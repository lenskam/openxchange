import json
import logging
from typing import Any, Dict, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self._connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self._connections[user_id] = websocket
        logger.info(f"WebSocket connected: user {user_id}")
        await self.send_to(user_id, "connection_established", {
            "user_id": user_id,
            "message": "Connected to Interxchange real-time updates",
        })

    def disconnect(self, user_id: int):
        self._connections.pop(user_id, None)
        logger.info(f"WebSocket disconnected: user {user_id}")

    async def send_to(self, user_id: int, event: str, data: Any):
        ws = self._connections.get(user_id)
        if ws:
            try:
                await ws.send_json({"event": event, "data": data})
            except Exception as e:
                logger.error(f"WebSocket send error to user {user_id}: {e}")
                self.disconnect(user_id)

    async def broadcast(self, event: str, data: Any, exclude_user_id: Optional[int] = None):
        message = {"event": event, "data": data}
        for user_id, ws in list(self._connections.items()):
            if user_id == exclude_user_id:
                continue
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"WebSocket broadcast error to user {user_id}: {e}")
                self.disconnect(user_id)

    @property
    def active_connections(self) -> int:
        return len(self._connections)


ws_manager = WebSocketManager()
