from fastapi import Depends, HTTPException, Request
import pandas as pd

from app.core.auth import CurrentUser, require_roles
from app.domains.service_calls.session_cache import get_session_data


def get_authorized_session_df(
    request: Request,
    user: CurrentUser = Depends(require_roles("corob_employee")),
) -> pd.DataFrame:
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(401, {"error": "session_expired"})
    try:
        return get_session_data(session_id)
    except KeyError:
        raise HTTPException(401, {"error": "session_expired"})
