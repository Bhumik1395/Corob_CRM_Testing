import pandas as pd
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core.auth import _issue_token
from app.core.rate_limit import rate_limit
from app.domains.pm import outcome

app = FastAPI()


@app.get("/x", dependencies=[Depends(rate_limit("t", 2, 60))])
def x():
    return {"ok": True}


def jwt(uid):
    return {"Authorization": "Bearer " + _issue_token({"id": uid, "email": "a@x.com", "role": "customer"})}


def test_rate_limit_is_per_user():
    c = TestClient(app)
    assert [c.get("/x", headers=jwt(1)).status_code for _ in range(3)] == [200, 200, 429]
    r = c.get("/x", headers=jwt(1))
    assert r.json()["detail"]["error"] == "rate_limited" and int(r.headers["retry-after"]) > 0
    assert c.get("/x", headers=jwt(2)).status_code == 200  # someone else is unaffected


def test_outcomes_unchanged_and_cached():
    learned = [("machine shifted lately", "Dispute")]
    assert outcome.label_text("PM done", learned) == ("PM Done", "rule")
    assert outcome.label_text("x machine shifted lately y", learned)[0] == "Dispute"
    hits = outcome._label_text.cache_info().hits
    df = pd.DataFrame({"remarks": ["PM done", "PM done", "PM not done", "???"]})
    out = outcome.apply_outcomes(df, learned, overrides={})
    assert list(out["pm_outcome"]) == ["PM Done", "PM Done", "Dispute", "Dispute"]
    assert list(out["pm_resolved"]) == [True, True, True, False]
    assert outcome._label_text.cache_info().hits > hits