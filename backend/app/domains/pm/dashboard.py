from fastapi import APIRouter, HTTPException, Depends

from app.core.auth import CurrentUser, require_roles
from app.domains.pm.cache import load_pm_frame
from app.domains.pm.analytics import compute_pm_dashboard, compute_pm_filter_options
from app.domains.pm.common import ALL_COMPANIES, resolve_company
from app.domains.pm.outcome import apply_outcomes
from app.domains.pm.rules_store import get_learned_rules

router = APIRouter()


def _frame_or_404(company: str):
    df = load_pm_frame(company)
    if df is None:
        where = "any company" if company == ALL_COMPANIES else company
        raise HTTPException(404, {
            "error": "no_data",
            "message": f"No PM data uploaded yet for {where}.",
        })
    return apply_outcomes(df, get_learned_rules())


@router.get("/api/pm/dashboard")
def pm_dashboard(
    company: str | None = None,
    state: str | None = None,
    overall_month: str | None = None,
    month: str | None = None,
    dealer_code: str | None = None,
    detail_state: str | None = None,
    detail_month: str | None = None,
    page: int = 1,
    page_size: int = 50,
    user: CurrentUser = Depends(require_roles("customer", "corob_employee")),
):
    resolved_company = resolve_company(user, company, allow_all=True)
    df = _frame_or_404(resolved_company)
    return compute_pm_dashboard(
        df,
        state=state,
        overall_month=overall_month,
        month=month,
        dealer_code=dealer_code,
        detail_state=detail_state,
        detail_month=detail_month,
        page=page,
        page_size=page_size,
    )


@router.get("/api/pm/filters")
def pm_filters(
    company: str | None = None,
    user: CurrentUser = Depends(require_roles("customer", "corob_employee")),
):
    resolved_company = resolve_company(user, company, allow_all=True)
    df = _frame_or_404(resolved_company)
    return compute_pm_filter_options(df)