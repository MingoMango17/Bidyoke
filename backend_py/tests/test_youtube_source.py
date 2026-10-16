import asyncio

import httpx
import pytest

from app.core.song import SourceUnavailable
from app.services.quota import QuotaBudget
from app.services.youtube import YouTubeSource

VIDEO_ID = "dQw4w9WgXcQ"


def make_source(handler, limit=10_000):
    return YouTubeSource("test-key", QuotaBudget(limit), transport=httpx.MockTransport(handler))


def video_item(video_id=VIDEO_ID, embeddable=True, duration="PT3M32S"):
    return {
        "id": video_id,
        "snippet": {
            "title": "Song (Karaoke)",
            "thumbnails": {"default": {"url": "http://t/d.jpg"}, "high": {"url": "http://t/h.jpg"}},
        },
        "contentDetails": {"duration": duration},
        "status": {"embeddable": embeddable},
    }


def api_handler(calls, items):
    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.url.path.endswith("/search"):
            return httpx.Response(
                200, json={"items": [{"id": {"videoId": it["id"]}} for it in items]}
            )
        return httpx.Response(200, json={"items": items})

    return handler


def test_search_maps_song_and_filters_unembeddable():
    calls = []
    items = [video_item(), video_item("aaaaaaaaaaa", embeddable=False)]
    source = make_source(api_handler(calls, items))
    songs = asyncio.run(source.search("my song", 5))
    assert [s.song_id for s in songs] == [f"youtube:{VIDEO_ID}"]
    song = songs[0]
    assert song.source == "youtube"
    assert song.thumbnail == "http://t/h.jpg"
    assert song.duration_ms == 212_000
    assert (song.lyrics, song.scoring) == (False, False)
    assert calls[0].url.params["q"] == "my song karaoke"


def test_search_is_cached_by_normalized_query():
    calls = []
    source = make_source(api_handler(calls, [video_item()]))
    asyncio.run(source.search("My  Song", 5))
    n = len(calls)
    asyncio.run(source.search("my song", 5))
    assert len(calls) == n


def test_resolve_rejects_malformed_id_without_calling_api():
    calls = []
    source = make_source(api_handler(calls, []))
    assert asyncio.run(source.resolve("youtube:../../x")) is None
    assert calls == []


def test_resolve_and_playback():
    source = make_source(api_handler([], [video_item()]))
    song = asyncio.run(source.resolve(f"youtube:{VIDEO_ID}"))
    assert song is not None and song.title == "Song (Karaoke)"
    pb = asyncio.run(source.playback(f"youtube:{VIDEO_ID}"))
    assert pb == {"kind": "youtube", "videoId": VIDEO_ID}


def test_resolve_unknown_video_is_none():
    source = make_source(api_handler([], []))
    assert asyncio.run(source.resolve(f"youtube:{VIDEO_ID}")) is None


@pytest.mark.parametrize("status", [403, 500])
def test_upstream_error_raises_source_unavailable(status):
    source = make_source(lambda r: httpx.Response(status, json={}))
    with pytest.raises(SourceUnavailable):
        asyncio.run(source.search("x", 5))


def test_network_error_raises_source_unavailable():
    def handler(request):
        raise httpx.ConnectError("boom", request=request)

    with pytest.raises(SourceUnavailable):
        asyncio.run(make_source(handler).search("x", 5))


def test_budget_exhausted_blocks_upstream_call():
    calls = []
    source = make_source(api_handler(calls, [video_item()]), limit=100)
    with pytest.raises(SourceUnavailable):
        asyncio.run(source.search("x", 5))
    assert len(calls) == 1


def test_cached_search_does_not_spend_budget():
    calls = []
    source = make_source(api_handler(calls, [video_item()]), limit=101)
    asyncio.run(source.search("x", 5))
    asyncio.run(source.search("x", 5))
    assert len(calls) == 2
