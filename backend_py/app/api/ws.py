from fastapi import APIRouter, Depends, WebSocket

from app.api.deps import get_container
from app.container import Container
from app.realtime.conn import Conn
from app.realtime.handshake import deny, origin_allowed
from app.realtime.loop import read_loop

router = APIRouter()


@router.websocket("/ws/sessions/{code}")
async def session_socket(
    ws: WebSocket, code: str, container: Container = Depends(get_container)
):
    session = container.sessions.get(code)
    if session is None:
        return await deny(ws, 404, "session_not_found", "No session with that code.")
    member = session.member_by_token(ws.query_params.get("token", ""))
    if member is None:
        return await deny(ws, 401, "invalid_token", "Missing or invalid token.")
    if not origin_allowed(ws):
        return await deny(ws, 403, "forbidden", "Origin not allowed.")

    await ws.accept()
    hub = container.hub
    conn = Conn(ws, member)
    await hub.attach(session, conn)
    try:
        await read_loop(ws, hub, session, member, conn)
    finally:
        hub.detach(session, conn)
