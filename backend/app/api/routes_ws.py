from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.database import SessionLocal
from app.models.collaboration import Collaboration
from app.realtime import manager
from app.api.utils import slot_payload

router = APIRouter(prefix="/ws", tags=["websockets"])


@router.websocket("/collaborations/{collaboration_id}")
async def collaboration_slots(websocket: WebSocket, collaboration_id: int) -> None:
    await manager.connect(collaboration_id, websocket)
    db = SessionLocal()
    try:
        collaboration = db.get(Collaboration, collaboration_id)
        if collaboration:
            await websocket.send_json({"type": "slots.snapshot", "payload": slot_payload(db, collaboration)})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(collaboration_id, websocket)
    finally:
        db.close()
