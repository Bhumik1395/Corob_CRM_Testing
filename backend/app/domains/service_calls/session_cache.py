import uuid
from datetime import datetime, timedelta

import pandas as pd
import pymysql

from app.core.config import SESSION_TTL_SECONDS
from app.core.db import get_connection
from app.shared.blob_store import dumps, loads

REFRESH_AFTER_SECONDS = 300

def create_session(df: pd.DataFrame, owner_sub: str, old_session_id: str | None = None) -> str:
    session_id = str(uuid.uuid4())
    payload = dumps(df)
    expires_at = datetime.utcnow() + timedelta(seconds=SESSION_TTL_SECONDS)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM service_call_sessions WHERE expires_at < UTC_TIMESTAMP()")
            if old_session_id:
                cur.execute("DELETE FROM service_call_sessions WHERE session_id = %s", (old_session_id,))
            cur.execute(
                "INSERT INTO service_call_sessions (session_id, owner_sub, payload, expires_at) VALUES (%s, %s, %s, %s)",
                (session_id, owner_sub, payload, expires_at),
            )
    return session_id


def get_session_data(session_id: str, owner_sub: str) -> pd.DataFrame:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT payload, expires_at FROM service_call_sessions "
                "WHERE session_id = %s AND owner_sub = %s AND expires_at > UTC_TIMESTAMP()",
                (session_id, owner_sub),
            )
            row = cur.fetchone()
            if row is None:
                raise KeyError("session_expired")

            remaining = (row["expires_at"] - datetime.utcnow()).total_seconds()
            if remaining < SESSION_TTL_SECONDS - REFRESH_AFTER_SECONDS:
                try:
                    cur.execute(
                        "UPDATE service_call_sessions SET expires_at = %s WHERE session_id = %s",
                        (datetime.utcnow() + timedelta(seconds=SESSION_TTL_SECONDS), session_id),
                    )
                except pymysql.err.OperationalError:
                    pass

    return loads(row["payload"])


def delete_session(session_id: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM service_call_sessions WHERE session_id = %s", (session_id,))