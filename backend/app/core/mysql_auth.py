from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import JWTError

from app.core.db import get_connection

bearer_scheme = HTTPBearer(auto_error=False)

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_TTL_SECONDS = int(os.getenv("JWT_TTL_SECONDS", str(60 * 60 * 8)))  


@dataclass
class CurrentUser:
    sub: str
    username: str
    roles: list[str] = field(default_factory=list)
    company: str | None = None

    @property
    def is_corob_employee(self) -> bool:
        return "corob_employee" in self.roles

    @property
    def is_customer(self) -> bool:
        return "customer" in self.roles


def _issue_token(user_row: dict) -> str:
    now = int(time.time())
    claims = {
        "sub": str(user_row["id"]),
        "email": user_row["email"],
        "role": user_row["role"],
        "company": user_row.get("company_name"),
        "iat": now,
        "exp": now + JWT_TTL_SECONDS,
    }
    return jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)

_DUMMY_HASH = bcrypt.hashpw(b"not-a-real-password-just-for-timing", bcrypt.gensalt()).decode("utf-8")


def authenticate(email: str, password: str) -> str:
    """Verifies email/password against MySQL, returns a signed JWT. Raises
    HTTPException(401) on bad credentials, mirroring the old Supabase-backed
    login() behaviour so app/api/login.py barely has to change."""
    email = email.strip().lower()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT u.id, u.email, u.password_hash, u.role, u.is_active,
                          c.name AS company_name
                   FROM users u LEFT JOIN companies c ON u.company_id = c.id
                   WHERE u.email = %s""",
                (email,),
            )
            row = cur.fetchone()

    hash_to_check = row["password_hash"] if row else _DUMMY_HASH
    password_ok = bcrypt.checkpw(password.encode("utf-8"), hash_to_check.encode("utf-8"))

    if row is None or not row["is_active"] or not password_ok:
        raise HTTPException(401, {"error": "invalid_credentials", "message": "Incorrect email or password."})

    return _issue_token(row)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(401, {"error": "invalid_token", "message": str(exc)}) from exc


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, {"error": "missing_token"})

    claims = _decode_token(creds.credentials)
    return CurrentUser(
        sub=claims["sub"],
        username=claims["email"],
        roles=[claims["role"]],
        company=claims.get("company"),
    )


def require_roles(*allowed: str):
    async def _check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not any(r in user.roles for r in allowed):
            raise HTTPException(status.HTTP_403_FORBIDDEN, {"error": "insufficient_role"})
        return user

    return _check


def create_user(email: str, password: str, role: str, company_id: int | None = None) -> int:
    """Admin helper for onboarding accounts (call from a one-off script/shell, not exposed as an API route)."""
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash, role, company_id) VALUES (%s, %s, %s, %s)",
                (email.strip().lower(), password_hash, role, company_id),
            )
            return cur.lastrowid
