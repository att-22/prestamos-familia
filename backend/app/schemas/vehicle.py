from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional


class VehicleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Nombre descriptivo: ej. 'Toyota Corolla 2024'")
    price_cash: Decimal = Field(..., gt=0, description="Precio al contado")
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    year: Optional[int] = Field(None, ge=1990, le=2030)
    is_used: bool = False
    notes: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    price_cash: Optional[Decimal] = Field(None, gt=0)
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    year: Optional[int] = Field(None, ge=1990, le=2030)
    is_used: Optional[bool] = None
    notes: Optional[str] = None


class VehicleRead(VehicleBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
