import pandas as pd
from fastapi import APIRouter, Depends
from app.domains.service_calls.session_auth import get_authorized_session_df
from app.domains.service_calls.employee_analytics import compute_employees

router = APIRouter()


@router.get("/api/dashboard/employees")
def dashboard_employees(
    page: int = 1,
    page_size: int = 50,
    search: str = None,
    df: pd.DataFrame = Depends(get_authorized_session_df),
):
    return compute_employees(df, page, page_size, search)