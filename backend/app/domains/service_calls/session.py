from fastapi import APIRouter, Request, Response
from app.domains.service_calls.session_cache import delete_session

router = APIRouter()


@router.delete("/api/session")
def end_session(request: Request, response: Response):
    session_id = request.cookies.get("session_id")
    if session_id:
        delete_session(session_id)
    response.delete_cookie("session_id")
    return {"deleted": True}
