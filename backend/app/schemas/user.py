from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    supabase_id: str


class UserUpdate(BaseModel):
    name: Optional[str] = None


class UserRead(UserBase):
    id: UUID
    supabase_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
