import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from sqlalchemy import ForeignKey
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg

if TYPE_CHECKING:
    from app.models.leasing_offer import LeasingOffer
    from app.models.vehicle import Vehicle


class Comparison(SQLModel, table=True):
    __tablename__ = "comparisons"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(pg.UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    vehicle_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    leasing_offer_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID(as_uuid=True), ForeignKey("leasing_offers.id", ondelete="CASCADE"), nullable=False, index=True),
    )

    total_leasing_cost: Decimal = Field(sa_column=Column(pg.NUMERIC(12, 2), nullable=False), description="Total pagado en leasing (entradas + cuotas + comisiones + seguros)")
    total_interest_fees: Decimal = Field(sa_column=Column(pg.NUMERIC(12, 2), nullable=False), description="Total intereses + comisiones + seguros")
    savings_vs_cash: Decimal = Field(sa_column=Column(pg.NUMERIC(12, 2), nullable=False), description="Precio contado - coste leasing (negativo = leasing más caro)")
    monthly_income_percent: Optional[Decimal] = Field(default=None, sa_column=Column(pg.NUMERIC(5, 2), nullable=True), description="% de ingresos que supone la cuota")

    alerts_json: list[dict] = Field(
        default=[],
        sa_column=Column(pg.JSONB, nullable=False, default=[]),
        description="Lista de alertas: [{type: 'warning'|'info'|'success', 'message': '...', 'code': '...'}]",
    )

    shared_slug: str = Field(sa_column=Column(pg.VARCHAR(50), unique=True, index=True, nullable=False))
    is_public: bool = Field(default=True, sa_column=Column(pg.BOOLEAN, nullable=False, default=True))

    user_monthly_income: Optional[Decimal] = Field(default=None, sa_column=Column(pg.NUMERIC(12, 2), nullable=True))
    user_available_savings: Optional[Decimal] = Field(default=None, sa_column=Column(pg.NUMERIC(12, 2), nullable=True))

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )

    vehicle: "Vehicle" = Relationship(back_populates="comparisons")
    leasing_offer: "LeasingOffer" = Relationship(back_populates="comparisons")

    @property
    def vehicle_name(self) -> Optional[str]:
        return self.vehicle.name if self.vehicle else None

    @property
    def source_name(self) -> Optional[str]:
        return self.leasing_offer.source_name if self.leasing_offer else None
