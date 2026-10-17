import time
from collections.abc import Callable

MAX_KEYS = 10_000


class TokenBucket:
    def __init__(self, rate: float, burst: float, clock: Callable[[], float] = time.monotonic):
        self._rate = rate
        self._burst = burst
        self._clock = clock
        self._tokens = burst
        self._stamp = clock()

    def allow(self) -> bool:
        now = self._clock()
        self._tokens = min(self._burst, self._tokens + (now - self._stamp) * self._rate)
        self._stamp = now
        if self._tokens < 1:
            return False
        self._tokens -= 1
        return True

    @property
    def idle(self) -> bool:
        return self._tokens + (self._clock() - self._stamp) * self._rate >= self._burst


class KeyedLimiter:
    def __init__(self, per_minute: int, clock: Callable[[], float] = time.monotonic):
        self._per_minute = per_minute
        self._clock = clock
        self._buckets: dict[str, TokenBucket] = {}

    def allow(self, key: str) -> bool:
        bucket = self._buckets.get(key)
        if bucket is None:
            if len(self._buckets) >= MAX_KEYS:
                self._buckets = {k: b for k, b in self._buckets.items() if not b.idle}
            bucket = self._buckets[key] = TokenBucket(
                self._per_minute / 60, self._per_minute, self._clock
            )
        return bucket.allow()
