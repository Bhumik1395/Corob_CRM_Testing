from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.auth import CurrentUser, require_roles
from app.domains.engineers.analytics import (
    compute_engineer_combined,
    compute_engineer_monthly,
    compute_engineer_visits,
    prepare_installation,
)
from app.domains.installation.cache import get_installation_data
from app.domains.pm.cache import get_all_pm_data
from app.domains.pm.outcome import apply_outcomes
from app.domains.pm.rules_store import get_learned_rules
from app.domains.service_calls.session_cache import get_session_data

router = APIRouter()

SOURCES = ("service", "pm", "installation")


def _service_df_or_none(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return None
    try:
        return get_session_data(session_id)
    except KeyError:
        return None


def _pm_df_or_none():
    df = get_all_pm_data()
    if df is None:
        return None
    return apply_outcomes(df, get_learned_rules())


def _installation_df_or_none():
    return prepare_installation(get_installation_data())


def _load_df(request: Request, source: str):
    if source not in SOURCES:
        raise HTTPException(400, {"error": "bad_source", "message": f"source must be one of {', '.join(SOURCES)}."})

    if source == "service":
        df = _service_df_or_none(request)
        if df is None:
            raise HTTPException(401, {"error": "session_expired", "message": "Upload a Service Calls file first."})
        return df

    if source == "installation":
        df = _installation_df_or_none()
        if df is None:
            raise HTTPException(404, {"error": "no_data", "message": "No Installation data uploaded yet."})
        return df

    df = _pm_df_or_none()
    if df is None:
        raise HTTPException(404, {"error": "no_data", "message": "No PM data uploaded yet."})
    return df


@router.get("/api/engineers/monthly")
def engineer_monthly(
    request: Request,
    eng_code: str,
    source: str = "service",
    user: CurrentUser = Depends(require_roles("corob_employee")),
):
    return compute_engineer_monthly(_load_df(request, source), eng_code, source)


@router.get("/api/engineers/utilization")
def engineer_utilization(
    request: Request,
    eng_code: str,
    user: CurrentUser = Depends(require_roles("corob_employee")),
):
    """Quota days / utilization: each source checked on its own, any one meeting it counts."""
    service_df = _service_df_or_none(request)
    pm_df = _pm_df_or_none()
    installation_df = _installation_df_or_none()
    if service_df is None and pm_df is None and installation_df is None:
        raise HTTPException(404, {"error": "no_data", "message": "Upload Service Calls, PM and/or Installation data first."})
    return compute_engineer_combined(service_df, pm_df, eng_code, installation_df)


@router.get("/api/engineers/visits")
def engineer_visits(
    request: Request,
    eng_code: str,
    source: str = "service",
    month: str = "",
    page: int = 1,
    page_size: int = 50,
    user: CurrentUser = Depends(require_roles("corob_employee")),
):
    return compute_engineer_visits(_load_df(request, source), eng_code, source, page, page_size, month)