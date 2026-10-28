import re

import pandas as pd

from app.core.db import get_connection
from app.domains.pm.common import ALL_COMPANIES, resolve_company
from app.domains.pm.excel_service import dedupe_pm_rows
from app.shared.blob_store import dumps, loads

# ponytail: PM data is permanent; expires_at is kept as a technical column
# but set far in the future so records are never auto-wiped.
_FAR_FUTURE = "2099-12-31 23:59:59"


def _slug(company: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", company.strip().lower()).strip("-")

def get_pm_data(company: str) -> pd.DataFrame | None:
    slug = _slug(company)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT payload FROM pm_data WHERE company_slug = %s",
                (slug,),
            )
            row = cur.fetchone()
            if row is None:
                return None
    return loads(row["payload"])


def get_all_pm_data() -> pd.DataFrame | None:
    """Every company's stored PM rows stacked into one frame (employees/admins only)."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT payload FROM pm_data")
            rows = cur.fetchall()
            if not rows:
                return None
    frames = [loads(r["payload"]) for r in rows]
    return pd.concat(frames, ignore_index=True)


def load_pm_frame(company: str) -> pd.DataFrame | None:
    """One entry point for the dashboard endpoints: a single company, or all of them."""
    if company == ALL_COMPANIES:
        return get_all_pm_data()
    return get_pm_data(company)


def save_pm_data(company: str, df: pd.DataFrame) -> int:
    existing = get_pm_data(company)
    combined = pd.concat([existing, df], ignore_index=True) if existing is not None else df
    combined = dedupe_pm_rows(combined)

    payload = dumps(combined)
    slug = _slug(company)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO pm_data (company_slug, company_name, payload, expires_at)
                   VALUES (%s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE
                       company_name = VALUES(company_name),
                       payload = VALUES(payload),
                       expires_at = VALUES(expires_at)""",
                (slug, company, payload, _FAR_FUTURE),
            )
    return len(combined)


def load_pm_df(user, company_param):
    """One company's PM data, or (employees/admins only) every company with __all__."""
    if (user.is_corob_employee or user.is_admin) and company_param == ALL_COMPANIES:
        return get_all_pm_data()
    return get_pm_data(resolve_company(user, company_param))
