import io
import re
from datetime import datetime, timedelta

import pandas as pd

from app.core.auth_config import PM_DATA_TTL_SECONDS
from app.core.db import get_connection
from app.domains.pm.common import ALL_COMPANIES, resolve_company
from app.domains.pm.excel_service import dedupe_pm_rows


def _slug(company: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", company.strip().lower()).strip("-")

def get_pm_data(company: str) -> pd.DataFrame | None:
    slug = _slug(company)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT payload FROM pm_data WHERE company_slug = %s AND expires_at > UTC_TIMESTAMP()",
                (slug,),
            )
            row = cur.fetchone()
            if row is None:
                return None

            new_expiry = datetime.utcnow() + timedelta(seconds=PM_DATA_TTL_SECONDS)
            cur.execute(
                "UPDATE pm_data SET expires_at = %s WHERE company_slug = %s",
                (new_expiry, slug),
            )

    return pd.read_pickle(io.BytesIO(row["payload"]), compression="gzip")


def get_all_pm_data() -> pd.DataFrame | None:
    """Every company's stored PM rows stacked into one frame (employees only)."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT payload FROM pm_data WHERE expires_at > UTC_TIMESTAMP()")
            rows = cur.fetchall()
            if not rows:
                return None

            new_expiry = datetime.utcnow() + timedelta(seconds=PM_DATA_TTL_SECONDS)
            cur.execute(
                "UPDATE pm_data SET expires_at = %s WHERE expires_at > UTC_TIMESTAMP()",
                (new_expiry,),
            )

    frames = [pd.read_pickle(io.BytesIO(r["payload"]), compression="gzip") for r in rows]
    return pd.concat(frames, ignore_index=True)


def load_pm_frame(company: str) -> pd.DataFrame | None:
    """One entry point for the dashboard endpoints: a single company, or all of them."""
    if company == ALL_COMPANIES:
        return get_all_pm_data()
    return get_pm_data(company)


def save_pm_data(company: str, df: pd.DataFrame) -> int:
    """Merge `df` (freshly-uploaded rows) into whatever is already stored for
    this company, dedupe by ticket_no (new rows win), and persist. Returns
    the resulting row count."""
    existing = get_pm_data(company)
    combined = pd.concat([existing, df], ignore_index=True) if existing is not None else df
    combined = dedupe_pm_rows(combined)

    buf = io.BytesIO()
    combined.to_pickle(buf, compression="gzip")
    slug = _slug(company)
    expires_at = datetime.utcnow() + timedelta(seconds=PM_DATA_TTL_SECONDS)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO pm_data (company_slug, company_name, payload, expires_at)
                   VALUES (%s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE
                       company_name = VALUES(company_name),
                       payload = VALUES(payload),
                       expires_at = VALUES(expires_at)""",
                (slug, company, buf.getvalue(), expires_at),
            )
    return len(combined)


def delete_all_pm_data() -> int:
    """Wipes every company's stored PM data. Returns the number of rows deleted."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM pm_data")
            return cur.rowcount


def delete_pm_data(company: str) -> bool:
    """Delete stored PM data for one company and report whether it existed."""
    slug = _slug(company)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM pm_data WHERE company_slug = %s", (slug,))
            return cur.rowcount > 0


def load_pm_df(user, company_param):
    """One company's PM data, or (employees only) every company with __all__."""
    if user.is_corob_employee and company_param == ALL_COMPANIES:
        return get_all_pm_data()
    return get_pm_data(resolve_company(user, company_param))
