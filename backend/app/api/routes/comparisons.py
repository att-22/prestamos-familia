from typing import List
from uuid import UUID
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.comparison import Comparison
from app.models.vehicle import Vehicle
from app.models.leasing_offer import LeasingOffer
from app.schemas.comparison import ComparisonCreate, ComparisonRead, ComparisonResult, ComparisonPublic
from app.services.calculations import calculate_leasing_comparison, CalculationInput
from app.services.alerts import generate_alerts, Alert
from app.api.deps import get_current_user_id, get_optional_user_id

router = APIRouter(prefix="/comparisons", tags=["comparisons"])


def generate_slug() -> str:
    return secrets.token_urlsafe(8)[:10]


@router.post("/calculate", response_model=ComparisonResult)
async def calculate_comparison(
    comparison_in: ComparisonCreate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """Calcula la comparación sin guardarla (para preview en tiempo real)"""
    # Cargar datos relacionados
    vehicle = session.get(Vehicle, comparison_in.vehicle_id)
    if not vehicle or vehicle.user_id != user_id:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    offer = session.get(LeasingOffer, comparison_in.leasing_offer_id)
    if not offer or offer.vehicle_id != vehicle.id:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    
    # Preparar input de cálculo
    calc_input = CalculationInput(
        price_cash=vehicle.price_cash,
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
    
    result = calculate_leasing_comparison(
        calc_input,
        user_monthly_income=comparison_in.user_monthly_income,
        user_available_savings=comparison_in.user_available_savings,
    )
    
    # Generar alertas
    alerts = generate_alerts(
        price_cash=vehicle.price_cash,
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
    )
    
    result.alerts = alerts
    return result


@router.post("", response_model=ComparisonRead, status_code=status.HTTP_201_CREATED)
async def create_comparison(
    comparison_in: ComparisonCreate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """Calcula y GUARDA la comparación (con link compartible)"""
    vehicle = session.get(Vehicle, comparison_in.vehicle_id)
    if not vehicle or vehicle.user_id != user_id:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    offer = session.get(LeasingOffer, comparison_in.leasing_offer_id)
    if not offer or offer.vehicle_id != vehicle.id:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    
    calc_input = CalculationInput(
        price_cash=vehicle.price_cash,
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
    
    result = calculate_leasing_comparison(
        calc_input,
        user_monthly_income=comparison_in.user_monthly_income,
        user_available_savings=comparison_in.user_available_savings,
    )
    
    alerts = generate_alerts(
        price_cash=vehicle.price_cash,
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
    )
    
    comparison = Comparison(
        user_id=user_id,
        vehicle_id=vehicle.id,
        leasing_offer_id=offer.id,
        total_leasing_cost=result.total_leasing_cost,
        total_interest_fees=result.total_interest_fees,
        savings_vs_cash=result.savings_vs_cash,
        monthly_income_percent=result.monthly_income_percent,
        alerts_json=[alert.__dict__ for alert in alerts],
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
        .order_by(Comparison.created_at.desc())
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
    """Vista pública de una comparación compartida (sin auth)"""
    comparison = session.exec(
        select(Comparison).where(Comparison.shared_slug == slug, Comparison.is_public == True)
    ).first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparación no encontrada o no pública")
    
    vehicle = session.get(Vehicle, comparison.vehicle_id)
    offer = session.get(LeasingOffer, comparison.leasing_offer_id)
    
    if not vehicle or not offer:
        raise HTTPException(status_code=404, detail="Datos incompletos")
    
    return ComparisonPublic(
        vehicle_name=vehicle.name,
        price_cash=vehicle.price_cash,
        source_name=offer.source_name,
        down_payment=offer.down_payment,
        tin=offer.tin,
        tae=offer.tae,
        mo
