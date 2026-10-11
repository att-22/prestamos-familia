import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy.dialects.postgresql as pg


class Comparison(SQLModel, table=True):
    __tablename__ = "comparisons"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(pg.UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID(as_uuid=True), nullable=False, index=True),
        foreign_key="users.id",
    )
    vehicle_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID(as_uuid=True), nullable=False, index=True),
        foreign_key="vehicles.id",
    )
    leasing_offer_id: uuid.UUID = Field(
        sa_column=Column(pg.UUID(as_uuid=True), nullable=False, index=True),
        foreign_key="leasing_offers.id",
    )

    # Resultados calculados (snapshot inmutable)
    total_leasing_cost: Decimal = Field(sa_column=Column(pg.NUMERIC(12, 2), nullable=False), description="Total pagado en leasing (entradas + cuotas + comisiones + seguros)")
    total_interest_fees: Decimal = Field(sa_column=Column(pg.NUMERIC(12, 2), nullable=False), description="Total intereses + comisiones + seguros")
    savings_vs_cash: Decimal = Field(sa_column=Column(pg.NUMERIC(12, 2), nullable=False), description="Ahorro pagando al contado (negativo = leasing más barato)")
    monthly_income_percent: Optional[Decimal] = Field(default=None, sa_column=Column(pg.NUMERIC(5, 2), nullable=True), description="% de ingresos que supone la cuota")

    # Alertas y consejos (JSON)
    alerts_json: list[dict] = Field(
        default=[],
        sa_column=Column(pg.JSONB, nullable=False, default=[]),
        description="Lista de alertas: [{type: 'warning'|'info'|'success', 'message': '...', 'code': '...'}]",
    )

    # Compartir
    shared_slug: str = Field(sa_column=Column(pg.VARCHAR(50), unique=Tr
