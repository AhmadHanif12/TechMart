"""Dashboard API endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db_session, get_cache_manager
from app.cache import CacheManager
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/overview")
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db_session),
    cache: CacheManager = Depends(get_cache_manager),
):
    """
    Get dashboard overview with key metrics for last 24 hours.

    Returns:
        - sales_24h: Total sales in last 24 hours
        - active_customers_24h: Number of unique customers
        - transactions_24h: Number of transactions
        - active_alerts: Number of unresolved alerts
        - low_stock_count: Number of products below reorder threshold
        - suspicious_transactions_24h: Number of flagged transactions
    """
    service = DashboardService(db, cache)
    overview = await service.get_dashboard_overview()

    return {
        "success": True,
        "data": overview,
        "error": None
    }


@router.get("/metrics/realtime")
async def get_realtime_metrics(
    db: AsyncSession = Depends(get_db_session),
    cache: CacheManager = Depends(get_cache_manager),
):
    """
    Get real-time metrics for last minute.

    Returns:
        - transactions_last_minute: Transaction count in last minute
        - timestamp: Current timestamp
    """
    service = DashboardService(db, cache)
    metrics = await service.get_realtime_metrics()

    return {
        "success": True,
        "data": metrics,
        "error": None
    }
