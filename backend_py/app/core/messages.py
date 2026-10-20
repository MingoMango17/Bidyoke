from enum import StrEnum


class ClientMessage(StrEnum):
    PING = "ping"


class Command(StrEnum):
    SESSION_LOCK = "session.lock"
    SESSION_KICK = "session.kick"
    SESSION_PROMOTE = "session.promote"
    SESSION_DEMOTE = "session.demote"
    SESSION_LIMIT = "session.limit"
    SESSION_END = "session.end"
    QUEUE_ADD = "queue.add"
    QUEUE_REMOVE = "queue.remove"
    QUEUE_MOVE = "queue.move"
    PLAYER_NEXT = "player.next"
    PLAYER_PAUSE = "player.pause"
    PLAYER_RESUME = "player.resume"
    PLAYER_ENDED = "player.ended"
    PLAYER_ERROR = "player.error"
    PLAYER_POSITION = "player.position"
    SCORE_SUBMIT = "score.submit"


class ServerMessage(StrEnum):
    STATE = "state"
    ERROR = "error"
    NOTICE = "notice"
    PLAYER_POSITION = "player.position"
    PONG = "pong"


class Role(StrEnum):
    HOST = "host"
    SUBHOST = "subhost"
    GUEST = "guest"


class PlayerStatus(StrEnum):
    IDLE = "idle"
    PLAYING = "playing"
    PAUSED = "paused"


class NoticeKind(StrEnum):
    SONG_SKIPPED = "song_skipped"
    MEMBER_KICKED = "member_kicked"
    MEMBER_PROMOTED = "member_promoted"
    HOST_DISCONNECTED = "host_disconnected"
    HOST_RECONNECTED = "host_reconnected"


class Source(StrEnum):
    YOUTUBE = "youtube"
    LOCAL = "local"


class SuggestionReason(StrEnum):
    PLAYED_HERE = "played_here"
    SAME_CHANNEL = "same_channel"


class ErrorCode(StrEnum):
    ALREADY_QUEUED = "already_queued"
    BAD_REQUEST = "bad_request"
    FORBIDDEN = "forbidden"
    INVALID_NAME = "invalid_name"
    INVALID_PAYLOAD = "invalid_payload"
    INVALID_QUERY = "invalid_query"
    INVALID_TOKEN = "invalid_token"
    QUEUE_FULL = "queue_full"
    RATE_LIMITED = "rate_limited"
    SESSION_FULL = "session_full"
    SESSION_LOCKED = "session_locked"
    SESSION_NOT_FOUND = "session_not_found"
    SONG_NOT_FOUND = "song_not_found"
    SOURCE_UNAVAILABLE = "source_unavailable"
    UNKNOWN_TYPE = "unknown_type"
