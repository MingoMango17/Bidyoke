import asyncio
import logging
from collections.abc import Callable

from app.core.manager import SessionManager
from app.core.messages import NoticeKind, Role, ServerMessage
from app.core.session import Session
from app.realtime.conn import Conn

log = logging.getLogger(__name__)


class Hub:
    """Tracks live connections per session and fans state out to them."""

    def __init__(self, sessions: SessionManager, grace_seconds: float) -> None:
        self._sessions = sessions
        self._grace = grace_seconds
        self._rooms: dict[str, dict[str, Conn]] = {}
        self._timers: dict[str, asyncio.Task] = {}
        self.on_state: Callable[[Session], None] | None = None

    async def attach(self, session: Session, conn: Conn) -> None:
        room = self._rooms.setdefault(session.code, {})
        old = room.get(conn.member.member_id)
        room[conn.member.member_id] = conn
        log.info("ws connected code=%s member=%s role=%s", session.code, conn.member.member_id, conn.member.role)
        if old is not None:
            log.info("ws replaced code=%s member=%s", session.code, conn.member.member_id)
            await old.close(4009)  # replaced by newer connection
        if session.set_connected(conn.member, True):
            self.broadcast(session)
        else:
            conn.send(self._state_msg(session))
        if conn.member.role == Role.HOST:
            timer = self._timers.pop(session.code, None)
            if timer is not None:
                timer.cancel()
                log.info("host reconnected code=%s", session.code)
                self.notify(session, {"kind": NoticeKind.HOST_RECONNECTED})

    def detach(self, session: Session, conn: Conn) -> None:
        conn.stop()
        room = self._rooms.get(session.code, {})
        if room.get(conn.member.member_id) is not conn:
            return  # already replaced; the newer socket owns presence
        del room[conn.member.member_id]
        log.info("ws disconnected code=%s member=%s", session.code, conn.member.member_id)
        if self._sessions.get(session.code) is not session:
            return  # session ended
        if conn.member.member_id not in session.members:
            return  # kicked
        changed = session.set_connected(conn.member, False)
        if conn.member.role == Role.HOST:
            changed = session.pause_for_host_loss() or changed
            log.warning("host disconnected code=%s grace=%ss", session.code, self._grace)
            self.notify(session, {"kind": NoticeKind.HOST_DISCONNECTED})
            self._timers[session.code] = asyncio.create_task(self._expire_after_grace(session))
        if changed:
            self.broadcast(session)

    async def kick(self, session: Session, member_id: str) -> None:
        conn = self._rooms.get(session.code, {}).pop(member_id, None)
        if conn is not None:
            log.info("member kicked code=%s member=%s", session.code, member_id)
            await conn.close(4003)

    async def end_session(self, session: Session) -> None:
        self._sessions.remove(session.code)
        timer = self._timers.pop(session.code, None)
        if timer is not None:
            timer.cancel()
        conns = list(self._rooms.pop(session.code, {}).values())
        log.info("closing session code=%s connections=%d", session.code, len(conns))
        for conn in conns:
            await conn.close(4004)

    async def _expire_after_grace(self, session: Session) -> None:
        await asyncio.sleep(self._grace)
        log.warning("host grace expired, ending session code=%s", session.code)
        self._timers.pop(session.code, None)
        await self.end_session(session)

    def broadcast(self, session: Session) -> None:
        msg = self._state_msg(session)
        for conn in list(self._rooms.get(session.code, {}).values()):
            conn.send(msg)
        if self.on_state is not None:
            self.on_state(session)

    def notify(self, session: Session, payload: dict) -> None:
        msg = {"type": ServerMessage.NOTICE, "payload": payload}
        for conn in list(self._rooms.get(session.code, {}).values()):
            conn.send(msg)

    def fan_out_position(self, session: Session, payload: dict) -> None:
        msg = {"type": ServerMessage.PLAYER_POSITION, "payload": payload}
        for conn in list(self._rooms.get(session.code, {}).values()):
            if conn.member.role != Role.HOST:
                conn.send(msg)

    @staticmethod
    def _state_msg(session: Session) -> dict:
        return {"type": ServerMessage.STATE, "payload": session.snapshot()}
