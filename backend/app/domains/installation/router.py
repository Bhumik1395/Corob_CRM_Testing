from fastapi import APIRouter, Depends, HTTPException
from app.core.audit import audit
from app.core.auth import CurrentUser, require_roles
from app.domains.installation.analytics import (
    compute_installation_dashboard,
    compute_installation_filter_options,
)
from app.domains.installation.cache import delete_installation_data, get_installation_data

router = APIRouter()
employee_only = require_roles("corob_employee")


def _frame_or_404():
    df = get_installation_data()
    if df is None:
        raise HTTPException(404, {
            "error": "no_data",
            "message": "No installation data uploaded yet.",
        })
    return df


@router.get("/api/installation/dashboard")
def installation_dashboard(
    company: str | None = None,
    zone: str | None = None,
    state: str | None = None,
    model: str | None = None,
    loc_up_rem: str | None = None,
    supervisor: str | None = None,
    year: int | None = None,
    month: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 50,
    user: CurrentUser = Depends(employee_only),
):
    return compute_installation_dashboard(
        _frame_or_404(),
        company=company, zone=zone, state=state, model=model,
        loc_up_rem=loc_up_rem, year=year, month=month, supervisor=supervisor,
        search=search,
        page=max(page, 1), page_size=min(max(page_size, 1), 200),
    )


@router.get("/api/installation/filters")
def installation_filters(user: CurrentUser = Depends(employee_only)):
    return compute_installation_filter_options(_frame_or_404())


@router.delete("/api/installation/data")
def installation_delete(user: CurrentUser = Depends(employee_only)):
    deleted = delete_installation_data()
    audit(user.username, "installation_delete")
    return {"deleted": deleted} 