from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum


class AlertType(str, Enum):
    WARNING = "warning"
    INFO = "info"
    SUCCESS = "success"
    ERROR = "error"


class Alert(BaseModel):
    type: AlertType
    message: str
    code: str


class ComparisonBase(BaseModel):
    vehicle_id: UUID
    leasing_offer_id: UUID
    user_monthly_income: Optional[Decimal] = Field(None, ge=0)
    user_available_savings: Optional[Decimal] = Field(None, ge=0)


class ComparisonCreate(ComparisonBase):
    pass


class ComparisonResult(BaseModel):
    """Resultado completo del cálculo para mostrar en frontend"""
    # Inputs
    price_cash: Decimal
    down_payment: Decimal
    tin: Decimal
    tae: Decimal
    months: int
    monthly_payment: Decimal
    opening_fee: Decimal
    early_repayment_fee_percent: Decimal
    mandatory_insurance_year: Decimal
    residual_value: Optional[Decimal] = None

    # Calculados
    financed_amount: Decimal
    total_payments: Decimal
    total_insurance: Decimal
    total_fees: Decimal
    total_leasing_cost: Decimal
    total_interest_fees: Decimal
    savings_vs_cash: Decimal
    effective_annual_rate: Decimal

    # Contexto usuario
    monthly_income_percent: Optional[Decimal] = None
    savings_after_down_payment: Optional[Decimal] = None

    # Alertas
    alerts: List[Alert]


class ComparisonRead(BaseModel):
    id: UUID
    user_id: UUID
    vehicle_id: UUID
    leasing_offer_id: UUID
    vehicle_name: Optional[str] = None
    source_name: Optional[str] = None
    total_leasing_cost: Decimal
    total_interest_fees: Decimal
    savings_vs_cash: Decimal
    monthly_income_percent: Optional[Decimal]
    user_monthly_income: Optional[Decimal] = None
    user_available_savings: Optional[Decimal] = None
    alerts_json: List[dict]
    shared_slug: str
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComparisonPublic(BaseModel):
    """Vista pública para link compartido /c/{slug}"""
    vehicle_name: str
    price_cash: Decimal
    source_name: str
    down_payment: Decimal
    tin: Decimal
    tae: Decimal
    months: int
    monthly_payment: Decimal
    total_leasing_cost: Decimal
    total_interest_fees: Decimal
    savings_vs_cash: Decimal
    alerts: List[Alert]
    created_at: datetime
