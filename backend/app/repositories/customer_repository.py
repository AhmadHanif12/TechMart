"""Customer repository."""
from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.repositories.base import BaseRepository


class CustomerRepository(BaseRepository[Customer]):
    """Repository for Customer model."""

    def __init__(self, db: AsyncSession):
        super().__init__(Customer, db)

    async def get_by_email(self, email: str) -> Optional[Customer]:
        """Get customer by email."""
        result = await self.db.execute(
            select(Customer).where(Customer.email == email)
        )
        return result.scalar_one_or_none()

    async def get_high_risk_customers(self, threshold: float = 0.7) -> List[Customer]:
        """Get customers with high risk score."""
        result = await self.db.execute(
            select(Customer)
            .where(Customer.risk_score >= threshold)
            .order_by(Customer.risk_score.desc())
        )
        return result.scalars().all()

    async def get_by_loyalty_tier(self, tier: str) -> List[Customer]:
        """Get customers by loyalty tier."""
        result = await self.db.execute(
            select(Customer).where(Customer.loyalty_tier == tier)
        )
        return result.scalars().all()

    async def search_customers(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Customer]:
        """Search customers by email or name."""
        search_pattern = f"%{search_term}%"
        result = await self.db.execute(
            select(Customer)
            .where(
                or_(
                    Customer.email.ilike(search_pattern),
                    Customer.first_name.ilike(search_pattern),
                    Customer.last_name.ilike(search_pattern)
                )
            )
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
