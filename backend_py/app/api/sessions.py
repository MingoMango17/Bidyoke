"""REST: create / get / join / rejoin (protocol §3.1-3.4)."""
from fastapi import APIRouter, Header, Request
from pydantic import BaseModel

from app import config
from app.api.errors import AppError
from app.core.manager import SessionManager
from app.core.session import Session

router = APIRouter(prefix="/api/sessions")

NAME_MAX = 24


class JoinBody(BaseModel):
    name: str


def _manager(request: Request) -> SessionManager:
    return request.app.state.sessions


def _session_or_404(request: Request, code: str) -> Session:
    session = _manager(request).get(code)
    if session is None:
        raise AppError(404, "session_not_found", "No session with that code.")
    return session


def _clean_name(raw: str) -> str:
    name = raw.strip()
    if not name or len(name) > NAME_MAX or any(ord(c) < 32 or ord(c) == 127 for c in name):
        raise AppError(422, "invalid_name", f"Name must be 1-{NAME_MAX} characters.")
    return name


def _bearer(authorization: str | None) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AppError(401, "invalid_token", "Missing or invalid token.")
    return token


@router.post("", status_code=201)
async def create_session(request: Request):
    session, host = _manager(request).create()
    return {
        "code": session.code,
        "memberId": host.member_id,
        "token": host.token,
        "joinUrl": f"{config.PUBLIC_BASE_URL}/s/{session.code}",
    }


@router.get("/{code}")
async def get_session(request: Request, code: str):
    session = _session_or_404(request, code)
    return {"code": session.code, "memberCount": len(session.members), "locked": session.locked}


@router.post("/{code}/join")
async def join_session(request: Request, code: str, body: JoinBody):
    session = _session_or_404(request, code)
    if session.locked:
        raise AppError(403, "session_locked", "This session is not accepting new members.")
    guest = _manager(request).add_member(session, _clean_name(body.name), "guest")
    return {"memberId": guest.member_id, "token": guest.token}


@router.post("/{code}/rejoin")
async def rejoin_session(
    request: Request, code: str, authorization: str | None = Header(default=None)
):
    session = _session_or_404(request, code)
    member = session.member_by_token(_bearer(authorization))
    if member is None:
        raise AppError(401, "invalid_token", "Missing or invalid token.")
    return {"memberId": member.member_id, "role": member.role}
