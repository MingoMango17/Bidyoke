import logging

from fastapi import Depends, Header, Request
from starlette.requests import HTTPConnection

from app.container import Container
from app.core.messages import ErrorCode
from app.core.session import Member, Session
from app.errors import AppError

log = logging.getLogger(__name__)


def get_container(conn: HTTPConnection) -> Container:
    return conn.app.state.container


def _rate_limited() -> AppError:
    return AppError(429, ErrorCode.RATE_LIMITED, "Too many requests. Try again shortly.")


def limit_join(request: Request, code: str, container: Container = Depends(get_container)) -> None:
    host = request.client.host if request.client else "unknown"
    if not container.join_limiter.allow(f"{host}:{code.upper()}"):
        log.warning("join rate limited code=%s ip=%s", code, host)
        raise _rate_limited()


def require_session(code: str, container: Container = Depends(get_container)) -> Session:
    session = container.sessions.get(code)
    if session is None:
        raise AppError(404, ErrorCode.SESSION_NOT_FOUND, "No session with that code.")
    return session


def bearer_token(authorization: str | None = Header(default=None)) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AppError(401, ErrorCode.INVALID_TOKEN, "Missing or invalid token.")
    return token


def require_member(
    token: str = Depends(bearer_token), container: Container = Depends(get_container)
) -> Member:
    member = container.sessions.member_by_token(token)
    if member is None:
        raise AppError(401, ErrorCode.INVALID_TOKEN, "Missing or invalid token.")
    return member


def limit_search(
    member: Member = Depends(require_member), container: Container = Depends(get_container)
) -> None:
    if not container.search_limiter.allow(member.member_id):
        log.warning("search rate limited member=%s", member.member_id)
        raise _rate_limited()
