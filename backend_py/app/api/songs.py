from fastapi import APIRouter, Depends

from app.api.deps import get_container, limit_search, require_member
from app.container import Container
from app.core.song import SourceUnavailable
from app.errors import AppError

router = APIRouter(prefix="/api", dependencies=[Depends(require_member)])

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
        raise AppError(422, "invalid_query", f"Query must be 1-{QUERY_MAX} characters.")
    results, sources = await container.catalog.search(q, source, limit)
    return {"results": [s.to_dict() for s in results], "sources": sources}


@router.get("/songs/{song_id}")
async def get_song(song_id: str, container: Container = Depends(get_container)):
    catalog = container.catalog
    try:
        song = await catalog.resolve(song_id)
        playback = await catalog.playback(song_id)
    except SourceUnavailable:
        raise AppError(502, "source_unavailable", "That source is unavailable.")
    if song is None or playback is None:
        raise AppError(404, "song_not_found", "No song with that id.")
    return {"song": song.to_dict(), "playback": playback}
