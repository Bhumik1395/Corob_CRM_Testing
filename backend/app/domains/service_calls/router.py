from fastapi import APIRouter, Request, HTTPException
from app.domains.service_calls.session_cache import get_session_data
from app.domains.service_calls.focus_analytics import compute_focus

router = APIRouter()


@router.get("/api/dashboard/focus")
def dashboard_focus(
    request: Request,
    customer: str = None,
    state: str = None,
    machine: str = None,
    status: str = None,
    service_type: str = None,
    page: int = 1,
    page_size: int = 50,
):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(401, {"error": "session_expired"})

    try:
        df = get_session_data(session_id)
    except KeyError:
        raise HTTPException(401, {"error": "session_expired"})

    return compute_focus(df, customer, state, machine, status, service_type, page, page_size)
