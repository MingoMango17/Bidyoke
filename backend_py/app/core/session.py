"""Session state. Framework-free: no FastAPI imports (see plan §3)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

Role = Literal["host", "guest"]


@dataclass
class Member:
    member_id: str
    name: str
    token: str
    role: Role
    connected: bool = False


@dataclass
class Session:
    code: str
    locked: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    members: dict[str, Member] = field(default_factory=dict)  # keyed by memberId

    def member_by_token(self, token: str) -> Member | None:
        for m in self.members.values():
            if m.token == token:
                return m
        return None
