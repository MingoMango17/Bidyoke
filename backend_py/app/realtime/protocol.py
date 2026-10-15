import json

MAX_MESSAGE_BYTES = 16 * 1024


class BadFrame(Exception):
    def __init__(self, code: str, message: str, id_: str | None = None):
        self.code = code
        self.message = message
        self.id = id_


def error_msg(code: str, message: str, id_: str | None = None) -> dict:
    payload = {"code": code, "message": message}
    if id_ is not None:
        payload["id"] = id_
    return {"type": "error", "payload": payload}


def parse_frame(text: str) -> tuple[str, dict, str | None]:
    """Return (type, payload, id) or raise BadFrame."""
    try:
        msg = json.loads(text)
    except ValueError:
        raise BadFrame("bad_request", "Invalid JSON.")
    if not isinstance(msg, dict) or not isinstance(msg.get("type"), str):
        raise BadFrame("bad_request", "Message must be an object with a string `type`.")
    id_ = msg.get("id") if isinstance(msg.get("id"), str) else None
    payload = msg.get("payload") or {}
    if not isinstance(payload, dict):
        raise BadFrame("invalid_payload", "`payload` must be an object.", id_)
    return msg["type"], payload, id_
