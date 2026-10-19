import asyncio

import pytest

from app import config
from app.core.session import CommandError, Member, Session
from app.core.song import Song


async def resolve(song_id):
    return Song(song_id, "local", song_id, None, "", 1000)


def make_session(*names):
    session = Session(code="ABCDE", resolve=resolve)
    members = [Member(f"m_{n}", n, f"t_{n}", "guest") for n in names]
    for m in members:
        session.members[m.member_id] = m
    return session, members


def test_total_queue_cap_counts_waiting_items_only(monkeypatch):
    monkeypatch.setattr(config, "MAX_QUEUE_TOTAL", 2)
    monkeypatch.setattr(config, "MAX_QUEUE_PER_MEMBER", 10)
    session, (a, b) = make_session("a", "b")

    async def run():
        for n, who in enumerate([a, a, b]):
            await session.handle(who, "queue.add", {"songId": f"local:{n}"})
        assert session.now_playing is not None
        assert len(session.queue) == 2
        with pytest.raises(CommandError) as exc:
            await session.handle(b, "queue.add", {"songId": "local:9"})
        assert exc.value.code == "queue_full"

    asyncio.run(run())


def test_removing_item_frees_total_slot(monkeypatch):
    monkeypatch.setattr(config, "MAX_QUEUE_TOTAL", 1)
    monkeypatch.setattr(config, "MAX_QUEUE_PER_MEMBER", 10)
    session, (a,) = make_session("a")

    async def run():
        await session.handle(a, "queue.add", {"songId": "local:0"})
        await session.handle(a, "queue.add", {"songId": "local:1"})
        with pytest.raises(CommandError):
            await session.handle(a, "queue.add", {"songId": "local:2"})
        await session.handle(a, "queue.remove", {"itemId": session.queue[0].item_id})
        await session.handle(a, "queue.add", {"songId": "local:2"})

    asyncio.run(run())
    assert [i.song.song_id for i in session.queue] == ["local:2"]


def test_suggestions_rank_played_songs_and_skip_active():
    session, (a, b) = make_session("a", "b")

    async def play(who, *song_ids):
        for song_id in song_ids:
            await session.handle(who, "queue.add", {"songId": song_id})
            await session.handle(
                session_host, "player.ended", {"itemId": session.now_playing.item_id}
            )

    session_host = Member("m_h", "h", "t_h", "host")
    session.members[session_host.member_id] = session_host

    async def run():
        await play(a, "local:1", "local:2", "local:1", "local:3")
        await session.handle(b, "queue.add", {"songId": "local:3"})

    asyncio.run(run())
    assert [s.song_id for s in session.suggestions()] == ["local:1", "local:2"]
    assert [s["songId"] for s in session.snapshot()["suggestions"]] == ["local:1", "local:2"]
