from fastapi import APIRouter, Depends, Request

from app import config
from app.api.deps import bearer_token, get_hub, get_sessions, require_session
from app.errors import AppError
from app.api.schemas import JoinBody
from app.core.session import Session
from app.core.validation import clean_name

router = APIRouter(prefix="/api/sessions")


@router.post("", status_code=201)
async def create_session(request: Request):
    session, host = get_sessions(request).create()
    return {
        "code": session.code,
        "memberId": host.member_id,
        "token": host.token,
        "joinUrl": f"{config.PUBLIC_BASE_URL}/s/{session.code}",
    }


@router.get("/{code}")
async def get_session(session: Session = Depends(require_session)):
    return {"code": session.code, "memberCount": len(session.members), "locked": session.locked}


@router.post("/{code}/join")
async def join_session(
    request: Request, body: JoinBody, session: Session = Depends(require_session)
):
    if session.locked:
        raise AppError(403, "session_locked", "This session is not accepting new members.")
    guest = get_sessions(request).add_member(session, clean_name(body.name), "guest")
    get_hub(request).broadcast(session)
    return {"memberId": guest.member_id, "token": guest.token}


@router.post("/{code}/rejoin")
async def rejoin_session(
    session: Session = Depends(require_session), token: str = Depends(bearer_token)
):
    member = session.member_by_token(token)
    if member is None:
        raise AppError(401, "invalid_token", "Missing or invalid token.")
    return {"memberId": member.member_id, "role": member.role}
