from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.core.security import MAX_PASSWORD_BYTES

MIN_PASSWORD_LENGTH = 10


class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_admin: bool = False
    created_at: datetime
    updated_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=MIN_PASSWORD_LENGTH)
    name: Optional[str] = Field(None, max_length=100)
    registration_code: str = ""

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError(f"La contraseña no puede superar los {MAX_PASSWORD_BYTES} bytes")
        return value


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=MIN_PASSWORD_LENGTH)

    @field_validator("new_password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError(f"La contraseña no puede superar los {MAX_PASSWORD_BYTES} bytes")
        return value


class DevTokenRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
