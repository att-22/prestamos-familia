from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, text
from app.core.database import get_session

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def health_check(session: Session = Depends(get_session)):
    """Health check de la plataforma: 503 si no hay base de datos, para que no enrute tráfico."""
    try:
        session.connection().execute(text("SELECT 1"))
    except Exception:
        # Sin el detalle del error: puede llevar datos de la conexión y el endpoint es público
        return JSONResponse(status_code=503, content={"status": "error", "database": "disconnected"})
    return {"status": "ok", "database": "connected"}


@router.get("/ready")
async def readiness_check():
    """Readiness check"""
    return {"status": "ready"}
