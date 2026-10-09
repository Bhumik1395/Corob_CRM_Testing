from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.auth import CurrentUser, require_roles
from app.domains.engineers.analytics import compute_engineer_monthly
from app.domains.pm.cache import get_all_pm_data
from app.domains.service_calls.session_cache import get_session_data

router = APIRouter()

SOURCES = ("service", "pm")


@router.get("/api/engineers/monthly")
def engineer_monthly(
    request: Request,
    eng_code: str,
    source: str = "service",
    user: CurrentUser = Depends(require_roles("corob_employee")),
):
    if source not in SOURCES:
        raise HTTPException(400, {"error": "bad_source", "message": f"source must be one of {', '.join(SOURCES)}."})

    if source == "service":
        session_id = request.cookies.get("session_id")
        if not session_id:
            raise HTTPException(401, {"error": "session_expired", "message": "Upload a Service Calls file first."})
        try:
            df = get_session_data(session_id)
        except KeyError:
            raise HTTPException(401, {"error": "session_expired", "message": "Upload a Service Calls file first."})
    else:
        df = get_all_pm_data()
        if df is None:
            raise HTTPException(404, {"error": "no_data", "message": "No PM data uploaded yet."})

    return compute_engineer_monthly(df, eng_code, source)