from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass


class SourceUnavailable(Exception):
    """A song source could not be reached or refused the request."""


@dataclass(frozen=True)
class Song:
    song_id: str
    source: str
    title: str
    artist: str | None
    thumbnail: str
    duration_ms: int
    lyrics: bool = False
    scoring: bool = False

    def to_dict(self) -> dict:
        return {
            "songId": self.song_id,
            "source": self.source,
            "title": self.title,
            "artist": self.artist,
            "thumbnail": self.thumbnail,
            "durationMs": self.duration_ms,
            "capabilities": {"lyrics": self.lyrics, "scoring": self.scoring},
        }


Resolver = Callable[[str], Awaitable[Song | None]]
