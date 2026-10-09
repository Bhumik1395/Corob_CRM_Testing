from __future__ import annotations

import time
import uuid

from fastapi import HTTPException, Request, Response, status

from app.domains.service_calls.session_cache import r

MAX_ATTEMPTS = 5
WINDOW_SECONDS = 15 * 60
LOCKOUT_SECONDS = 30 * 60

DEVICE_COOKIE_NAME = "device_id"
DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_or_set_device_id(request: Request, response: Response) -> str:
    device_id = request.cookies.get(DEVICE_COOKIE_NAME)
    if not device_id:
        device_id = str(uuid.uuid4())
        response.set_cookie(
            key=DEVICE_COOKIE_NAME,
            value=device_id,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=DEVICE_COOKIE_MAX_AGE,
        )
    return device_id


def _key(device_id: str, ip: str) -> str:
    return f"login_attempts:{device_id}:{ip}"


def _lockout_key(device_id: str, ip: str) -> str:
    return f"login_lockout:{device_id}:{ip}"


def enforce_not_locked_out(device_id: str, ip: str) -> None:
    ttl = r.ttl(_lockout_key(device_id, ip))
    if ttl and ttl > 0:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            {
                "error": "too_many_attempts",
                "message": f"Too many failed sign-in attempts. Try again in {ttl // 60 + 1} minute(s).",
                "retry_after_seconds": ttl,
            },
        )


def record_failed_attempt(device_id: str, ip: str) -> None:
    key = _key(device_id, ip)
    attempts = r.incr(key)
    if attempts == 1:
        r.expire(key, WINDOW_SECONDS)
    if attempts >= MAX_ATTEMPTS:
        r.set(_lockout_key(device_id, ip), "1", ex=LOCKOUT_SECONDS)
        r.delete(key)


def clear_attempts(device_id: str, ip: str) -> None:
    r.delete(_key(device_id, ip))
    r.delete(_lockout_key(device_id, ip))
