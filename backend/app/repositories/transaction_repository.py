"""Transaction repository with analytics and fraud detection queries."""
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.transaction import Transaction
from app.repositories.base import BaseRepository


class TransactionRepository(BaseRepository[Transaction]):
    """Repository for Transaction model."""

    def __init__(self, db: AsyncSession):
        super().__init__(Transaction, db)

    async def get_with_relations(self, transaction_id: int) -> Optional[Transaction]:
        """
        Get transaction with customer and product loaded.

        Args:
            transaction_id: Transaction ID

        Returns:
            Transaction with relations or None
        """
        result = await self.db.execute(
            select(Transaction)
            .options(
                selectinload(Transaction.customer),
                selectinload(Transaction.product)
            )
            .where(Transaction.id == transaction_id)
        )
        return result.scalar_one_or_none()

    async def get_by_customer(
        self,
        customer_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transaction]:
        """
        Get transactions for a customer.

        Args:
            customer_id: Customer ID
            skip: Pagination offset
            limit: Max results

        Returns:
            List of customer transactions
        """
        result = await self.db.execute(
            select(Transaction)
            .where(Transaction.customer_id == customer_id)
            .order_by(desc(Transaction.timestamp))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_recent_transactions(
        self,
        hours: int = 24,
        limit: int = 100
    ) -> List[Transaction]:
        """
        Get recent transactions within specified hours.

        Args:
            hours: Number of hours to look back
            limit: Max results

        Returns:
            List of recent transactions
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        result = await self.db.execute(
            select(Transaction)
            .where(Transaction.timestamp >= cutoff_time)
            .options(
                selectinload(Transaction.customer),
                selectinload(Transaction.product)
            )
            .order_by(desc(Transaction.timestamp))
            .limit(limit)
        )
        return result.scalars().all()

    async def get_suspicious_transactions(
        self,
        hours: Optional[int] = 24,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transaction]:
        """
        Get suspicious transactions.

        Args:
            hours: Hours to look back (None for all time)
            skip: Pagination offset
            limit: Max results

        Returns:
            List of suspicious transactions
        """
        query = select(Transaction).where(
            or_(
                Transaction.is_suspicious == True,
                Transaction.fraud_score > 0.7
            )
        )

        if hours:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            query = query.where(Transaction.timestamp >= cutoff_time)

        query = query.options(
            selectinload(Transaction.customer),
            selectinload(Transaction.product)
        ).order_by(desc(Transaction.fraud_score)).offset(skip).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_status(
        self,
        status: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transaction]:
        """
        Get transactions by status.

        Args:
            status: Transaction status
            skip: Pagination offset
            limit: Max results

        Returns:
            List of transactions
        """
        result = await self.db.execute(
            select(Transaction)
            .where(Transaction.status == status)
            .order_by(desc(Transaction.timestamp))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_customer_transaction_count(
        self,
        customer_id: int,
        minutes: int = 10
    ) -> int:
        """
        Count customer transactions in recent minutes (velocity check).

        Args:
            customer_id: Customer ID
            minutes: Time window in minutes

        Returns:
            Transaction count
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)

        result = await self.db.execute(
            select(func.count())
            .select_from(Transaction)
            .where(
                and_(
                    Transaction.customer_id == customer_id,
                    Transaction.timestamp >= cutoff_time
                )
            )
        )
        return result.scalar_one()

    async def get_hourly_sales_stats(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Tuple]:
        """
        Get hourly sales statistics.

        Args:
            start_date: Start datetime
            end_date: End datetime

        Returns:
            List of (hour, count, total_sales, avg_amount)
        """
        from sqlalchemy import text

        # Use raw SQL to avoid issues with GROUP BY and date_trunc
        query = text("""
            SELECT
                date_trunc('hour', timestamp) as hour,
                count(*) as transaction_count,
                sum(total_amount) as total_sales,
                avg(total_amount) as avg_transaction
            FROM transactions
            WHERE timestamp >= :start_date
                AND timestamp <= :end_date
                AND status = 'completed'
            GROUP BY date_trunc('hour', timestamp)
            ORDER BY date_trunc('hour', timestamp)
        """)

        result = await self.db.execute(
            query,
            {"start_date": start_date, "end_date": end_date}
        )
        return result.all()

    async def get_sales_by_product(
        self,
        days: int = 7,
        limit: int = 10
    ) -> List[Tuple]:
        """
        Get top selling products.

        Args:
            days: Days to look back
            limit: Max products to return

        Returns:
            List of (product_id, sales_count, total_revenue)
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        result = await self.db.execute(
            select(
                Transaction.product_id,
                func.count(Transaction.id).label('sales_count'),
                func.sum(Transaction.total_amount).label('total_revenue')
            )
            .where(
                and_(
                    Transaction.timestamp >= cutoff_date,
                    Transaction.status == 'completed'
                )
            )
            .group_by(Transaction.product_id)
            .order_by(desc('total_revenue'))
            .limit(limit)
        )
        return result.all()

    async def get_daily_sales_total(self, days: int = 1) -> float:
        """
        Get total sales for recent days.

        Args:
            days: Number of days to look back

        Returns:
            Total sales amount
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        result = await self.db.execute(
            select(func.sum(Transaction.total_amount))
            .where(
                and_(
                    Transaction.timestamp >= cutoff_date,
                    Transaction.status == 'completed'
                )
            )
        )
        total = result.scalar_one_or_none()
        return float(total) if total else 0.0

    async def get_unique_customers_count(self, hours: int = 24) -> int:
        """
        Count unique customers in recent hours.

        Args:
            hours: Hours to look back

        Returns:
            Unique customer count
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        result = await self.db.execute(
            select(func.count(func.distinct(Transaction.customer_id)))
            .where(Transaction.timestamp >= cutoff_time)
        )
        return result.scalar_one()

    async def get_total_sales(self) -> float:
        """
        Get total sales all time.

        Returns:
            Total sales amount
        """
        result = await self.db.execute(
            select(func.sum(Transaction.total_amount))
            .where(Transaction.status == 'completed')
        )
        total = result.scalar_one_or_none()
        return float(total) if total else 0.0

    async def get_total_unique_customers(self) -> int:
        """
        Get total unique customers all time.

        Returns:
            Total unique customer count
        """
        from app.models.customer import Customer

        result = await self.db.execute(
            select(func.count(Customer.id))
        )
        return result.scalar_one()

    async def get_total_transactions_count(self) -> int:
        """
        Get total transaction count all time.

        Returns:
            Total transaction count
        """
        result = await self.db.execute(
            select(func.count(Transaction.id))
        )
        return result.scalar_one()
