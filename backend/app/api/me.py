from fastapi import APIRouter, Depends
from app.core.auth import CurrentUser, get_current_user

router = APIRouter()


@router.get("/api/me")
def me(user: CurrentUser = Depends(get_current_user)):
    return {
        "username": user.username,
        "roles": user.roles,
        "company": user.company,
    }
