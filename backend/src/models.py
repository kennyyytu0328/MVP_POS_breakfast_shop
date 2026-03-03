from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime

# Enums
class MaterialCategory(str):
    RAW_MATERIAL = 'RAW_MATERIAL'
    PRODUCT = 'PRODUCT'
    PACKAGING = 'PACKAGING'

class PaymentMethod(str):
    CASH = 'CASH'
    LINEPAY = 'LINEPAY'
    CARD = 'CARD'

class OrderType(str):
    DINE_IN = 'DINE_IN'
    TAKE_OUT = 'TAKE_OUT'

class ActionType(str):
    SALE = 'SALE'
    RESTOCK = 'RESTOCK'
    WASTE = 'WASTE'
    ADJUSTMENT = 'ADJUSTMENT'

# Material Models
class MaterialBase(BaseModel):
    name: str
    category: str
    cost_price: float = 0
    unit: str
    current_stock: float = 0
    safety_stock: float = 0
    moq: float = 0
    supplier_info: Optional[str] = None
    storage_location: Optional[str] = None
    is_perishable: int = 0
    expiry_days: Optional[int] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialResponse(MaterialBase):
    id: int
    created_at: Optional[str] = None

class RestockRequest(BaseModel):
    material_id: int
    quantity: float
    reason: Optional[str] = None

# Product Models
class ProductBase(BaseModel):
    name: str
    price: float
    category: Optional[str] = None
    is_active: int = 1

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int

# Recipe Models
class RecipeItem(BaseModel):
    material_id: int
    quantity_required: float

class RecipeCreate(BaseModel):
    items: List[RecipeItem]

# Transaction Models
class TransactionItemCreate(BaseModel):
    product_id: int
    quantity: int
    modifiers: Optional[str] = None

class TransactionCreate(BaseModel):
    order_type: str
    payment_method: str
    staff_name: Optional[str] = None
    items: List[TransactionItemCreate]

class TransactionResponse(BaseModel):
    id: str
    total_amount: float
    status: str
    created_at: Optional[str] = None
