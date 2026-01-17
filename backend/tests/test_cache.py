"""
Unit tests for Cache Manager (Challenge D).

Tests Redis caching functionality and TTL management.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import pickle

from app.cache import CacheManager


class TestCacheManager:
    """Test cache manager operations."""

    @pytest.fixture
    def cache_manager(self):
        """Create cache manager with mocked Redis."""
        manager = CacheManager()
        manager.redis = AsyncMock()
        return manager

    @pytest.mark.asyncio
    async def test_get_existing_key(self, cache_manager):
        """Test getting existing cached value."""
        test_data = {"sales": 12345, "customers": 100}
        cache_manager.redis.get.return_value = pickle.dumps(test_data)

        result = await cache_manager.get("dashboard:metrics")

        assert result == test_data
        cache_manager.redis.get.assert_called_once_with("dashboard:metrics")

    @pytest.mark.asyncio
    async def test_get_nonexistent_key(self, cache_manager):
        """Test getting non-existent key returns None."""
        cache_manager.redis.get.return_value = None

        result = await cache_manager.get("nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_with_redis_error(self, cache_manager):
        """Test graceful handling of Redis errors."""
        cache_manager.redis.get.side_effect = Exception("Redis connection error")

        result = await cache_manager.get("dashboard:metrics")

        assert result is None  # Should return None on error

    @pytest.mark.asyncio
    async def test_set_value(self, cache_manager):
        """Test setting value in cache with TTL."""
        test_data = {"sales": 12345}
        key = "dashboard:metrics"
        ttl = 300

        await cache_manager.set(key, test_data, ttl=ttl)

        # Verify setex was called with correct parameters
        cache_manager.redis.setex.assert_called_once()
        call_args = cache_manager.redis.setex.call_args[0]
        assert call_args[0] == key
        assert call_args[1] == ttl
        # Verify data was pickled
        assert isinstance(call_args[2], bytes)

    @pytest.mark.asyncio
    async def test_set_with_redis_error(self, cache_manager):
        """Test error handling during set operation."""
        cache_manager.redis.setex.side_effect = Exception("Redis error")

        # Should not raise exception
        await cache_manager.set("key", "value", ttl=300)

    @pytest.mark.asyncio
    async def test_delete_single_key(self, cache_manager):
        """Test deleting a single key."""
        await cache_manager.delete("dashboard:metrics")

        cache_manager.redis.delete.assert_called_once_with("dashboard:metrics")

    @pytest.mark.asyncio
    async def test_delete_multiple_keys(self, cache_manager):
        """Test deleting multiple keys."""
        keys = ["key1", "key2", "key3"]

        await cache_manager.delete(*keys)

        cache_manager.redis.delete.assert_called_once_with(*keys)

    @pytest.mark.asyncio
    async def test_delete_pattern(self, cache_manager):
        """Test pattern-based deletion."""
        # Mock scan_iter to return matching keys
        cache_manager.redis.scan_iter = AsyncMock()
        cache_manager.redis.scan_iter.return_value = ["dashboard:1", "dashboard:2"].__aiter__()

        await cache_manager.delete_pattern("dashboard:*")

        # Verify scan_iter was called with pattern
        cache_manager.redis.scan_iter.assert_called_once_with(match="dashboard:*")

        # Verify delete was called for each key
        assert cache_manager.redis.delete.call_count == 2

    @pytest.mark.asyncio
    async def test_exists(self, cache_manager):
        """Test checking key existence."""
        cache_manager.redis.exists.return_value = 1

        result = await cache_manager.exists("dashboard:metrics")

        assert result is True
        cache_manager.redis.exists.assert_called_once_with("dashboard:metrics")

    @pytest.mark.asyncio
    async def test_exists_not_found(self, cache_manager):
        """Test checking non-existent key."""
        cache_manager.redis.exists.return_value = 0

        result = await cache_manager.exists("nonexistent")

        assert result is False

    @pytest.mark.asyncio
    async def test_increment(self, cache_manager):
        """Test incrementing a counter."""
        cache_manager.redis.incr.return_value = 5

        result = await cache_manager.increment("counter:requests")

        assert result == 5
        cache_manager.redis.incr.assert_called_once_with("counter:requests")

    @pytest.mark.asyncio
    async def test_expire(self, cache_manager):
        """Test setting expiration on existing key."""
        await cache_manager.expire("dashboard:metrics", 600)

        cache_manager.redis.expire.assert_called_once_with("dashboard:metrics", 600)


class TestCacheTTL:
    """Test TTL (Time To Live) management."""

    @pytest.fixture
    def cache_manager(self):
        """Create cache manager with mocked Redis."""
        manager = CacheManager()
        manager.redis = AsyncMock()
        return manager

    @pytest.mark.asyncio
    async def test_default_ttl(self, cache_manager):
        """Test default TTL is applied."""
        await cache_manager.set("key", "value")  # No TTL specified

        # Should use default TTL of 300 seconds (5 minutes)
        call_args = cache_manager.redis.setex.call_args[0]
        assert call_args[1] == 300

    @pytest.mark.asyncio
    async def test_custom_ttl(self, cache_manager):
        """Test custom TTL is applied."""
        custom_ttl = 1800  # 30 minutes

        await cache_manager.set("key", "value", ttl=custom_ttl)

        call_args = cache_manager.redis.setex.call_args[0]
        assert call_args[1] == custom_ttl

    @pytest.mark.asyncio
    async def test_short_ttl(self, cache_manager):
        """Test short TTL for volatile data."""
        short_ttl = 60  # 1 minute

        await cache_manager.set("volatile:data", "value", ttl=short_ttl)

        call_args = cache_manager.redis.setex.call_args[0]
        assert call_args[1] == short_ttl

    @pytest.mark.asyncio
    async def test_long_ttl(self, cache_manager):
        """Test long TTL for stable data."""
        long_ttl = 3600  # 1 hour

        await cache_manager.set("stable:data", "value", ttl=long_ttl)

        call_args = cache_manager.redis.setex.call_args[0]
        assert call_args[1] == long_ttl


class TestCacheSerialization:
    """Test cache serialization and deserialization."""

    @pytest.fixture
    def cache_manager(self):
        """Create cache manager with mocked Redis."""
        manager = CacheManager()
        manager.redis = AsyncMock()
        return manager

    @pytest.mark.asyncio
    async def test_serialize_dict(self, cache_manager):
        """Test serializing dictionary."""
        data = {"key": "value", "number": 123}

        await cache_manager.set("test", data)

        # Verify data was pickled
        call_args = cache_manager.redis.setex.call_args[0]
        serialized = call_args[2]
        deserialized = pickle.loads(serialized)

        assert deserialized == data

    @pytest.mark.asyncio
    async def test_serialize_list(self, cache_manager):
        """Test serializing list."""
        data = [1, 2, 3, "four", 5.0]

        await cache_manager.set("test", data)

        call_args = cache_manager.redis.setex.call_args[0]
        serialized = call_args[2]
        deserialized = pickle.loads(serialized)

        assert deserialized == data

    @pytest.mark.asyncio
    async def test_serialize_complex_object(self, cache_manager):
        """Test serializing complex nested object."""
        data = {
            "products": [
                {"id": 1, "name": "Product A", "price": 29.99},
                {"id": 2, "name": "Product B", "price": 49.99}
            ],
            "total": 79.98,
            "count": 2
        }

        await cache_manager.set("test", data)

        call_args = cache_manager.redis.setex.call_args[0]
        serialized = call_args[2]
        deserialized = pickle.loads(serialized)

        assert deserialized == data


class TestCachePerformance:
    """Test cache performance characteristics."""

    @pytest.fixture
    def cache_manager(self):
        """Create cache manager with mocked Redis."""
        manager = CacheManager()
        manager.redis = AsyncMock()
        return manager

    @pytest.mark.asyncio
    async def test_cache_hit(self, cache_manager):
        """Test cache hit scenario."""
        # Simulate cache hit
        cached_data = {"result": "cached"}
        cache_manager.redis.get.return_value = pickle.dumps(cached_data)

        result = await cache_manager.get("dashboard:metrics")

        assert result == cached_data
        # Should only call get, not compute
        cache_manager.redis.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_cache_miss(self, cache_manager):
        """Test cache miss scenario."""
        # Simulate cache miss
        cache_manager.redis.get.return_value = None

        result = await cache_manager.get("dashboard:metrics")

        assert result is None
        cache_manager.redis.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_cache_invalidation(self, cache_manager):
        """Test cache invalidation."""
        # Set value
        await cache_manager.set("dashboard:metrics", {"sales": 1000})

        # Invalidate
        await cache_manager.delete("dashboard:metrics")

        # Verify deletion
        cache_manager.redis.delete.assert_called_with("dashboard:metrics")


class TestCacheStrategies:
    """Test different caching strategies."""

    @pytest.fixture
    def cache_manager(self):
        """Create cache manager with mocked Redis."""
        manager = CacheManager()
        manager.redis = AsyncMock()
        return manager

    @pytest.mark.asyncio
    async def test_dashboard_cache_strategy(self, cache_manager):
        """Test dashboard caching strategy (5 min TTL)."""
        dashboard_data = {
            "sales_24h": 500000,
            "transactions_24h": 250,
            "customers_24h": 180
        }

        await cache_manager.set("dashboard:overview:24h", dashboard_data, ttl=300)

        call_args = cache_manager.redis.setex.call_args[0]
        assert call_args[1] == 300  # 5 minutes

    @pytest.mark.asyncio
    async def test_analytics_cache_strategy(self, cache_manager):
        """Test analytics caching strategy (1 hour TTL)."""
        analytics_data = {"hourly_sales": [100, 200, 150]}

        await cache_manager.set("analytics:hourly_sales", analytics_data, ttl=3600)

        call_args = cache_manager.redis.setex.call_args[0]
        assert call_args[1] == 3600  # 1 hour

    @pytest.mark.asyncio
    async def test_product_cache_strategy(self, cache_manager):
        """Test product caching strategy (30 min TTL)."""
        product_data = {"id": 1, "name": "Product", "price": 99.99}

        await cache_manager.set("products:1", product_data, ttl=1800)

        call_args = cache_manager.redis.setex.call_args[0]
        assert call_args[1] == 1800  # 30 minutes


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
