from functools import lru_cache
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, model_validator


def _split_csv(value: Union[str, List[str]]) -> List[str]:
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
    ALLOWED_EMAILS: Union[str, List[str]] = ""
    # Código que hay que conocer para registrarse. Sin verificación por correo,
    # es lo que impide que un extraño se adelante y ocupe un email autorizado.
    REGISTRATION_CODE: str = ""

    # App
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173"

    # Security
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        return _split_csv(v)

    @field_validator("ALLOWED_EMAILS", mode="before")
    @classmethod
    def parse_allowed_emails(cls, v: Union[str, List[str]]) -> List[str]:
        return [entry.lower() for entry in _split_csv(v)]

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
