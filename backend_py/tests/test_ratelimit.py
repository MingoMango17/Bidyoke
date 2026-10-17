from app.ratelimit import KeyedLimiter, TokenBucket


class Clock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


def test_bucket_allows_burst_then_blocks():
    clock = Clock()
    bucket = TokenBucket(rate=1, burst=3, clock=clock)
    assert [bucket.allow() for _ in range(4)] == [True, True, True, False]


def test_bucket_refills_over_time():
    clock = Clock()
    bucket = TokenBucket(rate=2, burst=2, clock=clock)
    bucket.allow()
    bucket.allow()
    assert not bucket.allow()
    clock.now = 0.5
    assert bucket.allow()
    assert not bucket.allow()


def test_bucket_never_exceeds_burst():
    clock = Clock()
    bucket = TokenBucket(rate=10, burst=2, clock=clock)
    clock.now = 100
    assert [bucket.allow() for _ in range(3)] == [True, True, False]


def test_limiter_tracks_keys_independently():
    clock = Clock()
    limiter = KeyedLimiter(per_minute=2, clock=clock)
    assert limiter.allow("a") and limiter.allow("a")
    assert not limiter.allow("a")
    assert limiter.allow("b")


def test_limiter_refills_per_minute_rate():
    clock = Clock()
    limiter = KeyedLimiter(per_minute=60, clock=clock)
    for _ in range(60):
        assert limiter.allow("a")
    assert not limiter.allow("a")
    clock.now = 1.0
    assert limiter.allow("a")
