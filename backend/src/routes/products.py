from fastapi import APIRouter, HTTPException, Request
from typing import List
from ..models import ProductCreate, ProductResponse, RecipeCreate

router = APIRouter()

@router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, request: Request):
    db = request.state.db
    query = """
        INSERT INTO products (name, price, category, is_active)
        VALUES (?, ?, ?, ?)
        RETURNING *
    """
    params = [product.name, product.price, product.category, product.is_active]
    
    try:
        stmt = db.prepare(query).bind(*params)
        result = await stmt.first()
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create product")
        return ProductResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/products/{id}/recipe")
async def create_recipe(id: int, recipe: RecipeCreate, request: Request):
    db = request.state.db
    
    # Delete existing recipe for this product (optional, but good for updates)
    # For MVP, we'll just insert. Or maybe clear first? Let's clear first to be safe.
    delete_query = "DELETE FROM recipes WHERE product_id = ?"
    insert_query = "INSERT INTO recipes (product_id, material_id, quantity_required) VALUES (?, ?, ?)"
    
    stmts = [db.prepare(delete_query).bind(id)]
    
    for item in recipe.items:
        stmts.append(db.prepare(insert_query).bind(id, item.material_id, item.quantity_required))
        
    try:
        await db.batch(stmts)
        return {"status": "success", "message": "Recipe updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
