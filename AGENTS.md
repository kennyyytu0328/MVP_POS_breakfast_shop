以下是針對 「雲端早餐店 POS 系統 (Cloudflare Stack)」 的完整 SDD 規格書。

📝 Project Specification: Cloud Breakfast POS (MVP)
1. Project Overview (專案概述)
Goal: Build a lightweight, web-based Point of Sale (POS) and Inventory Management system tailored for a small breakfast shop.

Target Platform: Cloudflare Ecosystem (Free Tier).

Tech Stack:

Frontend: React (deployed on Cloudflare Pages).

Backend: Python FastAPI (deployed on Cloudflare Workers using Python Workers Beta).

Database: Cloudflare D1 (SQLite-based).

Language: Python 3.x (Backend), TypeScript/JavaScript (Frontend).

2. System Architecture (系統架構)
The system follows a headless architecture where the frontend communicates with the backend via RESTful APIs.

Database Layer (D1): Stores products, raw materials, recipes (BOM), transactions, and inventory logs.

API Layer (Workers):

Handles HTTP requests using FastAPI.

Executes business logic (e.g., deducting raw material stock when a product is sold).

Interacts with D1 using the Cloudflare binding.

Frontend Layer (Pages): Provides a UI for "Cashier Mode" (POS) and "Manager Mode" (Inventory/Reports).

3. Database Schema Specification (D1/SQLite)
Instruction to AI: Use the following SQL definitions to initialize the D1 database. Ensure Foreign Key constraints are respected.

3.1 Table: materials (原物料與商品庫存)
Stores both raw ingredients (e.g., Eggs, Bread) and sellable items if they are tracked directly.

SQL

CREATE TABLE materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- Enum: 'RAW_MATERIAL' (原料), 'PRODUCT' (商品), 'PACKAGING' (包材)
    cost_price REAL DEFAULT 0,
    unit TEXT NOT NULL, -- e.g., 'pcs', 'g', 'ml'
    current_stock REAL DEFAULT 0,
    safety_stock REAL DEFAULT 0, -- Alert threshold
    moq REAL DEFAULT 0, -- Minimum Order Quantity
    supplier_info TEXT, -- JSON string or Text: Name/Phone
    storage_location TEXT, -- e.g., 'Fridge A', 'Shelf 1'
    is_perishable INTEGER DEFAULT 0, -- Boolean: 1=Yes
    expiry_days INTEGER, -- Shelf life in days
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
3.2 Table: products (銷售商品菜單)
Items that appear on the POS menu (e.g., "Ham & Egg Sandwich").

SQL

CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL, -- Selling Price
    category TEXT, -- e.g., 'Sandwich', 'Beverage'
    is_active INTEGER DEFAULT 1 -- 1=On Menu, 0=Archived
);
3.3 Table: recipes (BOM - 配方表)
Links Products to Materials for automatic stock deduction.

SQL

CREATE TABLE recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    quantity_required REAL NOT NULL, -- How much material is used per product
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (material_id) REFERENCES materials(id)
);
Logic Example: A "Ham Sandwich" (product_id: 1) requires "Bread" (material_id: A, qty: 2) and "Ham" (material_id: B, qty: 1).

3.4 Table: transactions (訂單檔頭)
SQL

CREATE TABLE transactions (
    id TEXT PRIMARY KEY, -- UUID
    queue_number INTEGER, -- Daily sequence number (e.g., 001)
    total_amount REAL NOT NULL,
    payment_method TEXT NOT NULL, -- 'CASH', 'LINEPAY', 'CARD'
    staff_name TEXT,
    order_type TEXT NOT NULL, -- 'DINE_IN', 'TAKE_OUT'
    table_number INTEGER, -- Nullable
    status TEXT DEFAULT 'COMPLETED', -- 'COMPLETED', 'VOID', 'REFUND'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
3.5 Table: transaction_items (訂單明細)
SQL

CREATE TABLE transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL, -- Snapshot of price at time of sale
    subtotal REAL NOT NULL,
    modifiers TEXT, -- JSON or String: "No Ice, Extra Spicy"
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
3.6 Table: inventory_logs (庫存異動紀錄)
Full audit trail for ANY stock change.

SQL

CREATE TABLE inventory_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    change_quantity REAL NOT NULL, -- Positive (Inbound) or Negative (Outbound)
    action_type TEXT NOT NULL, -- 'SALE', 'RESTOCK', 'WASTE', 'ADJUSTMENT'
    reason TEXT, -- e.g., 'Expired', 'Staff Meal', 'Order #UUID'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id)
);
4. Backend API Specification (FastAPI)
Instruction to AI: Implement these endpoints using FastAPI. Use pydantic for data validation. Ensure all database operations are asynchronous.

4.1 Inventory Management
POST /materials: Add new raw material.

POST /materials/restock: Inbound stock.

Logic: Update materials.current_stock AND insert record into inventory_logs (action_type='RESTOCK').

GET /materials: List all materials.

Feature: Support query param ?low_stock=true to filter items where current_stock <= safety_stock.

4.2 Product & Recipe Management
POST /products: Create a menu item.

POST /products/{id}/recipe: Define the BOM for a product.

Input: List of {material_id, quantity}.

4.3 POS Transaction (The Core Logic)
POST /transactions: Submit a new order.

Input Payload:

JSON

{
  "order_type": "TAKE_OUT",
  "payment_method": "CASH",
  "staff_name": "Alice",
  "items": [
    {"product_id": 1, "quantity": 2, "modifiers": "No onion"}
  ]
}
Transactional Logic (Critical):

Create transactions record.

Create transaction_items records.

Deduct Inventory (BOM Resolution):

For each item sold, look up recipes table.

Calculate total raw materials needed (e.g., 2 Sandwiches = 4 Bread slices).

Update materials.current_stock (decrease).

Insert inventory_logs (action_type='SALE', reason='Order #ID').

5. Frontend Requirements (React)
Instruction to AI: Use Functional Components and Hooks. Use Tailwind CSS for styling.

5.1 View: POS Terminal (Cashier)
Grid Layout: Display Products as large, clickable buttons (grouped by Category).

Cart Sidebar: List selected items, allow quantity adjustment, show total amount.

Checkout Modal: Select "Dine-in/Take-out" and "Payment Method".

Modifiers: Simple text input or preset buttons for selected items (e.g., "No Ice").

5.2 View: Inventory Dashboard (Manager)
Stock Table: List all materials. Highlight rows in RED if current_stock < safety_stock.

Restock Action: A button to quickly add stock (Restock Dialog).

History: View inventory_logs to see where materials went.

6. Implementation Notes for AI Agent
Cloudflare Workers Adapter: You must use the appropriate adapter to run FastAPI on Workers (e.g., handling the ASGI/WSGI bridge correctly for the specific Workers runtime).

Environment Variables: Assume DB is bound to the D1 database instance.

CORS: Enable CORS to allow the React frontend to communicate with the Workers API.

Error Handling: Return 400 for bad input, 500 for server errors, and ensure atomic transactions for the /transactions endpoint (if D1 supports batch execution, use it).