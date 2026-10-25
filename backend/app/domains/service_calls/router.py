import pandas as pd
from fastapi import APIRouter, Depends
from app.domains.service_calls.session_auth import get_authorized_session_df
from app.domains.service_calls.focus_analytics import compute_focus

router = APIRouter()


@router.get("/api/dashboard/focus")
def dashboard_focus(
    customer: str = None,
    state: str = None,
    machine: str = None,
    status: str = None,
    service_type: str = None,
    year: str = None,
    page: int = 1,
    page_size: int = 50,
    df: pd.DataFrame = Depends(get_authorized_session_df)
):
    return compute_focus(df, customer, state, machine, status, service_type, year, page, page_size)