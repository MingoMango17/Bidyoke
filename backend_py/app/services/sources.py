from typing import Protocol

from app.core.song import Song


class SongSource(Protocol):
    id: str

    def search(self, q: str, limit: int) -> list[Song]: ...

    def resolve(self, song_id: str) -> Song | None: ...

    def playback(self, song_id: str) -> dict | None: ...


class FixtureSource:
    id = "local"

    def __init__(self) -> None:
        self._songs = {
            f"local:test-{n}": Song(
                song_id=f"local:test-{n}",
                source="local",
                title=f"Test Song {n}",
                artist="Test Artist",
                thumbnail="https://example.com/cover.jpg",
                duration_ms=200_000,
            )
            for n in range(1, 7)
        }

    def search(self, q: str, limit: int) -> list[Song]:
        needle = q.lower()
        hits = [
            s for s in self._songs.values() if needle in f"{s.title} {s.artist}".lower()
        ]
        return hits[:limit]

    def resolve(self, song_id: str) -> Song | None:
        return self._songs.get(song_id)

    def playback(self, song_id: str) -> dict | None:
        song = self._songs.get(song_id)
        if song is None:
            return None
        slug = song_id.partition(":")[2]
        return {
            "kind": "local",
            "audioUrl": f"/media/songs/{slug}/instrumental.mp3",
            "durationMs": song.duration_ms,
            "offsetMs": 0,
        }
