import io
import uuid
from datetime import datetime, timedelta

import pandas as pd

from app.core.config import SESSION_TTL_SECONDS
from app.core.db import get_connection


def create_session(df: pd.DataFrame) -> str:
    session_id = str(uuid.uuid4())
    buf = io.BytesIO()
    df.to_pickle(buf, compression="gzip")
    expires_at = datetime.utcnow() + timedelta(seconds=SESSION_TTL_SECONDS)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO service_call_sessions (session_id, payload, expires_at) VALUES (%s, %s, %s)",
                (session_id, buf.getvalue(), expires_at),
            )
    return session_id


def get_session_data(session_id: str) -> pd.DataFrame:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT payload FROM service_call_sessions WHERE session_id = %s AND expires_at > UTC_TIMESTAMP()",
                (session_id,),
            )
            row = cur.fetchone()
            if row is None:
                raise KeyError("session_expired")

            # reads refresh the TTL, matching the old Redis behaviour
            new_expiry = datetime.utcnow() + timedelta(seconds=SESSION_TTL_SECONDS)
            cur.execute(
                "UPDATE service_call_sessions SET expires_at = %s WHERE session_id = %s",
                (new_expiry, session_id),
            )

    return pd.read_pickle(io.BytesIO(row["payload"]), compression="gzip")


def delete_session(session_id: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM service_call_sessions WHERE session_id = %s", (session_id,))
