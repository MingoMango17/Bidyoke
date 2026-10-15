from fastapi import Header, Request, WebSocket

from app.errors import AppError
from app.core.manager import SessionManager
from app.core.session import Session
from app.realtime.hub import Hub


def get_sessions(conn: Request | WebSocket) -> SessionManager:
    return conn.app.state.sessions


def get_hub(conn: Request | WebSocket) -> Hub:
    return conn.app.state.hub


def require_session(request: Request, code: str) -> Session:
    session = get_sessions(request).get(code)
    if session is None:
        raise AppError(404, "session_not_found", "No session with that code.")
    return session


def bearer_token(authorization: str | None = Header(default=None)) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AppError(401, "invalid_token", "Missing or invalid token.")
    return token
