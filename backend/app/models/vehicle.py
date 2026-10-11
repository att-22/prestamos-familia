import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg


class Vehicle(SQLModel, table=True):
    __tablename__ = "vehicles"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(pg.UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID(as_uuid=True), nullable=False, index=True),
        foreign_key="users.id",
    )
    name: str = Field(sa_column=Column(pg.VARCHAR(200), nullable=False))
    price_cash: Decimal = Field(
        sa_column=Column(pg.NUMERIC(12, 2), nullable=False),
        description="Precio al contado del vehículo",
    )
    brand: Optional[str] = Field(default=None, sa_column=Column(pg.VARCHAR(100), nullable=True))
    model: Optional[str] = Field(default=None, sa_column=Column(pg.VARCHAR(100), nullable=True))
    year: Optional[int] = Field(default=None, sa_column=Column(pg.INTEGER, nullable=True))
    is_used: bool = Field(default=False, sa_column=Column(pg.BOOLEAN, nullable=False, default=False))
    notes: Optional[str] = Field(default=None, sa_column=Column(pg.TEXT, nullable=True))
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )

    # Relationships
    leasing_offers: list["LeasingOffer"] = Relationship(back_populates="vehicle")
    comparisons: list["Comparison"] = Relationship(back_populates="vehicle")
