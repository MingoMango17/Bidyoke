from fastapi import FastAPI

from app import config
from app.api import error_handlers, sessions, songs, ws
from app.core.manager import SessionManager
from app.services.catalog import SongCatalog
from app.realtime.hub import Hub


def create_app() -> FastAPI:
    app = FastAPI(title="Bidyoke", docs_url="/docs")
    app.state.catalog = SongCatalog.from_config()
    app.state.sessions = SessionManager(app.state.catalog.resolve)
    app.state.hub = Hub(app.state.sessions, config.HOST_GRACE_SECONDS)
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
