from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, collaboration_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[collaboration_id].append(websocket)

    def disconnect(self, collaboration_id: int, websocket: WebSocket) -> None:
        connections = self.active_connections.get(collaboration_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections and collaboration_id in self.active_connections:
            del self.active_connections[collaboration_id]

    async def broadcast_slots(self, collaboration_id: int, payload: dict) -> None:
        disconnected: list[WebSocket] = []
        for connection in self.active_connections.get(collaboration_id, []):
            try:
                await connection.send_json({"type": "slots.updated", "payload": payload})
            except RuntimeError:
                disconnected.append(connection)

        for connection in disconnected:
            self.disconnect(collaboration_id, connection)


manager = ConnectionManager()
