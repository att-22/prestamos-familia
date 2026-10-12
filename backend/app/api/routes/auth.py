import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.database import get_session
from app.core.rate_limit import AttemptLimiter
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import (
    DevTokenRequest,
    LoginRequest,
    PasswordChange,
    RegisterRequest,
    TokenResponse,
    UserRead,
    UserUpdate,
)
from app.api.deps import get_current_user
from app.services.access import is_admin_email, is_registration_allowed

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

# 5 fallos en 15 minutos por IP y email, tanto al entrar como al registrarse
auth_limiter = AttemptLimiter(max_attempts=5, window_seconds=15 * 60)
# Tope por email desde cualquier IP. Detrás de un proxy la IP sale de una cabecera que
# el cliente puede falsear; sin esto bastaría cambiarla para seguir probando contraseñas.
email_limiter = AttemptLimiter(max_attempts=20, window_seconds=15 * 60)


def _limiter_key(request: Request, email: str) -> str:
    client = request.client.host if request.client else "unknown"
    return f"{client}:{email}"


def _check_not_blocked(key: str, email: str) -> None:
    if auth_limiter.is_blocked(key) or email_limiter.is_blocked(email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos y vuelve a probar.",
        )


def _record_failure(key: str, email: str) -> None:
    auth_limiter.record_failure(key)
    email_limiter.record_failure(email)


def _grant_admin_if_configured(user: User, session: Session) -> None:
    """El email de ADMIN_EMAIL es administrador aunque la cuenta existiera de antes."""
    if not user.is_admin and is_admin_email(user.email):
        user.is_admin = True
        session.add(user)
        session.commit()
        session.refresh(user)


def _token_response(user: User) -> TokenResponse:
    token = create_access_token(str(user.id), user.email)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, request: Request, session: Session = Depends(get_session)):
    """Crea la cuenta de un email autorizado. Hace falta el código de registro si está configurado."""
    email = data.email.lower()
    key = _limiter_key(request, email)
    _check_not_blocked(key, email)

    code_ok = not settings.REGISTRATION_CODE or secrets.compare_digest(
        data.registration_code.encode("utf-8"), settings.REGISTRATION_CODE.encode("utf-8")
    )
    # Mismo error para email no autorizado y código incorrecto: no se revela cuál falla
    if not is_registration_allowed(session, email) or not code_ok:
        _record_failure(key, email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este email no está autorizado o el código de invitación no es correcto.",
        )

    user = session.exec(select(User).where(User.email == email)).first()
    if user and user.password_hash:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe una cuenta con este email.")

    if user is None:
        user = User(email=email, name=data.name or email.split("@")[0].capitalize())
    user.password_hash = hash_password(data.password)
    user.is_admin = user.is_admin or is_admin_email(email)
    session.add(user)
    session.commit()
    session.refresh(user)

    auth_limiter.reset(key)
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, session: Session = Depends(get_session)):
    email = data.email.lower()
    key = _limiter_key(request, email)
    _check_not_blocked(key, email)

    user = session.exec(select(User).where(User.email == email)).first()
    if not verify_password(data.password, user.password_hash if user else None) or user is None:
        _record_failure(key, email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
        )

    auth_limiter.reset(key)
    _grant_admin_if_configured(user, session)
    return _token_response(user)


@router.post("/dev-token", response_model=TokenResponse)
def dev_token(data: DevTokenRequest, session: Session = Depends(get_session)):
    """
    SOLO DESARROLLO Y TESTS: entra como cualquier email sin contraseña.
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    email = data.email.lower()
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        user = User(email=email, name=email.split("@")[0].capitalize())
        session.add(user)
        session.commit()
        session.refresh(user)

    _grant_admin_if_configured(user, session)
    return _token_response(user)


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
def update_me(
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


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: PasswordChange,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Cambia la contraseña conociendo la actual: una sesión abierta en otro equipo no basta."""
    key = _limiter_key(request, current_user.email)
    _check_not_blocked(key, current_user.email)

    if not verify_password(data.current_password, current_user.password_hash):
        _record_failure(key, current_user.email)
        # 400 y no 401: la sesión es válida, lo que falla es la contraseña escrita
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La contraseña actual no es correcta.")
    if data.new_password == data.current_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La nueva contraseña debe ser distinta de la actual.")

    current_user.password_hash = hash_password(data.new_password)
    session.add(current_user)
    session.commit()
    auth_limiter.reset(key)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Borra la cuenta y, en cascada, sus compras, ofertas y comparativas."""
    session.delete(current_user)
    session.commit()
