import json
from collections.abc import Callable
from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.song import SourceUnavailable

QUOTA_TZ = ZoneInfo("America/Los_Angeles")


def pacific_today() -> str:
    return datetime.now(QUOTA_TZ).date().isoformat()


class QuotaBudget:
    """Self-imposed daily cap on API units. Google resets quota at midnight Pacific."""

    def __init__(
        self,
        limit: int,
        path: str | None = None,
        today: Callable[[], str] = pacific_today,
    ) -> None:
        self._limit = limit
        self._path = path
        self._today = today
        self._day = today()
        self._used = 0
        self._load()

    def charge(self, units: int) -> None:
        day = self._today()
        if day != self._day:
            self._day, self._used = day, 0
        if self._used + units > self._limit:
            raise SourceUnavailable("Daily YouTube quota budget reached.")
        self._used += units
        self._save()

    def _load(self) -> None:
        if not self._path:
            return
        try:
            with open(self._path) as f:
                data = json.load(f)
            if data["day"] == self._day:
                self._used = int(data["used"])
        except (OSError, ValueError, KeyError, TypeError):
            pass

    def _save(self) -> None:
        if not self._path:
            return
        try:
            with open(self._path, "w") as f:
                json.dump({"day": self._day, "used": self._used}, f)
        except OSError:
            pass
