from fastapi import FastAPI

from app import config
from app.api import error_handlers, sessions, songs, ws
from app.container import Container
from app.core.manager import SessionManager
from app.ratelimit import KeyedLimiter
from app.realtime.hub import Hub
from app.services.catalog import SongCatalog


def create_app() -> FastAPI:
    app = FastAPI(title="Bidyoke", docs_url="/docs")
    catalog = SongCatalog.from_config()
    session_manager = SessionManager(catalog.resolve)
    app.state.container = Container(
        catalog=catalog,
        sessions=session_manager,
        hub=Hub(session_manager, config.HOST_GRACE_SECONDS),
        join_limiter=KeyedLimiter(config.JOIN_RATE_PER_MIN),
        search_limiter=KeyedLimiter(config.SEARCH_RATE_PER_MIN),
    )
    error_handlers.install(app)
    app.include_router(sessions.router)
    app.include_router(songs.router)
    app.include_router(ws.router)

    @app.get("/healthz")
    async def healthz():
        return {
            "status": "ok",
            "protocolVersion": config.PROTOCOL_VERSION,
            "backend": config.BACKEND,
            "version": config.VERSION,
        }

    @app.get("/api/config")
    async def get_config():
        return {
            "sources": config.SOURCES,
            "mediaAuth": config.MEDIA_AUTH,
            "maxQueuePerMember": config.MAX_QUEUE_PER_MEMBER,
            "protocolVersion": config.PROTOCOL_VERSION,
        }

    return app


app = create_app()
