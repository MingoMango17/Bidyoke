from fastapi import Depends, Header, Request
from starlette.requests import HTTPConnection

from app.container import Container
from app.core.session import Member, Session
from app.errors import AppError


def get_container(conn: HTTPConnection) -> Container:
    return conn.app.state.container


def _rate_limited() -> AppError:
    return AppError(429, "rate_limited", "Too many requests. Try again shortly.")


def limit_join(request: Request, code: str, container: Container = Depends(get_container)) -> None:
    host = request.client.host if request.client else "unknown"
    if not container.join_limiter.allow(f"{host}:{code.upper()}"):
        raise _rate_limited()


def require_session(code: str, container: Container = Depends(get_container)) -> Session:
    session = container.sessions.get(code)
    if session is None:
        raise AppError(404, "session_not_found", "No session with that code.")
    return session


def bearer_token(authorization: str | None = Header(default=None)) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AppError(401, "invalid_token", "Missing or invalid token.")
    return token


def require_member(
    token: str = Depends(bearer_token), container: Container = Depends(get_container)
) -> Member:
    member = container.sessions.member_by_token(token)
    if member is None:
        raise AppError(401, "invalid_token", "Missing or invalid token.")
    return member


def limit_search(
    member: Member = Depends(require_member), container: Container = Depends(get_container)
) -> None:
    if not container.search_limiter.allow(member.member_id):
        raise _rate_limited()
