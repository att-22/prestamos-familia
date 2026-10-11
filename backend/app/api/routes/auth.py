from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from uuid import UUID
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


@router.post("/magic-link", response_model=MagicLinkResponse)
async def request_magic_link(request: MagicLinkRequest):
    """
    En producción: integrar con Supabase Auth API para enviar magic link.
    Aquí solo documentamos el flujo.
    """
    # TODO: Llamar a Supabase Admin API: supabase.auth.admin.generate_link(...)
    return {"message": f"Si {request.email} existe, recibirás un magic link. En desarrollo, usa /auth/dev-token"}


@router.post("/dev-token", response_model=TokenResponse)
async def dev_token(email: EmailStr, session: Session = Depends(get_session)):
    """
    SOLO DESARROLLO: Genera token JWT directo para testing sin Supabase.
    """
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        user = User(email=email, supabase_id=f"dev-{email}", name="Dev User")
        session.add(user)
        session.commit()
        session.refresh(user)
    
    token = create_access_token(str(user.id), user.email)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    for field, value in user_update.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user
