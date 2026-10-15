"""Session state. Framework-free: no FastAPI imports."""
from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

from app import config
from app.core.song import Resolver, Song

Role = Literal["host", "guest"]


class CommandError(Exception):
    """A rejected command. `code` is a protocol error code."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class Result:
    changed: bool = False
    notices: tuple[dict, ...] = ()


@dataclass
class Member:
    member_id: str
    name: str
    token: str
    role: Role
    connected: bool = False


@dataclass
class QueueItem:
    item_id: str
    song: Song
    added_by: str
    added_at: datetime

    def to_dict(self) -> dict:
        return {
            "itemId": self.item_id,
            "song": self.song.to_dict(),
            "addedBy": self.added_by,
            "addedAt": _iso(self.added_at),
        }


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


@dataclass
class Session:
    code: str
    resolve: Resolver = field(default=lambda _song_id: None, repr=False, compare=False)
    locked: bool = False
    rev: int = 0
    created_at: datetime = field(default_factory=_now)
    members: dict[str, Member] = field(default_factory=dict)  # keyed by memberId
    queue: list[QueueItem] = field(default_factory=list)
    now_playing: QueueItem | None = None
    player_status: Literal["idle", "playing", "paused"] = "idle"
    player_updated_at: datetime = field(default_factory=_now)

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

    def handle(self, member: Member, type_: str, payload: dict) -> Result:
        """Apply a client command."""
        if type_ == "session.lock":
            return Result(self._lock(member, payload))
        if type_ == "queue.add":
            return Result(self._queue_add(member, payload))
        if type_ == "queue.remove":
            return Result(self._queue_remove(member, payload))
        if type_ == "queue.move":
            return Result(self._queue_move(member, payload))
        if type_ == "player.next":
            self._require_host(member)
            return Result(self._skip_current())
        if type_ == "player.pause":
            self._require_host(member)
            return Result(self._set_status("playing", "paused"))
        if type_ == "player.resume":
            self._require_host(member)
            return Result(self._set_status("paused", "playing"))
        if type_ == "player.ended":
            self._require_host(member)
            return Result(self._finish_current(payload))
        if type_ == "player.error":
            self._require_host(member)
            return self._fail_current(payload)
        raise CommandError("unknown_type", f"Unknown message type: {type_}")

    def _lock(self, member: Member, payload: dict) -> bool:
        self._require_host(member)
        locked = payload.get("locked")
        if not isinstance(locked, bool):
            raise CommandError("invalid_payload", "`locked` must be a boolean.")
        if locked == self.locked:
            return False
        self.locked = locked
        self.touch()
        return True

    def _skip_current(self) -> bool:
        if self.now_playing is None:
            return False
        self._advance()
        return True

    def _set_status(self, expected: str, new: Literal["playing", "paused"]) -> bool:
        if self.now_playing is None or self.player_status != expected:
            return False
        self.player_status = new
        self.player_updated_at = _now()
        self.touch()
        return True

    def _finish_current(self, payload: dict) -> bool:
        if not self._is_current(payload):
            return False
        self._advance()
        return True

    def _fail_current(self, payload: dict) -> Result:
        reason = payload.get("reason")
        if not isinstance(reason, str):
            raise CommandError("invalid_payload", "`reason` must be a string.")
        if not self._is_current(payload):
            return Result()
        skipped = self.now_playing
        self._advance()
        notice = {"kind": "song_skipped", "itemId": skipped.item_id, "reason": reason}
        return Result(True, (notice,))

    def _is_current(self, payload: dict) -> bool:
        item_id = payload.get("itemId")
        if not isinstance(item_id, str):
            raise CommandError("invalid_payload", "`itemId` must be a string.")
        return self.now_playing is not None and self.now_playing.item_id == item_id

    def _advance(self) -> None:
        if self.queue:
            self.now_playing = self.queue.pop(0)
            self.player_status = "playing"
        else:
            self.now_playing = None
            self.player_status = "idle"
        self.player_updated_at = _now()
        self.touch()

    def _queue_add(self, member: Member, payload: dict) -> bool:
        song_id = payload.get("songId")
        if not isinstance(song_id, str) or not song_id:
            raise CommandError("invalid_payload", "`songId` must be a non-empty string.")
        song = self.resolve(song_id)
        if song is None:
            raise CommandError("song_not_found", "No song with that id.")
        mine = [i for i in self.queue if i.added_by == member.member_id]
        if any(i.song.song_id == song_id for i in mine):
            raise CommandError("already_queued", "You already queued that song.")
        if len(mine) >= config.MAX_QUEUE_PER_MEMBER:
            raise CommandError(
                "queue_full", f"You already have {config.MAX_QUEUE_PER_MEMBER} songs queued."
            )
        item = QueueItem("q_" + secrets.token_hex(4), song, member.member_id, _now())
        if self.now_playing is None:
            self.now_playing = item
            self.player_status = "playing"
            self.player_updated_at = item.added_at
        else:
            self.queue.append(item)
        self.touch()
        return True

    def _queue_remove(self, member: Member, payload: dict) -> bool:
        item = self._queued_item(payload)
        if member.role != "host" and item.added_by != member.member_id:
            raise CommandError("forbidden", "Only the owner or host can remove that.")
        self.queue.remove(item)
        self.touch()
        return True

    def _queue_move(self, member: Member, payload: dict) -> bool:
        self._require_host(member)
        item = self._queued_item(payload)
        to_index = payload.get("toIndex")
        if not isinstance(to_index, int) or isinstance(to_index, bool):
            raise CommandError("invalid_payload", "`toIndex` must be an integer.")
        to_index = max(0, min(to_index, len(self.queue) - 1))
        if self.queue.index(item) == to_index:
            return False
        self.queue.remove(item)
        self.queue.insert(to_index, item)
        self.touch()
        return True

    def _queued_item(self, payload: dict) -> QueueItem:
        item_id = payload.get("itemId")
        if not isinstance(item_id, str):
            raise CommandError("invalid_payload", "`itemId` must be a string.")
        for item in self.queue:
            if item.item_id == item_id:
                return item
        raise CommandError("invalid_payload", "No queued item with that id.")

    def snapshot(self) -> dict:
        return {
            "code": self.code,
            "protocolVersion": config.PROTOCOL_VERSION,
            "rev": self.rev,
            "queue": [i.to_dict() for i in self.queue],
            "nowPlaying": self.now_playing.to_dict() if self.now_playing else None,
            "player": {
                "status": self.player_status,
                "positionMs": 0,
                "updatedAt": _iso(self.player_updated_at),
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
