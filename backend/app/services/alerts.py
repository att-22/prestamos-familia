from dataclasses import dataclass
from decimal import Decimal
from typing import List, Optional
from enum import Enum


class AlertType(str, Enum):
    WARNING = "warning"
    INFO = "info"
    SUCCESS = "success"
    ERROR = "error"


@dataclass
class Alert:
    type: AlertType
    message: str
    code: str


def generate_alerts(
    price_cash: Decimal,
    down_payment: Decimal,
    tin: Decimal,
    tae: Decimal,
    months: int,
    monthly_payment: Decimal,
    opening_fee_percent: Decimal,
    early_repayment_fee_percent: Decimal,
    mandatory_insurance_year: Decimal,
    total_interest_fees: Decimal,
    savings_vs_cash: Decimal,
    effective_annual_rate: Decimal,
    monthly_income_percent: Optional[Decimal] = None,
    savings_after_down_payment: Optional[Decimal] = None,
    user_available_savings: Optional[Decimal] = None,
) -> List[Alert]:
    """Genera alertas y consejos basados en regl
