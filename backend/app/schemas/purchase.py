from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PurchaseCategory(StrEnum):
    VEHICLE = "vehicle"
    HOME = "home"
    RENOVATION = "renovation"
    ELECTRONICS = "electronics"
    OTHER = "other"


class PurchaseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Nombre descriptivo: ej. 'Lavadora Bosch' o 'Toyota Corolla 2024'")
    price_cash: Decimal = Field(..., gt=0, description="Precio al contado")
    category: PurchaseCategory = PurchaseCategory.OTHER
    brand: str | None = Field(None, max_length=100)
    model: str | None = Field(None, max_length=100)
    year: int | None = Field(None, ge=1990, le=2030)
    is_used: bool = False
    notes: str | None = None


class PurchaseCreate(PurchaseBase):
    pass


class PurchaseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    price_cash: Decimal | None = Field(None, gt=0)
    category: PurchaseCategory | None = None
    brand: str | None = Field(None, max_length=100)
    model: str | None = Field(None, max_length=100)
    year: int | None = Field(None, ge=1990, le=2030)
    is_used: bool | None = None
    notes: str | None = None


class PurchaseRead(PurchaseBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
