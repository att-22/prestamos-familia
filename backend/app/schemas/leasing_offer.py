from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional


class LeasingOfferBase(BaseModel):
    source_name: str = Field(..., min_length=1, max_length=200, description="Concesionario/Banco")
    down_payment: Decimal = Field(..., ge=0, max_digits=12, decimal_places=2, description="Entrada inicial")
    tin: Decimal = Field(..., ge=0, le=100, max_digits=5, decimal_places=2, description="TIN % anual")
    tae: Decimal = Field(..., ge=0, le=100, max_digits=5, decimal_places=2, description="TAE % anual")
    months: int = Field(..., ge=1, le=120, description="Plazo en meses")
    monthly_payment: Decimal = Field(..., ge=0, max_digits=12, decimal_places=2, description="Cuota mensual")
    opening_fee: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    opening_fee_percent: Decimal = Field(default=Decimal("0"), ge=0, le=10, max_digits=5, decimal_places=2)
    early_repayment_fee_percent: Decimal = Field(default=Decimal("0"), ge=0, le=10, max_digits=5, decimal_places=2)
    mandatory_insurance_year: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    residual_value: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    residual_value_percent: Optional[Decimal] = Field(None, ge=0, le=100, max_digits=5, decimal_places=2)
    notes: Optional[str] = None


class LeasingOfferCreate(LeasingOfferBase):
    vehicle_id: UUID


class LeasingOfferUpdate(BaseModel):
    source_name: Optional[str] = Field(None, min_length=1, max_length=200)
    down_payment: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    tin: Optional[Decimal] = Field(None, ge=0, le=100, max_digits=5, decimal_places=2)
    tae: Optional[Decimal] = Field(None, ge=0, le=100, max_digits=5, decimal_places=2)
    months: Optional[int] = Field(None, ge=1, le=120)
    monthly_payment: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    opening_fee: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    opening_fee_percent: Optional[Decimal] = Field(None, ge=0, le=10, max_digits=5, decimal_places=2)
    early_repayment_fee_percent: Optional[Decimal] = Field(None, ge=0, le=10, max_digits=5, decimal_places=2)
    mandatory_insurance_year: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    residual_value: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    residual_value_percent: Optional[Decimal] = Field(None, ge=0, le=100, max_digits=5, decimal_places=2)
    notes: Optional[str] = None


class LeasingOfferRead(LeasingOfferBase):
    id: UUID
    vehicle_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
