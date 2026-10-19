import logging

from app import config
from app.core.messages import ErrorCode, Source
from app.core.song import Song, SourceUnavailable
from app.errors import AppError
from app.services.quota import QuotaBudget
from app.services.sources import FixtureSource, SongSource
from app.services.youtube import YouTubeSource

log = logging.getLogger(__name__)

KNOWN_SOURCES = tuple(Source)


class SongCatalog:
    def __init__(self, sources: list[SongSource]) -> None:
        self._sources = {s.id: s for s in sources}

    @classmethod
    def from_config(cls) -> "SongCatalog":
        sources: list[SongSource] = []
        if config.FIXTURE_SONGS and Source.LOCAL in config.SOURCES:
            sources.append(FixtureSource())
        if config.YOUTUBE_API_KEY and Source.YOUTUBE in config.SOURCES:
            budget = QuotaBudget(config.YOUTUBE_DAILY_BUDGET, config.QUOTA_FILE)
            sources.append(YouTubeSource(config.YOUTUBE_API_KEY, budget))
        return cls(sources)

    async def search(self, q: str, source: str | None, limit: int) -> tuple[list[Song], list[str]]:
        if source is None:
            ids = [i for i in config.SOURCES if i in self._sources]
        elif source not in KNOWN_SOURCES or source not in config.SOURCES:
            raise AppError(422, ErrorCode.INVALID_QUERY, "Unknown or disabled source.")
        elif source not in self._sources:
            raise AppError(502, ErrorCode.SOURCE_UNAVAILABLE, "That source is unavailable.")
        else:
            ids = [source]
        results: list[Song] = []
        queried: list[str] = []
        for source_id in ids:
            try:
                results.extend(await self._sources[source_id].search(q, limit))
            except SourceUnavailable:
                log.warning("search skipped unavailable source=%s", source_id)
                continue
            queried.append(source_id)
        if ids and not queried:
            raise AppError(502, ErrorCode.SOURCE_UNAVAILABLE, "That source is unavailable.")
        return results[:limit], queried

    async def resolve(self, song_id: str) -> Song | None:
        source = self._sources.get(song_id.partition(":")[0])
        return await source.resolve(song_id) if source else None

    async def related(self, song: Song) -> list[Song]:
        source = self._sources.get(song.source)
        more = getattr(source, "more_from_channel", None)
        if more is None or not song.channel_id:
            return []
        return await more(song.channel_id)

    async def playback(self, song_id: str) -> dict | None:
        source = self._sources.get(song_id.partition(":")[0])
        return await source.playback(song_id) if source else None
