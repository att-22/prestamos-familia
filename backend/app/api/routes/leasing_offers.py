from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, col, select

from app.core.database import get_session
from app.models.leasing_offer import LeasingOffer
from app.models.vehicle import Vehicle
from app.schemas.leasing_offer import LeasingOfferCreate, LeasingOfferRead, LeasingOfferUpdate
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/leasing-offers", tags=["leasing-offers"])


@router.post("", response_model=LeasingOfferRead, status_code=status.HTTP_201_CREATED)
async def create_leasing_offer(
    offer_in: LeasingOfferCreate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    vehicle = session.exec(
        select(Vehicle).where(Vehicle.id == offer_in.vehicle_id, Vehicle.user_id == user_id)
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    offer = LeasingOffer(**offer_in.model_dump())
    session.add(offer)
    session.commit()
    session.refresh(offer)
    return offer


@router.get("", response_model=List[LeasingOfferRead])
async def list_leasing_offers(
    vehicle_id: UUID | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    query = select(LeasingOffer).join(Vehicle).where(Vehicle.user_id == user_id)
    if vehicle_id:
        query = query.where(LeasingOffer.vehicle_id == vehicle_id)
    
    offers = session.exec(
        query.order_by(col(LeasingOffer.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return offers


@router.get("/{offer_id}", response_model=LeasingOfferRead)
async def get_leasing_offer(
    offer_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    offer = session.exec(
        select(LeasingOffer)
        .join(Vehicle)
        .where(LeasingOffer.id == offer_id, Vehicle.user_id == user_id)
    ).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return offer


@router.patch("/{offer_id}", response_model=LeasingOfferRead)
async def update_leasing_offer(
    offer_id: UUID,
    offer_in: LeasingOfferUpdate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    offer = session.exec(
        select(LeasingOffer)
        .join(Vehicle)
        .where(LeasingOffer.id == offer_id, Vehicle.user_id == user_id)
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
async def delete_leasing_offer(
    offer_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    offer = session.exec(
        select(LeasingOffer)
        .join(Vehicle)
        .where(LeasingOffer.id == offer_id, Vehicle.user_id == user_id)
    ).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    session.delete(offer)
    session.commit()
