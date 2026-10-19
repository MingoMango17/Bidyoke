import logging

from fastapi import WebSocket

from app.core.messages import ClientMessage, ErrorCode, ServerMessage
from app.core.ratelimit import TokenBucket
from app.core.session import CommandError, Member, Session
from app.realtime.conn import Conn
from app.realtime.hub import Hub
from app.realtime.protocol import MAX_MESSAGE_BYTES, BadFrame, error_msg, parse_frame


log = logging.getLogger(__name__)

WS_RATE_PER_SEC = 20
WS_BURST = 40


async def read_loop(ws: WebSocket, hub: Hub, session: Session, member: Member, conn: Conn):
    bucket = TokenBucket(WS_RATE_PER_SEC, WS_BURST)
    while True:
        event = await ws.receive()
        if event["type"] == "websocket.disconnect":
            return
        if not bucket.allow():
            log.warning("ws flood, closing code=%s member=%s", session.code, member.member_id)
            await conn.close(4008)
            return
        text = event.get("text")
        if text is None:
            conn.send(error_msg(ErrorCode.BAD_REQUEST, "Only text frames are supported."))
            continue
        if len(text.encode()) > MAX_MESSAGE_BYTES:
            log.warning("ws message too big code=%s member=%s", session.code, member.member_id)
            await conn.close(1009)
            return

        try:
            type_, payload, id_ = parse_frame(text)
        except BadFrame as e:
            conn.send(error_msg(e.code, e.message, e.id))
            continue

        if type_ == ClientMessage.PING:
            conn.send({"type": ServerMessage.PONG})
            continue
        try:
            result = await session.handle(member, type_, payload)
        except CommandError as e:
            log.info("command rejected type=%s code=%s session=%s member=%s", type_, e.code, session.code, member.member_id)
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
            log.info("session ended by host code=%s", session.code)
            await hub.end_session(session)
            return
