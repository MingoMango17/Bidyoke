from app import config
from app.core.song import Resolver, Song

_FIXTURES = {
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


def build_resolver() -> Resolver:
    if config.FIXTURE_SONGS:
        return _FIXTURES.get
    return lambda _song_id: None
