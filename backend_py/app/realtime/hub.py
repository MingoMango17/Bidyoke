import asyncio

from app.core.manager import SessionManager
from app.core.session import Session
from app.realtime.conn import Conn


class Hub:
    """Tracks live connections per session and fans state out to them."""

    def __init__(self, sessions: SessionManager, grace_seconds: float) -> None:
        self._sessions = sessions
        self._grace = grace_seconds
        self._rooms: dict[str, dict[str, Conn]] = {}
        self._timers: dict[str, asyncio.Task] = {}

    async def attach(self, session: Session, conn: Conn) -> None:
        room = self._rooms.setdefault(session.code, {})
        old = room.get(conn.member.member_id)
        room[conn.member.member_id] = conn
        if old is not None:
            await old.close(4009)  # replaced by newer connection
        if session.set_connected(conn.member, True):
            self.broadcast(session)
        else:
            conn.send(self._state_msg(session))
        if conn.member.role == "host":
            timer = self._timers.pop(session.code, None)
            if timer is not None:
                timer.cancel()
                self.notify(session, {"kind": "host_reconnected"})

    def detach(self, session: Session, conn: Conn) -> None:
        conn.stop()
        room = self._rooms.get(session.code, {})
        if room.get(conn.member.member_id) is not conn:
            return  # already replaced; the newer socket owns presence
        del room[conn.member.member_id]
        if self._sessions.get(session.code) is not session:
            return  # session ended
        if conn.member.member_id not in session.members:
            return  # kicked
        changed = session.set_connected(conn.member, False)
        if conn.member.role == "host":
            changed = session.pause_for_host_loss() or changed
            self.notify(session, {"kind": "host_disconnected"})
            self._timers[session.code] = asyncio.create_task(self._expire_after_grace(session))
        if changed:
            self.broadcast(session)

    async def kick(self, session: Session, member_id: str) -> None:
        conn = self._rooms.get(session.code, {}).pop(member_id, None)
        if conn is not None:
            await conn.close(4003)

    async def end_session(self, session: Session) -> None:
        self._sessions.remove(session.code)
        timer = self._timers.pop(session.code, None)
        if timer is not None:
            timer.cancel()
        for conn in list(self._rooms.pop(session.code, {}).values()):
            await conn.close(4004)

    async def _expire_after_grace(self, session: Session) -> None:
        await asyncio.sleep(self._grace)
        self._timers.pop(session.code, None)
        await self.end_session(session)

    def broadcast(self, session: Session) -> None:
        msg = self._state_msg(session)
        for conn in list(self._rooms.get(session.code, {}).values()):
            conn.send(msg)

    def notify(self, session: Session, payload: dict) -> None:
        msg = {"type": "notice", "payload": payload}
        for conn in list(self._rooms.get(session.code, {}).values()):
            conn.send(msg)

    def fan_out_position(self, session: Session, payload: dict) -> None:
        msg = {"type": "player.position", "payload": payload}
        for conn in list(self._rooms.get(session.code, {}).values()):
            if conn.member.role != "host":
                conn.send(msg)

    @staticmethod
    def _state_msg(session: Session) -> dict:
        return {"type": "state", "payload": session.snapshot()}
