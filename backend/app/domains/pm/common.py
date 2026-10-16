from fastapi import HTTPException
from app.core.auth import CurrentUser

ALL_COMPANIES = "__all__"


def resolve_company(user: CurrentUser, company_param: str | None, allow_all: bool = False) -> str:
    if user.is_customer:
        return user.company
    if not company_param:
        raise HTTPException(400, {"error": "company_required", "message": "Pass ?company= to target a company."})
    if company_param == ALL_COMPANIES and not allow_all:
        raise HTTPException(400, {
            "error": "all_not_allowed",
            "message": "Choose a specific company for this action.",
        })
    return company_param


def load_pm_df(user: CurrentUser, company_param: str | None):
    """One company's PM data, or - for Corob employees only - ?company=__all__ for every company combined."""
    from app.domains.pm.cache import get_all_pm_data, get_pm_data

    if user.is_corob_employee and company_param == ALL_COMPANIES:
        return get_all_pm_data()
    return get_pm_data(resolve_company(user, company_param))