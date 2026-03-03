from js import Response, Headers, Object
import json

def to_dict(js_obj):
    """Convert JS object (D1 row) to Python dict"""
    if not js_obj:
        return None
    try:
        # Try direct conversion (works for some proxies)
        return dict(js_obj)
    except:
        try:
            # Use Object.entries for D1 rows
            entries = Object.entries(js_obj)
            return {entry[0]: entry[1] for entry in entries}
        except Exception as e:
            print(f"Failed to convert JS object: {e}")
            return {}

async def on_fetch(request, env):
    """
    Simple router for handling API requests without FastAPI.
    Uses native Python and JS interop.
    """
    url = request.url
    method = request.method
    
    # Parse path
    # Handle full URL parsing more robustly
    try:
        if '://' in url:
            path_part = url.split('://')[1]
            if '/' in path_part:
                raw_path = path_part.split('/', 1)[1]
            else:
                raw_path = ''
        else:
            raw_path = url
            
        # Normalize path: remove query params and trailing slashes
        path = raw_path.split('?')[0].rstrip('/')
    except Exception as e:
        print(f"Path parsing error: {e}")
        path = ''
    
    print(f"Incoming request: {method} {path} (Raw: {url})")

    # CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
        'X-Debug-Path': path  # Return parsed path for debugging
    }
    
    # Handle CORS preflight
    if method == 'OPTIONS':
        return create_response(None, 204, cors_headers)
    
    try:
        # Parse request body for POST requests
        body = None
        if method == 'POST' or method == 'PUT':
            try:
                body_text = await request.text()
                if body_text:
                    body = json.loads(body_text)
            except Exception as e:
                print(f"Body parsing error: {e}")
        
        # Route handling
        if path == '' or path == 'api':
            return create_response({'message': 'Breakfast POS API is running'}, 200, cors_headers)
        
        # Materials endpoints
        elif path == 'api/materials' and method == 'GET':
            return await get_materials(env, cors_headers)
        
        elif path == 'api/materials' and method == 'POST':
            return await create_material(env, body, cors_headers)
        
        elif path == 'api/materials/restock' and method == 'POST':
            return await restock_material(env, body, cors_headers)
        
        elif path.startswith('api/materials/') and method == 'DELETE':
            # Extract ID from the last part of the path
            material_id = path.split('/')[-1]
            return await delete_material(env, material_id, cors_headers)

        elif path.startswith('api/materials/') and method == 'PUT':
            material_id = path.split('/')[-1]
            return await update_material(env, material_id, body, cors_headers)
        
        # Products endpoints
        elif path == 'api/products' and method == 'GET':
            return await get_products(env, cors_headers)
        
        elif path == 'api/products' and method == 'POST':
            return await create_product(env, body, cors_headers)
        
        elif path.startswith('api/products/') and path.endswith('/recipe') and method == 'POST':
            product_id = path.split('/')[2]
            return await create_recipe(env, product_id, body, cors_headers)
        
        elif path.startswith('api/products/') and path.endswith('/recipe') and method == 'GET':
            product_id = path.split('/')[2]
            return await get_recipe(env, product_id, cors_headers)
        
        elif path.startswith('api/products/') and method == 'DELETE':
            product_id = path.split('/')[2]
            return await delete_product(env, product_id, cors_headers)
        
        # Transactions endpoint
        elif path == 'api/transactions' and method == 'POST':
            return await create_transaction(env, body, cors_headers)
        
        elif path == 'api/transactions' and method == 'GET':
            return await get_transactions(env, cors_headers)

        elif path == 'api/transactions' and method == 'DELETE':
            return await clear_transactions(env, cors_headers)

        # Reports endpoint
        elif path == 'api/reports/monthly' and method == 'GET':
            # Extract month from query params if needed, but for now we'll accept a 'month' param in the URL query string
            # URL parsing above strips query params, so we need to re-parse or just pass the raw query string if we want to support params.
            # However, our current router strips params. Let's modify the router to keep params or parse them.
            # Actually, let's just use a POST for the report to send the month, or fix the router.
            # Fixing the router is better but risky. Let's use the 'body' approach or a simple path param like /api/reports/monthly/2023-11
            pass 
            
            # Let's stick to the existing pattern. We can use a POST to request a report with specific parameters
            # Or we can parse the query string from the raw URL.
            # Let's use POST for simplicity in this custom router setup.
            return await get_monthly_report(env, body, cors_headers)
        
        elif path == 'api/reports/monthly' and method == 'POST':
             return await get_monthly_report(env, body, cors_headers)
        
        else:
            print(f"404 Not Found: {path}")
            return create_response({'error': f'Not found: {path}'}, 404, cors_headers)
    
    except Exception as e:
        print(f"Global error: {e}")
        return create_response({'error': str(e)}, 500, cors_headers)


def create_response(data, status=200, headers=None):
    """Helper to create JSON responses"""
    js_headers = Headers.new()
    if headers:
        for key, value in headers.items():
            js_headers.set(key, value)
    
    if data is None:
        return Response.new(None, status=status, headers=js_headers)
        
    body = json.dumps(data) if isinstance(data, (dict, list)) else data
    return Response.new(body, status=status, headers=js_headers)


async def get_materials(env, cors_headers):
    """Get all materials"""
    db = env.breakfast_pos_db
    result = await db.prepare("SELECT * FROM materials ORDER BY id DESC").all()
    materials = [to_dict(row) for row in result.results]
    return create_response(materials, 200, cors_headers)


async def create_material(env, body, cors_headers):
    """Create a new material"""
    db = env.breakfast_pos_db
    
    query = """
        INSERT INTO materials (name, category, cost_price, unit, current_stock, safety_stock, moq, supplier_info, storage_location, is_perishable, expiry_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
    """
    
    result = await db.prepare(query).bind(
        body.get('name'),
        body.get('category'),
        body.get('cost_price', 0),
        body.get('unit'),
        body.get('current_stock', 0),
        body.get('safety_stock', 0),
        body.get('moq', 0),
        body.get('supplier_info', ''),
        body.get('storage_location', ''),
        body.get('is_perishable', 0),
        body.get('expiry_days', 0)
    ).first()
    
    return create_response(to_dict(result), 200, cors_headers)


async def restock_material(env, body, cors_headers):
    """Restock a material"""
    print(f"Restock request body: {body}")
    db = env.breakfast_pos_db
    
    if not body:
        return create_response({'error': 'Missing request body'}, 400, cors_headers)

    try:
        material_id = int(body.get('material_id'))
        quantity = float(body.get('quantity'))
        reason = body.get('reason', 'Manual Restock')
        
        print(f"Restocking material {material_id} with quantity {quantity}")

        # Batch update
        await db.batch([
            db.prepare("UPDATE materials SET current_stock = current_stock + ? WHERE id = ?").bind(quantity, material_id),
            db.prepare("INSERT INTO inventory_logs (material_id, change_quantity, action_type, reason) VALUES (?, ?, 'RESTOCK', ?)").bind(material_id, quantity, reason)
        ])
        
        return create_response({'status': 'success'}, 200, cors_headers)
    except Exception as e:
        print(f"Restock error: {e}")
        return create_response({'error': str(e)}, 500, cors_headers)


async def delete_material(env, material_id_str, cors_headers):
    """Delete a material"""
    print(f"Delete material request for ID: {material_id_str}")
    db = env.breakfast_pos_db
    
    try:
        # Strip any query parameters or trailing slashes
        clean_id = material_id_str.split('?')[0].strip('/')
        material_id = int(clean_id)
        
        print(f"Deleting material {material_id}")

        # Delete related logs and recipes first (manual cascade)
        await db.batch([
            db.prepare("DELETE FROM inventory_logs WHERE material_id = ?").bind(material_id),
            db.prepare("DELETE FROM recipes WHERE material_id = ?").bind(material_id),
            db.prepare("DELETE FROM materials WHERE id = ?").bind(material_id)
        ])
        return create_response({'status': 'success'}, 200, cors_headers)
    except Exception as e:
        print(f"Delete material error: {e}")
        return create_response({'error': str(e)}, 500, cors_headers)


async def update_material(env, material_id_str, body, cors_headers):
    """Update a material"""
    print(f"Update material request for ID: {material_id_str}, body: {body}")
    db = env.breakfast_pos_db
    
    try:
        clean_id = material_id_str.split('?')[0].strip('/')
        material_id = int(clean_id)
        
        # Build update query dynamically based on provided fields
        # Allowed fields to update
        allowed_fields = ['name', 'category', 'cost_price', 'unit', 'safety_stock', 'moq', 'supplier_info', 'storage_location', 'is_perishable', 'expiry_days']
        
        updates = []
        params = []
        
        for field in allowed_fields:
            if field in body:
                updates.append(f"{field} = ?")
                params.append(body[field])
        
        if not updates:
            return create_response({'error': 'No valid fields to update'}, 400, cors_headers)
            
        params.append(material_id)
        
        query = f"UPDATE materials SET {', '.join(updates)} WHERE id = ? RETURNING *"
        
        result = await db.prepare(query).bind(*params).first()
        
        if not result:
            return create_response({'error': 'Material not found'}, 404, cors_headers)
            
        return create_response(to_dict(result), 200, cors_headers)
    except Exception as e:
        print(f"Update material error: {e}")
        return create_response({'error': str(e)}, 500, cors_headers)


async def get_products(env, cors_headers):
    """Get all products"""
    db = env.breakfast_pos_db
    result = await db.prepare("SELECT * FROM products WHERE is_active = 1 ORDER BY id DESC").all()
    products = [to_dict(row) for row in result.results]
    return create_response(products, 200, cors_headers)


async def create_product(env, body, cors_headers):
    """Create a new product"""
    db = env.breakfast_pos_db
    
    print(f"Creating product with body: {body}")
    try:
        query = "INSERT INTO products (name, price, category, is_active) VALUES (?, ?, ?, ?) RETURNING *"
        result = await db.prepare(query).bind(
            body.get('name'),
            body.get('price'),
            body.get('category'),
            body.get('is_active', 1)
        ).first()
        
        print(f"Create product result: {result}")
        
        if not result:
            return create_response({'error': 'Failed to create product (no result returned)'}, 500, cors_headers)
            
        return create_response(to_dict(result), 200, cors_headers)
    except Exception as e:
        print(f"Error creating product: {e}")
        raise e


async def delete_product(env, product_id, cors_headers):
    """Delete a product"""
    db = env.breakfast_pos_db
    
    try:
        await db.batch([
            db.prepare("DELETE FROM recipes WHERE product_id = ?").bind(int(product_id)),
            db.prepare("DELETE FROM products WHERE id = ?").bind(int(product_id))
        ])
        return create_response({'status': 'success'}, 200, cors_headers)
    except Exception as e:
        return create_response({'error': str(e)}, 500, cors_headers)


async def get_recipe(env, product_id, cors_headers):
    """Get recipe for a product"""
    db = env.breakfast_pos_db
    result = await db.prepare("SELECT * FROM recipes WHERE product_id = ?").bind(int(product_id)).all()
    items = [to_dict(row) for row in result.results]
    return create_response(items, 200, cors_headers)


async def create_recipe(env, product_id, body, cors_headers):
    """Create/update recipe for a product"""
    db = env.breakfast_pos_db
    
    items = body.get('items', [])
    
    # Delete existing recipe
    stmts = [db.prepare("DELETE FROM recipes WHERE product_id = ?").bind(int(product_id))]
    
    # Insert new recipe items
    for item in items:
        stmts.append(
            db.prepare("INSERT INTO recipes (product_id, material_id, quantity_required) VALUES (?, ?, ?)").bind(
                int(product_id),
                item.get('material_id'),
                item.get('quantity_required')
            )
        )
    
    await db.batch(stmts)
    return create_response({'status': 'success'}, 200, cors_headers)


async def create_transaction(env, body, cors_headers):
    """Create a new transaction"""
    import uuid
    
    db = env.breakfast_pos_db
    tx_id = str(uuid.uuid4())
    
    items = body.get('items', [])
    if not items:
        return create_response({'error': 'No items in transaction'}, 400, cors_headers)
    
    # Get product prices
    product_ids = [item['product_id'] for item in items]
    placeholders = ','.join(['?'] * len(product_ids))
    products_result = await db.prepare(f"SELECT id, price FROM products WHERE id IN ({placeholders})").bind(*product_ids).all()
    products_map = {to_dict(row)['id']: to_dict(row)['price'] for row in products_result.results}
    
    # Calculate total and prepare statements
    total_amount = 0
    stmts = []
    
    for item in items:
        price = products_map.get(item['product_id'])
        if not price:
            return create_response({'error': f"Product {item['product_id']} not found"}, 400, cors_headers)
        
        subtotal = price * item['quantity']
        total_amount += subtotal
        
        stmts.append(
            db.prepare("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, subtotal, modifiers) VALUES (?, ?, ?, ?, ?, ?)").bind(
                tx_id, item['product_id'], item['quantity'], price, subtotal, item.get('modifiers', '')
            )
        )
    
    # Insert transaction header
    # Handle table_number explicitly to avoid binding None (which can cause D1_TYPE_ERROR if mapped to undefined)
    table_number = body.get('table_number')
    
    if table_number is not None:
        tx_query = "INSERT INTO transactions (id, total_amount, payment_method, staff_name, order_type, table_number, status) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED')"
        tx_params = [tx_id, total_amount, body.get('payment_method'), body.get('staff_name'), body.get('order_type'), table_number]
    else:
        tx_query = "INSERT INTO transactions (id, total_amount, payment_method, staff_name, order_type, table_number, status) VALUES (?, ?, ?, ?, ?, NULL, 'COMPLETED')"
        tx_params = [tx_id, total_amount, body.get('payment_method'), body.get('staff_name'), body.get('order_type')]

    stmts.insert(0, db.prepare(tx_query).bind(*tx_params))
    
    # Get recipes and deduct inventory
    recipes_result = await db.prepare(f"SELECT * FROM recipes WHERE product_id IN ({placeholders})").bind(*product_ids).all()
    
    for item in items:
        for recipe_row in recipes_result.results:
            recipe = to_dict(recipe_row)
            if recipe['product_id'] == item['product_id']:
                qty_needed = recipe['quantity_required'] * item['quantity']
                stmts.append(
                    db.prepare("UPDATE materials SET current_stock = current_stock - ? WHERE id = ?").bind(qty_needed, recipe['material_id'])
                )
                stmts.append(
                    db.prepare("INSERT INTO inventory_logs (material_id, change_quantity, action_type, reason) VALUES (?, ?, 'SALE', ?)").bind(
                        recipe['material_id'], -qty_needed, f"Order #{tx_id}"
                    )
                )
    
    await db.batch(stmts)
    
    return create_response({'id': tx_id, 'total_amount': total_amount, 'status': 'COMPLETED'}, 200, cors_headers)


async def get_transactions(env, cors_headers):
    """Get transaction history"""
    db = env.breakfast_pos_db
    
    # Fetch transactions
    # Exclude ARCHIVED transactions
    tx_result = await db.prepare("SELECT * FROM transactions WHERE status != 'ARCHIVED' ORDER BY created_at DESC LIMIT 50").all()
    transactions = [to_dict(row) for row in tx_result.results]
    
    if not transactions:
        return create_response([], 200, cors_headers)
    
    # Fetch items for these transactions
    tx_ids = [tx['id'] for tx in transactions]
    placeholders = ','.join(['?'] * len(tx_ids))
    
    items_query = f"""
        SELECT ti.*, p.name as product_name 
        FROM transaction_items ti
        LEFT JOIN products p ON ti.product_id = p.id
        WHERE ti.transaction_id IN ({placeholders})
    """
    
    items_result = await db.prepare(items_query).bind(*tx_ids).all()
    all_items = [to_dict(row) for row in items_result.results]
    
    # Group items by transaction
    for tx in transactions:
        tx['items'] = [item for item in all_items if item['transaction_id'] == tx['id']]
        
    return create_response(transactions, 200, cors_headers)


async def clear_transactions(env, cors_headers):
    """Archive all visible transaction history"""
    db = env.breakfast_pos_db
    
    try:
        # Soft delete: Update status to 'ARCHIVED'
        await db.prepare("UPDATE transactions SET status = 'ARCHIVED' WHERE status != 'ARCHIVED'").run()
        return create_response({'status': 'success'}, 200, cors_headers)
    except Exception as e:
        return create_response({'error': str(e)}, 500, cors_headers)


async def get_monthly_report(env, body, cors_headers):
    """Generate monthly sales report"""
    db = env.breakfast_pos_db
    
    # Default to current month if not specified
    # Format: 'YYYY-MM'
    target_month = body.get('month') if body else None
    
    if not target_month:
        # Fallback to current month logic if needed, or just return error
        # For MVP, let's require the month
        return create_response({'error': 'Month is required (YYYY-MM)'}, 400, cors_headers)
    
    try:
        # SQLite date string comparison
        start_date = f"{target_month}-01"
        # Simple logic: start of this month to start of next month
        # But for MVP, let's just match the string prefix
        
        query = """
            SELECT 
                t.id, t.created_at, t.total_amount, t.payment_method, t.order_type,
                ti.product_id, ti.quantity, ti.subtotal,
                p.name as product_name, p.category
            FROM transactions t
            JOIN transaction_items ti ON t.id = ti.transaction_id
            LEFT JOIN products p ON ti.product_id = p.id
            WHERE t.created_at LIKE ? AND t.status != 'VOID'
            ORDER BY t.created_at DESC
        """
        
        result = await db.prepare(query).bind(f"{target_month}%").all()
        rows = [to_dict(row) for row in result.results]
        
        # Aggregate data
        total_sales = 0
        total_orders = len(set(row['id'] for row in rows))
        category_sales = {}
        product_sales = {}
        
        for row in rows:
            # Total Sales (sum of subtotals to be safe, or use transaction totals)
            # Using transaction totals might duplicate if we join items.
            # Let's calculate from items for granular breakdown.
            
            # Wait, if we join items, we get one row per item.
            # Transaction total is repeated.
            # Let's sum item subtotals.
            total_sales += row['subtotal']
            
            # Category breakdown
            cat = row['category'] or 'Uncategorized'
            category_sales[cat] = category_sales.get(cat, 0) + row['subtotal']
            
            # Product breakdown
            prod = row['product_name'] or f"Product {row['product_id']}"
            product_sales[prod] = product_sales.get(prod, 0) + row['quantity']
            
        report = {
            'month': target_month,
            'total_sales': total_sales,
            'total_orders': total_orders,
            'category_sales': category_sales,
            'top_products': dict(sorted(product_sales.items(), key=lambda item: item[1], reverse=True)[:5]),
            'details': rows # Optional: send full details if needed
        }
        
        return create_response(report, 200, cors_headers)
        
    except Exception as e:
        print(f"Report error: {e}")
        return create_response({'error': str(e)}, 500, cors_headers)
