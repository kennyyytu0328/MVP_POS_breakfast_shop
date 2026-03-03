---
name: breakfast-pos-patterns
description: Coding patterns for Cloud Breakfast POS system
version: 1.0.0
source: codebase-analysis
---

# Breakfast POS Patterns

## Code Architecture

```
MVP_POS_breakfast_shop/
├── frontend/                    # React + Vite + Tailwind
│   └── src/
│       ├── components/
│       │   ├── POS/            # Cashier terminal
│       │   ├── Inventory/      # Stock management
│       │   ├── Product/        # Menu management
│       │   └── Transactions/   # Order history
│       ├── App.jsx             # Router and navigation
│       └── main.jsx            # Entry point
├── backend/                     # Cloudflare Workers (Python)
│   ├── src/
│   │   ├── index.py           # Custom router with D1 bindings
│   │   ├── main.py            # FastAPI alternative
│   │   ├── models.py          # Pydantic models
│   │   └── routes/            # FastAPI route modules
│   └── wrangler.toml          # Workers configuration
└── schema.sql                  # D1 database schema
```

## Frontend Patterns

### Component Structure
- Functional components with hooks (`useState`, `useEffect`)
- Single file components with inline styles via Tailwind
- API calls via axios with `try/catch` and loading states
- Fallback mock data when backend unavailable

### Naming Conventions
- Components: PascalCase (`PosTerminal.jsx`, `InventoryDashboard.jsx`)
- Directories: PascalCase matching feature area
- State variables: camelCase (`products`, `cart`, `loading`)

### State Management Pattern
```jsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
    fetchData();
}, []);

const fetchData = async () => {
    try {
        const res = await axios.get(`${API_URL}/endpoint`);
        setData(res.data);
    } catch (error) {
        console.error("Failed to fetch", error);
        setData(fallbackData); // Graceful degradation
    } finally {
        setLoading(false);
    }
};
```

### UI Pattern: Category Color Mapping
```jsx
const CATEGORY_COLORS = {
    'Sandwich': { bg: 'bg-amber-300', hover: 'hover:bg-amber-200', ... },
    'Beverage': { bg: 'bg-sky-100', ... },
    'default': { bg: 'bg-gray-100', ... }
};
const getCategoryColor = (category) => CATEGORY_COLORS[category] || CATEGORY_COLORS['default'];
```

## Backend Patterns

### D1 Database Binding (Cloudflare Workers)
```python
# Access via env binding (wrangler.toml: binding = "breakfast_pos_db")
db = env.breakfast_pos_db

# Query patterns
result = await db.prepare("SELECT * FROM table").all()
rows = [to_dict(row) for row in result.results]

# Insert with RETURNING
result = await db.prepare("INSERT INTO table (...) VALUES (?) RETURNING *").bind(value).first()

# Batch operations for atomicity
await db.batch([stmt1, stmt2, stmt3])
```

### JS Interop Helper
```python
from js import Response, Headers, Object

def to_dict(js_obj):
    """Convert D1 row (JS object) to Python dict"""
    try:
        return dict(js_obj)
    except:
        entries = Object.entries(js_obj)
        return {entry[0]: entry[1] for entry in entries}
```

### Response Pattern
```python
def create_response(data, status=200, headers=None):
    js_headers = Headers.new()
    if headers:
        for key, value in headers.items():
            js_headers.set(key, value)
    body = json.dumps(data) if isinstance(data, (dict, list)) else data
    return Response.new(body, status=status, headers=js_headers)
```

### CORS Headers
```python
cors_headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
}
```

## Database Patterns

### BOM (Bill of Materials) Resolution
When processing a sale, resolve recipes to deduct materials:
```python
for item in transaction.items:
    recipes = get_recipes(item.product_id)
    for recipe in recipes:
        qty_needed = recipe['quantity_required'] * item.quantity
        # Deduct from materials
        # Log to inventory_logs
```

### Inventory Audit Trail
Always log stock changes to `inventory_logs`:
```sql
INSERT INTO inventory_logs (material_id, change_quantity, action_type, reason)
VALUES (?, ?, 'SALE', 'Order #UUID')
```

Action types: `SALE`, `RESTOCK`, `WASTE`, `ADJUSTMENT`

### Soft Delete Pattern
```python
# Archive instead of hard delete
await db.prepare("UPDATE transactions SET status = 'ARCHIVED' WHERE ...").run()

# Query excludes archived
"SELECT * FROM transactions WHERE status != 'ARCHIVED'"
```

## Pydantic Models Pattern

```python
class MaterialBase(BaseModel):
    name: str
    category: str
    cost_price: float = 0
    unit: str
    # ... required and optional fields

class MaterialCreate(MaterialBase):
    pass  # Input model

class MaterialResponse(MaterialBase):
    id: int
    created_at: Optional[str] = None  # Output model with DB fields
```

## Testing Workflow

No automated tests configured. For development:
1. Start backend: `cd backend && wrangler dev`
2. Start frontend: `cd frontend && npm run dev`
3. Test manually via UI or API calls

## Deployment Workflow

### Backend (Cloudflare Workers)
```bash
cd backend
wrangler d1 execute breakfast-pos-db --file=../schema.sql --remote  # First time
wrangler deploy
```

### Frontend (Cloudflare Pages)
```bash
cd frontend
npm run build
# Deploy dist/ to Cloudflare Pages
```

## Key Conventions

1. **UUID for transaction IDs** - Use `uuid.uuid4()` for order identifiers
2. **Price snapshots** - Store `unit_price` in transaction_items, not just product_id
3. **Batch operations** - Use `db.batch([])` for multi-statement atomicity
4. **Graceful degradation** - Frontend falls back to mock data if backend unavailable
5. **Status enums as strings** - `'COMPLETED'`, `'VOID'`, `'REFUND'`, `'ARCHIVED'`
