import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from sqlalchemy import ForeignKey
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg

if TYPE_CHECKING:
    from app.models.comparison import Comparison
    from app.models.vehicle import Vehicle


class LeasingOffer(SQLModel, table=True):
    __tablename__ = "leasing_offers"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(pg.UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    vehicle_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True),
    )

    source_name: str = Field(sa_column=Column(pg.VARCHAR(200), nullable=False), description="Nombre del concesionario/banco")
    down_payment: Decimal = Field(sa_column=Column(pg.NUMERIC(12, 2), nullable=False), description="Entrada inicial")
    tin: Decimal = Field(sa_column=Column(pg.NUMERIC(5, 2), nullable=False), description="TIN % nominal anual")
    tae: Decimal = Field(sa_column=Column(pg.NUMERIC(5, 2), nullable=False), description="TAE % equivalente anual")
    months: int = Field(sa_column=Column(pg.INTEGER, nullable=False), description="Plazo en meses")
    monthly_payment: Decimal = Field(sa_column=Column(pg.NUMERIC(12, 2), nullable=False), description="Cuota mensual")

    opening_fee: Decimal = Field(default=Decimal("0"), sa_column=Column(pg.NUMERIC(12, 2), nullable=False, default=0), description="Comisión de apertura")
    opening_fee_percent: Decimal = Field(default=Decimal("0"), sa_column=Column(pg.NUMERIC(5, 2), nullable=False, default=0), description="Comisión apertura %")
    early_repayment_fee_percent: Decimal = Field(default=Decimal("0"), sa_column=Column(pg.NUMERIC(5, 2), nullable=False, default=0), description="Comisión amortización anticipada %")
    mandatory_insurance_year: Decimal = Field(default=Decimal("0"), sa_column=Column(pg.NUMERIC(12, 2), nullable=False, default=0), description="Seguro obligatorio anual")

    residual_value: Optional[Decimal] = Field(default=None, sa_column=Column(pg.NUMERIC(12, 2), nullable=True), description="Valor residual al final del contrato")
    residual_value_percent: Optional[Decimal] = Field(default=None, sa_column=Column(pg.NUMERIC(5, 2), nullable=True), description="Valor residual % sobre precio")

    notes: Optional[str] = Field(default=None, sa_column=Column(pg.TEXT, nullable=True))
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )

    vehicle: "Vehicle" = Relationship(back_populates="leasing_offers")
    comparisons: list["Comparison"] = Relationship(
        back_populates="leasing_offer",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
