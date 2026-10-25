import pandas as pd
from fastapi import APIRouter, Depends
from app.domains.service_calls.session_auth import get_authorized_session_df
from app.domains.service_calls.filters_service import compute_filter_options

router = APIRouter()


@router.get("/api/filters")
def get_filters(df: pd.DataFrame = Depends(get_authorized_session_df)):
    return compute_filter_options(df)