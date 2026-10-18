from enum import StrEnum


class ClientMessage(StrEnum):
    PING = "ping"


class Command(StrEnum):
    SESSION_LOCK = "session.lock"
    SESSION_KICK = "session.kick"
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
