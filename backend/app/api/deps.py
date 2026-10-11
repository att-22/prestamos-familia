from typing import Optional
from uuid import UUID
from fastapi import Depends, Header, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import decode_token
from app.models.user import User


def get_current_user(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
) -> User:
    """Usuario al que pertenece el JWT de la cabecera Authorization."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorización requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = decode_token(authorization.removeprefix("Bearer "))
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token_data:
        raise invalid

    try:
        user_id = UUID(token_data.user_id)
    except ValueError:
        raise invalid

    # Un token válido de una cuenta ya borrada tampoco sirve
    user = session.get(User, user_id)
    if not user:
        raise invalid
    return user


def get_current_user_id(current_user: User = Depends(get_current_user)) -> UUID:
    return current_user.id
