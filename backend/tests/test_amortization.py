from decimal import Decimal

import pytest

from app.services.amortization import build_schedule, implied_monthly_rate, payment_for, simulate
from app.services.calculations import CalculationInput

# 20.000 € al 6,5 % TIN a 60 meses -> cuota francesa de 391,32 €
LOAN = dict(principal=Decimal("20000"), monthly_payment=Decimal("391.32"), months=60)


def test_implied_rate_recovers_the_nominal_rate_of_the_loan():
    schedule = build_schedule(**LOAN)

    assert schedule.annual_rate == Decimal("6.50")


def test_schedule_splits_each_payment_and_ends_with_nothing_owed():
    schedule = build_schedule(**LOAN)
    first, last = schedule.rows[0], schedule.rows[-1]

    assert len(schedule.rows) == 60
    # 20.000 x 6,5 % / 12 = 108,33 de intereses el primer mes
    assert (first.interest, first.principal) == (Decimal("108.33"), Decimal("282.99"))
    assert first.balance == Decimal("19717.01")
    assert last.balance == Decimal("0.00")
    assert last.interest < Decimal("3")
    for row in schedule.rows:
        assert row.interest + row.principal == row.payment
    # Lo pagado de más sobre el capital son exactamente los intereses
    assert schedule.total_interest == Decimal("391.32") * 60 - Decimal("20000")


def test_interest_share_falls_over_time():
    interests = [row.interest for row in build_schedule(**LOAN).rows]

    assert interests == sorted(interests, reverse=True)


def test_balloon_payment_is_what_remains_owed_at_the_end():
    # Mismo capital a 48 meses dejando 10.000 € para el final
    schedule = build_schedule(Decimal("20000"), Decimal("291.32"), 48, residual=Decimal("10000"))

    assert schedule.rows[-1].balance == Decimal("10000.00")
    assert schedule.total_interest == Decimal("291.32") * 48 + Decimal("10000") - Decimal("20000")


def test_interest_free_financing_is_all_principal():
    schedule = build_schedule(Decimal("1299"), Decimal("108.25"), 12)

    assert schedule.annual_rate == Decimal("0.00")
    assert schedule.total_interest == Decimal("0.00")
    assert schedule.rows[-1].balance == Decimal("0.00")


def test_payment_for_is_the_inverse_of_the_implied_rate():
    rate = implied_monthly_rate(**LOAN)

    assert payment_for(Decimal("20000"), rate, 60) == Decimal("391.32")
    assert payment_for(Decimal("12000"), Decimal("0"), 24) == Decimal("500.00")


def make_input(**overrides) -> CalculationInput:
    data = dict(
        price_cash=Decimal("25000"), down_payment=Decimal("5000"), tin=Decimal("6.5"), tae=Decimal("6.7"),
        months=60, monthly_payment=Decimal("391.32"),
    )
    data.update(overrides)
    return CalculationInput(**data)


def test_simulating_the_same_conditions_changes_nothing():
    result, rate = simulate(make_input(), Decimal("5000"), 60)

    assert rate == Decimal("6.50")
    assert result.monthly_payment == Decimal("391.32")
    assert result.total_financing_cost == Decimal("28479.20")


def test_more_down_payment_and_a_shorter_term_cost_less_in_total():
    baseline, _ = simulate(make_input(), Decimal("5000"), 60)

    result, _ = simulate(make_input(), Decimal("10000"), 36)

    # 15.000 € al 6,5 % a 36 meses
    assert result.monthly_payment == Decimal("459.73")
    assert result.total_financing_cost == Decimal("10000") + Decimal("459.73") * 36
    assert result.total_financing_cost < baseline.total_financing_cost


def test_simulation_keeps_fees_insurance_and_balloon_of_the_offer():
    offer = make_input(
        months=48, monthly_payment=Decimal("291.32"), residual_value=Decimal("10000"),
        opening_fee_percent=Decimal("1"), mandatory_insurance_year=Decimal("120"),
    )

    result, _ = simulate(offer, Decimal("7000"), 24)

    assert result.residual_value == Decimal("10000.00")
    assert result.total_fees == Decimal("180.00")  # 1 % de 18.000
    assert result.total_insurance == Decimal("240.00")
    assert result.total_financing_cost == (
        Decimal("7000") + result.monthly_payment * 24 + Decimal("10000") + Decimal("180") + Decimal("240")
    )


@pytest.mark.parametrize("months", [1, 12, 120])
def test_simulated_payment_always_repays_the_loan(months):
    result, _ = simulate(make_input(), Decimal("5000"), months)

    schedule = build_schedule(Decimal("20000"), result.monthly_payment, months)
    assert abs(schedule.rows[-1].balance) < Decimal("0.01")
