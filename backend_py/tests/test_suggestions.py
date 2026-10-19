import asyncio

from app.core.messages import SuggestionReason
from app.core.session import Member, Session
from app.core.song import Song


def song(song_id):
    return Song(song_id, "local", song_id, None, "", 1000)


async def resolve(song_id):
    return song(song_id)


def channel_song(song_id, channel_id="UC1", title="Karaoke Hub"):
    return Song(song_id, "youtube", song_id, None, "", 1000, channel_id=channel_id, channel_title=title)


def make_session(channel=None):
    session = Session(code="ABCDE", resolve=resolve)
    if channel is not None:
        session.channel = channel
    host = Member("m_h", "host", "t_h", "host")
    guests = [Member(f"m_{n}", n, f"t_{n}", "guest") for n in ("a", "b")]
    for m in (host, *guests):
        session.members[m.member_id] = m
    return session, host, guests


async def play(session, host, who, *song_ids):
    for song_id in song_ids:
        await session.handle(who, "queue.add", {"songId": song_id})
        await session.handle(host, "player.ended", {"itemId": session.now_playing.item_id})


def ids(suggestions):
    return [s.song.song_id for s in suggestions]


def test_played_songs_rank_by_count_then_recency_and_skip_active():
    session, host, (a, b) = make_session()

    async def run():
        await play(session, host, a, "local:1", "local:2", "local:1", "local:3")
        await session.handle(b, "queue.add", {"songId": "local:3"})

    asyncio.run(run())
    assert ids(session.suggestions()) == ["local:1", "local:2"]


def test_played_songs_are_tagged_and_serialised_in_the_snapshot():
    session, host, (a, _) = make_session()
    asyncio.run(play(session, host, a, "local:1"))
    assert session.snapshot()["suggestions"] == [
        {"song": song("local:1").to_dict(), "reason": SuggestionReason.PLAYED_HERE, "context": None}
    ]


def test_nothing_is_suggested_before_a_song_has_played():
    session, _, _ = make_session()
    assert session.suggestions() == []
    assert session.snapshot()["suggestions"] == []


def channel_of(*song_ids):
    return lambda _playing: [channel_song(i) for i in song_ids]


def start(session, who, song_id):
    async def resolve_channel_song(_song_id):
        return channel_song(song_id)

    session.resolve = resolve_channel_song
    asyncio.run(session.handle(who, "queue.add", {"songId": song_id}))


def test_playing_song_offers_at_most_three_more_from_its_channel():
    session, _, (a, _) = make_session(channel_of("c1", "c2", "c3", "c4"))
    start(session, a, "now")
    suggestions = session.suggestions()
    assert ids(suggestions) == ["c1", "c2", "c3"]
    assert {s.reason for s in suggestions} == {SuggestionReason.SAME_CHANNEL}
    assert {s.context for s in suggestions} == {"Karaoke Hub"}


def test_channel_suggestions_skip_what_is_already_queued():
    session, _, (a, b) = make_session(channel_of("c1", "c2", "c3"))
    start(session, a, "now")
    start(session, b, "c1")
    assert ids(session.suggestions()) == ["c2", "c3"]


def test_channel_suggestions_come_before_played_songs():
    session, host, (a, b) = make_session(channel_of("c1"))
    asyncio.run(play(session, host, a, "local:1"))
    start(session, b, "now")
    suggestions = session.suggestions()
    assert ids(suggestions) == ["c1", "local:1"]
    assert [s.reason for s in suggestions] == [
        SuggestionReason.SAME_CHANNEL,
        SuggestionReason.PLAYED_HERE,
    ]


def test_no_channel_suggestions_when_nothing_is_playing():
    session, _, _ = make_session(channel_of("c1"))
    assert session.suggestions() == []


def test_channel_provider_receives_the_playing_song():
    seen = []

    def provider(playing):
        seen.append(playing.song_id)
        return []

    session, _, (a, _) = make_session(provider)
    start(session, a, "now")
    session.suggestions()
    assert seen == ["now"]


def test_songs_already_played_here_are_not_repeated_in_the_channel_group():
    session, host, (a, b) = make_session(channel_of("c1", "local:1", "c2"))
    asyncio.run(play(session, host, a, "local:1"))
    start(session, b, "now")
    suggestions = session.suggestions()
    assert [(s.song.song_id, s.reason) for s in suggestions] == [
        ("c1", SuggestionReason.SAME_CHANNEL),
        ("c2", SuggestionReason.SAME_CHANNEL),
        ("local:1", SuggestionReason.PLAYED_HERE),
    ]
