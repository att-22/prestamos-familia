from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.database import get_session
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


class MagicLinkRequest(BaseModel):
    email: EmailStr


class DevTokenRequest(BaseModel):
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
async def dev_token(request: DevTokenRequest, session: Session = Depends(get_session)):
    """
    SOLO DESARROLLO: Genera token JWT directo para testing sin Supabase.
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    email = request.email
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        user = User(email=email, supabase_id=f"dev-{email}", name=email.split("@")[0].capitalize())
        session.add(user)
        session.commit()
        session.refresh(user)
    
    # El 'sub' es el supabase_id, igual que en un JWT real de Supabase
    token = create_access_token(user.supabase_id, user.email)
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
