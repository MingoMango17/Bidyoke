"""Session state. Framework-free: no FastAPI imports."""
from __future__ import annotations

import secrets
import time
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app import config
from app.core.messages import Command, ErrorCode, NoticeKind, PlayerStatus, Role, SuggestionReason
from app.core.song import ChannelProvider, Resolver, Song, SourceUnavailable, no_channel

POSITION_FANOUT_INTERVAL = 1.0
SUGGESTION_LIMIT = 5
CHANNEL_LIMIT = 3


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
    position: dict | None = None
    kicked: str | None = None
    ended: bool = False


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


async def _no_song(_song_id: str) -> Song | None:
    return None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class Suggestion:
    song: Song
    reason: SuggestionReason
    context: str | None = None

    def to_dict(self) -> dict:
        return {"song": self.song.to_dict(), "reason": self.reason, "context": self.context}


@dataclass
class Session:
    code: str
    resolve: Resolver = field(default=_no_song, repr=False, compare=False)
    channel: ChannelProvider = field(default=no_channel, repr=False, compare=False)
    locked: bool = False
    max_queue_per_member: int | None = field(default_factory=lambda: config.MAX_QUEUE_PER_MEMBER)
    rev: int = 0
    last_activity: float = field(default_factory=time.monotonic)
    created_at: datetime = field(default_factory=_now)
    members: dict[str, Member] = field(default_factory=dict)  # keyed by memberId
    queue: list[QueueItem] = field(default_factory=list)
    now_playing: QueueItem | None = None
    player_status: PlayerStatus = PlayerStatus.IDLE
    player_updated_at: datetime = field(default_factory=_now)
    player_position_ms: int = 0
    history: list[QueueItem] = field(default_factory=list)
    scores: list[dict] = field(default_factory=list)
    _last_fanout: float = field(default=-POSITION_FANOUT_INTERVAL, init=False, repr=False)

    def member_by_token(self, token: str) -> Member | None:
        for m in self.members.values():
            if m.token == token:
                return m
        return None

    def touch(self) -> None:
        """Mark state changed. Every visible change bumps `rev`."""
        self.rev += 1
        self.last_activity = time.monotonic()

    def set_connected(self, member: Member, connected: bool) -> bool:
        if member.connected == connected:
            return False
        member.connected = connected
        self.touch()
        return True

    async def handle(self, member: Member, type_: str, payload: dict) -> Result:
        """Apply a client command."""
        if type_ == Command.SESSION_LOCK:
            return Result(self._lock(member, payload))
        if type_ == Command.QUEUE_ADD:
            return Result(await self._queue_add(member, payload))
        if type_ == Command.QUEUE_REMOVE:
            return Result(self._queue_remove(member, payload))
        if type_ == Command.QUEUE_MOVE:
            return Result(self._queue_move(member, payload))
        if type_ == Command.PLAYER_NEXT:
            self._require_manager(member)
            return Result(self._skip_current())
        if type_ == Command.PLAYER_PAUSE:
            self._require_manager(member)
            return Result(self._set_status(PlayerStatus.PLAYING, PlayerStatus.PAUSED))
        if type_ == Command.PLAYER_RESUME:
            self._require_manager(member)
            return Result(self._set_status(PlayerStatus.PAUSED, PlayerStatus.PLAYING))
        if type_ == Command.PLAYER_ENDED:
            self._require_host(member)
            return Result(self._finish_current(payload))
        if type_ == Command.PLAYER_ERROR:
            self._require_host(member)
            return self._fail_current(payload)
        if type_ == Command.PLAYER_POSITION:
            self._require_host(member)
            return self._report_position(payload)
        if type_ == Command.SESSION_KICK:
            self._require_manager(member)
            return self._kick(member, payload)
        if type_ == Command.SESSION_PROMOTE:
            self._require_manager(member)
            return self._promote(payload)
        if type_ == Command.SESSION_DEMOTE:
            self._require_manager(member)
            self._set_role(payload, Role.SUBHOST, Role.GUEST)
            return Result(True)
        if type_ == Command.SESSION_LIMIT:
            self._require_manager(member)
            return Result(self._set_limit(payload))
        if type_ == Command.SESSION_END:
            self._require_host(member)
            return Result(ended=True)
        if type_ == Command.SCORE_SUBMIT:
            return Result(self._submit_score(member, payload))
        raise CommandError(ErrorCode.UNKNOWN_TYPE, f"Unknown message type: {type_}")

    def _lock(self, member: Member, payload: dict) -> bool:
        self._require_host(member)
        locked = payload.get("locked")
        if not isinstance(locked, bool):
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`locked` must be a boolean.")
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

    def _set_status(self, expected: PlayerStatus, new: PlayerStatus) -> bool:
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
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`reason` must be a string.")
        skipped = self.now_playing
        if not self._is_current(payload) or skipped is None:
            return Result()
        self._advance()
        notice = {"kind": NoticeKind.SONG_SKIPPED, "itemId": skipped.item_id, "reason": reason}
        return Result(True, (notice,))

    def _report_position(self, payload: dict) -> Result:
        if not self._is_current(payload) or self.now_playing is None:
            return Result()
        position = payload.get("positionMs")
        if not isinstance(position, int) or isinstance(position, bool) or position < 0:
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`positionMs` must be a non-negative integer.")
        if self.player_status != PlayerStatus.PLAYING:
            return Result()
        self.player_position_ms = position
        now = time.monotonic()
        if now - self._last_fanout < POSITION_FANOUT_INTERVAL:
            return Result()
        self._last_fanout = now
        return Result(
            position={
                "itemId": self.now_playing.item_id,
                "positionMs": position,
                "serverTime": int(time.time() * 1000),
            }
        )

    def _submit_score(self, member: Member, payload: dict) -> bool:
        item_id = payload.get("itemId")
        if not isinstance(item_id, str):
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`itemId` must be a string.")
        sung = [i for i in (*self.history, self.now_playing) if i is not None]
        item = next((i for i in sung if i.item_id == item_id), None)
        if item is None:
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "No played item with that id.")
        if item.added_by != member.member_id:
            raise CommandError(ErrorCode.FORBIDDEN, "Only the singer can submit a score.")
        score = payload.get("score")
        if isinstance(score, bool) or not isinstance(score, (int, float)) or not 0 <= score <= 100:
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`score` must be a number from 0 to 100.")
        breakdown = payload.get("breakdown", {})
        if not isinstance(breakdown, dict):
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`breakdown` must be an object.")
        self.scores = [x for x in self.scores if x["itemId"] != item_id]
        self.scores.append(
            {"itemId": item_id, "memberId": member.member_id, "score": score, "breakdown": breakdown}
        )
        self.touch()
        return True

    def _promote(self, payload: dict) -> Result:
        target = self._set_role(payload, Role.GUEST, Role.SUBHOST)
        notice = {"kind": NoticeKind.MEMBER_PROMOTED, "memberId": target.member_id}
        return Result(True, (notice,))

    def _set_role(self, payload: dict, expected: Role, new: Role) -> Member:
        target = self._target_member(payload)
        if target.role != expected:
            raise CommandError(ErrorCode.INVALID_PAYLOAD, f"That member is not a {expected}.")
        target.role = new
        self.touch()
        return target

    def _set_limit(self, payload: dict) -> bool:
        if "maxQueuePerMember" not in payload:
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`maxQueuePerMember` is required.")
        limit = payload["maxQueuePerMember"]
        if limit is not None and (not isinstance(limit, int) or isinstance(limit, bool) or limit < 1):
            raise CommandError(
                ErrorCode.INVALID_PAYLOAD, "`maxQueuePerMember` must be a positive integer or null."
            )
        if limit == self.max_queue_per_member:
            return False
        self.max_queue_per_member = limit
        self.touch()
        return True

    def _target_member(self, payload: dict) -> Member:
        member_id = payload.get("memberId")
        if not isinstance(member_id, str):
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`memberId` must be a string.")
        target = self.members.get(member_id)
        if target is None:
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "No member with that id.")
        return target

    def _kick(self, member: Member, payload: dict) -> Result:
        target = self._target_member(payload)
        member_id = target.member_id
        if target.role == Role.HOST:
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "The host cannot be kicked.")
        if target.role == Role.SUBHOST and member.role != Role.HOST:
            raise CommandError(ErrorCode.FORBIDDEN, "Only the host can remove a subhost.")
        del self.members[member_id]
        self.touch()
        notice = {"kind": NoticeKind.MEMBER_KICKED, "memberId": member_id}
        return Result(True, (notice,), kicked=member_id)

    def pause_for_host_loss(self) -> bool:
        return self._set_status(PlayerStatus.PLAYING, PlayerStatus.PAUSED)

    def _is_current(self, payload: dict) -> bool:
        item_id = payload.get("itemId")
        if not isinstance(item_id, str):
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`itemId` must be a string.")
        return self.now_playing is not None and self.now_playing.item_id == item_id

    def _advance(self) -> None:
        if self.now_playing is not None:
            self.history.append(self.now_playing)
        self.player_position_ms = 0
        if self.queue:
            self.now_playing = self.queue.pop(0)
            self.player_status = PlayerStatus.PLAYING
        else:
            self.now_playing = None
            self.player_status = PlayerStatus.IDLE
        self.player_updated_at = _now()
        self.touch()

    async def _queue_add(self, member: Member, payload: dict) -> bool:
        song_id = payload.get("songId")
        if not isinstance(song_id, str) or not song_id:
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`songId` must be a non-empty string.")
        try:
            song = await self.resolve(song_id)
        except SourceUnavailable:
            raise CommandError(ErrorCode.SOURCE_UNAVAILABLE, "That source is unavailable.")
        if song is None:
            raise CommandError(ErrorCode.SONG_NOT_FOUND, "No song with that id.")
        mine = [i for i in self.queue if i.added_by == member.member_id]
        if any(i.song.song_id == song_id for i in mine):
            raise CommandError(ErrorCode.ALREADY_QUEUED, "You already queued that song.")
        limit = self.max_queue_per_member
        if limit is not None and len(mine) >= limit:
            raise CommandError(ErrorCode.QUEUE_FULL, f"You already have {limit} songs queued.")
        if len(self.queue) >= config.MAX_QUEUE_TOTAL:
            raise CommandError(ErrorCode.QUEUE_FULL, "The queue is full.")
        item = QueueItem("q_" + secrets.token_hex(4), song, member.member_id, _now())
        if self.now_playing is None:
            self.now_playing = item
            self.player_status = PlayerStatus.PLAYING
            self.player_updated_at = item.added_at
        else:
            self.queue.append(item)
        self.touch()
        return True

    def _queue_remove(self, member: Member, payload: dict) -> bool:
        item = self._queued_item(payload)
        if member.role == Role.GUEST and item.added_by != member.member_id:
            raise CommandError(ErrorCode.FORBIDDEN, "Only the owner or host can remove that.")
        self.queue.remove(item)
        self.touch()
        return True

    def _queue_move(self, member: Member, payload: dict) -> bool:
        self._require_manager(member)
        item = self._queued_item(payload)
        to_index = payload.get("toIndex")
        if not isinstance(to_index, int) or isinstance(to_index, bool):
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`toIndex` must be an integer.")
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
            raise CommandError(ErrorCode.INVALID_PAYLOAD, "`itemId` must be a string.")
        for item in self.queue:
            if item.item_id == item_id:
                return item
        raise CommandError(ErrorCode.INVALID_PAYLOAD, "No queued item with that id.")

    def suggestions(self) -> list[Suggestion]:
        active = {i.song.song_id for i in (self.now_playing, *self.queue) if i is not None}
        picks = Counter(i.song.song_id for i in self.history)
        latest = {i.song.song_id: n for n, i in enumerate(self.history)}
        songs = {i.song.song_id: i.song for i in self.history}
        ranked = sorted(
            (song_id for song_id in picks if song_id not in active),
            key=lambda song_id: (-picks[song_id], -latest[song_id]),
        )
        suggestions: list[Suggestion] = []
        if self.now_playing is not None:
            playing = self.now_playing.song
            related = [
                s for s in self.channel(playing) if s.song_id not in active and s.song_id not in picks
            ]
            suggestions += [
                Suggestion(song, SuggestionReason.SAME_CHANNEL, playing.channel_title)
                for song in related[:CHANNEL_LIMIT]
            ]
        suggestions += [
            Suggestion(songs[song_id], SuggestionReason.PLAYED_HERE)
            for song_id in ranked[:SUGGESTION_LIMIT]
        ]
        return suggestions

    def snapshot(self) -> dict:
        return {
            "code": self.code,
            "protocolVersion": config.PROTOCOL_VERSION,
            "rev": self.rev,
            "queue": [i.to_dict() for i in self.queue],
            "nowPlaying": self.now_playing.to_dict() if self.now_playing else None,
            "player": {
                "status": self.player_status,
                "positionMs": self.player_position_ms,
                "updatedAt": _iso(self.player_updated_at),
            },
            "members": [
                {"memberId": m.member_id, "name": m.name, "role": m.role, "connected": m.connected}
                for m in self.members.values()
            ],
            "scores": self.scores,
            "suggestions": [s.to_dict() for s in self.suggestions()],
            "settings": {
                "maxQueuePerMember": self.max_queue_per_member,
                "locked": self.locked,
            },
        }

    @staticmethod
    def _require_host(member: Member) -> None:
        if member.role != Role.HOST:
            raise CommandError(ErrorCode.FORBIDDEN, "Only the host can do that.")

    @staticmethod
    def _require_manager(member: Member) -> None:
        if member.role == Role.GUEST:
            raise CommandError(ErrorCode.FORBIDDEN, "Only the host or a subhost can do that.")
