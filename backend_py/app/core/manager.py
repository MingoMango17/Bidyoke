"""Session registry, join codes, and member creation."""
from __future__ import annotations

import logging
import secrets
import time

from app.core.messages import Role
from app.core.session import Member, Session
from app.core.song import ChannelProvider, Resolver, no_channel

log = logging.getLogger(__name__)

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 5


class SessionManager:
    def __init__(self, resolve: Resolver, channel: ChannelProvider = no_channel) -> None:
        self._resolve = resolve
        self._channel = channel
        self._sessions: dict[str, Session] = {}

    def get(self, code: str) -> Session | None:
        return self._sessions.get(code.strip().upper())

    def member_by_token(self, token: str) -> Member | None:
        for session in self._sessions.values():
            member = session.member_by_token(token)
            if member is not None:
                return member
        return None

    def remove(self, code: str) -> None:
        if self._sessions.pop(code, None) is not None:
            log.info("session removed code=%s", code)

    def idle(self, ttl: float) -> list[Session]:
        cutoff = time.monotonic() - ttl
        return [s for s in self._sessions.values() if s.last_activity < cutoff]

    def create(self, host_name: str = "Host") -> tuple[Session, Member]:
        code = self._new_code()
        session = Session(code=code, resolve=self._resolve, channel=self._channel)
        self._sessions[code] = session
        log.info("session created code=%s", code)
        host = self.add_member(session, host_name, Role.HOST)
        return session, host

    def add_member(self, session: Session, name: str, role: Role) -> Member:
        member = Member(
            member_id="m_" + secrets.token_hex(4),
            name=name,
            token=secrets.token_urlsafe(24),
            role=role,
        )
        session.members[member.member_id] = member
        session.touch()
        log.info("member added code=%s member=%s role=%s", session.code, member.member_id, role)
        return member

    def _new_code(self) -> str:
        while True:
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
            if code not in self._sessions:
                return code
