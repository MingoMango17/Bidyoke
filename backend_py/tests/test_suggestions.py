import asyncio

from app.core.messages import SuggestionReason
from app.core.session import Member, Session
from app.core.song import Song


def song(song_id):
    return Song(song_id, "local", song_id, None, "", 1000)


async def resolve(song_id):
    return song(song_id)


def make_session():
    session = Session(code="ABCDE", resolve=resolve)
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
        {"song": song("local:1").to_dict(), "reason": SuggestionReason.PLAYED_HERE}
    ]


def test_nothing_is_suggested_before_a_song_has_played():
    session, _, _ = make_session()
    assert session.suggestions() == []
    assert session.snapshot()["suggestions"] == []
