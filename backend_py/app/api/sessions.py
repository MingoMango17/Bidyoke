from fastapi import APIRouter, Depends

from app import config
from app.api.deps import bearer_token, get_container, limit_join, require_session
from app.api.schemas import JoinBody
from app.container import Container
from app.core.messages import ErrorCode, Role
from app.core.session import Session
from app.core.validation import clean_name
from app.errors import AppError

router = APIRouter(prefix="/api/sessions")


@router.post("", status_code=201)
async def create_session(container: Container = Depends(get_container)):
    session, host = container.sessions.create()
    return {
        "code": session.code,
        "memberId": host.member_id,
        "token": host.token,
        "joinUrl": f"{config.PUBLIC_BASE_URL}/s/{session.code}",
    }


@router.get("/{code}")
async def get_session(session: Session = Depends(require_session)):
    return {"code": session.code, "memberCount": len(session.members), "locked": session.locked}


@router.post("/{code}/join", dependencies=[Depends(limit_join)])
async def join_session(
    body: JoinBody,
    session: Session = Depends(require_session),
    container: Container = Depends(get_container),
):
    if session.locked:
        raise AppError(403, ErrorCode.SESSION_LOCKED, "This session is not accepting new members.")
    if len(session.members) >= config.MAX_MEMBERS:
        raise AppError(403, ErrorCode.SESSION_FULL, "This session is full.")
    guest = container.sessions.add_member(session, clean_name(body.name), Role.GUEST)
    container.hub.broadcast(session)
    return {"memberId": guest.member_id, "token": guest.token}


@router.post("/{code}/rejoin")
async def rejoin_session(
    session: Session = Depends(require_session), token: str = Depends(bearer_token)
):
    member = session.member_by_token(token)
    if member is None:
        raise AppError(401, ErrorCode.INVALID_TOKEN, "Missing or invalid token.")
    return {"memberId": member.member_id, "role": member.role}
