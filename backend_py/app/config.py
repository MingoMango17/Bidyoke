import os

PROTOCOL_VERSION = 1
VERSION = "0.1.0"
BACKEND = "fastapi"

SOURCES = [s.strip() for s in os.environ.get("SOURCES", "youtube,local").split(",") if s.strip()]
MEDIA_AUTH = os.environ.get("MEDIA_AUTH", "off")
MAX_QUEUE_PER_MEMBER = int(os.environ.get("MAX_QUEUE_PER_MEMBER", "3"))
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:5173").rstrip("/")
FIXTURE_SONGS = os.environ.get("FIXTURE_SONGS", "off") == "on"
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
YOUTUBE_DAILY_BUDGET = int(os.environ.get("YOUTUBE_DAILY_BUDGET", "5000"))
QUOTA_FILE = os.environ.get("QUOTA_FILE", ".youtube_quota.json")
HOST_GRACE_SECONDS = float(os.environ.get("HOST_GRACE_SECONDS", "120"))
JOIN_RATE_PER_MIN = int(os.environ.get("JOIN_RATE_PER_MIN", "60"))
SEARCH_RATE_PER_MIN = int(os.environ.get("SEARCH_RATE_PER_MIN", "20"))
SESSION_TTL = float(os.environ.get("SESSION_TTL", "21600"))
MAX_MEMBERS = int(os.environ.get("MAX_MEMBERS", "50"))
MAX_QUEUE_TOTAL = int(os.environ.get("MAX_QUEUE_TOTAL", "100"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
