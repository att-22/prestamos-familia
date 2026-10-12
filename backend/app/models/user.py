import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
import sqlalchemy.dialects.postgresql as pg


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(pg.UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    email: str = Field(sa_column=Column(pg.VARCHAR(255), unique=True, index=True, nullable=False))
    name: Optional[str] = Field(default=None, sa_column=Column(pg.VARCHAR(100), nullable=True))
    # Hash bcrypt. Vacío en los usuarios de desarrollo creados con /auth/dev-token,
    # que no pueden iniciar sesión con contraseña.
    password_hash: Optional[str] = Field(default=None, sa_column=Column(pg.VARCHAR(255), nullable=True))
    is_admin: bool = Field(default=False, sa_column=Column(pg.BOOLEAN, nullable=False, default=False))
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )
