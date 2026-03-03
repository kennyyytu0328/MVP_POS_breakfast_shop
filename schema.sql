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

CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL, -- Selling Price
    category TEXT, -- e.g., 'Sandwich', 'Beverage'
    is_active INTEGER DEFAULT 1 -- 1=On Menu, 0=Archived
);

CREATE TABLE recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    quantity_required REAL NOT NULL, -- How much material is used per product
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (material_id) REFERENCES materials(id)
);

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

CREATE TABLE inventory_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    change_quantity REAL NOT NULL, -- Positive (Inbound) or Negative (Outbound)
    action_type TEXT NOT NULL, -- 'SALE', 'RESTOCK', 'WASTE', 'ADJUSTMENT'
    reason TEXT, -- e.g., 'Expired', 'Staff Meal', 'Order #UUID'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id)
);
