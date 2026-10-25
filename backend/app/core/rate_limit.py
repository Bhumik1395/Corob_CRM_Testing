import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException

from app.core.auth import CurrentUser, get_current_user

_hits: dict[tuple[str, str], deque] = defaultdict(deque)
_lock = threading.Lock()


def rate_limit(bucket: str, max_calls: int, per_seconds: int):
    def _check(user: CurrentUser = Depends(get_current_user)) -> None:
        now = time.monotonic()
        with _lock:
            q = _hits[(bucket, user.sub)]
            while q and q[0] <= now - per_seconds:
                q.popleft()
            if len(q) >= max_calls:
                wait = int(q[0] + per_seconds - now) + 1
                raise HTTPException(
                    429,
                    {"error": "rate_limited", "message": f"Too many requests. Try again in {wait}s."},
                    headers={"Retry-After": str(wait)},
                )
            q.append(now)

    return _check