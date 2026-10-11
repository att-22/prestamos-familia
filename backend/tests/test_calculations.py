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


# Oferta "multiopción": 20.000€ financiados al 6,5% TIN, 48 cuotas de 291,32€ y 10.000€ al final
BALLOON = dict(months=48, monthly_payment=Decimal("291.32"))


def test_residual_value_is_part_of_the_total_cost():
    result = calculate_leasing_comparison(make_input(**BALLOON, residual_value=Decimal("10000")))

    assert result.residual_value == Decimal("10000.00")
    assert result.total_payments == Decimal("13983.36")
    assert result.total_leasing_cost == Decimal("28983.36")  # 5.000 + 13.983,36 + 10.000
    assert result.savings_vs_cash == Decimal("-3983.36")


def test_residual_value_can_be_given_as_percent_of_price():
    result = calculate_leasing_comparison(make_input(**BALLOON, residual_value_percent=Decimal("40")))

    assert result.residual_value == Decimal("10000.00")
    assert result.total_leasing_cost == Decimal("28983.36")


def test_residual_amount_wins_over_percent():
    result = calculate_leasing_comparison(
        make_input(**BALLOON, residual_value=Decimal("9000"), residual_value_percent=Decimal("40"))
    )

    assert result.residual_value == Decimal("9000.00")


def test_effective_tae_accounts_for_residual_value():
    result = calculate_leasing_comparison(make_input(**BALLOON, residual_value=Decimal("10000")))
    assert abs(result.effective_annual_rate - Decimal("6.70")) <= Decimal("0.02")

    # Sin contar la cuota final, las cuotas no cubren ni el capital: saldría un 0% engañoso
    ignoring_residual = calculate_effective_tae(Decimal("20000"), Decimal("291.32"), 48)
    assert ignoring_residual == Decimal("0.00")


def test_no_residual_value_is_reported_as_none():
    assert calculate_leasing_comparison(make_input()).residual_value is None
