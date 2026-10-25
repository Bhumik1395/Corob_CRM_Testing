from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.login import router as login_router
from app.core.auth import CurrentUser, _issue_token, require_roles
from tests.conftest import fake_db

app = FastAPI()
app.include_router(login_router)


@app.get("/x")
def x(user: CurrentUser = Depends(require_roles("corob_employee"))):
    return {"ok": True}


def jwt():
    return {"Authorization": "Bearer " + _issue_token({"id": 7, "email": "a@x.com", "role": "corob_employee"})}


def test_deactivated_user_is_rejected_on_next_request():
    c = TestClient(app)
    assert c.get("/x", headers=jwt()).status_code == 200
    for row in ({"is_active": 0}, None):  
        with fake_db(row):
            r = c.get("/x", headers=jwt())
            assert r.status_code == 401 and r.json()["detail"]["error"] == "account_disabled"


def test_refresh_reissues_for_active_user_and_refuses_disabled_or_missing_token():
    c = TestClient(app)
    r = c.post("/api/auth/refresh", headers=jwt())
    assert r.status_code == 200 and r.json()["access_token"]
    with fake_db({"is_active": 0}):
        assert c.post("/api/auth/refresh", headers=jwt()).status_code == 401
    assert c.post("/api/auth/refresh").status_code == 401