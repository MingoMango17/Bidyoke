"""Session registry, join codes, and member creation."""
from __future__ import annotations

import secrets

from app.core.session import Member, Role, Session
from app.core.song import Resolver

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 5


class SessionManager:
    def __init__(self, resolve: Resolver) -> None:
        self._resolve = resolve
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
        self._sessions.pop(code, None)

    def create(self, host_name: str = "Host") -> tuple[Session, Member]:
        code = self._new_code()
        session = Session(code=code, resolve=self._resolve)
        self._sessions[code] = session
        host = self.add_member(session, host_name, "host")
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
        return member

    def _new_code(self) -> str:
        while True:
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
            if code not in self._sessions:
                return code
