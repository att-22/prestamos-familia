from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional


class PurchaseCategory(str, Enum):
    VEHICLE = "vehicle"
    HOME = "home"
    RENOVATION = "renovation"
    ELECTRONICS = "electronics"
    OTHER = "other"


class PurchaseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Nombre descriptivo: ej. 'Lavadora Bosch' o 'Toyota Corolla 2024'")
    price_cash: Decimal = Field(..., gt=0, description="Precio al contado")
    category: PurchaseCategory = PurchaseCategory.OTHER
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    year: Optional[int] = Field(None, ge=1990, le=2030)
    is_used: bool = False
    notes: Optional[str] = None


class PurchaseCreate(PurchaseBase):
    pass


class PurchaseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    price_cash: Optional[Decimal] = Field(None, gt=0)
    category: Optional[PurchaseCategory] = None
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    year: Optional[int] = Field(None, ge=1990, le=2030)
    is_used: Optional[bool] = None
    notes: Optional[str] = None


class PurchaseRead(PurchaseBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
