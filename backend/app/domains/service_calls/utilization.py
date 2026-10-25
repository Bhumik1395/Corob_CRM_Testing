import pandas as pd
from fastapi import APIRouter, Depends
from app.domains.service_calls.session_auth import get_authorized_session_df
from app.domains.service_calls.utilization_analytics import compute_utilization

router = APIRouter()


@router.get("/api/dashboard/utilization")
def dashboard_utilization(
    customer: str = None,
    year: int = None,
    month: int = None,
    df: pd.DataFrame = Depends(get_authorized_session_df),
):
    return compute_utilization(df, customer=customer, year=year, month=month)