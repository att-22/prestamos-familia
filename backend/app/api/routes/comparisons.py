from dataclasses import asdict
from typing import List
from uuid import UUID
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, col, select

from app.core.database import get_session
from app.models.comparison import Comparison
from app.models.purchase import Purchase
from app.models.financing_offer import FinancingOffer
from app.schemas.comparison import (
    ComparisonCreate,
    ComparisonPublic,
    ComparisonRead,
    ComparisonResult,
    ScenarioRequest,
    ScenarioResult,
)
from app.services.calculations import calculate_financing_comparison, CalculationResult
from app.services.amortization import max_down_payment, schedule_for, simulate
from app.services.offer_analysis import to_calculation_input
from app.services.alerts import generate_alerts, PERSONAL_ALERT_CODES
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/comparisons", tags=["comparisons"])


def generate_slug() -> str:
    return secrets.token_urlsafe(8)[:10]


def _load_purchase_and_offer(
    comparison_in: ComparisonCreate | ScenarioRequest, user_id: UUID, session: Session
) -> tuple[Purchase, FinancingOffer]:
    purchase = session.get(Purchase, comparison_in.purchase_id)
    if not purchase or purchase.user_id != user_id:
        raise HTTPException(status_code=404, detail="Compra no encontrada")

    offer = session.get(FinancingOffer, comparison_in.financing_offer_id)
    if not offer or offer.purchase_id != purchase.id:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")

    return purchase, offer


def _compute(
    purchase: Purchase, offer: FinancingOffer, comparison_in: ComparisonCreate
) -> tuple[CalculationResult, list[dict]]:
    result = calculate_financing_comparison(
        to_calculation_input(purchase, offer),
        user_monthly_income=comparison_in.user_monthly_income,
        user_available_savings=comparison_in.user_available_savings,
    )

    alerts = generate_alerts(
        price_cash=purchase.price_cash,
        down_payment=offer.down_payment,
        tin=offer.tin,
        tae=offer.tae,
        months=offer.months,
        monthly_payment=offer.monthly_payment,
        opening_fee_percent=offer.opening_fee_percent,
        early_repayment_fee_percent=offer.early_repayment_fee_percent,
        mandatory_insurance_year=offer.mandatory_insurance_year,
        total_interest_fees=result.total_interest_fees,
        savings_vs_cash=result.savings_vs_cash,
        effective_annual_rate=result.effective_annual_rate,
        monthly_income_percent=result.monthly_income_percent,
        savings_after_down_payment=result.savings_after_down_payment,
        user_available_savings=comparison_in.user_available_savings,
        residual_value=result.residual_value,
    )

    alerts_json = [{"type": a.type.value, "message": a.message, "code": a.code, "params": a.params} for a in alerts]
    return result, alerts_json


def _snapshot(purchase: Purchase, offer: FinancingOffer, result: CalculationResult) -> dict:
    """Datos de entrada del cálculo, tal como eran al guardar (JSON: los decimales van como texto)."""
    return {
        "purchase_name": purchase.name,
        "price_cash": str(result.price_cash),
        "source_name": offer.source_name,
        "down_payment": str(result.down_payment),
        "tin": str(result.tin),
        "tae": str(result.tae),
        "months": result.months,
        "monthly_payment": str(result.monthly_payment),
        "residual_value": str(result.residual_value) if result.residual_value is not None else None,
    }


@router.post("/calculate", response_model=ComparisonResult)
async def calculate_comparison(
    comparison_in: ComparisonCreate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    purchase, offer = _load_purchase_and_offer(comparison_in, user_id, session)
    result, alerts_json = _compute(purchase, offer, comparison_in)
    schedule = schedule_for(to_calculation_input(purchase, offer))
    return ComparisonResult(**asdict(result), alerts=alerts_json, amortization=asdict(schedule))


@router.post("/simulate", response_model=ScenarioResult)
async def simulate_scenario(
    scenario_in: ScenarioRequest,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """Qué costaría la misma oferta con otra entrada y otro plazo, manteniendo su tipo de interés."""
    purchase, offer = _load_purchase_and_offer(scenario_in, user_id, session)
    calc_input = to_calculation_input(purchase, offer)
    if scenario_in.down_payment > max_down_payment(calc_input):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La entrada no puede superar lo que queda por pagar a plazos.",
        )

    result, annual_rate = simulate(calc_input, scenario_in.down_payment, scenario_in.months)
    return ScenarioResult(
        down_payment=result.down_payment,
        months=result.months,
        monthly_payment=result.monthly_payment,
        total_financing_cost=result.total_financing_cost,
        total_interest_fees=result.total_interest_fees,
        annual_rate=annual_rate,
    )


@router.post("", response_model=ComparisonRead, status_code=status.HTTP_201_CREATED)
async def create_comparison(
    comparison_in: ComparisonCreate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    purchase, offer = _load_purchase_and_offer(comparison_in, user_id, session)
    result, alerts_json = _compute(purchase, offer, comparison_in)

    comparison = Comparison(
        user_id=user_id,
        purchase_id=purchase.id,
        financing_offer_id=offer.id,
        total_financing_cost=result.total_financing_cost,
        total_interest_fees=result.total_interest_fees,
        savings_vs_cash=result.savings_vs_cash,
        monthly_income_percent=result.monthly_income_percent,
        alerts_json=alerts_json,
        snapshot=_snapshot(purchase, offer, result),
        shared_slug=generate_slug(),
        user_monthly_income=comparison_in.user_monthly_income,
        user_available_savings=comparison_in.user_available_savings,
    )

    session.add(comparison)
    session.commit()
    session.refresh(comparison)
    return comparison


@router.get("", response_model=List[ComparisonRead])
async def list_comparisons(
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    comparisons = session.exec(
        select(Comparison)
        .where(Comparison.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .order_by(col(Comparison.created_at).desc())
    ).all()
    return comparisons


@router.get("/{comparison_id}", response_model=ComparisonRead)
async def get_comparison(
    comparison_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    comparison = session.exec(
        select(Comparison).where(Comparison.id == comparison_id, Comparison.user_id == user_id)
    ).first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparación no encontrada")
    return comparison


@router.get("/public/{slug}", response_model=ComparisonPublic)
async def get_public_comparison(
    slug: str,
    session: Session = Depends(get_session),
):
    comparison = session.exec(
        select(Comparison).where(Comparison.shared_slug == slug, col(Comparison.is_public).is_(True))
    ).first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparación no encontrada o no pública")
    
    return ComparisonPublic(
        **comparison.snapshot,
        total_financing_cost=comparison.total_financing_cost,
        total_interest_fees=comparison.total_interest_fees,
        savings_vs_cash=comparison.savings_vs_cash,
        alerts=[a for a in comparison.alerts_json if a["code"] not in PERSONAL_ALERT_CODES],
        created_at=comparison.created_at,
    )


@router.delete("/{comparison_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comparison(
    comparison_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    comparison = session.exec(
        select(Comparison).where(Comparison.id == comparison_id, Comparison.user_id == user_id)
    ).first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparación no encontrada")
    session.delete(comparison)
    session.commit()
