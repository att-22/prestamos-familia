from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FinancingOfferBase(BaseModel):
    source_name: str = Field(..., min_length=1, max_length=200, description="Concesionario/Banco")
    down_payment: Decimal = Field(..., ge=0, description="Entrada inicial")
    tin: Decimal = Field(..., ge=0, le=100, description="TIN % anual")
    tae: Decimal = Field(..., ge=0, le=100, description="TAE % anual")
    months: int = Field(..., ge=1, le=120, description="Plazo en meses")
    monthly_payment: Decimal = Field(..., ge=0, description="Cuota mensual")
    opening_fee: Decimal = Field(default=Decimal("0"), ge=0)
    opening_fee_percent: Decimal = Field(default=Decimal("0"), ge=0, le=10)
    early_repayment_fee_percent: Decimal = Field(default=Decimal("0"), ge=0, le=10)
    mandatory_insurance_year: Decimal = Field(default=Decimal("0"), ge=0)
    residual_value: Decimal | None = Field(None, ge=0)
    residual_value_percent: Decimal | None = Field(None, ge=0, le=100)
    notes: str | None = None


class FinancingOfferCreate(FinancingOfferBase):
    purchase_id: UUID


class FinancingOfferUpdate(BaseModel):
    source_name: str | None = Field(None, min_length=1, max_length=200)
    down_payment: Decimal | None = Field(None, ge=0)
    tin: Decimal | None = Field(None, ge=0, le=100)
    tae: Decimal | None = Field(None, ge=0, le=100)
    months: int | None = Field(None, ge=1, le=120)
    monthly_payment: Decimal | None = Field(None, ge=0)
    opening_fee: Decimal | None = Field(None, ge=0)
    opening_fee_percent: Decimal | None = Field(None, ge=0, le=10)
    early_repayment_fee_percent: Decimal | None = Field(None, ge=0, le=10)
    mandatory_insurance_year: Decimal | None = Field(None, ge=0)
    residual_value: Decimal | None = Field(None, ge=0)
    residual_value_percent: Decimal | None = Field(None, ge=0, le=100)
    notes: str | None = None


class FinancingOfferRead(FinancingOfferBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    purchase_id: UUID
    created_at: datetime
    updated_at: datetime
