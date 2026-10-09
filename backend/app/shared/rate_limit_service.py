"""Login throttling, MySQL-backed (replaces the Redis rate_limit_service.py).

Two independent limits: per device-cookie+IP, and per account. An attacker
has to get past both, and the account limit can't be reset by clearing
cookies or changing IP.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException, Request, Response, status

from app.core.db import get_connection

MAX_ATTEMPTS = 5
WINDOW_SECONDS = 15 * 60
LOCKOUT_SECONDS = 30 * 60

ACCOUNT_MAX_ATTEMPTS = 8
ACCOUNT_WINDOW_SECONDS = 15 * 60
ACCOUNT_LOCKOUT_SECONDS = 15 * 60

DEVICE_COOKIE_NAME = "device_id"
DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365


def _client_ip(request: Request) -> str:
    # Behind our Nginx, X-Real-IP is set to the true socket address and cannot
    # be spoofed by the client (X-Forwarded-For can — clients may prepend to it).
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
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


# --- shared helpers ------------------------------------------------------------
def _is_locked(key: str) -> int:
    """Seconds remaining on the lock for this key, or 0."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT locked_until FROM login_attempts WHERE device_ip_key = %s", (key,))
            row = cur.fetchone()
    if row and row["locked_until"] and row["locked_until"] > datetime.utcnow():
        return int((row["locked_until"] - datetime.utcnow()).total_seconds())
    return 0


def _record_failure(key: str, max_attempts: int, window_s: int, lockout_s: int) -> None:
    now = datetime.utcnow()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT attempts, window_expires_at FROM login_attempts WHERE device_ip_key = %s",
                (key,),
            )
            row = cur.fetchone()
            if row is None or (row["window_expires_at"] and row["window_expires_at"] < now):
                attempts = 1
                window_expires_at = now + timedelta(seconds=window_s)
            else:
                attempts = row["attempts"] + 1
                window_expires_at = row["window_expires_at"]
            locked_until = now + timedelta(seconds=lockout_s) if attempts >= max_attempts else None
            cur.execute(
                """INSERT INTO login_attempts (device_ip_key, attempts, window_expires_at, locked_until)
                   VALUES (%s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE
                       attempts = VALUES(attempts),
                       window_expires_at = VALUES(window_expires_at),
                       locked_until = VALUES(locked_until)""",
                (key, attempts, window_expires_at, locked_until),
            )


def _clear(key: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM login_attempts WHERE device_ip_key = %s", (key,))


# --- per device + IP -----------------------------------------------------------
def _device_key(device_id: str, ip: str) -> str:
    return f"{device_id}:{ip}"


def enforce_not_locked_out(device_id: str, ip: str) -> None:
    remaining = _is_locked(_device_key(device_id, ip))
    if remaining:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            {
                "error": "too_many_attempts",
                "message": f"Too many failed sign-in attempts. Try again in {remaining // 60 + 1} minute(s).",
                "retry_after_seconds": remaining,
            },
        )


def record_failed_attempt(device_id: str, ip: str) -> None:
    _record_failure(_device_key(device_id, ip), MAX_ATTEMPTS, WINDOW_SECONDS, LOCKOUT_SECONDS)


def clear_attempts(device_id: str, ip: str) -> None:
    _clear(_device_key(device_id, ip))


# --- per account ---------------------------------------------------------------
def _account_key(email: str) -> str:
    return f"email:{email.strip().lower()}"


def enforce_account_not_locked(email: str) -> None:
    remaining = _is_locked(_account_key(email))
    if remaining:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            {
                "error": "account_locked",
                "message": f"Too many failed attempts on this account. Try again in {remaining // 60 + 1} minute(s).",
                "retry_after_seconds": remaining,
            },
        )


def record_account_failure(email: str) -> None:
    _record_failure(_account_key(email), ACCOUNT_MAX_ATTEMPTS, ACCOUNT_WINDOW_SECONDS, ACCOUNT_LOCKOUT_SECONDS)


def clear_account_failures(email: str) -> None:
    _clear(_account_key(email))
