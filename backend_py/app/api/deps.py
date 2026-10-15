from fastapi import Depends, Header, Request, WebSocket

from app.errors import AppError
from app.core.manager import SessionManager
from app.core.session import Member, Session
from app.services.catalog import SongCatalog
from app.realtime.hub import Hub


def get_sessions(conn: Request | WebSocket) -> SessionManager:
    return conn.app.state.sessions


def get_hub(conn: Request | WebSocket) -> Hub:
    return conn.app.state.hub


def get_catalog(request: Request) -> SongCatalog:
    return request.app.state.catalog


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


def require_member(request: Request, token: str = Depends(bearer_token)) -> Member:
    member = get_sessions(request).member_by_token(token)
    if member is None:
        raise AppError(401, "invalid_token", "Missing or invalid token.")
    return member
