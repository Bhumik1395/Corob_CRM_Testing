from fastapi import APIRouter, Request, HTTPException
from app.domains.service_calls.session_cache import get_session_data
from app.domains.service_calls.employee_analytics import compute_employees

router = APIRouter()


@router.get("/api/dashboard/employees")
def dashboard_employees(request: Request, page: int = 1, page_size: int = 50, search: str = None):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(401, {"error": "session_expired"})

    try:
        df = get_session_data(session_id)
    except KeyError:
        raise HTTPException(401, {"error": "session_expired"})

    return compute_employees(df, page, page_size, search)
