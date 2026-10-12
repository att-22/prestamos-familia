from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, col, select

from app.api.deps import get_current_admin
from app.core.config import get_settings
from app.core.database import get_session
from app.models.allowed_email import AllowedEmail
from app.models.user import User
from app.schemas.admin import AdminSettings, AllowedEmailCreate, AllowedEmailRead

# Todo el router exige ser administrador
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])
settings = get_settings()


def _registered_emails(session: Session) -> set[str]:
    return set(session.exec(select(User.email).where(col(User.password_hash).is_not(None))).all())


@router.get("/settings", response_model=AdminSettings)
async def get_admin_settings():
    """Lo que el administrador necesita para invitar a alguien."""
    return AdminSettings(
        registration_code=settings.REGISTRATION_CODE or None,
        admin_email=settings.ADMIN_EMAIL or None,
    )


@router.get("/allowed-emails", response_model=List[AllowedEmailRead])
async def list_allowed_emails(session: Session = Depends(get_session)):
    registered = _registered_emails(session)

    def read(entry: str, source: str, row: AllowedEmail | None = None) -> AllowedEmailRead:
        return AllowedEmailRead(
            id=row.id if row else None,
            entry=entry,
            source=source,  # type: ignore[arg-type]
            is_domain=entry.startswith("@"),
            registered=entry in registered,
            created_at=row.created_at if row else None,
        )

    config_entries = list(dict.fromkeys(
        ([settings.ADMIN_EMAIL] if settings.ADMIN_EMAIL else []) + list(settings.ALLOWED_EMAILS)
    ))
    rows = session.exec(select(AllowedEmail).order_by(col(AllowedEmail.created_at).desc())).all()

    return [read(row.entry, "admin", row) for row in rows] + [read(entry, "config") for entry in config_entries]


@router.post("/allowed-emails", response_model=AllowedEmailRead, status_code=status.HTTP_201_CREATED)
async def add_allowed_email(data: AllowedEmailCreate, session: Session = Depends(get_session)):
    already_there = (
        data.entry == settings.ADMIN_EMAIL
        or data.entry in settings.ALLOWED_EMAILS
        or session.exec(select(AllowedEmail).where(AllowedEmail.entry == data.entry)).first() is not None
    )
    if already_there:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese email o dominio ya está autorizado.")

    row = AllowedEmail(entry=data.entry)
    session.add(row)
    session.commit()
    session.refresh(row)
    return AllowedEmailRead(
        id=row.id,
        entry=row.entry,
        source="admin",
        is_domain=row.entry.startswith("@"),
        registered=row.entry in _registered_emails(session),
        created_at=row.created_at,
    )


@router.delete("/allowed-emails/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_allowed_email(entry_id: UUID, session: Session = Depends(get_session)):
    """Impide nuevos registros con esa entrada. Las cuentas ya creadas no se tocan."""
    row = session.get(AllowedEmail, entry_id)
    if not row:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    session.delete(row)
    session.commit()
