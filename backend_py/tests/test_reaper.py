import asyncio

from app.core.manager import SessionManager
from app.core.reaper import reap_idle


async def no_song(_song_id):
    return None


def make_manager():
    return SessionManager(no_song)


def test_idle_returns_only_sessions_past_ttl():
    manager = make_manager()
    old, _ = manager.create()
    fresh, _ = manager.create()
    old.last_activity -= 100
    assert manager.idle(ttl=50) == [old]
    assert fresh not in manager.idle(ttl=50)


def test_touch_resets_idle_clock():
    manager = make_manager()
    session, _ = manager.create()
    session.last_activity -= 100
    session.touch()
    assert manager.idle(ttl=50) == []


def test_reaper_ends_idle_sessions_only():
    manager = make_manager()
    old, _ = manager.create()
    fresh, _ = manager.create()
    old.last_activity -= 100
    ended = []

    async def end(session):
        manager.remove(session.code)
        ended.append(session.code)

    async def run():
        task = asyncio.create_task(reap_idle(manager, end, ttl=50, interval=0.01))
        await asyncio.sleep(0.05)
        task.cancel()

    asyncio.run(run())
    assert ended == [old.code]
    assert manager.get(old.code) is None
    assert manager.get(fresh.code) is fresh


def test_reaper_survives_a_failing_end():
    manager = make_manager()
    first, _ = manager.create()
    second, _ = manager.create()
    first.last_activity -= 100
    second.last_activity -= 100
    ended = []

    async def end(session):
        if session.code == first.code:
            raise RuntimeError("boom")
        manager.remove(session.code)
        ended.append(session.code)

    async def run():
        task = asyncio.create_task(reap_idle(manager, end, ttl=50, interval=0.01))
        await asyncio.sleep(0.05)
        assert not task.done()
        task.cancel()

    asyncio.run(run())
    assert ended == [second.code]
