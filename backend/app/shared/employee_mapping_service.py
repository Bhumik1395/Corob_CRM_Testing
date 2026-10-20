import logging
import time

import pandas as pd

from app.core.db import get_connection

log = logging.getLogger(__name__)

_CACHE_TTL = 60  # seconds; with 2 uvicorn workers each one refreshes on its own
_cache: tuple[float, dict[str, str], dict[str, str]] | None = None
_BLANK = {"", "nan", "none", "nat"}


def _load():
    global _cache
    if _cache and time.time() - _cache[0] < _CACHE_TTL:
        return _cache[1], _cache[2]
    names: dict[str, str] = {}
    supervisors: dict[str, str] = {}
    try:
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT eng_code, employee_name, supervisor FROM engineer_directory")
            for r in cur.fetchall():
                names[r["eng_code"]] = r["employee_name"]
                if r["supervisor"]:
                    supervisors[r["eng_code"]] = r["supervisor"]
    except Exception:
        # Missing table or DB hiccup: callers already fall back to the
        # "Owned By" name in the uploaded file, so don't take the page down.
        log.exception("Could not read engineer_directory")
    _cache = (time.time(), names, supervisors)
    return names, supervisors


def invalidate_cache() -> None:
    global _cache
    _cache = None


def load_employee_mapping() -> dict[str, str]:
    return _load()[0]


def load_supervisor_mapping() -> dict[str, str]:
    return _load()[1]


def learn_from_frame(df: pd.DataFrame) -> int:
    """Save eng_code -> name (and supervisor) pairs seen in a processed Service
    or PM frame. Returns the number of engineers written."""
    if "eng_code" not in df.columns or "employee_name" not in df.columns:
        return 0
    cols = [c for c in ("eng_code", "employee_name", "supervisor") if c in df.columns]
    d = df[cols].copy()
    for c in cols:
        d[c] = d[c].fillna("").astype(str).str.strip()
    d = d[~d["eng_code"].str.lower().isin(_BLANK)]
    d = d[~d["employee_name"].str.lower().isin(_BLANK)]
    if d.empty:
        return 0
    if "supervisor" not in d.columns:
        d["supervisor"] = ""
    d.loc[d["supervisor"].str.lower().isin(_BLANK), "supervisor"] = ""

    def mode(s: pd.Series) -> str:
        s = s[s != ""]
        return str(s.mode().iloc[0]) if not s.empty else ""

    rows = (
        d.groupby("eng_code")
        .agg(employee_name=("employee_name", mode), supervisor=("supervisor", mode))
        .reset_index()
    )
    rows = rows[rows["employee_name"] != ""]
    if rows.empty:
        return 0

    with get_connection() as conn, conn.cursor() as cur:
        cur.executemany(
            """INSERT INTO engineer_directory (eng_code, employee_name, supervisor)
               VALUES (%s, %s, %s)
               ON DUPLICATE KEY UPDATE
                   employee_name = VALUES(employee_name),
                   supervisor = IF(VALUES(supervisor) <> '', VALUES(supervisor), supervisor)""",
            list(rows.itertuples(index=False, name=None)),
        )
    invalidate_cache()
    return len(rows)