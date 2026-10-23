import logging
from app.core.db import get_connection

log = logging.getLogger(__name__)


def get_overrides() -> dict[tuple[str, str], str]:
    try:
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT company, ticket_no, label FROM pm_row_overrides")
            rows = cur.fetchall()
    except Exception:
        log.exception("Could not read pm_row_overrides")
        return {}
    return {(r["company"], r["ticket_no"]): r["label"] for r in rows}


def set_overrides(pairs: list[tuple[str, str]], label: str, user: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.executemany(
            """INSERT INTO pm_row_overrides (company, ticket_no, label, set_by)
               VALUES (%s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE label = VALUES(label), set_by = VALUES(set_by)""",
            [(c, t, label, user) for c, t in pairs],
        )


def clear_overrides(pairs: list[tuple[str, str]]) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.executemany(
            "DELETE FROM pm_row_overrides WHERE company = %s AND ticket_no = %s",
            list(pairs),
        )
