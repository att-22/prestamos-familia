from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional
from enum import Enum


class AlertType(str, Enum):
    WARNING = "warning"
    INFO = "info"
    SUCCESS = "success"
    ERROR = "error"


@dataclass
class Alert:
    type: AlertType
    # Texto con marcadores como "{tae}". Las cifras viajan aparte, en params,
    # para que quien lo muestre las escriba con el formato de su idioma.
    message: str
    code: str
    params: Dict[str, Dict[str, str]] = field(default_factory=dict)


def percent(value: Decimal) -> Dict[str, str]:
    return {"value": str(value), "kind": "percent"}


def currency(value: Decimal) -> Dict[str, str]:
    return {"value": str(value), "kind": "currency"}


def number(value: Decimal | int) -> Dict[str, str]:
    return {"value": str(value), "kind": "number"}


# Alertas calculadas con los ingresos o ahorros del usuario. No deben salir
# en el enlace compartido: su texto permite deducir esos datos.
PERSONAL_ALERT_CODES = frozenset({
    "DEBT_RATIO_CRITICAL",
    "DEBT_RATIO_HIGH",
    "DEBT_RATIO_OK",
    "DEBT_RATIO_LOW",
    "DOWN_PAYMENT_EXCEEDS_SAVINGS",
    "LOW_EMERGENCY_FUND",
    "HEALTHY_EMERGENCY_FUND",
})


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
            message="La TAE del {tae} es alta. Pide oferta a tu banco y a otra entidad antes de aceptar esta.",
            code="TAE_HIGH",
            params={"tae": percent(tae)},
        ))
    elif tae > Decimal("5"):
        alerts.append(Alert(
            type=AlertType.INFO,
            message="La TAE del {tae} es moderada. Compara con tu banco antes de firmar.",
            code="TAE_MODERATE",
            params={"tae": percent(tae)},
        ))
    else:
        alerts.append(Alert(
            type=AlertType.SUCCESS,
            message="Buena TAE ({tae}). Es una financiación competitiva.",
            code="TAE_GOOD",
            params={"tae": percent(tae)},
        ))

    # Diferencia TIN vs TAE (indica comisiones/seguros ocultos)
    tae_tin_diff = tae - tin
    if tae_tin_diff > Decimal("2"):
        alerts.append(Alert(
            type=AlertType.WARNING,
            message="La TAE ({tae}) supera al TIN ({tin}) en {diff} puntos. Revisa comisiones y seguros obligatorios.",
            code="TAE_TIN_GAP_HIGH",
            params={"tae": percent(tae), "tin": percent(tin), "diff": number(tae_tin_diff)},
        ))
    elif tae_tin_diff > Decimal("0.5"):
        alerts.append(Alert(
            type=AlertType.INFO,
            message="Hay {diff} puntos de diferencia entre TIN y TAE. Esa diferencia son comisiones y seguros.",
            code="TAE_TIN_GAP",
            params={"diff": number(tae_tin_diff)},
        ))

    # Comisión de apertura
    if opening_fee_percent > Decimal("1"):
        alerts.append(Alert(
            type=AlertType.WARNING,
            message="Comisión de apertura del {fee}: es alta. Negocia que te la quiten o busca otra entidad.",
            code="OPENING_FEE_HIGH",
            params={"fee": percent(opening_fee_percent)},
        ))
    elif opening_fee_percent > Decimal("0"):
        alerts.append(Alert(
            type=AlertType.INFO,
            message="Comisión de apertura del {fee}. Pide que te la bonifiquen.",
            code="OPENING_FEE_EXISTS",
            params={"fee": percent(opening_fee_percent)},
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
            message="Comisión por amortización anticipada del {fee}. Te penalizan si pagas antes. Negocia eliminarla.",
            code="EARLY_REPAYMENT_FEE",
            params={"fee": percent(early_repayment_fee_percent)},
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
            message="Seguro vinculado: {yearly} al año ({total} en total). Pregunta si es obligatorio y compara precios.",
            code="MANDATORY_INSURANCE",
            params={"yearly": currency(mandatory_insurance_year), "total": currency(total_insurance)},
        ))

    # Cuota final / valor residual
    if residual_value is not None and residual_value > Decimal("0"):
        residual_percent = (residual_value / price_cash * Decimal("100")).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
        alerts.append(Alert(
            type=AlertType.WARNING if residual_percent >= Decimal("20") else AlertType.INFO,
            message=(
                "Al terminar las cuotas quedan {residual} por pagar ({share} del precio) para que sea tuyo. "
                "La cuota mensual es baja por eso. Si no puedes pagarlos tendrás que refinanciarlos o devolver lo comprado."
            ),
            code="BALLOON_PAYMENT",
            params={"residual": currency(residual_value), "share": percent(residual_percent)},
        ))

    # === ALERTAS DE ENDEUDAMIENTO ===

    if monthly_income_percent is not None:
        ratio = {"ratio": percent(monthly_income_percent)}
        if monthly_income_percent > Decimal("35"):
            alerts.append(Alert(
                type=AlertType.ERROR,
                message="La cuota supone el {ratio} de tus ingresos. Supera el 35% recomendado. Riesgo alto de sobreendeudamiento.",
                code="DEBT_RATIO_CRITICAL",
                params=ratio,
            ))
        elif monthly_income_percent > Decimal("30"):
            alerts.append(Alert(
                type=AlertType.WARNING,
                message="La cuota es el {ratio} de tus ingresos. Está cerca del límite recomendado (30%).",
                code="DEBT_RATIO_HIGH",
                params=ratio,
            ))
        elif monthly_income_percent > Decimal("20"):
            alerts.append(Alert(
                type=AlertType.INFO,
                message="La cuota representa el {ratio} de tus ingresos. Dentro del rango saludable (menos del 30%).",
                code="DEBT_RATIO_OK",
                params=ratio,
            ))
        else:
            alerts.append(Alert(
                type=AlertType.SUCCESS,
                message="La cuota es solo el {ratio} de tus ingresos. Muy cómodo.",
                code="DEBT_RATIO_LOW",
                params=ratio,
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
                message="Tras la entrada te quedarían {left}. Se recomienda mantener entre 3 y 6 meses de gastos para imprevistos.",
                code="LOW_EMERGENCY_FUND",
                params={"left": currency(savings_after_down_payment)},
            ))
        else:
            alerts.append(Alert(
                type=AlertType.SUCCESS,
                message="Tras la entrada mantienes {left} de colchón. Buena posición.",
                code="HEALTHY_EMERGENCY_FUND",
                params={"left": currency(savings_after_down_payment)},
            ))

    # === ALERTAS DE PLAZO ===

    term = {
        "months": number(months),
        "years": number((Decimal(months) / Decimal("12")).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
    }
    if months > 72:
        alerts.append(Alert(
            type=AlertType.WARNING,
            message="Plazo de {months} meses ({years} años). Muy largo: pagas muchos intereses y puedes acabar debiendo más de lo que vale lo que compraste.",
            code="TERM_TOO_LONG",
            params=term,
        ))
    elif months > 60:
        alerts.append(Alert(
            type=AlertType.INFO,
            message="Plazo de {months} meses ({years} años). Considera acortarlo para pagar menos intereses.",
            code="TERM_LONG",
            params=term,
        ))

    # === RESULTADO FINAL ===

    if savings_vs_cash > Decimal("0"):
        alerts.append(Alert(
            type=AlertType.SUCCESS,
            message="Financiar sale {amount} más barato que pagar al contado. Es poco habitual: comprueba que el precio al contado es el real.",
            code="SAVINGS_POSITIVE",
            params={"amount": currency(savings_vs_cash)},
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
            message="Financiar cuesta {amount} más que pagar al contado. Valora si lo necesitas ya o puedes esperar y ahorrar.",
            code="FINANCING_MORE_EXPENSIVE",
            params={"amount": currency(abs(savings_vs_cash))},
        ))

    # TAE efectiva vs declarada
    if effective_annual_rate > tae + Decimal("1"):
        alerts.append(Alert(
            type=AlertType.WARNING,
            message="Nuestra TAE calculada ({effective}) supera a la declarada ({tae}). Revisa comisiones ocultas.",
            code="EFFECTIVE_TAE_HIGHER",
            params={"effective": percent(effective_annual_rate), "tae": percent(tae)},
        ))

    return alerts
