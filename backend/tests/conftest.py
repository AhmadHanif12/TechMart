"""
Pytest configuration and fixtures for TechMart tests.
"""
import pytest
import asyncio
from typing import Generator
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_db_session() -> AsyncMock:
    """Create a mocked database session."""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    return session


@pytest.fixture
def mock_cache_manager() -> AsyncMock:
    """Create a mocked cache manager."""
    cache = AsyncMock()
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock()
    cache.delete = AsyncMock()
    cache.exists = AsyncMock(return_value=False)
    return cache


@pytest.fixture
def sample_product_data() -> dict:
    """Sample product data for tests."""
    return {
        "id": 1,
        "name": "Test Product",
        "sku": "TEST-001",
        "category": "Electronics",
        "stock_quantity": 50,
        "reorder_threshold": 20,
        "reorder_quantity": 100,
        "price": 29.99,
        "supplier_id": 1
    }


@pytest.fixture
def sample_transaction_data() -> dict:
    """Sample transaction data for tests."""
    return {
        "id": 1,
        "customer_id": 42,
        "product_id": 1,
        "quantity": 2,
        "total_amount": 59.98,
        "status": "completed",
        "is_suspicious": False,
        "fraud_score": 0.12,
        "payment_method": "credit_card"
    }


@pytest.fixture
def sample_supplier_data() -> dict:
    """Sample supplier data for tests."""
    return {
        "id": 1,
        "name": "Test Supplier",
        "reliability_score": 0.95,
        "average_delivery_days": 5,
        "payment_terms": "NET30"
    }
