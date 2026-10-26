import pandas as pd
from fastapi import APIRouter, Depends
from app.domains.service_calls.session_auth import get_authorized_session_df
from app.domains.service_calls.utilization_analytics import compute_utilization

router = APIRouter()


def _pm_and_installation():
    from app.domains.engineers.analytics import prepare_installation
    from app.domains.installation.cache import get_installation_data
    from app.domains.pm.cache import get_all_pm_data
    from app.domains.pm.outcome import apply_outcomes
    from app.domains.pm.rules_store import get_learned_rules

    pm = get_all_pm_data()
    if pm is not None:
        pm = apply_outcomes(pm, get_learned_rules())
        if "is_closed" in pm.columns:
            pm = pm[pm["is_closed"]]
    return pm, prepare_installation(get_installation_data())


@router.get("/api/dashboard/utilization")
def dashboard_utilization(
    customer: str = None,
    year: int = None,
    month: int = None,
    df: pd.DataFrame = Depends(get_authorized_session_df),
):
    pm_df, installation_df = _pm_and_installation()
    return compute_utilization(
        df, customer=customer, year=year, month=month,
        pm_df=pm_df, installation_df=installation_df,
    )