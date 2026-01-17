"""Alert repository."""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.repositories.base import BaseRepository


class AlertRepository(BaseRepository[Alert]):
    """Repository for Alert model."""

    def __init__(self, db: AsyncSession):
        super().__init__(Alert, db)

    async def get_unresolved_alerts(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Alert]:
        """Get unresolved alerts."""
        result = await self.db.execute(
            select(Alert)
            .where(Alert.is_resolved == False)
            .order_by(desc(Alert.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_unresolved_count(self) -> int:
        """Get count of unresolved alerts."""
        result = await self.db.execute(
            select(func.count()).select_from(Alert).where(Alert.is_resolved == False)
        )
        return result.scalar() or 0

    async def get_by_severity(
        self,
        severity: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Alert]:
        """Get alerts by severity."""
        result = await self.db.execute(
            select(Alert)
            .where(Alert.severity == severity)
            .order_by(desc(Alert.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_type(
        self,
        alert_type: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Alert]:
        """Get alerts by type."""
        result = await self.db.execute(
            select(Alert)
            .where(Alert.alert_type == alert_type)
            .order_by(desc(Alert.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def resolve_alert(self, alert_id: int) -> bool:
        """Mark alert as resolved."""
        alert = await self.get_by_id(alert_id)
        if not alert:
            return False

        alert.is_resolved = True
        alert.resolved_at = datetime.utcnow()
        await self.db.flush()
        return True

    async def get_with_filters(
        self,
        is_resolved: Optional[bool] = None,
        severity: Optional[str] = None,
        alert_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Alert]:
        """Get alerts with combined filters."""
        conditions = []

        if is_resolved is not None:
            conditions.append(Alert.is_resolved == is_resolved)

        if severity is not None:
            conditions.append(Alert.severity == severity)

        if alert_type is not None:
            conditions.append(Alert.alert_type == alert_type)

        query = select(Alert).order_by(desc(Alert.created_at))

        if conditions:
            query = query.where(and_(*conditions))

        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()
