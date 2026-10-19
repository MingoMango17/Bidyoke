import logging

from fastapi import Depends, Request

from app.container import Container
from app.core.messages import ErrorCode
from app.core.session import Member
from app.dependencies.auth import require_member
from app.dependencies.container import get_container
from app.errors import AppError

log = logging.getLogger(__name__)


def _rate_limited() -> AppError:
    return AppError(429, ErrorCode.RATE_LIMITED, "Too many requests. Try again shortly.")


def limit_join(request: Request, code: str, container: Container = Depends(get_container)) -> None:
    host = request.client.host if request.client else "unknown"
    if not container.join_limiter.allow(f"{host}:{code.upper()}"):
        log.warning("join rate limited code=%s ip=%s", code, host)
        raise _rate_limited()


def limit_search(
    member: Member = Depends(require_member), container: Container = Depends(get_container)
) -> None:
    if not container.search_limiter.allow(member.member_id):
        log.warning("search rate limited member=%s", member.member_id)
        raise _rate_limited()
