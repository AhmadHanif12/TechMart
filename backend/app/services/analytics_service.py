"""Analytics service for reporting and insights."""
from typing import List, Dict
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.transaction_repository import TransactionRepository
from app.repositories.product_repository import ProductRepository
from app.cache import CacheManager
from app.config import get_settings

settings = get_settings()


class AnalyticsService:
    """Service for analytics and reporting."""

    def __init__(self, db: AsyncSession, cache: CacheManager):
        self.db = db
        self.cache = cache
        self.transaction_repo = TransactionRepository(db)
        self.product_repo = ProductRepository(db)

    async def get_hourly_sales(
        self,
        hours: int = 24
    ) -> List[Dict]:
        """
        Get hourly sales data.

        Args:
            hours: Number of hours to look back

        Returns:
            List of hourly sales data
        """
        # Try cache
        cache_key = f"analytics:hourly_sales:{hours}h"
        cached_data = await self.cache.get(cache_key)
        if cached_data:
            return cached_data

        end_date = datetime.utcnow()
        start_date = end_date - timedelta(hours=hours)

        stats = await self.transaction_repo.get_hourly_sales_stats(
            start_date=start_date,
            end_date=end_date
        )

        hourly_data = []
        for row in stats:
            hourly_data.append({
                "hour": row.hour.isoformat(),
                "transaction_count": row.transaction_count,
                "total_sales": float(row.total_sales) if row.total_sales else 0.0,
                "avg_transaction": float(row.avg_transaction) if row.avg_transaction else 0.0
            })

        # Cache for 1 hour
        await self.cache.set(cache_key, hourly_data, ttl=settings.CACHE_TTL_ANALYTICS)

        return hourly_data

    async def get_top_products(
        self,
        days: int = 7,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get top selling products.

        Args:
            days: Days to look back
            limit: Number of products to return

        Returns:
            List of top products with sales data
        """
        # Try cache
        cache_key = f"analytics:top_products:{days}d:limit{limit}"
        cached_data = await self.cache.get(cache_key)
        if cached_data:
            return cached_data

        sales_data = await self.transaction_repo.get_sales_by_product(
            days=days,
            limit=limit
        )

        top_products = []
        for row in sales_data:
            product = await self.product_repo.get_by_id(row.product_id)
            if product:
                top_products.append({
                    "product_id": product.id,
                    "name": product.name,
                    "category": product.category,
                    "stock_quantity": product.stock_quantity,
                    "sales_count": row.sales_count,
                    "total_revenue": float(row.total_revenue),
                    "is_low_stock": product.is_low_stock
                })

        # Cache for 30 minutes
        await self.cache.set(cache_key, top_products, ttl=1800)

        return top_products

    async def get_sales_by_category(
        self,
        days: int = 30
    ) -> List[Dict]:
        """
        Get sales breakdown by product category.

        Args:
            days: Days to look back

        Returns:
            List of category sales data
        """
        from sqlalchemy import select, func
        from app.models.transaction import Transaction
        from app.models.product import Product

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        result = await self.db.execute(
            select(
                Product.category,
                func.count(Transaction.id).label('transaction_count'),
                func.sum(Transaction.total_amount).label('total_sales')
            )
            .join(Transaction, Transaction.product_id == Product.id)
            .where(
                Transaction.timestamp >= cutoff_date,
                Transaction.status == 'completed'
            )
            .group_by(Product.category)
            .order_by(func.sum(Transaction.total_amount).desc())
        )

        categories = []
        for row in result.all():
            categories.append({
                "category": row.category,
                "transaction_count": row.transaction_count,
                "total_sales": float(row.total_sales) if row.total_sales else 0.0
            })

        return categories
