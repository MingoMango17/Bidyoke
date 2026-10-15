"""Session state. Framework-free: no FastAPI imports."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

from app import config

Role = Literal["host", "guest"]


class CommandError(Exception):
    """A rejected command. `code` is a protocol error code."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


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
    rev: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    members: dict[str, Member] = field(default_factory=dict)  # keyed by memberId

    def member_by_token(self, token: str) -> Member | None:
        for m in self.members.values():
            if m.token == token:
                return m
        return None

    def touch(self) -> None:
        """Mark state changed. Every visible change bumps `rev`."""
        self.rev += 1

    def set_connected(self, member: Member, connected: bool) -> bool:
        if member.connected == connected:
            return False
        member.connected = connected
        self.touch()
        return True

    def handle(self, member: Member, type_: str, payload: dict) -> bool:
        """Apply a client command. Returns True if state changed."""
        if type_ == "session.lock":
            self._require_host(member)
            locked = payload.get("locked")
            if not isinstance(locked, bool):
                raise CommandError("invalid_payload", "`locked` must be a boolean.")
            if locked == self.locked:
                return False
            self.locked = locked
            self.touch()
            return True
        raise CommandError("unknown_type", f"Unknown message type: {type_}")

    def snapshot(self) -> dict:
        return {
            "code": self.code,
            "protocolVersion": config.PROTOCOL_VERSION,
            "rev": self.rev,
            "queue": [],
            "nowPlaying": None,
            "player": {
                "status": "idle",
                "positionMs": 0,
                "updatedAt": self.created_at.isoformat().replace("+00:00", "Z"),
            },
            "members": [
                {"memberId": m.member_id, "name": m.name, "role": m.role, "connected": m.connected}
                for m in self.members.values()
            ],
            "scores": [],
            "settings": {
                "maxQueuePerMember": config.MAX_QUEUE_PER_MEMBER,
                "locked": self.locked,
            },
        }

    @staticmethod
    def _require_host(member: Member) -> None:
        if member.role != "host":
            raise CommandError("forbidden", "Only the host can do that.")
