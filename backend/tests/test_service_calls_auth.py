import os
os.environ.setdefault("JWT_SECRET", "test-secret-test-secret-test-secret")

from unittest.mock import patch

import pandas as pd
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.auth import _issue_token
from app.domains.service_calls.employees import router as employees
from app.domains.service_calls.filters import router as filters
from app.domains.service_calls.reports import router as reports
from app.domains.service_calls.router import router as focus
from app.domains.service_calls.utilization import router as utilization

app = FastAPI()
for r in (focus, employees, utilization, filters, reports):
    app.include_router(r)

ROUTES = [("GET", "/api/dashboard/focus"), ("GET", "/api/dashboard/employees"),
          ("GET", "/api/dashboard/utilization"), ("GET", "/api/filters"), ("POST", "/api/reports/pdf")]


def jwt(role, uid=7):
    return {"Authorization": "Bearer " + _issue_token({"id": uid, "email": "a@x.com", "role": role})}


def client():
    c = TestClient(app, raise_server_exceptions=False)
    c.cookies.set("session_id", "sid")
    return c


def test_jwt_and_role_required():
    c = client()
    for m, p in ROUTES:
        assert c.request(m, p).status_code == 401, p                                   
        assert c.request(m, p, headers=jwt("customer")).status_code == 403, p         


def test_session_is_bound_to_owner():
    def fake(session_id, owner_sub):
        if owner_sub != "7":
            raise KeyError("session_expired")
        return pd.DataFrame()

    with patch("app.domains.service_calls.session_auth.get_session_data", side_effect=fake):
        c = client()
        for m, p in ROUTES:
            assert c.request(m, p, headers=jwt("corob_employee", uid=8)).status_code == 401, p  
            assert c.request(m, p, headers=jwt("corob_employee", uid=7)).status_code not in (401, 403), p