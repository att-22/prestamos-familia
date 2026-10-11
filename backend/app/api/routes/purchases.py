from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, col, select

from app.core.database import get_session
from app.models.purchase import Purchase
from app.schemas.purchase import PurchaseCreate, PurchaseRead, PurchaseUpdate
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.post("", response_model=PurchaseRead, status_code=status.HTTP_201_CREATED)
async def create_purchase(
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
async def list_purchases(
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
async def get_purchase(
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


@router.patch("/{purchase_id}", response_model=PurchaseRead)
async def update_purchase(
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
async def delete_purchase(
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
