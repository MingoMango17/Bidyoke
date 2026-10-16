from app import config
from app.core.song import Song, SourceUnavailable
from app.errors import AppError
from app.services.sources import FixtureSource, SongSource

KNOWN_SOURCES = ("youtube", "local")


class SongCatalog:
    def __init__(self, sources: list[SongSource]) -> None:
        self._sources = {s.id: s for s in sources}

    @classmethod
    def from_config(cls) -> "SongCatalog":
        sources: list[SongSource] = []
        if config.FIXTURE_SONGS and "local" in config.SOURCES:
            sources.append(FixtureSource())
        return cls(sources)

    async def search(self, q: str, source: str | None, limit: int) -> tuple[list[Song], list[str]]:
        if source is None:
            ids = [i for i in config.SOURCES if i in self._sources]
        elif source not in KNOWN_SOURCES or source not in config.SOURCES:
            raise AppError(422, "invalid_query", "Unknown or disabled source.")
        elif source not in self._sources:
            raise AppError(502, "source_unavailable", "That source is unavailable.")
        else:
            ids = [source]
        results: list[Song] = []
        queried: list[str] = []
        for source_id in ids:
            try:
                results.extend(await self._sources[source_id].search(q, limit))
            except SourceUnavailable:
                continue
            queried.append(source_id)
        if ids and not queried:
            raise AppError(502, "source_unavailable", "That source is unavailable.")
        return results[:limit], queried

    async def resolve(self, song_id: str) -> Song | None:
        source = self._sources.get(song_id.partition(":")[0])
        return await source.resolve(song_id) if source else None

    async def playback(self, song_id: str) -> dict | None:
        source = self._sources.get(song_id.partition(":")[0])
        return await source.playback(song_id) if source else None
