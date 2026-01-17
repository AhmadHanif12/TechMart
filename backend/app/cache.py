"""Redis cache manager for high-performance caching."""
import pickle
import redis.asyncio as aioredis
from typing import Any, Optional
from functools import wraps
from app.config import get_settings

settings = get_settings()


class CacheManager:
    """Async Redis cache manager with pickle serialization."""

    def __init__(self):
        """Initialize Redis connection pool."""
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self):
        """Connect to Redis."""
        self.redis = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=False,
            max_connections=settings.REDIS_MAX_CONNECTIONS,
        )

    async def disconnect(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        if not self.redis:
            return None

        try:
            data = await self.redis.get(key)
            if data:
                return pickle.loads(data)
        except Exception as e:
            print(f"Cache get error for key {key}: {e}")

        return None

    async def set(self, key: str, value: Any, ttl: int = 300):
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default: 5 minutes)
        """
        if not self.redis:
            return

        try:
            serialized = pickle.dumps(value)
            await self.redis.setex(key, ttl, serialized)
        except Exception as e:
            print(f"Cache set error for key {key}: {e}")

    async def delete(self, *keys: str):
        """
        Delete one or more keys from cache.

        Args:
            keys: Cache keys to delete
        """
        if not self.redis or not keys:
            return

        try:
            await self.redis.delete(*keys)
        except Exception as e:
            print(f"Cache delete error: {e}")

    async def delete_pattern(self, pattern: str):
        """
        Delete all keys matching pattern.

        Args:
            pattern: Redis key pattern (e.g., "dashboard:*")
        """
        if not self.redis:
            return

        try:
            async for key in self.redis.scan_iter(match=pattern):
                await self.redis.delete(key)
        except Exception as e:
            print(f"Cache delete pattern error for {pattern}: {e}")

    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.

        Args:
            key: Cache key

        Returns:
            True if key exists, False otherwise
        """
        if not self.redis:
            return False

        try:
            return await self.redis.exists(key) > 0
        except Exception:
            return False

    async def increment(self, key: str, amount: int = 1) -> int:
        """
        Increment counter in cache.

        Args:
            key: Cache key
            amount: Amount to increment by

        Returns:
            New value after increment
        """
        if not self.redis:
            return 0

        try:
            return await self.redis.incrby(key, amount)
        except Exception:
            return 0

    async def expire(self, key: str, ttl: int):
        """
        Set expiration time for key.

        Args:
            key: Cache key
            ttl: Time to live in seconds
        """
        if not self.redis:
            return

        try:
            await self.redis.expire(key, ttl)
        except Exception as e:
            print(f"Cache expire error for key {key}: {e}")


# Global cache instance
cache_manager = CacheManager()


async def get_cache() -> CacheManager:
    """Dependency to get cache manager."""
    return cache_manager


def cached(key_pattern: str, ttl: int = 300):
    """
    Decorator for caching function results.

    Args:
        key_pattern: Cache key pattern with {param} placeholders
        ttl: Time to live in seconds

    Usage:
        @cached("products:low_stock", ttl=600)
        async def get_low_stock_products(db: AsyncSession):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get cache from kwargs (injected dependency)
            cache = kwargs.get('cache') or cache_manager

            # Generate cache key from pattern
            try:
                key = key_pattern.format(**kwargs)
            except KeyError:
                # If pattern has placeholders not in kwargs, use function name
                key = f"{func.__name__}:{key_pattern}"

            # Try to get from cache
            cached_value = await cache.get(key)
            if cached_value is not None:
                return cached_value

            # Cache miss - execute function
            result = await func(*args, **kwargs)

            # Store in cache
            await cache.set(key, result, ttl)

            return result

        return wrapper
    return decorator
