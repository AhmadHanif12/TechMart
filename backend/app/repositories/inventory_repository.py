"""Inventory repository for predictions and reorder suggestions."""
from typing import List, Optional
from datetime import date, datetime, timedelta
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.inventory_prediction import InventoryPrediction
from app.models.reorder_suggestion import ReorderSuggestion
from app.repositories.base import BaseRepository


class InventoryPredictionRepository(BaseRepository[InventoryPrediction]):
    """Repository for InventoryPrediction model."""

    def __init__(self, db: AsyncSession):
        super().__init__(InventoryPrediction, db)

    async def get_by_product(
        self,
        product_id: int,
        limit: int = 10
    ) -> List[InventoryPrediction]:
        """Get predictions for a product."""
        result = await self.db.execute(
            select(InventoryPrediction)
            .where(InventoryPrediction.product_id == product_id)
            .order_by(desc(InventoryPrediction.prediction_date))
            .limit(limit)
        )
        return result.scalars().all()

    async def get_latest_prediction(
        self,
        product_id: int,
        horizon_days: int = 7
    ) -> Optional[InventoryPrediction]:
        """Get latest prediction for product and horizon."""
        result = await self.db.execute(
            select(InventoryPrediction)
            .where(
                and_(
                    InventoryPrediction.product_id == product_id,
                    InventoryPrediction.prediction_horizon_days == horizon_days
                )
            )
            .order_by(desc(InventoryPrediction.prediction_date))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_recent_predictions(
        self,
        days: int = 7
    ) -> List[InventoryPrediction]:
        """Get all recent predictions."""
        cutoff_date = date.today() - timedelta(days=days)

        result = await self.db.execute(
            select(InventoryPrediction)
            .where(InventoryPrediction.prediction_date >= cutoff_date)
            .options(selectinload(InventoryPrediction.product))
            .order_by(desc(InventoryPrediction.confidence_score))
        )
        return result.scalars().all()


class ReorderSuggestionRepository(BaseRepository[ReorderSuggestion]):
    """Repository for ReorderSuggestion model."""

    def __init__(self, db: AsyncSession):
        super().__init__(ReorderSuggestion, db)

    async def get_pending_suggestions(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[ReorderSuggestion]:
        """Get pending reorder suggestions."""
        result = await self.db.execute(
            select(ReorderSuggestion)
            .where(ReorderSuggestion.status == 'pending')
            .options(
                selectinload(ReorderSuggestion.product),
                selectinload(ReorderSuggestion.supplier)
            )
            .order_by(desc(ReorderSuggestion.urgency_score))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_product(
        self,
        product_id: int,
        status: Optional[str] = None
    ) -> List[ReorderSuggestion]:
        """Get reorder suggestions for a product."""
        query = select(ReorderSuggestion).where(
            ReorderSuggestion.product_id == product_id
        )

        if status:
            query = query.where(ReorderSuggestion.status == status)

        query = query.options(
            selectinload(ReorderSuggestion.supplier)
        ).order_by(desc(ReorderSuggestion.created_at))

        result = await self.db.execute(query)
        return result.scalars().all()

    async def approve_suggestion(self, suggestion_id: int) -> bool:
        """Approve a reorder suggestion."""
        suggestion = await self.get_by_id(suggestion_id)
        if not suggestion or suggestion.status != 'pending':
            return False

        suggestion.status = 'approved'
        await self.db.flush()
        return True

    async def reject_suggestion(self, suggestion_id: int) -> bool:
        """Reject a reorder suggestion."""
        suggestion = await self.get_by_id(suggestion_id)
        if not suggestion or suggestion.status != 'pending':
            return False

        suggestion.status = 'rejected'
        await self.db.flush()
        return True
