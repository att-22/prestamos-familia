from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, col, select

from app.core.database import get_session
from app.models.financing_offer import FinancingOffer
from app.models.purchase import Purchase
from app.schemas.financing_offer import FinancingOfferCreate, FinancingOfferRead, FinancingOfferUpdate
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/financing-offers", tags=["financing-offers"])


@router.post("", response_model=FinancingOfferRead, status_code=status.HTTP_201_CREATED)
async def create_financing_offer(
    offer_in: FinancingOfferCreate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    purchase = session.exec(
        select(Purchase).where(Purchase.id == offer_in.purchase_id, Purchase.user_id == user_id)
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    offer = FinancingOffer(**offer_in.model_dump())
    session.add(offer)
    session.commit()
    session.refresh(offer)
    return offer


@router.get("", response_model=List[FinancingOfferRead])
async def list_financing_offers(
    purchase_id: UUID | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    query = select(FinancingOffer).join(Purchase).where(Purchase.user_id == user_id)
    if purchase_id:
        query = query.where(FinancingOffer.purchase_id == purchase_id)
    
    offers = session.exec(
        query.order_by(col(FinancingOffer.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return offers


@router.get("/{offer_id}", response_model=FinancingOfferRead)
async def get_financing_offer(
    offer_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    offer = session.exec(
        select(FinancingOffer)
        .join(Purchase)
        .where(FinancingOffer.id == offer_id, Purchase.user_id == user_id)
    ).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return offer


@router.patch("/{offer_id}", response_model=FinancingOfferRead)
async def update_financing_offer(
    offer_id: UUID,
    offer_in: FinancingOfferUpdate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    offer = session.exec(
        select(FinancingOffer)
        .join(Purchase)
        .where(FinancingOffer.id == offer_id, Purchase.user_id == user_id)
    ).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    
    for field, value in offer_in.model_dump(exclude_unset=True).items():
        setattr(offer, field, value)
    
    session.add(offer)
    session.commit()
    session.refresh(offer)
    return offer


@router.delete("/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_financing_offer(
    offer_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    offer = session.exec(
        select(FinancingOffer)
        .join(Purchase)
        .where(FinancingOffer.id == offer_id, Purchase.user_id == user_id)
    ).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    session.delete(offer)
    session.commit()
