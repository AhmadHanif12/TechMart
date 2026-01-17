"""WebSocket API endpoint for real-time updates."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import logging

from app.websocket import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/dashboard")
async def websocket_dashboard(
    websocket: WebSocket,
    user_id: Optional[str] = Query(None),
    channels: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for real-time dashboard updates.

    Query Parameters:
    - user_id: Optional user identifier
    - channels: Comma-separated list of channels to subscribe to
               Available: dashboard, transactions, inventory, alerts, analytics

    Message Format (Server -> Client):
    {
        "type": "event_type",
        "channel": "channel_name",
        "timestamp": "2024-01-01T00:00:00Z",
        "data": {...}
    }

    Client Actions (send JSON):
    - Subscribe: {"action": "subscribe", "channel": "channel_name"}
    - Unsubscribe: {"action": "unsubscribe", "channel": "channel_name"}
    - Ping: {"action": "ping"}
    """
    # Parse channels from query parameter
    channel_list = None
    if channels:
        channel_list = [c.strip() for c in channels.split(",") if c.strip()]

    # Accept connection
    await manager.connect(websocket, user_id, channel_list)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "subscribe":
                channel = data.get("channel")
                if channel:
                    await manager.subscribe(websocket, channel)

            elif action == "unsubscribe":
                channel = data.get("channel")
                if channel:
                    await manager.unsubscribe(websocket, channel)

            elif action == "ping":
                await manager.send_to_connection(websocket, {"pong": True}, "pong")

            else:
                logger.warning(f"Unknown action: {action}")
                await manager.send_to_connection(
                    websocket,
                    {"error": f"Unknown action: {action}"},
                    "error"
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected: {user_id or 'anonymous'}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics."""
    return {
        "success": True,
        "data": manager.get_stats(),
        "error": None
    }
