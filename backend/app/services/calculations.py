from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional


@dataclass
class CalculationInput:
    price_cash: Decimal
    down_payment: Decimal
    tin: Decimal          # % anual nominal
    tae: Decimal          # % anual equivalente
    months: int
    monthly_payment: Decimal
    opening_fee: Decimal = Decimal("0")
    opening_fee_percent: Decimal = Decimal("0")
    early_repayment_fee_percent: Decimal = Decimal("0")
    mandatory_insurance_year: Decimal = Decimal("0")
    residual_value: Optional[Decimal] = None
    residual_value_percent: Optional[Decimal] = None


@dataclass
class CalculationResult:
    # Inputs (para referencia)
    price_cash: Decimal
    down_payment: Decimal
    tin: Decimal
    tae: Decimal
    months: int
    monthly_payment: Decimal
    opening_fee: Decimal
    early_repayment_fee_percent: Decimal
    mandatory_insurance_year: Decimal
    residual_value: Optional[Decimal]

    # Calculados
    financed_amount: Decimal
    total_payments: Decimal
    total_insurance: Decimal
    total_fees: Decimal
    total_financing_cost: Decimal
    total_interest_fees: Decimal
    savings_vs_cash: Decimal
    effective_annual_rate: Decimal

    # Contexto usuario (opcional)
    monthly_income_percent: Optional[Decimal] = None
    savings_after_down_payment: Optional[Decimal] = None


def round_eur(value: Decimal) -> Decimal:
    """Redondea a 2 decimales (céntimos)"""
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def resolve_residual_value(
    price_cash: Decimal,
    residual_value: Optional[Decimal],
    residual_value_percent: Optional[Decimal],
) -> Decimal:
    """Cuota final en euros. Si se indican importe y porcentaje, manda el importe."""
    if residual_value is not None:
        return round_eur(residual_value)
    if residual_value_percent is not None:
        return round_eur(price_cash * residual_value_percent / Decimal("100"))
    return Decimal("0.00")


def calculate_financing_comparison(input: CalculationInput, user_monthly_income: Optional[Decimal] = None, user_available_savings: Optional[Decimal] = None) -> CalculationResult:
    """
    Calcula la comparación completa entre pagar al contado y financiar.
    
    Fórmulas:
    - Importe financiado = Precio contado - Entrada
    - Total cuotas = Cuota mensual × Meses
    - Total seguros = Seguro anual × (Meses / 12)
    - Total comisiones = Comisión apertura + (Comisión apertura % × Importe financiado)
    - Coste total financiado = Entrada + Total cuotas + Cuota final + Total seguros + Total comisiones
      (la cuota final / valor residual es lo que hay que pagar para quedarse lo comprado,
      que es con lo que se compara el pago al contado)
    - Intereses + comisiones = Coste total financiado - Precio contado
    - Ahorro contado = Precio contado - Coste total financiado (negativo = financiar es más caro)
    - TAE efectiva = Calculada vía VAN (aproximación)
    """
    
    # Importe financiado
    financed_amount = round_eur(input.price_cash - input.down_payment)
    
    # Total pagado en cuotas
    total_payments = round_eur(input.monthly_payment * input.months)
    
    # Total seguros (prorrateado por meses)
    total_insurance = round_eur(input.mandatory_insurance_year * Decimal(input.months) / Decimal("12"))
    
    # Total comisiones
    opening_fee_calculated = round_eur(input.opening_fee + (financed_amount * input.opening_fee_percent / Decimal("100")))
    total_fees = round_eur(opening_fee_calculated)
    
    # Cuota final para quedarse lo comprado (0 si la oferta no tiene)
    residual_value = resolve_residual_value(input.price_cash, input.residual_value, input.residual_value_percent)
    
    # Coste total financiando
    total_financing_cost = round_eur(input.down_payment + total_payments + residual_value + total_insurance + total_fees)
    
    # Intereses + comisiones totales (lo que pagas de más vs contado)
    total_interest_fees = round_eur(total_financing_cost - input.price_cash)
    
    # Diferencia contado - financiado (negativo = financiar sale más caro)
    savings_vs_cash = round_eur(input.price_cash - total_financing_cost)
    
    # TAE efectiva calculada (aproximación via VAN simplificada)
    # Resolvemos: financed_amount = SUM(monthly_payment / (1+r)^n) 
    # Usamos fórmula de cuota francesa inversa aproximada
    if financed_amount > 0 and input.monthly_payment > 0 and input.months > 0:
        # Aproximación: r_mensual ≈ (monthly_payment * months - financed_amount) / (financed_amount * months / 2)
        # Fórmula más precisa: usar tasa interna de retorno (IRR)
        effective_annual_rate = calculate_effective_tae(
            financed_amount=financed_amount,
            monthly_payment=input.monthly_payment,
            months=input.months,
            opening_fee=opening_fee_calculated,
            residual_value=residual_value,
        )
    else:
        effective_annual_rate = Decimal("0")
    
    # Contexto usuario
    monthly_income_percent = None
    if user_monthly_income and user_monthly_income > 0:
        monthly_income_percent = round_eur((input.monthly_payment / user_monthly_income) * Decimal("100"))
    
    savings_after_down_payment = None
    if user_available_savings is not None:
        savings_after_down_payment = round_eur(user_available_savings - input.down_payment)
    
    return CalculationResult(
        price_cash=input.price_cash,
        down_payment=input.down_payment,
        tin=input.tin,
        tae=input.tae,
        months=input.months,
        monthly_payment=input.monthly_payment,
        opening_fee=input.opening_fee,
        early_repayment_fee_percent=input.early_repayment_fee_percent,
        mandatory_insurance_year=input.mandatory_insurance_year,
        residual_value=residual_value if residual_value > 0 else None,
        financed_amount=financed_amount,
        total_payments=total_payments,
        total_insurance=total_insurance,
        total_fees=total_fees,
        total_financing_cost=total_financing_cost,
        total_interest_fees=total_interest_fees,
        savings_vs_cash=savings_vs_cash,
        effective_annual_rate=effective_annual_rate,
        monthly_income_percent=monthly_income_percent,
        savings_after_down_payment=savings_after_down_payment,
    )


def calculate_effective_tae(
    financed_amount: Decimal,
    monthly_payment: Decimal,
    months: int,
    opening_fee: Decimal = Decimal("0"),
    residual_value: Decimal = Decimal("0"),
) -> Decimal:
    """
    Calcula la TAE efectiva (IRR) usando método numérico (Newton-Raphson simplificado).
    Flujo de caja: recibes financed_amount - opening_fee al mes 0, pagas monthly_payment mes 1..n
    y, si la hay, la cuota final (residual_value) junto con la última cuota
    """
    # Valor inicial: TAE declarada como punto de partida
    # Buscamos r mensual tal que VAN = 0
    
    net_received = financed_amount - opening_fee

    def npv(rate_monthly: Decimal) -> Decimal:
        """Valor actual de las cuotas menos lo recibido, a tasa mensual dada"""
        vp = Decimal("0")
        for n in range(1, months + 1):
            vp += monthly_payment / ((Decimal("1") + rate_monthly) ** n)
        vp += residual_value / ((Decimal("1") + rate_monthly) ** months)
        return vp - net_received

    # Sin intereses (o cuotas que no cubren lo recibido): no hay tasa positiva
    if monthly_payment * months + residual_value <= net_received:
        return Decimal("0.00")
    
    # Búsqueda binaria de la tasa mensual
    low = Decimal("0.00001")  # 0.001% mensual
    high = Decimal("0.05")    # 5% mensual (~80% anual)
    
    for _ in range(50):  # Suficiente precisión
        mid = (low + high) / Decimal("2")
        val = npv(mid)
        if val > 0:
            low = mid
        else:
            high = mid
        if abs(val) < Decimal("0.01"):
            break
    
    monthly_rate = (low + high) / Decimal("2")
    annual_rate = (Decimal("1") + monthly_rate) ** 12 - Decimal("1")
    return round_eur(annual_rate * Decimal("100"))
