from dataclasses import dataclass

from app.core.manager import SessionManager
from app.core.ratelimit import KeyedLimiter
from app.realtime.hub import Hub
from app.services.catalog import SongCatalog


@dataclass
class Container:
    catalog: SongCatalog
    sessions: SessionManager
    hub: Hub
    join_limiter: KeyedLimiter
    search_limiter: KeyedLimiter
