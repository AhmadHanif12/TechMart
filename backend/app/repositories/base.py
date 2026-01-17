"""Base repository with common CRUD operations."""
from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy import select, func, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository with generic CRUD operations."""

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        """
        Initialize repository.

        Args:
            model: SQLAlchemy model class
            db: Database session
        """
        self.model = model
        self.db = db

    async def get_by_id(self, id: int) -> Optional[ModelType]:
        """
        Get record by ID.

        Args:
            id: Record ID

        Returns:
            Model instance or None
        """
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Any = None
    ) -> List[ModelType]:
        """
        Get all records with pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            order_by: Column to order by

        Returns:
            List of model instances
        """
        query = select(self.model).offset(skip).limit(limit)

        if order_by is not None:
            query = query.order_by(order_by)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, **kwargs) -> ModelType:
        """
        Create new record.

        Args:
            **kwargs: Field values

        Returns:
            Created model instance
        """
        instance = self.model(**kwargs)
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def update(self, id: int, **kwargs) -> Optional[ModelType]:
        """
        Update record by ID.

        Args:
            id: Record ID
            **kwargs: Fields to update

        Returns:
            Updated model instance or None
        """
        await self.db.execute(
            update(self.model)
            .where(self.model.id == id)
            .values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(id)

    async def delete(self, id: int) -> bool:
        """
        Delete record by ID.

        Args:
            id: Record ID

        Returns:
            True if deleted, False otherwise
        """
        result = await self.db.execute(
            delete(self.model).where(self.model.id == id)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def count(self) -> int:
        """
        Count total records.

        Returns:
            Total count
        """
        result = await self.db.execute(
            select(func.count()).select_from(self.model)
        )
        return result.scalar_one()

    async def exists(self, id: int) -> bool:
        """
        Check if record exists.

        Args:
            id: Record ID

        Returns:
            True if exists, False otherwise
        """
        result = await self.db.execute(
            select(func.count()).select_from(self.model).where(self.model.id == id)
        )
        return result.scalar_one() > 0
