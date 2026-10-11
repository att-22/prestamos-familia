from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
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
    residual_value: Optional[Decimal] = None,
) -> List[Alert]:
    """Genera alertas y consejos basados en reglas de sentido común financiero"""
    alerts = []

    # === ALERTAS DE COSTE (TAE, intereses) ===

    if tae > Decimal("8"):
        alerts.append(Alert(
            type=AlertType.WARNING,
            message=f"La TAE del {tae}% es alta. Pide oferta a tu banco y a otra entidad antes de aceptar esta.",
            code="TAE_HIGH"
        ))
    elif tae > Decimal("5"):
        alerts.append(Alert(
            type=AlertType.INFO,
            message=f"La TAE del {tae}% es moderada. Compara con tu banco antes de firmar.",
            code="TAE_MODERATE"
        ))
    else:
        alerts.append(Alert(
            type=AlertType.SUCCESS,
            message=f"Buena TAE ({tae}%). Es una financiación competitiva.",
            code="TAE_GOOD"
        ))

    # Diferencia TIN vs TAE (indica comisiones/seguros ocultos)
    tae_tin_diff = tae - tin
    if tae_tin_diff > Decimal("2"):
        alerts.append(Alert(
            type=AlertType.WARNING,
            message=f"La TAE ({tae}%) supera al TIN ({tin}%) en {tae_tin_diff} puntos. Revisa comisiones y seguros obligatorios.",
            code="TAE_TIN_GAP_HIGH"
        ))
    elif tae_tin_diff > Decimal("0.5"):
        alerts.append(Alert(
            type=AlertType.INFO,
            message=f"Hay {tae_tin_diff} puntos de diferencia entre TIN y TAE. Esa diferencia son comisiones y seguros.",
            code="TAE_TIN_GAP"
        ))

    # Comisión de apertura
    if opening_fee_percent > Decimal("1"):
        alerts.append(Alert(
            type=AlertType.WARNING,
            message=f"Comisión de apertura del {opening_fee_percent}%: es alta. Negocia que te la quiten o busca otra entidad.",
            code="OPENING_FEE_HIGH"
        ))
    elif opening_fee_percent > Decimal("0"):
        alerts.append(Alert(
            type=AlertType.INFO,
            message=f"Comisión de apertura del {opening_fee_percent}%. Pide que te la bonifiquen.",
            code="OPENING_FEE_EXISTS"
        ))
    else:
        alerts.append(Alert(
            type=AlertType.SUCCESS,
            message="Sin comisión de apertura.",
            code="NO_OPENING_FEE"
        ))

    # Comisión amortización anticipada
    if early_repayment_fee_percent > Decimal("0"):
        alerts.append(Alert(
            type=AlertType.WARNING,
            message=f"Comisión por amortización anticipada del {early_repayment_fee_percent}%. Te penalizan si pagas antes. Negocia eliminarla.",
            code="EARLY_REPAYMENT_FEE"
        ))
    else:
        alerts.append(Alert(
            type=AlertType.SUCCESS,
            message="Sin comisión por amortización anticipada. Puedes cancelar el préstamo antes de tiempo sin coste.",
            code="NO_EARLY_REPAYMENT_FEE"
        ))

    # Seguro obligatorio
    if mandatory_insurance_year > Decimal("0"):
        total_insurance = (mandatory_insurance_year * Decimal(months) / Decimal("12")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        alerts.append(Alert(
            type=AlertType.INFO,
            message=f"Seguro vinculado: {mandatory_insurance_year}€ al año ({total_insurance}€ en total). Pregunta si es obligatorio y compara precios.",
            code="MANDATORY_INSURANCE"
        ))

    # Cuota final / valor residual
    if residual_value is not None and residual_value > Decimal("0"):
        residual_percent = (residual_value / price_cash * Decimal("100")).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
        alerts.append(Alert(
            type=AlertType.WARNING if residual_percent >= Decimal("20") else AlertType.INFO,
            message=(
                f"Al terminar las cuotas quedan {residual_value}€ por pagar ({residual_percent}% del precio) para que sea tuyo. "
                "La cuota mensual es baja por eso. Si no puedes pagarlos tendrás que refinanciarlos o devolver lo comprado."
            ),
            code="BALLOON_PAYMENT"
        ))

    # === ALERTAS DE ENDEUDAMIENTO ===

    if monthly_income_percent is not None:
        if monthly_income_percent > Decimal("35"):
            alerts.append(Alert(
                type=AlertType.ERROR,
                message=f"La cuota supone el {monthly_income_percent}% de tus ingresos. Supera el 35% recomendado. Riesgo alto de sobreendeudamiento.",
                code="DEBT_RATIO_CRITICAL"
            ))
        elif monthly_income_percent > Decimal("30"):
            alerts.append(Alert(
                type=AlertType.WARNING,
                message=f"La cuota es el {monthly_income_percent}% de tus ingresos. Está cerca del límite recomendado (30%).",
                code="DEBT_RATIO_HIGH"
            ))
        elif monthly_income_percent > Decimal("20"):
            alerts.append(Alert(
                type=AlertType.INFO,
                message=f"La cuota representa el {monthly_income_percent}% de tus ingresos. Dentro del rango saludable (menos del 30%).",
                code="DEBT_RATIO_OK"
            ))
        else:
            alerts.append(Alert(
                type=AlertType.SUCCESS,
                message=f"La cuota es solo el {monthly_income_percent}% de tus ingresos. Muy cómodo.",
                code="DEBT_RATIO_LOW"
            ))

    # === ALERTAS DE AHORROS ===

    if savings_after_down_payment is not None and user_available_savings is not None:
        if savings_after_down_payment < Decimal("0"):
            alerts.append(Alert(
                type=AlertType.ERROR,
                message="La entrada supera tus ahorros disponibles. Necesitarías financiar también la entrada.",
                code="DOWN_PAYMENT_EXCEEDS_SAVINGS"
            ))
        elif savings_after_down_payment < Decimal("3000"):
            alerts.append(Alert(
                type=AlertType.WARNING,
                message=f"Tras la entrada te quedarían {savings_after_down_payment}€. Se recomienda mantener entre 3 y 6 meses de gastos para imprevistos.",
                code="LOW_EMERGENCY_FUND"
            ))
        else:
            alerts.append(Alert(
                type=AlertType.SUCCESS,
                message=f"Tras la entrada mantienes {savings_after_down_payment}€ de colchón. Buena posición.",
                code="HEALTHY_EMERGENCY_FUND"
            ))

    # === ALERTAS DE PLAZO ===

    if months > 72:
        alerts.append(Alert(
            type=AlertType.WARNING,
            message=f"Plazo de {months} meses ({months/12:.1f} años). Muy largo: pagas muchos intereses y puedes acabar debiendo más de lo que vale lo que compraste.",
            code="TERM_TOO_LONG"
        ))
    elif months > 60:
        alerts.append(Alert(
            type=AlertType.INFO,
            message=f"Plazo de {months} meses ({months/12:.1f} años). Considera acortarlo para pagar menos intereses.",
            code="TERM_LONG"
        ))

    # === RESULTADO FINAL ===

    if savings_vs_cash > Decimal("0"):
        alerts.append(Alert(
            type=AlertType.SUCCESS,
            message=f"Financiar sale {savings_vs_cash}€ más barato que pagar al contado. Es poco habitual: comprueba que el precio al contado es el real.",
            code="SAVINGS_POSITIVE"
        ))
    elif savings_vs_cash == Decimal("0"):
        alerts.append(Alert(
            type=AlertType.SUCCESS,
            message="Financiar cuesta lo mismo que pagar al contado.",
            code="SAME_COST"
        ))
    else:
        alerts.append(Alert(
            type=AlertType.WARNING,
            message=f"Financiar cuesta {abs(savings_vs_cash)}€ más que pagar al contado. Valora si lo necesitas ya o puedes esperar y ahorrar.",
            code="FINANCING_MORE_EXPENSIVE"
        ))

    # TAE efectiva vs declarada
    if effective_annual_rate > tae + Decimal("1"):
        alerts.append(Alert(
            type=AlertType.WARNING,
            message=f"Nuestra TAE calculada ({effective_annual_rate}%) supera a la declarada ({tae}%). Revisa comisiones ocultas.",
            code="EFFECTIVE_TAE_HIGHER"
        ))

    return alerts
