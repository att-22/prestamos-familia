from decimal import Decimal

from app.services.calculations import (
    CalculationInput,
    calculate_effective_tae,
    calculate_leasing_comparison,
)


def make_input(**overrides) -> CalculationInput:
    # 20.000€ financiados al 6,5% TIN a 60 meses -> cuota francesa de 391,32€
    data = dict(
        price_cash=Decimal("25000"),
        down_payment=Decimal("5000"),
        tin=Decimal("6.5"),
        tae=Decimal("6.7"),
        months=60,
        monthly_payment=Decimal("391.32"),
    )
    data.update(overrides)
    return CalculationInput(**data)


def test_totals_without_fees():
    result = calculate_leasing_comparison(make_input())

    assert result.financed_amount == Decimal("20000.00")
    assert result.total_payments == Decimal("23479.20")
    assert result.total_insurance == Decimal("0.00")
    assert result.total_fees == Decimal("0.00")
    assert result.total_leasing_cost == Decimal("28479.20")
    assert result.total_interest_fees == Decimal("3479.20")
    assert result.savings_vs_cash == Decimal("-3479.20")


def test_fees_and_insurance_are_added_to_total():
    result = calculate_leasing_comparison(
        make_input(
            opening_fee=Decimal("100"),
            opening_fee_percent=Decimal("1.5"),
            mandatory_insurance_year=Decimal("300"),
        )
    )

    assert result.total_fees == Decimal("400.00")  # 100 + 1,5% de 20.000
    assert result.total_insurance == Decimal("1500.00")  # 300€/año x 5 años
    assert result.total_leasing_cost == Decimal("30379.20")


def test_effective_tae_matches_tin_without_fees():
    # TIN 6,5% con pagos mensuales equivale a TAE (1 + 0,065/12)^12 - 1 = 6,70%
    rate = calculate_effective_tae(Decimal("20000"), Decimal("391.32"), 60)
    assert abs(rate - Decimal("6.70")) <= Decimal("0.02")


def test_opening_fee_increases_effective_tae():
    without_fee = calculate_effective_tae(Decimal("20000"), Decimal("391.32"), 60)
    with_fee = calculate_effective_tae(Decimal("20000"), Decimal("391.32"), 60, opening_fee=Decimal("300"))
    assert with_fee > without_fee


def test_zero_interest_loan_has_zero_effective_tae():
    rate = calculate_effective_tae(Decimal("12000"), Decimal("200"), 60)
    assert rate == Decimal("0.00")


def test_user_context():
    result = calculate_leasing_comparison(
        make_input(),
        user_monthly_income=Decimal("2000"),
        user_available_savings=Decimal("6000"),
    )

    assert result.monthly_income_percent == Decimal("19.57")
    assert result.savings_after_down_payment == Decimal("1000.00")


def test_user_context_is_optional():
    result = calculate_leasing_comparison(make_input())

    assert result.monthly_income_percent is None
    assert result.savings_after_down_payment is None
