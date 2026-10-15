"""Session registry, join codes, and member creation."""
from __future__ import annotations

import secrets

from app.core.session import Member, Role, Session

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 5


class SessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def get(self, code: str) -> Session | None:
        return self._sessions.get(code.strip().upper())

    def create(self, host_name: str = "Host") -> tuple[Session, Member]:
        code = self._new_code()
        session = Session(code=code)
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
        return member

    def _new_code(self) -> str:
        while True:
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
            if code not in self._sessions:
                return code
