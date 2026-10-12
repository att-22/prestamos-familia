from sqlmodel import Session, select

from app.core.config import get_settings
from app.models.allowed_email import AllowedEmail

settings = get_settings()


def matches(entry: str, email: str) -> bool:
    """Una entrada autoriza un email si es ese email o su dominio ("@ejemplo.org")."""
    return entry == email or (entry.startswith("@") and email.endswith(entry))


def is_admin_email(email: str) -> bool:
    return bool(settings.ADMIN_EMAIL) and email.lower() == settings.ADMIN_EMAIL


def is_registration_allowed(session: Session, email: str) -> bool:
    """Puede registrarse el administrador, lo que diga ALLOWED_EMAILS y lo que añada el administrador."""
    email = email.lower()
    if is_admin_email(email) or settings.is_email_allowed(email):
        return True
    entries = session.exec(select(AllowedEmail.entry)).all()
    return any(matches(entry, email) for entry in entries)
