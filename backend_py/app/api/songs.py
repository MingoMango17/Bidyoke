from fastapi import APIRouter, Depends

from app.container import Container
from app.core.messages import ErrorCode
from app.core.song import SourceUnavailable
from app.dependencies.auth import require_member
from app.dependencies.container import get_container
from app.dependencies.rate_limits import limit_search
from app.errors import AppError

router = APIRouter(dependencies=[Depends(require_member)])

QUERY_MAX = 100
LIMIT_MAX = 50


@router.get("/search", dependencies=[Depends(limit_search)])
async def search(
    q: str = "",
    source: str | None = None,
    limit: int = 20,
    container: Container = Depends(get_container),
):
    if not 1 <= len(q) <= QUERY_MAX or not 1 <= limit <= LIMIT_MAX:
        raise AppError(422, ErrorCode.INVALID_QUERY, f"Query must be 1-{QUERY_MAX} characters.")
    results, sources = await container.catalog.search(q, source, limit)
    return {"results": [s.to_dict() for s in results], "sources": sources}


@router.get("/songs/{song_id}")
async def get_song(song_id: str, container: Container = Depends(get_container)):
    catalog = container.catalog
    try:
        song = await catalog.resolve(song_id)
        playback = await catalog.playback(song_id)
    except SourceUnavailable:
        raise AppError(502, ErrorCode.SOURCE_UNAVAILABLE, "That source is unavailable.")
    if song is None or playback is None:
        raise AppError(404, ErrorCode.SONG_NOT_FOUND, "No song with that id.")
    return {"song": song.to_dict(), "playback": playback}
