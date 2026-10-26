import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core import audit as audit_mod
from app.core import db
from app.core.security_middleware import CsrfOriginCheckMiddleware, SecurityHeadersMiddleware

BACKEND = Path(__file__).resolve().parent.parent


def test_csrf_check_fails_closed_and_still_blocks_foreign_origins():
    with pytest.raises(RuntimeError):
        CsrfOriginCheckMiddleware(FastAPI(), allowed_origin="")
    app = FastAPI()
    app.add_middleware(CsrfOriginCheckMiddleware, allowed_origin="https://corob.example")

    @app.post("/p")
    def p():
        return {}

    c = TestClient(app)
    assert c.post("/p").status_code == 403
    assert c.post("/p", headers={"Origin": "https://evil.example"}).status_code == 403
    assert c.post("/p", headers={"Origin": "https://corob.example"}).status_code == 200


def test_api_responses_are_not_cacheable_but_health_is_untouched():
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)
    app.get("/api/x")(lambda: {})
    app.get("/health")(lambda: {})
    c = TestClient(app)
    assert c.get("/api/x").headers["cache-control"] == "no-store"
    assert "cache-control" not in c.get("/health").headers


def test_short_jwt_secret_refuses_to_start():
    r = subprocess.run(
        [sys.executable, "-c", "import app.core.auth"],
        cwd=BACKEND, capture_output=True, text=True,
        env={**os.environ, "JWT_SECRET": "too-short"},
    )
    assert r.returncode != 0 and "at least 32" in r.stderr


def test_mysql_tls_without_ca_refuses_instead_of_going_unverified(monkeypatch):
    monkeypatch.setattr(db, "_pool", None)
    monkeypatch.setenv("MYSQL_SSL", "1")
    monkeypatch.delenv("MYSQL_SSL_CA", raising=False)
    with pytest.raises(RuntimeError):
        db.get_pool()


def test_audit_writes_and_never_raises():
    conn = MagicMock()
    conn.__enter__.return_value = conn
    cur = conn.cursor.return_value.__enter__.return_value
    with patch.object(audit_mod, "get_connection", return_value=conn):
        audit_mod.audit("x" * 400, "login_ok", "1.2.3.4")
        args = cur.execute.call_args[0][1]
        assert len(args[0]) == 255 and args[1:] == ("login_ok", "1.2.3.4")
    with patch.object(audit_mod, "get_connection", side_effect=RuntimeError("db down")):
        audit_mod.audit("a", "b")  # must not raise