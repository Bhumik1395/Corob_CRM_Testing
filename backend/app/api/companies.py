from fastapi import APIRouter, Depends
from app.core.auth import CurrentUser, require_roles
from app.core.domain_directory import list_companies

router = APIRouter()


@router.get("/api/companies")
def get_companies(user: CurrentUser = Depends(require_roles("corob_employee"))):
    return {"companies": list_companies()}
