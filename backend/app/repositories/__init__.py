"""Repository layer for data access."""
from app.repositories.base import BaseRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.alert_repository import AlertRepository
from app.repositories.inventory_repository import (
    InventoryPredictionRepository,
    ReorderSuggestionRepository
)

__all__ = [
    "BaseRepository",
    "ProductRepository",
    "CustomerRepository",
    "TransactionRepository",
    "AlertRepository",
    "InventoryPredictionRepository",
    "ReorderSuggestionRepository",
]
