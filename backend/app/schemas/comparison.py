from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AlertType(StrEnum):
    WARNING = "warning"
    INFO = "info"
    SUCCESS = "success"
    ERROR = "error"


class AlertParam(BaseModel):
    value: str
    kind: Literal["percent", "currency", "number"]


class Alert(BaseModel):
    type: AlertType
    # Texto con marcadores como "{tae}", que se sustituyen por params ya formateados
    message: str
    code: str
    # Vacío en las comparativas guardadas antes de separar las cifras del texto
    params: dict[str, AlertParam] = {}


class ComparisonBase(BaseModel):
    purchase_id: UUID
    financing_offer_id: UUID
    user_monthly_income: Decimal | None = Field(None, ge=0)
    user_available_savings: Decimal | None = Field(None, ge=0)


class ComparisonCreate(ComparisonBase):
    pass


class AmortizationRow(BaseModel):
    month: int
    payment: Decimal
    interest: Decimal
    principal: Decimal
    balance: Decimal


class Amortization(BaseModel):
    # % nominal anual que resulta de las cuotas (puede no coincidir con el TIN declarado)
    annual_rate: Decimal
    total_interest: Decimal
    rows: list[AmortizationRow]


class ScenarioRequest(BaseModel):
    """La misma oferta con otra entrada y otro plazo"""
    purchase_id: UUID
    financing_offer_id: UUID
    down_payment: Decimal = Field(..., ge=0)
    months: int = Field(..., ge=1, le=120)


class ScenarioResult(BaseModel):
    down_payment: Decimal
    months: int
    monthly_payment: Decimal
    total_financing_cost: Decimal
    total_interest_fees: Decimal
    # % nominal anual de la oferta, que la simulación mantiene
    annual_rate: Decimal


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
    residual_value: Decimal | None = None

    # Calculados
    financed_amount: Decimal
    total_payments: Decimal
    total_insurance: Decimal
    total_fees: Decimal
    total_financing_cost: Decimal
    total_interest_fees: Decimal
    savings_vs_cash: Decimal
    effective_annual_rate: Decimal

    # Contexto usuario
    monthly_income_percent: Decimal | None = None
    savings_after_down_payment: Decimal | None = None

    # Alertas
    alerts: list[Alert]

    amortization: Amortization


class ComparisonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    purchase_id: UUID
    financing_offer_id: UUID
    purchase_name: str | None = None
    source_name: str | None = None
    total_financing_cost: Decimal
    total_interest_fees: Decimal
    savings_vs_cash: Decimal
    monthly_income_percent: Decimal | None
    user_monthly_income: Decimal | None = None
    user_available_savings: Decimal | None = None
    alerts_json: list[dict]
    shared_slug: str
    is_public: bool
    created_at: datetime
    updated_at: datetime


class ComparisonPublic(BaseModel):
    """Vista pública para link compartido /c/{slug}"""
    purchase_name: str
    price_cash: Decimal
    source_name: str
    down_payment: Decimal
    tin: Decimal
    tae: Decimal
    months: int
    monthly_payment: Decimal
    residual_value: Decimal | None = None
    total_financing_cost: Decimal
    total_interest_fees: Decimal
    savings_vs_cash: Decimal
    alerts: list[Alert]
    created_at: datetime


class OfferSummary(BaseModel):
    """Una oferta dentro de la comparativa de todas las de una compra"""
    offer_id: UUID
    source_name: str
    down_payment: Decimal
    monthly_payment: Decimal
    months: int
    tin: Decimal
    tae: Decimal
    effective_annual_rate: Decimal
    residual_value: Decimal | None = None
    total_payments: Decimal
    total_financing_cost: Decimal
    # Lo que cuesta de más frente al contado (negativo si financiar sale más barato)
    total_interest_fees: Decimal
    is_cheapest: bool
    has_lowest_payment: bool


class OfferRanking(BaseModel):
    purchase_id: UUID
    price_cash: Decimal
    # De la más barata a la más cara
    offers: list[OfferSummary]
