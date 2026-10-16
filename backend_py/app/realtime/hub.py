from app.core.manager import SessionManager
from app.core.session import Session
from app.realtime.conn import Conn


class Hub:
    """Tracks live connections per session and fans state out to them."""

    def __init__(self, sessions: SessionManager) -> None:
        self._sessions = sessions
        self._rooms: dict[str, dict[str, Conn]] = {}

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
        if session.set_connected(conn.member, False):
            self.broadcast(session)

    async def kick(self, session: Session, member_id: str) -> None:
        conn = self._rooms.get(session.code, {}).pop(member_id, None)
        if conn is not None:
            await conn.close(4003)

    async def end_session(self, session: Session) -> None:
        self._sessions.remove(session.code)
        for conn in list(self._rooms.pop(session.code, {}).values()):
            await conn.close(4004)

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
