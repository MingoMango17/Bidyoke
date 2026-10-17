import asyncio
from collections.abc import Awaitable, Callable

from app.core.manager import SessionManager
from app.core.session import Session

SWEEP_INTERVAL = 60.0


async def reap_idle(
    sessions: SessionManager,
    end: Callable[[Session], Awaitable[None]],
    ttl: float,
    interval: float = SWEEP_INTERVAL,
) -> None:
    while True:
        await asyncio.sleep(interval)
        for session in sessions.idle(ttl):
            await end(session)
