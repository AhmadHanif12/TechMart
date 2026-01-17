"""Dashboard service for aggregating metrics."""
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.transaction_repository import TransactionRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.alert_repository import AlertRepository
from app.cache import CacheManager
from app.config import get_settings

settings = get_settings()


class DashboardService:
    """Service for dashboard overview and metrics."""

    def __init__(self, db: AsyncSession, cache: CacheManager):
        self.db = db
        self.cache = cache
        self.transaction_repo = TransactionRepository(db)
        self.product_repo = ProductRepository(db)
        self.alert_repo = AlertRepository(db)

    async def get_dashboard_overview(self) -> dict:
        """
        Get dashboard overview with key metrics - both total and last 24 hours.

        Returns:
            Dictionary with dashboard metrics
        """
        # Try cache first
        cache_key = "dashboard:overview:24h"
        cached_data = await self.cache.get(cache_key)

        if cached_data:
            cached_data["metadata"] = {"cached": True}
            return cached_data

        # Calculate metrics
        hours_24 = 24

        # TOTAL counts (all time)
        total_sales = await self.transaction_repo.get_total_sales()
        total_customers = await self.transaction_repo.get_total_unique_customers()
        total_transactions = await self.transaction_repo.get_total_transactions_count()
        total_products = await self.product_repo.get_total_products_count()

        # Sales in last 24 hours
        sales_24h = await self.transaction_repo.get_daily_sales_total(days=1)

        # Active customers in last 24 hours
        active_customers = await self.transaction_repo.get_unique_customers_count(
            hours=hours_24
        )

        # Transaction count in last 24 hours
        recent_transactions = await self.transaction_repo.get_recent_transactions(
            hours=hours_24,
            limit=10000  # High limit to get accurate count
        )
        transactions_24h = len(recent_transactions)

        # Unresolved alerts count
        unresolved_alerts = await self.alert_repo.get_unresolved_alerts(limit=1000)
        active_alerts = len(unresolved_alerts)

        # Low stock products count
        low_stock_products = await self.product_repo.get_low_stock_products()
        low_stock_count = len(low_stock_products)

        # Suspicious transactions count
        suspicious_transactions = await self.transaction_repo.get_suspicious_transactions(
            hours=hours_24,
            limit=1000
        )
        suspicious_count = len(suspicious_transactions)

        overview_data = {
            # Total counts (all time)
            "total_sales": round(total_sales, 2),
            "total_customers": total_customers,
            "total_transactions": total_transactions,
            "total_products": total_products,
            # Last 24 hours
            "sales_24h": round(sales_24h, 2),
            "active_customers_24h": active_customers,
            "transactions_24h": transactions_24h,
            # Other metrics
            "active_alerts": active_alerts,
            "low_stock_count": low_stock_count,
            "suspicious_transactions_24h": suspicious_count,
            "last_updated": datetime.utcnow().isoformat(),
        }

        # Cache for 5 minutes
        await self.cache.set(cache_key, overview_data, ttl=settings.CACHE_TTL_DASHBOARD)

        return {
            **overview_data,
            "metadata": {"cached": False}
        }

    async def get_realtime_metrics(self) -> dict:
        """
        Get real-time metrics (last minute).

        Returns:
            Dictionary with realtime metrics
        """
        # Recent transactions (last 5 minutes)
        recent_txns = await self.transaction_repo.get_recent_transactions(
            hours=0,  # Will use minutes internally
            limit=100
        )

        # Filter to last 1 minute
        one_min_ago = datetime.utcnow() - timedelta(minutes=1)
        last_minute_txns = [
            txn for txn in recent_txns
            if txn.timestamp >= one_min_ago
        ]

        return {
            "transactions_last_minute": len(last_minute_txns),
            "timestamp": datetime.utcnow().isoformat()
        }
