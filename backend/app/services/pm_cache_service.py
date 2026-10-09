import io
import re
import pandas as pd
from app.domains.service_calls.session_cache import r  # reuse the same Redis/Valkey connection
from app.core.auth_config import PM_DATA_TTL_SECONDS
from app.domains.pm.excel_service import dedupe_pm_rows


def _company_key(company: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", company.strip().lower()).strip("-")
    return f"pm_data:{slug}"


def get_pm_data(company: str) -> pd.DataFrame | None:
    raw = r.get(_company_key(company))
    if raw is None:
        return None
    df = pd.read_pickle(io.BytesIO(raw), compression="gzip")
    r.expire(_company_key(company), PM_DATA_TTL_SECONDS)  # reads refresh the TTL too
    return df


def save_pm_data(company: str, df: pd.DataFrame) -> int:
    """Merge `df` (freshly-uploaded rows) into whatever is already stored for
    this company, dedupe by ticket_no (new rows win), and persist. Returns
    the resulting row count."""
    existing = get_pm_data(company)
    combined = pd.concat([existing, df], ignore_index=True) if existing is not None else df
    combined = dedupe_pm_rows(combined)

    buf = io.BytesIO()
    combined.to_pickle(buf, compression="gzip")
    r.set(_company_key(company), buf.getvalue(), ex=PM_DATA_TTL_SECONDS)
    return len(combined)


def delete_pm_data(company: str) -> bool:
    """Wipes all stored PM data for a company. Returns True if there was
    anything to delete, False if it was already empty."""
    deleted_count = r.delete(_company_key(company))
    return deleted_count > 0