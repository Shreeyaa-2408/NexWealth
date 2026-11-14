from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
class LoginIn(BaseModel):
    email: EmailStr
    password: str
class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
class TransactionIn(BaseModel):
    date: date
    description: str = Field(min_length=1, max_length=255)
    category: str = "Other"
    amount: float = Field(gt=0)
    type: str
class TransactionOut(TransactionIn):
    id: int
    model_config = ConfigDict(from_attributes=True)
class GoalIn(BaseModel):
    title: str
    target_amount: float = Field(gt=0)
    saved_amount: float = Field(default=0, ge=0)
    target_date: date | None = None
class ChallengeIn(BaseModel):
    title: str = "A little every day"
    daily_amount: float = Field(default=50, gt=0)
    duration_days: int = Field(default=30, ge=1, le=365)
class ContributionIn(BaseModel):
    amount: float = Field(gt=0)
    note: str = "Daily contribution"
class SimulateIn(BaseModel):
    product_name: str = "Purchase"
    price: float = Field(gt=0)
    category: str = "Shopping"
class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
