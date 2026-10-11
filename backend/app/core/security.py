from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from pydantic import BaseModel
from app.core.config import get_settings

settings = get_settings()


class TokenData(BaseModel):
    user_id: str
    email: str
    exp: datetime


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(to_encode, settings.SUPABASE_JWT_SECRET, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        exp_timestamp: int = payload.get("exp")
        if user_id is None or email is None:
            return None
        return TokenData(
            user_id=user_id,
            email=email,
            exp=datetime.fromtimestamp(exp_timestamp, tz=timezone.utc),
        )
    except JWTError:
        return None
