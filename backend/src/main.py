from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .routes import inventory, products, transactions

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for MVP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to access DB from scope (populated by index.py adapter)
@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    # Assuming the adapter puts 'env' in the scope
    env = request.scope.get("env")
    if env:
        request.state.db = env.DB
    response = await call_next(request)
    return response

app.include_router(inventory.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Breakfast POS API is running"}
