import logging

from app.core.db import get_connection

log = logging.getLogger(__name__)


def audit(actor: str, action: str, detail: str = "") -> None:
    """Never raises: a broken audit table must not take logins and uploads down with it."""
    try:
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO audit_log (actor, action, detail) VALUES (%s, %s, %s)",
                (str(actor)[:255], action[:64], str(detail)[:500]),
            )
    except Exception:
        log.exception("audit write failed: %s %s", actor, action)