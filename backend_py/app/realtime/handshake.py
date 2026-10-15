from fastapi import WebSocket
from fastapi.responses import JSONResponse

from app import config


async def deny(ws: WebSocket, status: int, code: str, message: str) -> None:
    """Reject before upgrade with a real HTTP status."""
    try:
        await ws.send_denial_response(
            JSONResponse({"error": {"code": code, "message": message}}, status_code=status)
        )
    except RuntimeError:  # server lacks the denial-response extension
        await ws.close(code=1008)


def origin_allowed(ws: WebSocket) -> bool:
    origin = ws.headers.get("origin")
    return not config.ALLOWED_ORIGINS or origin is None or origin in config.ALLOWED_ORIGINS
