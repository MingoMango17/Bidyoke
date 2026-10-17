import asyncio
import logging
from collections.abc import Awaitable, Callable

from app.core.manager import SessionManager
from app.core.session import Session

SWEEP_INTERVAL = 60.0

log = logging.getLogger(__name__)


async def reap_idle(
    sessions: SessionManager,
    end: Callable[[Session], Awaitable[None]],
    ttl: float,
    interval: float = SWEEP_INTERVAL,
) -> None:
    while True:
        await asyncio.sleep(interval)
        for session in sessions.idle(ttl):
            try:
                await end(session)
            except Exception:
                log.exception("failed to end idle session %s", session.code)
