from typing import Optional
from uuid import UUID
from fastapi import Depends, Header, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import decode_token
from app.models.user import User


def get_current_user_id(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
) -> UUID:
    """Extrae user_id del JWT de Supabase"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorización requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.replace("Bearer ", "")
    token_data = decode_token(token)
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verificar/crear usuario en nuestra BD
    user = session.exec(select(User).where(User.supabase_id == token_data.user_id)).first()
    if not user:
        # Crear usuario automáticamente (primer login)
        user = User(supabase_id=token_data.user_id, email=token_data.email)
        session.add(user)
        session.commit()
        session.refresh(user)
    
    return user.id


def get_current_user(
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
) -> User:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


# Dependency opcional (para endpoints públicos que pueden tener user)
def get_optional_user_id(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
) -> Optional[UUID]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    token_data = decode_token(token)
    if not token_data:
        return None
    user = session.exec(select(User).where(User.supabase_id == token_data.user_id)).first()
    return user.id if user else None
