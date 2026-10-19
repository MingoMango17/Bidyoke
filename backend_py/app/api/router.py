from fastapi import APIRouter

from app.api import sessions, songs, system

api_router = APIRouter(prefix="/api")
api_router.include_router(system.router)
api_router.include_router(sessions.router)
api_router.include_router(songs.router)
