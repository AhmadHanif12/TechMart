"""Pydantic schemas for Transaction endpoints."""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class TransactionCreate(BaseModel):
    """Schema for creating a new transaction."""

    customer_id: int = Field(..., gt=0, description="Customer ID")
    product_id: int = Field(..., gt=0, description="Product ID")
    quantity: int = Field(..., gt=0, le=1000, description="Quantity to purchase")
    payment_method: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Payment method"
    )
    ip_address: Optional[str] = Field(None, description="Customer IP address")
    discount_applied: Optional[float] = Field(0.0, ge=0, description="Discount amount")
    shipping_cost: Optional[float] = Field(0.0, ge=0, description="Shipping cost")

    @validator('payment_method')
    def validate_payment_method(cls, v):
        allowed_methods = [
            'credit_card', 'debit_card', 'paypal',
            'bank_transfer', 'cash', 'crypto'
        ]
        if v.lower() not in allowed_methods:
            raise ValueError(f"Payment method must be one of: {', '.join(allowed_methods)}")
        return v.lower()

    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": 1,
                "product_id": 5,
                "quantity": 2,
                "payment_method": "credit_card",
                "discount_applied": 10.0,
                "shipping_cost": 5.99
            }
        }


class TransactionResponse(BaseModel):
    """Schema for transaction response."""

    transaction_id: int
    total_amount: float
    status: str
    is_suspicious: bool
    fraud_score: float
    fraud_reason: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class TransactionFilter(BaseModel):
    """Schema for filtering transactions."""

    customer_id: Optional[int] = None
    product_id: Optional[int] = None
    status: Optional[str] = None
    hours: Optional[int] = Field(24, ge=1, le=720, description="Hours to look back")
    skip: int = Field(0, ge=0, description="Pagination offset")
    limit: int = Field(20, ge=1, le=100, description="Max results")
