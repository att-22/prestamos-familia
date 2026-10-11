from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import health, auth, purchases, financing_offers, comparisons

settings = get_settings()


app = FastAPI(
    title="Préstamos Familia API",
    description="API para comparar financiación vs pago al contado de cualquier compra",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(purchases.router)
app.include_router(financing_offers.router)
app.include_router(comparisons.router)


@app.get("/")
async def root():
    return {
        "name": "Préstamos Familia API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/healthz",
    }
