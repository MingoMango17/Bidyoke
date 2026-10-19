from fastapi import Depends

from app.container import Container
from app.core.messages import ErrorCode
from app.core.session import Session
from app.dependencies.container import get_container
from app.errors import AppError


def require_session(code: str, container: Container = Depends(get_container)) -> Session:
    session = container.sessions.get(code)
    if session is None:
        raise AppError(404, ErrorCode.SESSION_NOT_FOUND, "No session with that code.")
    return session
