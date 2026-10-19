from fastapi import Depends, Header

from app.container import Container
from app.core.messages import ErrorCode
from app.core.session import Member
from app.dependencies.container import get_container
from app.errors import AppError


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
