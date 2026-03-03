# Cloud Breakfast POS (MVP)

A lightweight, web-based Point of Sale (POS) and Inventory Management system for a small breakfast shop.

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS (with i18n: Chinese/English)
- **Backend**: Python on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite-based)

## Getting Started

### Prerequisites

- Node.js (v18+)
- Wrangler CLI (`npm install -g wrangler`)
- npm or yarn

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at **http://localhost:5173**

#### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

### Backend (Cloudflare Workers)

```bash
cd backend
wrangler dev
```

The backend API will start at **http://localhost:8787**

#### Initialize D1 Database (first time only)

```bash
cd backend
wrangler d1 execute breakfast-pos-db --file=../schema.sql --local
```

To verify tables were created:

```bash
wrangler d1 execute breakfast-pos-db --command="SELECT name FROM sqlite_master WHERE type='table';" --local
```

#### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Health check |
| `/api/materials` | Inventory management |
| `/api/products` | Product & recipe management |
| `/api/transactions` | POS transactions |
| `/api/reports/monthly` | Monthly sales report |

#### Deploy to Production

```bash
# Initialize remote D1 database
wrangler d1 execute breakfast-pos-db --file=../schema.sql --remote

# Deploy backend
cd backend
wrangler deploy
```

## Internationalization (i18n)

The app supports **Traditional Chinese (zh-TW)** and **English (en)** with Chinese as the default language.

- Language toggle is in the top-right corner of the navbar
- Language preference is persisted in `localStorage`
- Translation files are located in `frontend/src/i18n/locales/`
- To add or modify translations, edit `en.json` and `zh-TW.json`

## Project Structure

```
MVP_POS_breakfast_shop/
├── frontend/          # React frontend (Vite)
│   ├── src/
│   │   ├── i18n/              # Internationalization
│   │   │   ├── LanguageContext.jsx  # i18n provider & hook
│   │   │   └── locales/
│   │   │       ├── en.json    # English translations
│   │   │       └── zh-TW.json # Chinese translations
│   │   └── components/        # UI components
│   └── package.json
├── backend/           # Python Cloudflare Workers
│   ├── src/
│   │   ├── index.py   # Main entry point
│   │   └── main.py    # FastAPI (alternative)
│   └── wrangler.toml  # Wrangler config
├── schema.sql         # D1 database schema
└── AGENTS.md          # Project specification
```
