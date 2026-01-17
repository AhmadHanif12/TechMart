"""Pydantic schemas for Product endpoints."""
from pydantic import BaseModel, Field, validator
from typing import Optional
from decimal import Decimal


class ProductCreate(BaseModel):
    """Schema for creating a new product."""

    name: str = Field(..., min_length=3, max_length=255, description="Product name")
    category: str = Field(..., min_length=2, max_length=100, description="Product category")
    price: Decimal = Field(..., gt=0, description="Product price")
    stock_quantity: int = Field(0, ge=0, description="Initial stock quantity")
    supplier_id: int = Field(..., gt=0, description="Supplier ID")
    sku: str = Field(..., min_length=2, max_length=50, description="Product SKU (unique)")
    description: Optional[str] = Field(None, description="Product description")
    weight: Optional[Decimal] = Field(None, gt=0, description="Product weight in kg")
    dimensions: Optional[str] = Field(None, max_length=100, description="Product dimensions (LxWxH)")
    warranty_months: Optional[int] = Field(None, ge=0, description="Warranty period in months")
    reorder_threshold: int = Field(10, ge=0, description="Stock level that triggers reorder alert")
    reorder_quantity: int = Field(50, gt=0, description="Default quantity to reorder")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Wireless Gaming Mouse",
                "category": "Electronics",
                "price": 49.99,
                "stock_quantity": 100,
                "supplier_id": 1,
                "sku": "WGM-001",
                "description": "High-precision wireless gaming mouse with RGB lighting",
                "weight": 0.15,
                "dimensions": "12x7x4 cm",
                "warranty_months": 24,
                "reorder_threshold": 10,
                "reorder_quantity": 50
            }
        }


class ProductUpdate(BaseModel):
    """Schema for updating a product."""

    name: Optional[str] = Field(None, min_length=3, max_length=255)
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    price: Optional[Decimal] = Field(None, gt=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    supplier_id: Optional[int] = Field(None, gt=0)
    description: Optional[str] = None
    weight: Optional[Decimal] = Field(None, gt=0)
    dimensions: Optional[str] = Field(None, max_length=100)
    warranty_months: Optional[int] = Field(None, ge=0)
    reorder_threshold: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, gt=0)


class StockUpdate(BaseModel):
    """Schema for updating product stock."""

    quantity_change: int = Field(..., description="Amount to add (positive) or remove (negative)")
    reason: Optional[str] = Field(None, description="Reason for stock change")

    class Config:
        json_schema_extra = {
            "example": {
                "quantity_change": 10,
                "reason": "Stock replenishment"
            }
        }


class ProductResponse(BaseModel):
    """Schema for product response."""

    id: int
    name: str
    category: str
    price: float
    stock_quantity: int
    supplier_id: int
    sku: str
    description: Optional[str]
    is_low_stock: bool
    reorder_threshold: int
    reorder_quantity: int
    created_at: str

    class Config:
        from_attributes = True
