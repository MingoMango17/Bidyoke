from fastapi import APIRouter

from app import config

health = APIRouter()
router = APIRouter()


@health.get("/healthz")
async def healthz():
    return {
        "status": "ok",
        "protocolVersion": config.PROTOCOL_VERSION,
        "backend": config.BACKEND,
        "version": config.VERSION,
    }


@router.get("/config")
async def get_config():
    return {
        "sources": config.SOURCES,
        "mediaAuth": config.MEDIA_AUTH,
        "maxQueuePerMember": config.MAX_QUEUE_PER_MEMBER,
        "protocolVersion": config.PROTOCOL_VERSION,
    }
