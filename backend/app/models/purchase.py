import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from sqlalchemy import ForeignKey
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg

if TYPE_CHECKING:
    from app.models.comparison import Comparison
    from app.models.financing_offer import FinancingOffer


class Purchase(SQLModel, table=True):
    __tablename__ = "purchases"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(pg.UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    name: str = Field(sa_column=Column(pg.VARCHAR(200), nullable=False))
    price_cash: Decimal = Field(
        sa_column=Column(pg.NUMERIC(12, 2), nullable=False),
        description="Precio al contado",
    )
    category: str = Field(default="other", sa_column=Column(pg.VARCHAR(20), nullable=False, default="other"))
    # Detalles opcionales, pensados para la categoría "vehicle"
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
    financing_offers: list["FinancingOffer"] = Relationship(
        back_populates="purchase",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    comparisons: list["Comparison"] = Relationship(
        back_populates="purchase",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
