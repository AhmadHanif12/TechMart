"""API v1 routers."""
from app.api.v1 import dashboard, transactions, inventory, analytics, alerts, websocket

__all__ = ["dashboard", "transactions", "inventory", "analytics", "alerts", "websocket"]
