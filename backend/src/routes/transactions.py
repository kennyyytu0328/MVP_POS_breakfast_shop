from fastapi import APIRouter, HTTPException, Request
from ..models import TransactionCreate, TransactionResponse
import uuid
import json

router = APIRouter()

@router.post("/transactions", response_model=TransactionResponse)
async def create_transaction(transaction: TransactionCreate, request: Request):
    db = request.state.db
    
    # 1. Generate ID
    tx_id = str(uuid.uuid4())
    
    # 2. Calculate Total Amount (Need to fetch product prices)
    # Get all product IDs
    product_ids = [item.product_id for item in transaction.items]
    if not product_ids:
        raise HTTPException(status_code=400, detail="No items in transaction")
        
    placeholders = ','.join(['?'] * len(product_ids))
    products_query = f"SELECT id, price FROM products WHERE id IN ({placeholders})"
    
    try:
        products_result = await db.prepare(products_query).bind(*product_ids).all()
        products_map = {row['id']: row['price'] for row in products_result.results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch products: {str(e)}")
        
    total_amount = 0
    tx_items_stmts = []
    
    # 3. Prepare Transaction Items and Calculate Total
    for item in transaction.items:
        price = products_map.get(item.product_id)
        if price is None:
             raise HTTPException(status_code=400, detail=f"Product ID {item.product_id} not found")
        
        subtotal = price * item.quantity
        total_amount += subtotal
        
        tx_items_stmts.append(
            db.prepare("""
                INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, subtotal, modifiers)
                VALUES (?, ?, ?, ?, ?, ?)
            """).bind(tx_id, item.product_id, item.quantity, price, subtotal, item.modifiers)
        )
        
    # 4. Prepare Transaction Header
    tx_stmt = db.prepare("""
        INSERT INTO transactions (id, total_amount, payment_method, staff_name, order_type, status)
        VALUES (?, ?, ?, ?, ?, 'COMPLETED')
    """).bind(tx_id, total_amount, transaction.payment_method, transaction.staff_name, transaction.order_type)
    
    # 5. Inventory Deduction
    # Fetch recipes
    recipes_query = f"SELECT * FROM recipes WHERE product_id IN ({placeholders})"
    try:
        recipes_result = await db.prepare(recipes_query).bind(*product_ids).all()
        recipes = recipes_result.results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch recipes: {str(e)}")
        
    inventory_stmts = []
    
    # Map product_id to list of recipes
    product_recipes = {}
    for r in recipes:
        pid = r['product_id']
        if pid not in product_recipes:
            product_recipes[pid] = []
        product_recipes[pid].append(r)
        
    for item in transaction.items:
        p_recipes = product_recipes.get(item.product_id, [])
        for recipe in p_recipes:
            qty_needed = recipe['quantity_required'] * item.quantity
            material_id = recipe['material_id']
            
            # Deduct stock
            inventory_stmts.append(
                db.prepare("UPDATE materials SET current_stock = current_stock - ? WHERE id = ?")
                .bind(qty_needed, material_id)
            )
            
            # Log
            inventory_stmts.append(
                db.prepare("""
                    INSERT INTO inventory_logs (material_id, change_quantity, action_type, reason)
                    VALUES (?, ?, 'SALE', ?)
                """).bind(material_id, -qty_needed, f"Order #{tx_id}")
            )
            
    # 6. Execute Batch
    all_stmts = [tx_stmt] + tx_items_stmts + inventory_stmts
    
    try:
        await db.batch(all_stmts)
        return TransactionResponse(id=tx_id, total_amount=total_amount, status="COMPLETED")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")
