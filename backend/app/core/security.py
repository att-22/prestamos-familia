from datetime import UTC, datetime, timedelta

import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()

# bcrypt ignora todo lo que pase de 72 bytes; se rechaza antes para no aceptar
# en silencio contraseñas que solo difieren a partir de ahí.
MAX_PASSWORD_BYTES = 72

# Hash con el que comparar cuando el usuario no existe, para que un login
# fallido tarde lo mismo exista o no la cuenta.
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password", bcrypt.gensalt())


class TokenData(BaseModel):
    user_id: str
    email: str
    exp: datetime


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str | None) -> bool:
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        return False
    if password_hash is None:
        bcrypt.checkpw(encoded, _DUMMY_HASH)
        return False
    return bcrypt.checkpw(encoded, password_hash.encode("ascii"))


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> TokenData | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        exp_timestamp: int = payload.get("exp")
        if user_id is None or email is None:
            return None
        return TokenData(
            user_id=user_id,
            email=email,
            exp=datetime.fromtimestamp(exp_timestamp, tz=UTC),
        )
    except JWTError:
        return None
