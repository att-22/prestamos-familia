from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, col, select

from app.core.database import get_session
from app.models.financing_offer import FinancingOffer
from app.models.purchase import Purchase
from app.schemas.comparison import OfferRanking, OfferSummary
from app.schemas.purchase import PurchaseCreate, PurchaseRead, PurchaseUpdate
from app.services.calculations import calculate_financing_comparison
from app.services.offer_analysis import to_calculation_input
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.post("", response_model=PurchaseRead, status_code=status.HTTP_201_CREATED)
def create_purchase(
    purchase_in: PurchaseCreate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    purchase = Purchase(**purchase_in.model_dump(mode="json"), user_id=user_id)
    session.add(purchase)
    session.commit()
    session.refresh(purchase)
    return purchase


@router.get("", response_model=List[PurchaseRead])
def list_purchases(
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    purchases = session.exec(
        select(Purchase)
        .where(Purchase.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .order_by(col(Purchase.created_at).desc())
    ).all()
    return purchases


@router.get("/{purchase_id}", response_model=PurchaseRead)
def get_purchase(
    purchase_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    purchase = session.exec(
        select(Purchase).where(Purchase.id == purchase_id, Purchase.user_id == user_id)
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    return purchase


@router.get("/{purchase_id}/offer-ranking", response_model=OfferRanking)
def rank_offers(
    purchase_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """Todas las ofertas de una compra con su coste total, de la más barata a la más cara."""
    purchase = session.exec(
        select(Purchase).where(Purchase.id == purchase_id, Purchase.user_id == user_id)
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")

    offers = session.exec(select(FinancingOffer).where(FinancingOffer.purchase_id == purchase.id)).all()
    results = [(offer, calculate_financing_comparison(to_calculation_input(purchase, offer))) for offer in offers]
    # A igual coste, primero la más antigua: el orden no baila entre peticiones
    results.sort(key=lambda pair: (pair[1].total_financing_cost, pair[0].created_at))

    lowest_cost = min((result.total_financing_cost for _, result in results), default=None)
    lowest_payment = min((offer.monthly_payment for offer, _ in results), default=None)

    return OfferRanking(
        purchase_id=purchase.id,
        price_cash=purchase.price_cash,
        offers=[
            OfferSummary(
                offer_id=offer.id,
                source_name=offer.source_name,
                down_payment=offer.down_payment,
                monthly_payment=offer.monthly_payment,
                months=offer.months,
                tin=offer.tin,
                tae=offer.tae,
                effective_annual_rate=result.effective_annual_rate,
                residual_value=result.residual_value,
                total_payments=result.total_payments,
                total_financing_cost=result.total_financing_cost,
                total_interest_fees=result.total_interest_fees,
                is_cheapest=result.total_financing_cost == lowest_cost,
                has_lowest_payment=offer.monthly_payment == lowest_payment,
            )
            for offer, result in results
        ],
    )


@router.patch("/{purchase_id}", response_model=PurchaseRead)
def update_purchase(
    purchase_id: UUID,
    purchase_in: PurchaseUpdate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    purchase = session.exec(
        select(Purchase).where(Purchase.id == purchase_id, Purchase.user_id == user_id)
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    for field, value in purchase_in.model_dump(exclude_unset=True, mode="json").items():
        setattr(purchase, field, value)
    
    session.add(purchase)
    session.commit()
    session.refresh(purchase)
    return purchase


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(
    purchase_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    purchase = session.exec(
        select(Purchase).where(Purchase.id == purchase_id, Purchase.user_id == user_id)
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    session.delete(purchase)
    session.commit()
