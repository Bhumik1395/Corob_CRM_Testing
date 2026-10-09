from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
import logging
import pymysql
from app.core.auth import authenticate
from app.shared.rate_limit_service import (
    enforce_not_locked_out,
    get_or_set_device_id,
    record_failed_attempt,
    clear_attempts,
    enforce_account_not_locked,
    record_account_failure,
    clear_account_failures,
    _client_ip,
)

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/api/auth/login")
def login(body: LoginRequest, request: Request, response: Response):
    device_id = get_or_set_device_id(request, response)
    ip = _client_ip(request)

    enforce_not_locked_out(device_id, ip)
    enforce_account_not_locked(body.email)

    try:
        token = authenticate(body.email, body.password)
    except HTTPException:
        record_failed_attempt(device_id, ip)
        record_account_failure(body.email)
        raise

    clear_attempts(device_id, ip)
    clear_account_failures(body.email)
    return {"access_token": token}

log = logging.getLogger(__name__)

@router.post("/api/auth/login")
def login(body: LoginRequest, request: Request, response: Response):
    try:
        device_id = get_or_set_device_id(request, response)
        ip = _client_ip(request)

        enforce_not_locked_out(device_id, ip)
        enforce_account_not_locked(body.email)

        try:
            token = authenticate(body.email, body.password)
        except HTTPException:
            record_failed_attempt(device_id, ip)
            record_account_failure(body.email)
            raise

        clear_attempts(device_id, ip)
        clear_account_failures(body.email)
        return {"access_token": token}
    except pymysql.err.MySQLError:
        log.exception("Database error during login")
        raise HTTPException(503, {
            "error": "db_unavailable",
            "message": "The database is unavailable. Please try again shortly.",
        })