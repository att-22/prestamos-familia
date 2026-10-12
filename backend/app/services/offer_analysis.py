from app.models.financing_offer import FinancingOffer
from app.models.purchase import Purchase
from app.services.calculations import CalculationInput


def to_calculation_input(purchase: Purchase, offer: FinancingOffer) -> CalculationInput:
    return CalculationInput(
        price_cash=purchase.price_cash,
        down_payment=offer.down_payment,
        tin=offer.tin,
        tae=offer.tae,
        months=offer.months,
        monthly_payment=offer.monthly_payment,
        opening_fee=offer.opening_fee,
        opening_fee_percent=offer.opening_fee_percent,
        early_repayment_fee_percent=offer.early_repayment_fee_percent,
        mandatory_insurance_year=offer.mandatory_insurance_year,
        residual_value=offer.residual_value,
        residual_value_percent=offer.residual_value_percent,
    )
