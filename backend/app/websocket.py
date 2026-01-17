"""WebSocket connection manager for real-time updates."""
from typing import List, Dict, Set, Optional
from fastapi import WebSocket
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manager for WebSocket connections and broadcasts."""

    def __init__(self):
        # Active WebSocket connections
        self.active_connections: List[WebSocket] = []

        # Track metadata for each connection
        self.connection_metadata: Dict[WebSocket, dict] = {}

        # Channels for targeted broadcasts
        self.channels: Dict[str, Set[WebSocket]] = {
            "dashboard": set(),
            "transactions": set(),
            "inventory": set(),
            "alerts": set(),
            "analytics": set(),
        }

        # Statistics
        self.total_connections = 0
        self.messages_sent = 0

    async def connect(
        self,
        websocket: WebSocket,
        user_id: Optional[str] = None,
        channels: Optional[List[str]] = None
    ):
        """
        Accept and register a new WebSocket connection.

        Args:
            websocket: WebSocket connection
            user_id: Optional user identifier
            channels: List of channels to subscribe to
        """
        await websocket.accept()

        self.active_connections.append(websocket)
        self.total_connections += 1

        # Store metadata
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "connected_at": datetime.utcnow(),
            "subscriptions": set(channels or ["dashboard"]),
        }

        # Add to requested channels
        for channel in (channels or ["dashboard"]):
            if channel in self.channels:
                self.channels[channel].add(websocket)

        logger.info(
            f"WebSocket connected: {user_id or 'anonymous'}. "
            f"Total connections: {len(self.active_connections)}"
        )

        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "timestamp": datetime.utcnow().isoformat(),
            "channels": list(self.connection_metadata[websocket]["subscriptions"]),
        })

    def disconnect(self, websocket: WebSocket):
        """
        Remove a WebSocket connection.

        Args:
            websocket: WebSocket connection to remove
        """
        if websocket in self.active_connections:
            # Remove from all channels
            subscriptions = self.connection_metadata.get(websocket, {}).get("subscriptions", set())
            for channel in subscriptions:
                if channel in self.channels and websocket in self.channels[channel]:
                    self.channels[channel].discard(websocket)

            # Remove from active connections and metadata
            self.active_connections.remove(websocket)
            del self.connection_metadata[websocket]

            logger.info(
                f"WebSocket disconnected. "
                f"Total connections: {len(self.active_connections)}"
            )

    async def subscribe(self, websocket: WebSocket, channel: str):
        """
        Subscribe a connection to a specific channel.

        Args:
            websocket: WebSocket connection
            channel: Channel name to subscribe to
        """
        if websocket in self.active_connections and channel in self.channels:
            self.channels[channel].add(websocket)
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["subscriptions"].add(channel)

            await websocket.send_json({
                "type": "subscribed",
                "channel": channel,
                "timestamp": datetime.utcnow().isoformat(),
            })
            logger.info(f"Connection subscribed to {channel}")

    async def unsubscribe(self, websocket: WebSocket, channel: str):
        """
        Unsubscribe a connection from a specific channel.

        Args:
            websocket: WebSocket connection
            channel: Channel name to unsubscribe from
        """
        if websocket in self.active_connections and channel in self.channels:
            self.channels[channel].discard(websocket)
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["subscriptions"].discard(channel)

            await websocket.send_json({
                "type": "unsubscribed",
                "channel": channel,
                "timestamp": datetime.utcnow().isoformat(),
            })

    async def broadcast(self, message: dict, event_type: str = None):
        """
        Broadcast a message to all connected clients.

        Args:
            message: Message data to broadcast
            event_type: Optional event type identifier
        """
        if not self.active_connections:
            return

        payload = {
            "type": event_type or "broadcast",
            "timestamp": datetime.utcnow().isoformat(),
            "data": message,
        }

        # Remove dead connections
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
                self.messages_sent += 1
            except Exception as e:
                logger.warning(f"Failed to send to connection: {e}")
                dead_connections.append(connection)

        # Clean up dead connections
        for connection in dead_connections:
            self.disconnect(connection)

    async def broadcast_to_channel(self, channel: str, message: dict, event_type: str = None):
        """
        Broadcast a message to all clients subscribed to a specific channel.

        Args:
            channel: Channel name
            message: Message data to broadcast
            event_type: Optional event type identifier
        """
        if channel not in self.channels:
            logger.warning(f"Unknown channel: {channel}")
            return

        if not self.channels[channel]:
            return

        payload = {
            "type": event_type or "channel_broadcast",
            "channel": channel,
            "timestamp": datetime.utcnow().isoformat(),
            "data": message,
        }

        # Remove dead connections
        dead_connections = []
        for connection in list(self.channels[channel]):
            try:
                await connection.send_json(payload)
                self.messages_sent += 1
            except Exception as e:
                logger.warning(f"Failed to send to connection on {channel}: {e}")
                dead_connections.append(connection)

        # Clean up dead connections
        for connection in dead_connections:
            self.disconnect(connection)

    async def send_to_connection(self, websocket: WebSocket, message: dict, event_type: str = None):
        """
        Send a message to a specific connection.

        Args:
            websocket: WebSocket connection
            message: Message data to send
            event_type: Optional event type identifier
        """
        if websocket not in self.active_connections:
            return

        try:
            payload = {
                "type": event_type or "direct_message",
                "timestamp": datetime.utcnow().isoformat(),
                "data": message,
            }
            await websocket.send_json(payload)
            self.messages_sent += 1
        except Exception as e:
            logger.warning(f"Failed to send direct message: {e}")
            self.disconnect(websocket)

    def get_stats(self) -> dict:
        """Get connection statistics."""
        return {
            "active_connections": len(self.active_connections),
            "total_connections": self.total_connections,
            "messages_sent": self.messages_sent,
            "channel_subscribers": {
                channel: len(connections)
                for channel, connections in self.channels.items()
            },
        }


# Global connection manager instance
manager = ConnectionManager()


# Helper functions for common broadcasts
async def broadcast_new_transaction(transaction_data: dict):
    """Broadcast when a new transaction is created."""
    await manager.broadcast_to_channel(
        "transactions",
        transaction_data,
        "new_transaction"
    )
    await manager.broadcast_to_channel(
        "dashboard",
        {"transaction": transaction_data},
        "dashboard_update"
    )


async def broadcast_stock_update(product_data: dict):
    """Broadcast when product stock changes."""
    await manager.broadcast_to_channel(
        "inventory",
        product_data,
        "stock_update"
    )
    await manager.broadcast_to_channel(
        "dashboard",
        {"product": product_data},
        "dashboard_update"
    )


async def broadcast_new_alert(alert_data: dict):
    """Broadcast when a new alert is created."""
    await manager.broadcast_to_channel(
        "alerts",
        alert_data,
        "new_alert"
    )
    await manager.broadcast_to_channel(
        "dashboard",
        {"alert": alert_data},
        "dashboard_update"
    )


async def broadcast_fraud_detected(transaction_data: dict):
    """Broadcast when suspicious transaction is detected."""
    await manager.broadcast_to_channel(
        "transactions",
        transaction_data,
        "fraud_detected"
    )
    await manager.broadcast_to_channel(
        "alerts",
        transaction_data,
        "fraud_alert"
    )


async def broadcast_dashboard_metrics(metrics: dict):
    """Broadcast periodic dashboard metrics updates."""
    await manager.broadcast_to_channel(
        "dashboard",
        metrics,
        "metrics_update"
    )
