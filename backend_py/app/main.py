import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import config
from app.api import system, ws
from app.api.router import api_router
from app.container import Container
from app.core.manager import SessionManager
from app.core.ratelimit import KeyedLimiter
from app.core.reaper import reap_idle
from app.errors import handlers as error_handlers
from app.logs import setup_logging
from app.realtime.hub import Hub
from app.services.catalog import SongCatalog
from app.services.channel import ChannelSuggestions


log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    container: Container = app.state.container
    log.info(
        "starting sources=%s youtube_key=%s youtube_budget=%s ttl=%ss grace=%ss",
        ",".join(config.SOURCES),
        "set" if config.YOUTUBE_API_KEY else "missing",
        config.YOUTUBE_DAILY_BUDGET,
        config.SESSION_TTL,
        config.HOST_GRACE_SECONDS,
    )
    reaper = asyncio.create_task(
        reap_idle(container.sessions, container.hub.end_session, config.SESSION_TTL)
    )
    yield
    reaper.cancel()


def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI(title="Bidyoke", docs_url="/docs", lifespan=lifespan)
    catalog = SongCatalog.from_config()
    channel = ChannelSuggestions(catalog.related)
    session_manager = SessionManager(catalog.resolve, channel.lookup)
    hub = Hub(session_manager, config.HOST_GRACE_SECONDS)
    channel.rebroadcast = hub.broadcast
    hub.on_state = channel.warm
    app.state.container = Container(
        catalog=catalog,
        sessions=session_manager,
        hub=hub,
        join_limiter=KeyedLimiter(config.JOIN_RATE_PER_MIN),
        search_limiter=KeyedLimiter(config.SEARCH_RATE_PER_MIN),
    )
    error_handlers.install(app)
    app.include_router(system.health)
    app.include_router(api_router)
    app.include_router(ws.router)

    return app


app = create_app()
