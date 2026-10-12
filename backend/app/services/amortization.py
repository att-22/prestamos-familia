"""Cuadro de amortización y simulación de otras condiciones para una oferta.

Todo parte del tipo de interés que resulta de las cuotas introducidas, no del TIN
declarado: así el cuadro siempre cuadra con lo que de verdad se paga, aunque el TIN
esté mal copiado o la entidad lo haya redondeado.
"""
from dataclasses import dataclass, replace
from decimal import Decimal
from typing import List

from app.services.calculations import (
    CalculationInput,
    CalculationResult,
    calculate_financing_comparison,
    resolve_residual_value,
    round_eur,
)

ZERO = Decimal("0")
ONE = Decimal("1")
MAX_MONTHLY_RATE = Decimal("0.05")  # ~80 % anual: por encima no hay financiación razonable


@dataclass
class ScheduleRow:
    month: int
    payment: Decimal
    interest: Decimal
    principal: Decimal
    balance: Decimal  # capital pendiente después de esta cuota


@dataclass
class Schedule:
    annual_rate: Decimal  # % nominal anual que resulta de las cuotas
    total_interest: Decimal
    rows: List[ScheduleRow]


def _present_value(monthly_payment: Decimal, months: int, residual: Decimal, rate: Decimal) -> Decimal:
    if rate == ZERO:
        return monthly_payment * months + residual
    discount = (ONE + rate) ** -months
    return monthly_payment * (ONE - discount) / rate + residual * discount


def implied_monthly_rate(principal: Decimal, monthly_payment: Decimal, months: int, residual: Decimal = ZERO) -> Decimal:
    """Tipo mensual que iguala lo financiado con el valor actual de las cuotas y la cuota final."""
    if principal <= ZERO or months <= 0 or _present_value(monthly_payment, months, residual, ZERO) <= principal:
        return ZERO

    low, high = ZERO, MAX_MONTHLY_RATE
    for _ in range(60):
        mid = (low + high) / 2
        if _present_value(monthly_payment, months, residual, mid) > principal:
            low = mid
        else:
            high = mid
    return (low + high) / 2


def payment_for(principal: Decimal, monthly_rate: Decimal, months: int, residual: Decimal = ZERO) -> Decimal:
    """Cuota (sistema francés) que amortiza el capital en ese plazo, dejando pendiente la cuota final."""
    if monthly_rate == ZERO:
        payment = (principal - residual) / months
    else:
        discount = (ONE + monthly_rate) ** -months
        payment = (principal - residual * discount) * monthly_rate / (ONE - discount)
    return round_eur(max(payment, ZERO))


def build_schedule(principal: Decimal, monthly_payment: Decimal, months: int, residual: Decimal = ZERO) -> Schedule:
    rate = implied_monthly_rate(principal, monthly_payment, months, residual)
    balance = principal
    rows: List[ScheduleRow] = []

    for month in range(1, months + 1):
        interest = round_eur(balance * rate)
        amortized = monthly_payment - interest
        if month == months and rate > ZERO:
            # La última cuota absorbe los céntimos del redondeo: queda pendiente justo la cuota final
            amortized = balance - residual
            interest = monthly_payment - amortized
        balance = round_eur(balance - amortized)
        rows.append(ScheduleRow(month=month, payment=monthly_payment, interest=interest, principal=amortized, balance=balance))

    return Schedule(
        annual_rate=round_eur(rate * 12 * 100),
        total_interest=round_eur(sum((row.interest for row in rows), ZERO)),
        rows=rows,
    )


def schedule_for(calc_input: CalculationInput) -> Schedule:
    residual = resolve_residual_value(calc_input.price_cash, calc_input.residual_value, calc_input.residual_value_percent)
    return build_schedule(
        principal=calc_input.price_cash - calc_input.down_payment,
        monthly_payment=calc_input.monthly_payment,
        months=calc_input.months,
        residual=residual,
    )


def max_down_payment(calc_input: CalculationInput) -> Decimal:
    """Con más entrada que esto no quedaría nada que pagar a plazos."""
    residual = resolve_residual_value(calc_input.price_cash, calc_input.residual_value, calc_input.residual_value_percent)
    return calc_input.price_cash - residual


def simulate(calc_input: CalculationInput, down_payment: Decimal, months: int) -> tuple[CalculationResult, Decimal]:
    """La misma oferta con otra entrada y otro plazo, manteniendo su tipo de interés.

    Devuelve el resultado y el tipo nominal anual (%) usado. Es una estimación: la
    entidad puede cambiar el tipo o las comisiones al cambiar las condiciones.
    """
    residual = resolve_residual_value(calc_input.price_cash, calc_input.residual_value, calc_input.residual_value_percent)
    rate = implied_monthly_rate(
        calc_input.price_cash - calc_input.down_payment, calc_input.monthly_payment, calc_input.months, residual
    )
    scenario = replace(
        calc_input,
        down_payment=down_payment,
        months=months,
        monthly_payment=payment_for(calc_input.price_cash - down_payment, rate, months, residual),
    )
    return calculate_financing_comparison(scenario), round_eur(rate * 12 * 100)
