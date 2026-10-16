from fastapi import APIRouter, Depends, Request

from app.api.deps import get_catalog, require_member
from app.core.song import SourceUnavailable
from app.errors import AppError

router = APIRouter(prefix="/api", dependencies=[Depends(require_member)])

QUERY_MAX = 100
LIMIT_MAX = 50


@router.get("/search")
async def search(request: Request, q: str = "", source: str | None = None, limit: int = 20):
    if not 1 <= len(q) <= QUERY_MAX or not 1 <= limit <= LIMIT_MAX:
        raise AppError(422, "invalid_query", f"Query must be 1-{QUERY_MAX} characters.")
    results, sources = await get_catalog(request).search(q, source, limit)
    return {"results": [s.to_dict() for s in results], "sources": sources}


@router.get("/songs/{song_id}")
async def get_song(request: Request, song_id: str):
    catalog = get_catalog(request)
    try:
        song = await catalog.resolve(song_id)
        playback = await catalog.playback(song_id)
    except SourceUnavailable:
        raise AppError(502, "source_unavailable", "That source is unavailable.")
    if song is None or playback is None:
        raise AppError(404, "song_not_found", "No song with that id.")
    return {"song": song.to_dict(), "playback": playback}
