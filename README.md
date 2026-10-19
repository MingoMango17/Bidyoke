# Bidyoke

Party karaoke. One host device plays songs, guests join from their phones and queue songs live.

The backend lives in `backend_py/` (FastAPI, single process, in-memory state).

## Run locally

```bash
cd backend_py
python -m venv venv && . venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add YOUTUBE_API_KEY
uvicorn app.main:app --env-file .env
```

API docs at `http://localhost:8000/docs`. Health check at `/healthz`.

Run a single worker. Sessions live in process memory, so more workers would each hold a different set of rooms.

## Run with Docker

```bash
cd backend_py
docker build -t bidyoke-backend .
docker run --rm -p 8000:8000 --env-file .env -v bidyoke-data:/data bidyoke-backend
```

The `/data` volume keeps the YouTube quota counter across restarts.

Behind a reverse proxy (Caddy, Nginx) set `FORWARDED_ALLOW_IPS` to the proxy's address. Without it every guest appears to come from the proxy's IP and shares one join rate limit.

## Configuration

All settings are environment variables.

| Variable | Default | Purpose |
|---|---|---|
| `YOUTUBE_API_KEY` | – | YouTube Data API v3 key. Without it the `youtube` source is unavailable. |
| `YOUTUBE_DAILY_BUDGET` | `5000` | Self-imposed cap on YouTube quota units per day. A search costs about 101. |
| `QUOTA_FILE` | `.youtube_quota.json` | Where the daily quota counter is saved. |
| `SOURCES` | `youtube,local` | Enabled song sources. |
| `FIXTURE_SONGS` | `off` | `on` serves six fixed test songs as the `local` source. |
| `ALLOWED_ORIGINS` | – | Comma-separated WebSocket origins. Empty allows any. |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | Base of the join link returned on create. |
| `MAX_QUEUE_PER_MEMBER` | `3` | Waiting songs per member. |
| `MAX_QUEUE_TOTAL` | `100` | Waiting songs per session. |
| `MAX_MEMBERS` | `50` | Members per session. |
| `HOST_GRACE_SECONDS` | `120` | How long a disconnected host can come back before the session ends. |
| `SESSION_TTL` | `21600` | Idle seconds before a session is ended. |
| `JOIN_RATE_PER_MIN` | `60` | Joins per minute per IP and session. |
| `SEARCH_RATE_PER_MIN` | `20` | Searches per minute per member. |
| `LOG_LEVEL` | `INFO` | Log verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| `MEDIA_AUTH` | `off` | Reserved for the local library. |

## Suggestions

Sessions show suggestion cards under the queue:

- **More from <channel>** while a YouTube song is playing: up to 3 of that channel's most viewed embeddable videos. The first lookup for a channel costs about 3 YouTube quota units and is cached for a day.
- **Play again**: songs already played in this session that are not queued.

The channel card appears a moment after a song starts, once the lookup has finished.

## Tests

```bash
cd backend_py
pip install -r requirements-dev.txt
python -m pytest tests
```
