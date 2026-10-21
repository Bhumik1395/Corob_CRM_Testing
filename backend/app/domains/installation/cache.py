import io
import logging
from datetime import datetime, timedelta

import pandas as pd

from app.core.auth_config import PM_DATA_TTL_SECONDS
from app.core.db import get_connection
from app.shared.engineer_resolver import resolve_engineers

log = logging.getLogger(__name__)


def get_installation_data() -> pd.DataFrame | None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT payload FROM installation_data WHERE id = 1 AND expires_at > UTC_TIMESTAMP()")
        row = cur.fetchone()
        if row is None:
            return None
        cur.execute(
            "UPDATE installation_data SET expires_at = %s WHERE id = 1",
            (datetime.utcnow() + timedelta(seconds=PM_DATA_TTL_SECONDS),),
        )
    return pd.read_pickle(io.BytesIO(row["payload"]), compression="gzip")


def _write(df: pd.DataFrame) -> None:
    buf = io.BytesIO()
    df.to_pickle(buf, compression="gzip")
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO installation_data (id, payload, expires_at) VALUES (1, %s, %s)
               ON DUPLICATE KEY UPDATE payload = VALUES(payload), expires_at = VALUES(expires_at)""",
            (buf.getvalue(), datetime.utcnow() + timedelta(seconds=PM_DATA_TTL_SECONDS)),
        )


def save_installation_data(df: pd.DataFrame) -> int:
    """Merge freshly uploaded rows into what is stored (same company + machine
    number: the new row wins). Returns the stored row count."""
    existing = get_installation_data()
    combined = pd.concat([existing, df], ignore_index=True) if existing is not None else df
    combined = combined.drop_duplicates(subset=["company", "machine_no"], keep="last")
    _write(combined)
    return len(combined)


def relink_installation_engineers() -> bool:
    """Re-run engineer matching on stored rows (call after the directory learned
    new engineers, so upload order does not matter)."""
    df = get_installation_data()
    if df is None:
        return False
    _write(resolve_engineers(df))
    return True


def delete_installation_data() -> bool:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM installation_data")
        return cur.rowcount > 0