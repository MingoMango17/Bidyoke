import asyncio
import logging
from collections.abc import Awaitable, Callable

from app.core.session import Session
from app.core.song import Song, SourceUnavailable
from app.services.cache import TTLCache

log = logging.getLogger(__name__)

CACHE_SECONDS = 24 * 3600
RETRY_SECONDS = 600


class ChannelSuggestions:
    def __init__(self, fetch: Callable[[Song], Awaitable[list[Song]]]) -> None:
        self._fetch = fetch
        self._found = TTLCache(CACHE_SECONDS)
        self._failed = TTLCache(RETRY_SECONDS)
        self._waiting: dict[str, dict[str, Session]] = {}
        self._tasks: set[asyncio.Task] = set()
        self.rebroadcast: Callable[[Session], None] = lambda _session: None

    def lookup(self, song: Song) -> list[Song]:
        songs = self._found.get(song.channel_id) if song.channel_id else None
        return [s for s in songs or [] if s.song_id != song.song_id]

    def warm(self, session: Session) -> None:
        playing = session.now_playing.song if session.now_playing else None
        channel_id = playing.channel_id if playing else None
        if playing is None or not channel_id:
            return
        if self._found.get(channel_id) is not None or self._failed.get(channel_id):
            return
        waiting = self._waiting.get(channel_id)
        if waiting is not None:
            waiting[session.code] = session
            return
        self._waiting[channel_id] = {session.code: session}
        task = asyncio.create_task(self._load(channel_id, playing))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _load(self, channel_id: str, playing: Song) -> None:
        songs: list[Song] | None = None
        try:
            songs = await self._fetch(playing)
        except SourceUnavailable:
            self._failed.set(channel_id, True)
        except Exception:
            log.exception("channel suggestions failed channel=%s", channel_id)
            self._failed.set(channel_id, True)
        waiting = self._waiting.pop(channel_id, {})
        if songs is None:
            return
        self._found.set(channel_id, songs)
        for session in waiting.values():
            playing = session.now_playing.song if session.now_playing else None
            if playing is None or playing.channel_id != channel_id:
                continue
            # clients drop a state whose rev is not newer, and suggestions are part of the state
            session.touch()
            self.rebroadcast(session)
