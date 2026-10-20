import asyncio

import pytest

from app import config
from app.core.session import CommandError, Member, Session
from app.core.song import Song


async def resolve(song_id):
    return Song(song_id, "local", song_id, None, "", 1000)


def make_session():
    session = Session(code="ABCDE", resolve=resolve)
    roles = {"host": "host", "subhost": "subhost", "subhost2": "subhost", "guest": "guest", "other": "guest"}
    members = {name: Member(f"m_{name}", name, f"t_{name}", role) for name, role in roles.items()}
    for m in members.values():
        session.members[m.member_id] = m
    return session, members


def run(session, member, type_, payload=None):
    return asyncio.run(session.handle(member, type_, payload or {}))


def test_guest_cannot_promote_or_set_limit():
    session, m = make_session()
    for type_, payload in [
        ("session.promote", {"memberId": m["other"].member_id}),
        ("session.demote", {"memberId": m["subhost"].member_id}),
        ("session.limit", {"maxQueuePerMember": 5}),
        ("player.next", {}),
    ]:
        with pytest.raises(CommandError) as exc:
            run(session, m["guest"], type_, payload)
        assert exc.value.code == "forbidden"


def test_host_promotes_and_demotes():
    session, m = make_session()
    result = run(session, m["host"], "session.promote", {"memberId": m["guest"].member_id})
    assert m["guest"].role == "subhost"
    assert result.notices == ({"kind": "member_promoted", "memberId": m["guest"].member_id},)
    run(session, m["host"], "session.demote", {"memberId": m["guest"].member_id})
    assert m["guest"].role == "guest"


def test_promote_and_demote_check_target_role():
    session, m = make_session()
    for type_, target in [
        ("session.promote", m["host"]),
        ("session.promote", m["subhost"]),
        ("session.demote", m["guest"]),
        ("session.demote", m["host"]),
    ]:
        with pytest.raises(CommandError) as exc:
            run(session, m["host"], type_, {"memberId": target.member_id})
        assert exc.value.code == "invalid_payload"


def test_subhost_cannot_lock_or_end():
    session, m = make_session()
    for type_, payload in [("session.lock", {"locked": True}), ("session.end", {})]:
        with pytest.raises(CommandError) as exc:
            run(session, m["subhost"], type_, payload)
        assert exc.value.code == "forbidden"


def test_subhost_cannot_report_playback():
    session, m = make_session()
    run(session, m["guest"], "queue.add", {"songId": "local:1"})
    item_id = session.now_playing.item_id
    for type_, payload in [
        ("player.ended", {"itemId": item_id}),
        ("player.error", {"itemId": item_id, "reason": "x"}),
        ("player.position", {"itemId": item_id, "positionMs": 1}),
    ]:
        with pytest.raises(CommandError) as exc:
            run(session, m["subhost"], type_, payload)
        assert exc.value.code == "forbidden"


def test_subhost_controls_playback_and_queue():
    session, m = make_session()
    for n in range(3):
        run(session, m["guest"], "queue.add", {"songId": f"local:{n}"})
    run(session, m["subhost"], "player.pause")
    assert session.player_status == "paused"
    run(session, m["subhost"], "player.resume")
    last = session.queue[-1].item_id
    run(session, m["subhost"], "queue.move", {"itemId": last, "toIndex": 0})
    assert session.queue[0].item_id == last
    run(session, m["subhost"], "queue.remove", {"itemId": last})
    run(session, m["subhost"], "player.next")
    assert session.now_playing.song.song_id == "local:1"


def test_subhost_kick_rules():
    session, m = make_session()
    with pytest.raises(CommandError) as exc:
        run(session, m["subhost"], "session.kick", {"memberId": m["subhost2"].member_id})
    assert exc.value.code == "forbidden"
    with pytest.raises(CommandError):
        run(session, m["subhost"], "session.kick", {"memberId": m["host"].member_id})
    result = run(session, m["subhost"], "session.kick", {"memberId": m["guest"].member_id})
    assert result.kicked == m["guest"].member_id
    result = run(session, m["host"], "session.kick", {"memberId": m["subhost2"].member_id})
    assert result.kicked == m["subhost2"].member_id


def test_subhost_can_promote_and_set_limit():
    session, m = make_session()
    run(session, m["subhost"], "session.promote", {"memberId": m["guest"].member_id})
    assert m["guest"].role == "subhost"
    run(session, m["subhost"], "session.limit", {"maxQueuePerMember": 4})
    assert session.snapshot()["settings"]["maxQueuePerMember"] == 4


def test_limit_can_change_and_be_unlimited(monkeypatch):
    monkeypatch.setattr(config, "MAX_QUEUE_TOTAL", 100)
    session, m = make_session()
    assert session.snapshot()["settings"]["maxQueuePerMember"] == config.MAX_QUEUE_PER_MEMBER
    run(session, m["host"], "session.limit", {"maxQueuePerMember": 1})
    run(session, m["guest"], "queue.add", {"songId": "local:0"})
    run(session, m["guest"], "queue.add", {"songId": "local:1"})
    with pytest.raises(CommandError) as exc:
        run(session, m["guest"], "queue.add", {"songId": "local:2"})
    assert exc.value.code == "queue_full"
    run(session, m["host"], "session.limit", {"maxQueuePerMember": None})
    assert session.snapshot()["settings"]["maxQueuePerMember"] is None
    for n in range(2, 12):
        run(session, m["guest"], "queue.add", {"songId": f"local:{n}"})
    assert len(session.queue) == 11


@pytest.mark.parametrize("value", [0, -1, "3", 1.5, True])
def test_limit_rejects_bad_values(value):
    session, m = make_session()
    with pytest.raises(CommandError) as exc:
        run(session, m["host"], "session.limit", {"maxQueuePerMember": value})
    assert exc.value.code == "invalid_payload"


def test_limit_requires_field():
    session, m = make_session()
    with pytest.raises(CommandError):
        run(session, m["host"], "session.limit", {})
