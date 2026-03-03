from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from ..models import MaterialCreate, MaterialResponse, RestockRequest

router = APIRouter()

@router.post("/materials", response_model=MaterialResponse)
async def create_material(material: MaterialCreate, request: Request):
    db = request.state.db
    query = """
        INSERT INTO materials (name, category, cost_price, unit, current_stock, safety_stock, moq, supplier_info, storage_location, is_perishable, expiry_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
    """
    params = [
        material.name, material.category, material.cost_price, material.unit,
        material.current_stock, material.safety_stock, material.moq,
        material.supplier_info, material.storage_location, material.is_perishable, material.expiry_days
    ]
    
    try:
        # D1 execute returns a result object. In Python workers it might be awaitable.
        # Assuming a helper or direct js binding usage.
        # For this code, I'll assume db.prepare(query).bind(*params).first() pattern or similar if using a wrapper,
        # but raw D1 binding in JS is: await env.DB.prepare(query).bind(...).run() or .first()
        # In Python via js: await db.prepare(query).bind(*params).first()
        
        stmt = db.prepare(query).bind(*params)
        result = await stmt.first()
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create material")
            
        return MaterialResponse(**result) # Assuming result is a dict-like object
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/materials/restock")
async def restock_material(restock: RestockRequest, request: Request):
    db = request.state.db
    
    # 1. Update current_stock
    # 2. Insert inventory_log
    # D1 supports batching
    
    try:
        update_query = "UPDATE materials SET current_stock = current_stock + ? WHERE id = ?"
        log_query = """
            INSERT INTO inventory_logs (material_id, change_quantity, action_type, reason)
            VALUES (?, ?, 'RESTOCK', ?)
        """
        
        # Batch execution
        stmts = [
            db.prepare(update_query).bind(restock.quantity, restock.material_id),
            db.prepare(log_query).bind(restock.material_id, restock.quantity, restock.reason or 'Manual Restock')
        ]
        
        await db.batch(stmts)
        
        return {"status": "success", "message": "Restock successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/materials", response_model=List[MaterialResponse])
async def list_materials(request: Request, low_stock: bool = False):
    db = request.state.db
    
    query = "SELECT * FROM materials"
    if low_stock:
        query += " WHERE current_stock <= safety_stock"
    
    query += " ORDER BY id DESC"
    
    try:
        stmt = db.prepare(query)
        results = await stmt.all()
        # results.results is the list of rows in D1 binding
        return [MaterialResponse(**row) for row in results.results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
