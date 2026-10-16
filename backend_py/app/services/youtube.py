import re

import httpx

from app.core.song import Song, SourceUnavailable
from app.services.cache import TTLCache

API_URL = "https://www.googleapis.com/youtube/v3"
SEARCH_TTL = 6 * 3600
SONG_TTL = 24 * 3600
TIMEOUT = 5.0

_VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
_DURATION = re.compile(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")


class YouTubeSource:
    id = "youtube"

    def __init__(self, api_key: str, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._key = api_key
        self._transport = transport
        self._searches = TTLCache(SEARCH_TTL)
        self._songs = TTLCache(SONG_TTL)

    async def search(self, q: str, limit: int) -> list[Song]:
        key = f"{' '.join(q.lower().split())}|{limit}"
        cached = self._searches.get(key)
        if cached is not None:
            return cached
        found = await self._get(
            "search",
            {
                "part": "id",
                "type": "video",
                "videoEmbeddable": "true",
                "maxResults": limit,
                "q": f"{q} karaoke",
            },
        )
        ids = [item["id"]["videoId"] for item in found.get("items", [])]
        songs = await self._videos(ids)
        self._searches.set(key, songs)
        return songs

    async def resolve(self, song_id: str) -> Song | None:
        video_id = song_id.partition(":")[2]
        if not _VIDEO_ID.match(video_id):
            return None
        songs = await self._videos([video_id])
        return songs[0] if songs else None

    async def playback(self, song_id: str) -> dict | None:
        song = await self.resolve(song_id)
        if song is None:
            return None
        return {"kind": "youtube", "videoId": song_id.partition(":")[2]}

    async def _videos(self, ids: list[str]) -> list[Song]:
        missing = [i for i in ids if self._songs.get(i) is None]
        if missing:
            body = await self._get(
                "videos",
                {"part": "snippet,contentDetails,status", "id": ",".join(missing)},
            )
            for item in body.get("items", []):
                if item.get("status", {}).get("embeddable"):
                    self._songs.set(item["id"], _to_song(item))
        return [s for s in (self._songs.get(i) for i in ids) if s is not None]

    async def _get(self, path: str, params: dict) -> dict:
        try:
            async with httpx.AsyncClient(transport=self._transport, timeout=TIMEOUT) as client:
                response = await client.get(f"{API_URL}/{path}", params={**params, "key": self._key})
        except httpx.HTTPError:
            raise SourceUnavailable("YouTube request failed.") from None
        if response.status_code != 200:
            raise SourceUnavailable(f"YouTube returned {response.status_code}.")
        return response.json()


def _to_song(item: dict) -> Song:
    snippet = item["snippet"]
    thumbs = snippet.get("thumbnails", {})
    thumb = next((thumbs[k]["url"] for k in ("high", "medium", "default") if k in thumbs), "")
    return Song(
        song_id=f"youtube:{item['id']}",
        source="youtube",
        title=snippet.get("title", ""),
        artist=None,
        thumbnail=thumb,
        duration_ms=_duration_ms(item.get("contentDetails", {}).get("duration", "")),
    )


def _duration_ms(iso: str) -> int:
    match = _DURATION.match(iso)
    if not match:
        return 0
    hours, minutes, seconds = (int(g or 0) for g in match.groups())
    return ((hours * 60 + minutes) * 60 + seconds) * 1000
