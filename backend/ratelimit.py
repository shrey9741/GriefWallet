"""Small per-user rate limiter for the expensive AI endpoints.

In-memory and per process: fine for a single Render instance. It protects the shared
Groq token budget and stops one account from hammering the AI routes.
"""
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException

from routers.auth import get_current_user

_hits: dict = defaultdict(deque)


def rate_limit(name: str, max_calls: int, window_seconds: int):
    def dependency(current_user=Depends(get_current_user)):
        now = time.monotonic()
        q = _hits[(name, str(current_user.id))]
        while q and now - q[0] > window_seconds:
            q.popleft()
        if len(q) >= max_calls:
            wait = int(window_seconds - (now - q[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"You have used this feature a lot recently. Please try again in about {max(1, wait // 60)} minute(s).",
            )
        q.append(now)

    return dependency
