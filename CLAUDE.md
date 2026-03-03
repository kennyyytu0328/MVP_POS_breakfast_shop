# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloud Breakfast POS - A lightweight web-based Point of Sale and Inventory Management system for a small breakfast shop. Built on Cloudflare's free tier ecosystem.

## Tech Stack

- **Frontend**: React 19 + Vite 7 + Tailwind CSS 3 + react-router-dom v7 (deployed to Cloudflare Pages)
- **Backend**: Python on Cloudflare Workers (Python Workers Beta, using `js` interop for D1 access)
- **Database**: Cloudflare D1 (SQLite-based)
- **Prerequisites**: Node.js v18+, Wrangler CLI (`npm install -g wrangler`)

## Development Commands

### Frontend (from `frontend/` directory)
```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend (from `backend/` directory)
```bash
wrangler dev         # Start dev server at http://localhost:8787
wrangler deploy      # Deploy to Cloudflare Workers
```

### Database Setup (first time only, from `backend/` directory)
```bash
wrangler d1 execute breakfast-pos-db --file=../schema.sql --local    # Local
wrangler d1 execute breakfast-pos-db --file=../schema.sql --remote   # Production
```

## Architecture

### Frontend (`frontend/src/`)

Four views routed via react-router-dom in `App.jsx`:
- `/` → `components/POS/PosTerminal.jsx` - Cashier view with product grid and cart
- `/inventory` → `components/Inventory/InventoryDashboard.jsx` - Stock management with low-stock alerts
- `/products` → `components/Product/ProductManagement.jsx` - Menu item and recipe (BOM) management
- `/transactions` → `components/Transactions/TransactionHistory.jsx` - Order history view

Each component defines its own `API_URL = 'http://localhost:8787/api'` constant (no shared API config yet). All API calls use `axios`.

### Backend (`backend/src/`)

**Production entry point is `index.py`** - a monolithic file (~500 lines) with a custom router using Cloudflare's JS interop (`from js import Response, Headers, Object`). This is necessary because FastAPI doesn't run natively on Python Workers.

- `main.py` + `routes/` - Alternative FastAPI implementation (not used in production)
- `models.py` - Pydantic models for validation

**D1 Interop Pattern**: D1 rows are JS proxy objects. The `to_dict()` helper at the top of `index.py` converts them to Python dicts using `Object.entries()`. All DB access goes through `env.breakfast_pos_db` (binding in `wrangler.toml`).

### Database Schema (`schema.sql`, 6 tables)
- `materials` - Raw ingredients with stock tracking, safety_stock thresholds, supplier info
- `products` - Menu items with pricing and active/archived status
- `recipes` - BOM linking products to materials (quantity_required per product)
- `transactions` - Order headers (UUID primary key, queue_number for daily sequence)
- `transaction_items` - Line items with price snapshots at time of sale
- `inventory_logs` - Audit trail for stock changes (SALE, RESTOCK, WASTE, ADJUSTMENT)

### Key Business Logic

**Transaction Flow** (`index.py:create_transaction`):
1. Generate UUID, assign queue number
2. Fetch product prices and calculate total
3. Create transaction header and line items
4. Resolve BOM: for each sold product, lookup recipes and calculate material requirements
5. Deduct materials from stock and log each change to `inventory_logs`
6. Execute all SQL as a D1 batch for atomicity

**Material Categories**: RAW_MATERIAL (原料), PRODUCT (商品), PACKAGING (包材)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/materials` | List materials (?low_stock=true for alerts) |
| POST | `/api/materials` | Create material |
| PUT | `/api/materials/{id}` | Update material |
| DELETE | `/api/materials/{id}` | Delete material (cascades to logs/recipes) |
| POST | `/api/materials/restock` | Restock with inventory log |
| GET | `/api/products` | List active products |
| POST | `/api/products` | Create product |
| DELETE | `/api/products/{id}` | Delete product |
| GET | `/api/products/{id}/recipe` | Get product's BOM |
| POST | `/api/products/{id}/recipe` | Set product's BOM |
| GET | `/api/transactions` | List recent transactions (excludes ARCHIVED) |
| POST | `/api/transactions` | Create order (triggers inventory deduction) |
| DELETE | `/api/transactions` | Archive all transactions |
| POST | `/api/reports/monthly` | Monthly report (body: {month: "YYYY-MM"}) |

## Configuration

- **API URL**: Hardcoded as `API_URL` constant in each of the 4 frontend components (not centralized)
- **D1 Database**: Binding `breakfast_pos_db` configured in `backend/wrangler.toml`
- **CORS**: Open (`*`) for all origins in development
