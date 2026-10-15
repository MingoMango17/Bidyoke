from fastapi import FastAPI

from app import config
from app.api import errors, sessions, ws
from app.core.manager import SessionManager
from app.realtime.hub import Hub


def create_app() -> FastAPI:
    app = FastAPI(title="Bidyoke", docs_url="/docs")
    app.state.sessions = SessionManager()
    app.state.hub = Hub()
    errors.install(app)
    app.include_router(sessions.router)
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
