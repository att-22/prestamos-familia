import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, TypeAdapter, field_validator

_DOMAIN = re.compile(r"^@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$")
_EMAIL = TypeAdapter(EmailStr)


class AllowedEmailCreate(BaseModel):
    entry: str = Field(..., max_length=255, description="Email, o dominio entero como '@ejemplo.org'")

    @field_validator("entry")
    @classmethod
    def normalize(cls, value: str) -> str:
        value = value.strip().lower()
        if value.startswith("@"):
            if not _DOMAIN.match(value):
                raise ValueError("Dominio inválido. Ejemplo: @ejemplo.org")
            return value
        try:
            return _EMAIL.validate_python(value).lower()
        except ValueError:
            raise ValueError("Escribe un email válido o un dominio como @ejemplo.org") from None


class AllowedEmailRead(BaseModel):
    # Las entradas que vienen de la configuración (ALLOWED_EMAILS, ADMIN_EMAIL) no tienen id ni se pueden borrar
    id: UUID | None
    entry: str
    source: Literal["admin", "config"]
    is_domain: bool
    # Solo tiene sentido para emails concretos: si esa persona ya creó su cuenta
    registered: bool
    created_at: datetime | None


class AdminSettings(BaseModel):
    registration_code: str | None
    admin_email: str | None


class AdminUserRead(BaseModel):
    id: UUID
    email: str
    name: str | None
    is_admin: bool
    # False tras restablecer la contraseña, hasta que la persona vuelve a crear su cuenta
    has_password: bool
    created_at: datetime
