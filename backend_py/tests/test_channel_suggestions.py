import asyncio
from datetime import datetime, timezone

from app.core.session import QueueItem, Session
from app.core.song import Song, SourceUnavailable
from app.services import channel as channel_module
from app.services.channel import ChannelSuggestions


def song(song_id, channel_id="UC1"):
    return Song(song_id, "youtube", song_id, None, "", 1000, channel_id=channel_id, channel_title="Hub")


def session_playing(code, playing):
    session = Session(code=code)
    if playing is not None:
        session.now_playing = QueueItem("q1", playing, "m", datetime.now(timezone.utc))
    return session


class Fetch:
    def __init__(self, result=None, error=None):
        self.result = result if result is not None else []
        self.error = error
        self.calls = 0

    async def __call__(self, playing):
        self.calls += 1
        await asyncio.sleep(0)
        if self.error:
            raise self.error
        return self.result


def run_warm(suggester, *sessions):
    async def go():
        for s in sessions:
            suggester.warm(s)
        await asyncio.sleep(0.05)

    asyncio.run(go())


def test_lookup_is_empty_until_the_channel_has_been_loaded():
    suggester = ChannelSuggestions(Fetch([song("b")]))
    assert suggester.lookup(song("a")) == []


def test_warm_loads_the_channel_once_and_rebroadcasts_every_waiting_session():
    fetch = Fetch([song("a"), song("b"), song("c")])
    suggester = ChannelSuggestions(fetch)
    sent = []
    suggester.rebroadcast = lambda s: sent.append(s.code)
    first, second = session_playing("S1", song("a")), session_playing("S2", song("a"))
    before = (first.rev, second.rev)
    run_warm(suggester, first, second)
    assert fetch.calls == 1
    assert sorted(sent) == ["S1", "S2"]
    assert (first.rev, second.rev) == (before[0] + 1, before[1] + 1)
    assert [s.song_id for s in suggester.lookup(song("a"))] == ["b", "c"]


def test_a_loaded_channel_is_not_fetched_again():
    fetch = Fetch([song("b")])
    suggester = ChannelSuggestions(fetch)
    run_warm(suggester, session_playing("S1", song("a")))
    run_warm(suggester, session_playing("S2", song("x")))
    assert fetch.calls == 1


def test_songs_without_a_channel_and_idle_sessions_cause_no_fetch():
    fetch = Fetch([song("b")])
    suggester = ChannelSuggestions(fetch)
    run_warm(suggester, session_playing("S1", song("a", channel_id=None)), session_playing("S2", None))
    assert fetch.calls == 0
    assert suggester.lookup(song("a", channel_id=None)) == []


def test_a_failed_load_is_not_rebroadcast_and_is_not_retried_straight_away():
    fetch = Fetch(error=SourceUnavailable("down"))
    suggester = ChannelSuggestions(fetch)
    sent = []
    suggester.rebroadcast = lambda s: sent.append(s.code)
    run_warm(suggester, session_playing("S1", song("a")))
    run_warm(suggester, session_playing("S1", song("a")))
    assert fetch.calls == 1
    assert sent == []
    assert suggester.lookup(song("a")) == []


def test_a_failed_load_is_retried_after_the_cooldown(monkeypatch):
    monkeypatch.setattr(channel_module, "RETRY_SECONDS", 0.01)
    fetch = Fetch(error=SourceUnavailable("down"))
    suggester = ChannelSuggestions(fetch)

    async def go():
        suggester.warm(session_playing("S1", song("a")))
        await asyncio.sleep(0.05)
        suggester.warm(session_playing("S1", song("a")))
        await asyncio.sleep(0.05)

    asyncio.run(go())
    assert fetch.calls == 2


def test_an_unexpected_error_is_contained_and_cools_down():
    fetch = Fetch(error=RuntimeError("boom"))
    suggester = ChannelSuggestions(fetch)
    run_warm(suggester, session_playing("S1", song("a")))
    run_warm(suggester, session_playing("S1", song("a")))
    assert fetch.calls == 1


def test_a_session_that_moved_on_before_the_load_finished_is_left_alone():
    fetch = Fetch([song("b")])
    suggester = ChannelSuggestions(fetch)
    sent = []
    suggester.rebroadcast = lambda s: sent.append(s.code)
    moved_on = session_playing("S1", song("a"))
    still_playing = session_playing("S2", song("a"))
    before = moved_on.rev

    async def go():
        suggester.warm(moved_on)
        suggester.warm(still_playing)
        moved_on.now_playing = None
        await asyncio.sleep(0.05)

    asyncio.run(go())
    assert sent == ["S2"]
    assert moved_on.rev == before


def test_the_update_is_accepted_by_a_client_that_drops_stale_revs():
    suggester = ChannelSuggestions(Fetch([song("b")]))
    applied = []
    last = {"rev": -1}

    def deliver(session):
        if session.rev > last["rev"]:
            last["rev"] = session.rev
            applied.append(session.rev)

    suggester.rebroadcast = deliver
    playing = session_playing("S1", song("a"))
    deliver(playing)
    run_warm(suggester, playing)
    assert len(applied) == 2
