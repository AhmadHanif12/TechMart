"""Inventory API endpoints (Challenge B - Advanced Inventory Management)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional
from pydantic import BaseModel

from app.dependencies import get_db_session
from app.repositories.product_repository import ProductRepository
from app.repositories.inventory_repository import ReorderSuggestionRepository
from app.services.inventory_service import InventoryService
from app.schemas.product import ProductCreate, ProductUpdate, StockUpdate, ProductResponse
from app.models.product import Product

router = APIRouter()


@router.post("/", status_code=201)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Create a new product.

    Creates a new product with inventory tracking enabled.
    Validates that the SKU is unique and supplier exists.
    """
    repo = ProductRepository(db)

    # Check if SKU already exists
    existing = await repo.get_by_sku(product_data.sku)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Product with SKU '{product_data.sku}' already exists"
        )

    # Create product
    try:
        product = await repo.create(
            name=product_data.name,
            category=product_data.category,
            price=float(product_data.price),
            stock_quantity=product_data.stock_quantity,
            supplier_id=product_data.supplier_id,
            sku=product_data.sku,
            description=product_data.description,
            weight=float(product_data.weight) if product_data.weight else None,
            dimensions=product_data.dimensions,
            warranty_months=product_data.warranty_months,
            reorder_threshold=product_data.reorder_threshold,
            reorder_quantity=product_data.reorder_quantity
        )
        await db.commit()

        return {
            "success": True,
            "data": {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "stock_quantity": product.stock_quantity,
                "created_at": product.created_at.isoformat()
            },
            "error": None
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")


@router.get("/products")
async def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None, description="Filter by category"),
    supplier_id: Optional[int] = Query(None, description="Filter by supplier"),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get all products with pagination and optional filters.

    Returns a paginated list of products with their details.
    """
    from sqlalchemy import select

    # Build the base query with eager loading of supplier
    query = select(Product).options(selectinload(Product.supplier))

    # Apply filters if provided
    if category:
        query = query.where(Product.category == category)
    if supplier_id:
        query = query.where(Product.supplier_id == supplier_id)

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    products = result.scalars().all()

    results = []
    for product in products:
        results.append({
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "price": float(product.price),
            "stock_quantity": product.stock_quantity,
            "reorder_threshold": product.reorder_threshold,
            "reorder_quantity": product.reorder_quantity,
            "description": product.description,
            "supplier": {
                "id": product.supplier.id,
                "name": product.supplier.name
            } if product.supplier else None,
            "is_low_stock": product.is_low_stock
        })

    return {
        "success": True,
        "data": results,
        "metadata": {
            "count": len(results),
            "skip": skip,
            "limit": limit
        },
        "error": None
    }


@router.get("/low-stock")
async def get_low_stock_products(
    threshold: Optional[int] = Query(None, description="Custom threshold (uses product's reorder_threshold if not provided)"),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get products with stock below reorder threshold.

    Returns products with:
    - stock_quantity < reorder_threshold (or custom threshold)
    - Sorted by stock quantity (lowest first)
    - Includes supplier information
    """
    repo = ProductRepository(db)
    products = await repo.get_low_stock_products(threshold=threshold)

    results = []
    for product in products:
        results.append({
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "stock_quantity": product.stock_quantity,
            "reorder_threshold": product.reorder_threshold,
            "reorder_quantity": product.reorder_quantity,
            "price": float(product.price),
            "supplier": {
                "id": product.supplier.id,
                "name": product.supplier.name,
                "reliability_score": float(product.supplier.reliability_score) if product.supplier.reliability_score else None,
                "average_delivery_days": product.supplier.average_delivery_days
            } if product.supplier else None
        })

    return {
        "success": True,
        "data": results,
        "metadata": {"count": len(results)},
        "error": None
    }


@router.get("/reorder-suggestions")
async def get_reorder_suggestions(
    status: Optional[str] = Query("pending", description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get automated reorder suggestions (Challenge B).

    Returns:
    - product details
    - suggested_quantity: Calculated reorder amount
    - suggested_supplier: Optimal supplier (multi-criteria optimization)
    - urgency_score: Priority indicator (0-1)
    - estimated_stockout_date: When product will run out
    - reasoning: Explanation of calculation
    """
    repo = ReorderSuggestionRepository(db)
    suggestions = await repo.get_pending_suggestions(skip=skip, limit=limit)

    results = []
    for suggestion in suggestions:
        results.append({
            "id": suggestion.id,
            "product": {
                "id": suggestion.product.id,
                "name": suggestion.product.name,
                "sku": suggestion.product.sku,
                "current_stock": suggestion.product.stock_quantity
            },
            "suggested_quantity": suggestion.suggested_quantity,
            "suggested_supplier": {
                "id": suggestion.supplier.id,
                "name": suggestion.supplier.name,
                "reliability_score": float(suggestion.supplier.reliability_score) if suggestion.supplier.reliability_score else None,
                "average_delivery_days": suggestion.supplier.average_delivery_days
            } if suggestion.supplier else None,
            "urgency_score": float(suggestion.urgency_score) if suggestion.urgency_score else None,
            "estimated_stockout_date": suggestion.estimated_stockout_date.isoformat() if suggestion.estimated_stockout_date else None,
            "reasoning": suggestion.reasoning,
            "status": suggestion.status,
            "created_at": suggestion.created_at.isoformat()
        })

    return {
        "success": True,
        "data": results,
        "metadata": {"count": len(results), "skip": skip, "limit": limit},
        "error": None
    }


@router.post("/reorder-suggestions/{suggestion_id}/approve")
async def approve_reorder_suggestion(
    suggestion_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Approve a reorder suggestion.

    Changes status to 'approved'.
    In production, this would trigger ordering workflow.
    """
    repo = ReorderSuggestionRepository(db)
    success = await repo.approve_suggestion(suggestion_id)

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Suggestion {suggestion_id} not found or not in pending status"
        )

    await db.commit()

    return {
        "success": True,
        "data": {"message": f"Reorder suggestion {suggestion_id} approved"},
        "error": None
    }


@router.post("/generate-reorder-suggestion/{product_id}")
async def generate_reorder_suggestion(
    product_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Generate automated reorder suggestion for a product (Challenge B).

    Analyzes:
    - Current stock level
    - Demand forecast
    - Supplier lead time
    - Safety stock requirements

    Selects optimal supplier using multi-criteria optimization:
    - Price (40% weight)
    - Reliability (35% weight)
    - Delivery time (25% weight)
    """
    service = InventoryService(db)
    suggestion = await service.generate_reorder_suggestion(product_id)

    if not suggestion:
        raise HTTPException(
            status_code=400,
            detail=f"Product {product_id} not found or stock is above reorder threshold"
        )

    # Save suggestion to database
    from app.repositories.inventory_repository import ReorderSuggestionRepository
    repo = ReorderSuggestionRepository(db)
    created = await repo.create(**suggestion)
    await db.commit()

    return {
        "success": True,
        "data": {
            "id": created.id,
            **suggestion
        },
        "error": None
    }


@router.get("/predictions/{product_id}")
async def get_demand_forecast(
    product_id: int,
    horizon_days: int = Query(7, ge=1, le=90, description="Forecast horizon in days"),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get demand forecast for a product (Challenge B - Demand Forecasting).

    Uses hybrid forecasting model:
    - Moving averages (7-day & 30-day)
    - Trend analysis
    - Seasonality detection

    Returns:
    - predicted_demand: Forecasted demand for horizon period
    - confidence_score: Prediction confidence (0-1)
    - trend_factor: Growth/decline indicator
    - seasonality_factor: Seasonal variation factor
    """
    service = InventoryService(db)

    # Check product exists
    repo = ProductRepository(db)
    product = await repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    forecast = await service.forecast_demand(product_id, horizon_days=horizon_days)

    return {
        "success": True,
        "data": {
            "product_id": product_id,
            "product_name": product.name,
            "horizon_days": horizon_days,
            **forecast
        },
        "error": None
    }


# Parameterized routes must come LAST
@router.get("/{product_id}")
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Get product details by ID."""
    repo = ProductRepository(db)
    product = await repo.get_with_supplier(product_id)

    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    return {
        "success": True,
        "data": {
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "price": float(product.price),
            "stock_quantity": product.stock_quantity,
            "reorder_threshold": product.reorder_threshold,
            "reorder_quantity": product.reorder_quantity,
            "description": product.description,
            "supplier": {
                "id": product.supplier.id,
                "name": product.supplier.name
            } if product.supplier else None,
            "is_low_stock": product.is_low_stock
        },
        "error": None
    }


@router.put("/{product_id}")
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Update a product.

    Updates product details. Only provided fields are updated.
    """
    repo = ProductRepository(db)

    # Check if product exists
    product = await repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    # Build update dict with only provided fields
    update_data = {}
    if product_data.name is not None:
        update_data['name'] = product_data.name
    if product_data.category is not None:
        update_data['category'] = product_data.category
    if product_data.price is not None:
        update_data['price'] = float(product_data.price)
    if product_data.stock_quantity is not None:
        update_data['stock_quantity'] = product_data.stock_quantity
    if product_data.supplier_id is not None:
        update_data['supplier_id'] = product_data.supplier_id
    if product_data.description is not None:
        update_data['description'] = product_data.description
    if product_data.weight is not None:
        update_data['weight'] = float(product_data.weight)
    if product_data.dimensions is not None:
        update_data['dimensions'] = product_data.dimensions
    if product_data.warranty_months is not None:
        update_data['warranty_months'] = product_data.warranty_months
    if product_data.reorder_threshold is not None:
        update_data['reorder_threshold'] = product_data.reorder_threshold
    if product_data.reorder_quantity is not None:
        update_data['reorder_quantity'] = product_data.reorder_quantity

    try:
        updated_product = await repo.update(product_id, **update_data)
        await db.commit()

        return {
            "success": True,
            "data": {
                "id": updated_product.id,
                "name": updated_product.name,
                "updated_at": updated_product.updated_at.isoformat()
            },
            "error": None
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update product: {str(e)}")


@router.post("/{product_id}/stock")
async def update_stock(
    product_id: int,
    stock_data: StockUpdate,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Update product stock quantity.

    Adds or removes stock from a product.
    Use positive values to add stock, negative to remove.
    """
    repo = ProductRepository(db)

    try:
        product = await repo.update_stock(product_id, stock_data.quantity_change)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

        await db.commit()

        return {
            "success": True,
            "data": {
                "id": product.id,
                "name": product.name,
                "stock_quantity": product.stock_quantity,
                "change": stock_data.quantity_change
            },
            "error": None
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update stock: {str(e)}")
