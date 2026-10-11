from fastapi import APIRouter, Depends
from sqlmodel import Session, text
from app.core.database import get_session

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def health_check(session: Session = Depends(get_session)):
    """Health check para load balancers / Railway"""
    try:
        session.connection().execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}


@router.get("/ready")
async def readiness_check():
    """Readiness check"""
    return {"status": "ready"}
