import uuid
from datetime import datetime
from sqlmodel import SQLModel, Field, Column
import sqlalchemy.dialects.postgresql as pg


class AllowedEmail(SQLModel, table=True):
    """Email o dominio ("@ejemplo.org") al que el administrador permite registrarse."""

    __tablename__ = "allowed_emails"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(pg.UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    # Siempre en minúsculas
    entry: str = Field(sa_column=Column(pg.VARCHAR(255), unique=True, index=True, nullable=False))
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )
