from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleRead, VehicleUpdate
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    vehicle_in: VehicleCreate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    vehicle = Vehicle(**vehicle_in.model_dump(), user_id=user_id)
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


@router.get("", response_model=List[VehicleRead])
async def list_vehicles(
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    vehicles = session.exec(
        select(Vehicle)
        .where(Vehicle.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .order_by(Vehicle.created_at.desc())
    ).all()
    return vehicles


@router.get("/{vehicle_id}", response_model=VehicleRead)
async def get_vehicle(
    vehicle_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    vehicle = session.exec(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.user_id == user_id)
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return vehicle


@router.patch("/{vehicle_id}", response_model=VehicleRead)
async def update_vehicle(
    vehicle_id: UUID,
    vehicle_in: VehicleUpdate,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    vehicle = session.exec(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.user_id == user_id)
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    for field, value in vehicle_in.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)
    
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    vehicle = session.exec(
        select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.user_id == user_id)
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    session.delete(vehicle)
    session.commit()
