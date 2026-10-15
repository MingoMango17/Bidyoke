import os

PROTOCOL_VERSION = 1
VERSION = "0.1.0"
BACKEND = "fastapi"

SOURCES = [s.strip() for s in os.environ.get("SOURCES", "youtube,local").split(",") if s.strip()]
MEDIA_AUTH = os.environ.get("MEDIA_AUTH", "off")
MAX_QUEUE_PER_MEMBER = int(os.environ.get("MAX_QUEUE_PER_MEMBER", "3"))
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
PUBLIC_BASE_URL =os.environ.get("PUBLIC_BASE_URL", "http://localhost:5173").rstrip("/")
