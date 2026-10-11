from decimal import Decimal

from app.services.alerts import AlertType, generate_alerts


def alerts_for(**overrides):
    data = dict(
        price_cash=Decimal("25000"),
        down_payment=Decimal("5000"),
        tin=Decimal("4.5"),
        tae=Decimal("4.8"),
        months=60,
        monthly_payment=Decimal("372.86"),
        opening_fee_percent=Decimal("0"),
        early_repayment_fee_percent=Decimal("0"),
        mandatory_insurance_year=Decimal("0"),
        total_interest_fees=Decimal("2371.60"),
        savings_vs_cash=Decimal("-2371.60"),
        effective_annual_rate=Decimal("4.59"),
    )
    data.update(overrides)
    return {alert.code: alert for alert in generate_alerts(**data)}


def test_good_offer():
    alerts = alerts_for()

    assert alerts["TAE_GOOD"].type == AlertType.SUCCESS
    assert "NO_OPENING_FEE" in alerts
    assert "NO_EARLY_REPAYMENT_FEE" in alerts
    assert "TAE_TIN_GAP" not in alerts
    assert alerts["FINANCING_MORE_EXPENSIVE"].type == AlertType.WARNING


def test_expensive_offer():
    alerts = alerts_for(
        tin=Decimal("7"),
        tae=Decimal("9.5"),
        opening_fee_percent=Decimal("2"),
        early_repayment_fee_percent=Decimal("1"),
        months=84,
    )

    for code in ("TAE_HIGH", "TAE_TIN_GAP_HIGH", "OPENING_FEE_HIGH", "EARLY_REPAYMENT_FEE", "TERM_TOO_LONG"):
        assert alerts[code].type == AlertType.WARNING


def test_debt_ratio_thresholds():
    assert "DEBT_RATIO_LOW" in alerts_for(monthly_income_percent=Decimal("20"))
    assert "DEBT_RATIO_OK" in alerts_for(monthly_income_percent=Decimal("25"))
    assert "DEBT_RATIO_HIGH" in alerts_for(monthly_income_percent=Decimal("32"))
    assert alerts_for(monthly_income_percent=Decimal("40"))["DEBT_RATIO_CRITICAL"].type == AlertType.ERROR


def test_savings_alerts():
    def with_savings(remaining: str):
        return alerts_for(
            savings_after_down_payment=Decimal(remaining),
            user_available_savings=Decimal("5000") + Decimal(remaining),
        )

    assert with_savings("-1000")["DOWN_PAYMENT_EXCEEDS_SAVINGS"].type == AlertType.ERROR
    assert "LOW_EMERGENCY_FUND" in with_savings("1000")
    assert "HEALTHY_EMERGENCY_FUND" in with_savings("8000")


def test_no_user_context_means_no_personal_alerts():
    codes = alerts_for().keys()

    assert not any(code.startswith("DEBT_RATIO") for code in codes)
    assert "LOW_EMERGENCY_FUND" not in codes


def test_financing_cheaper_than_cash_is_not_reported_as_cash_saving():
    alerts = alerts_for(savings_vs_cash=Decimal("500"))

    assert "FINANCING_MORE_EXPENSIVE" not in alerts
    assert "Financiar" in alerts["SAVINGS_POSITIVE"].message


def test_effective_tae_higher_than_declared():
    assert "EFFECTIVE_TAE_HIGHER" in alerts_for(effective_annual_rate=Decimal("6.5"))
    assert "EFFECTIVE_TAE_HIGHER" not in alerts_for(effective_annual_rate=Decimal("5.0"))


def test_balloon_payment_alert():
    assert "BALLOON_PAYMENT" not in alerts_for()
    assert alerts_for(residual_value=Decimal("2500"))["BALLOON_PAYMENT"].type == AlertType.INFO

    big = alerts_for(residual_value=Decimal("10000"))["BALLOON_PAYMENT"]
    assert big.type == AlertType.WARNING
    assert "10000" in big.message and "40.0%" in big.message
