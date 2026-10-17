from fastapi import WebSocket

from app.core.session import CommandError, Member, Session
from app.ratelimit import TokenBucket
from app.realtime.conn import Conn
from app.realtime.hub import Hub
from app.realtime.protocol import MAX_MESSAGE_BYTES, BadFrame, error_msg, parse_frame


WS_RATE_PER_SEC = 20
WS_BURST = 40


async def read_loop(ws: WebSocket, hub: Hub, session: Session, member: Member, conn: Conn):
    bucket = TokenBucket(WS_RATE_PER_SEC, WS_BURST)
    while True:
        event = await ws.receive()
        if event["type"] == "websocket.disconnect":
            return
        if not bucket.allow():
            await conn.close(4008)
            return
        text = event.get("text")
        if text is None:
            conn.send(error_msg("bad_request", "Only text frames are supported."))
            continue
        if len(text.encode()) > MAX_MESSAGE_BYTES:
            await conn.close(1009)
            return

        try:
            type_, payload, id_ = parse_frame(text)
        except BadFrame as e:
            conn.send(error_msg(e.code, e.message, e.id))
            continue

        if type_ == "ping":
            conn.send({"type": "pong"})
            continue
        try:
            result = await session.handle(member, type_, payload)
        except CommandError as e:
            conn.send(error_msg(e.code, e.message, id_))
            continue
        if result.changed:
            hub.broadcast(session)
        for notice in result.notices:
            hub.notify(session, notice)
        if result.position:
            hub.fan_out_position(session, result.position)
        if result.kicked:
            await hub.kick(session, result.kicked)
        if result.ended:
            await hub.end_session(session)
            return
