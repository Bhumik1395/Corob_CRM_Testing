import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.core.db import get_connection

STATEMENTS = (
    "DELETE FROM pm_data WHERE expires_at < UTC_TIMESTAMP()",
    "DELETE FROM installation_data WHERE expires_at < UTC_TIMESTAMP()",
    "DELETE FROM service_call_sessions WHERE expires_at < UTC_TIMESTAMP()",
    """DELETE FROM login_attempts
       WHERE (locked_until IS NULL OR locked_until < UTC_TIMESTAMP())
         AND (window_expires_at IS NULL OR window_expires_at < UTC_TIMESTAMP())""",
)


def main() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        for sql in STATEMENTS:
            cur.execute(sql)
            print(f"{cur.rowcount:>6} rows  {' '.join(sql.split())[:60]}")


if __name__ == "__main__":
    main()