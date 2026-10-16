import time
from typing import Any


class TTLCache:
    def __init__(self, ttl: float, max_size: int = 512) -> None:
        self._ttl = ttl
        self._max_size = max_size
        self._data: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        expires, value = entry
        if expires < time.monotonic():
            del self._data[key]
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        if key not in self._data and len(self._data) >= self._max_size:
            del self._data[next(iter(self._data))]
        self._data[key] = (time.monotonic() + self._ttl, value)
