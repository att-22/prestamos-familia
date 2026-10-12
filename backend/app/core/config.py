from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _split_csv(value: str | list[str]) -> list[str]:
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str

    # Auth
    JWT_SECRET: str
    # Quién puede crear una cuenta: emails exactos o dominios enteros ("@familia.com")
    ALLOWED_EMAILS: str | list[str] = ""
    # Código que hay que conocer para registrarse. Sin verificación por correo,
    # es lo que impide que un extraño se adelante y ocupe un email autorizado.
    REGISTRATION_CODE: str = ""
    # Email de quien administra la app: siempre puede registrarse y, al hacerlo,
    # obtiene acceso a la vista de administración.
    ADMIN_EMAIL: str = ""

    # App
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str | list[str] = "http://localhost:5173"

    # Security
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    @field_validator("DATABASE_URL")
    @classmethod
    def use_psycopg_driver(cls, v: str) -> str:
        # Los proveedores entregan postgres:// o postgresql://. Se fija el driver para no
        # depender del que SQLAlchemy elija por defecto, que cambió entre la 2.0 y la 2.1.
        for scheme in ("postgres://", "postgresql://"):
            if v.startswith(scheme):
                return "postgresql+psycopg://" + v[len(scheme):]
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        return _split_csv(v)

    @field_validator("ALLOWED_EMAILS", mode="before")
    @classmethod
    def parse_allowed_emails(cls, v: str | list[str]) -> list[str]:
        return [entry.lower() for entry in _split_csv(v)]

    @field_validator("ADMIN_EMAIL", mode="before")
    @classmethod
    def normalize_admin_email(cls, v: str) -> str:
        return v.strip().lower()

    @model_validator(mode="after")
    def require_safe_production_settings(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            if len(self.JWT_SECRET) < 32:
                raise ValueError("JWT_SECRET must be at least 32 characters in production")
            if not self.REGISTRATION_CODE:
                raise ValueError("REGISTRATION_CODE is required in production")
        return self

    def is_email_allowed(self, email: str) -> bool:
        email = email.lower()
        for entry in self.ALLOWED_EMAILS:
            if entry == email or (entry.startswith("@") and email.endswith(entry)):
                return True
        return False


@lru_cache
def get_settings() -> Settings:
    return Settings()
