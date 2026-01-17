"""Dependency injection for FastAPI routes."""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.cache import get_cache, CacheManager


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session dependency.

    Usage:
        async def endpoint(db: AsyncSession = Depends(get_db_session)):
            ...
    """
    async for session in get_db():
        yield session


async def get_cache_manager() -> CacheManager:
    """
    Get cache manager dependency.

    Usage:
        async def endpoint(cache: CacheManager = Depends(get_cache_manager)):
            ...
    """
    return await get_cache()
