"""Analytics API endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, get_cache_manager
from app.cache import CacheManager
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/hourly-sales")
async def get_hourly_sales(
    hours: int = Query(24, ge=1, le=168, description="Hours to look back"),
    db: AsyncSession = Depends(get_db_session),
    cache: CacheManager = Depends(get_cache_manager)
):
    """
    Get hourly sales data with aggregations.

    Returns for each hour:
    - transaction_count: Number of transactions
    - total_sales: Total sales amount
    - avg_transaction: Average transaction value
    """
    service = AnalyticsService(db, cache)
    data = await service.get_hourly_sales(hours=hours)

    return {
        "success": True,
        "data": data,
        "metadata": {"hours": hours},
        "error": None
    }


@router.get("/top-products")
async def get_top_products(
    days: int = Query(7, ge=1, le=90, description="Days to look back"),
    limit: int = Query(10, ge=1, le=50, description="Number of products"),
    db: AsyncSession = Depends(get_db_session),
    cache: CacheManager = Depends(get_cache_manager)
):
    """
    Get top selling products by revenue.

    Returns:
    - Product details
    - sales_count: Number of sales
    - total_revenue: Total revenue generated
    - is_low_stock: Stock status indicator
    """
    service = AnalyticsService(db, cache)
    data = await service.get_top_products(days=days, limit=limit)

    return {
        "success": True,
        "data": data,
        "metadata": {"days": days, "limit": limit},
        "error": None
    }


@router.get("/category-performance")
async def get_category_performance(
    days: int = Query(30, ge=1, le=365, description="Days to look back"),
    db: AsyncSession = Depends(get_db_session),
    cache: CacheManager = Depends(get_cache_manager)
):
    """
    Get sales performance by product category.

    Returns for each category:
    - transaction_count: Number of sales
    - total_sales: Total revenue
    """
    service = AnalyticsService(db, cache)
    data = await service.get_sales_by_category(days=days)

    return {
        "success": True,
        "data": data,
        "metadata": {"days": days},
        "error": None
    }
