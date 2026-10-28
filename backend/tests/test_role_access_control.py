import os
os.environ.setdefault("JWT_SECRET", "test-secret-test-secret-test-secret")

import asyncio
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException

from app.core.auth import (
    CurrentUser,
    _decode_token,
    _issue_token,
    authenticate,
    get_current_user,
    require_roles,
)
from app.api.companies import router as companies_router
from app.domains.pm.ticket_report import any_user as ticket_pdf_role_guard
from fastapi import FastAPI
from fastapi.testclient import TestClient
import bcrypt


def test_issue_token_and_decode_roles():
    for role in ("admin", "corob_employee", "customer"):
        token = _issue_token({"id": 10, "email": f"{role}@corob.com", "role": role})
        claims = _decode_token(token)
        assert claims["role"] == role
        assert claims["email"] == f"{role}@corob.com"


def test_current_user_properties():
    admin_user = CurrentUser(sub="1", username="admin@corob.com", roles=["admin"])
    assert admin_user.is_admin is True
    assert admin_user.is_corob_employee is False
    assert admin_user.is_customer is False

    emp_user = CurrentUser(sub="2", username="emp@corob.com", roles=["corob_employee"])
    assert emp_user.is_admin is False
    assert emp_user.is_corob_employee is True
    assert emp_user.is_customer is False

    cust_user = CurrentUser(sub="3", username="cust@client.com", roles=["customer"], company="ClientCo")
    assert cust_user.is_admin is False
    assert cust_user.is_corob_employee is False
    assert cust_user.is_customer is True


def test_require_roles_guard():
    staff_guard = require_roles("corob_employee", "admin")
    customer_guard = require_roles("customer")

    admin = CurrentUser(sub="1", username="admin@corob.com", roles=["admin"])
    emp = CurrentUser(sub="2", username="emp@corob.com", roles=["corob_employee"])
    cust = CurrentUser(sub="3", username="cust@client.com", roles=["customer"])

    # Staff guard allows admin and corob_employee, forbids customer
    assert asyncio.run(staff_guard(admin)) == admin
    assert asyncio.run(staff_guard(emp)) == emp
    with pytest.raises(HTTPException) as exc:
        asyncio.run(staff_guard(cust))
    assert exc.value.status_code == 403

    # Customer guard allows customer, forbids admin and corob_employee
    assert asyncio.run(customer_guard(cust)) == cust
    with pytest.raises(HTTPException) as exc:
        asyncio.run(customer_guard(admin))
    assert exc.value.status_code == 403
    with pytest.raises(HTTPException) as exc:
        asyncio.run(customer_guard(emp))
    assert exc.value.status_code == 403


def test_combined_upload_admin_only_guard():
    upload_guard = require_roles("admin")

    admin = CurrentUser(sub="1", username="admin@corob.com", roles=["admin"])
    emp = CurrentUser(sub="2", username="emp@corob.com", roles=["corob_employee"])
    cust = CurrentUser(sub="3", username="cust@client.com", roles=["customer"])

    # Admin is allowed
    assert asyncio.run(upload_guard(admin)) == admin

    # Employee is forbidden (403)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(upload_guard(emp))
    assert exc.value.status_code == 403
    assert exc.value.detail == {"error": "insufficient_role"}

    # Customer is forbidden (403)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(upload_guard(cust))
    assert exc.value.status_code == 403
    assert exc.value.detail == {"error": "insufficient_role"}


def test_authenticate_admin_user():
    pw_hash = bcrypt.hashpw(b"admin-secret", bcrypt.gensalt()).decode("utf-8")
    mock_row = {
        "id": 99,
        "email": "admin@corob.com",
        "password_hash": pw_hash,
        "role": "admin",
        "is_active": 1,
        "company_name": None,
    }

    conn = MagicMock()
    conn.__enter__.return_value = conn
    conn.cursor.return_value.__enter__.return_value.fetchone.return_value = mock_row

    with patch("app.core.auth.get_connection", return_value=conn):
        token = authenticate("admin@corob.com", "admin-secret")
        claims = _decode_token(token)
        assert claims["role"] == "admin"
        assert claims["sub"] == "99"


def test_companies_api_role_check():
    app = FastAPI()
    app.include_router(companies_router)
    client = TestClient(app, raise_server_exceptions=False)

    admin_jwt = "Bearer " + _issue_token({"id": 1, "email": "admin@corob.com", "role": "admin"})
    emp_jwt = "Bearer " + _issue_token({"id": 2, "email": "emp@corob.com", "role": "corob_employee"})
    cust_jwt = "Bearer " + _issue_token({"id": 3, "email": "cust@client.com", "role": "customer"})

    with patch("app.api.companies.list_companies", return_value=["CompanyA", "CompanyB"]):
        # Admin: 200
        res_admin = client.get("/api/companies", headers={"Authorization": admin_jwt})
        assert res_admin.status_code == 200
        assert res_admin.json() == {"companies": ["CompanyA", "CompanyB"]}

        # Corob employee: 200
        res_emp = client.get("/api/companies", headers={"Authorization": emp_jwt})
        assert res_emp.status_code == 200
        assert res_emp.json() == {"companies": ["CompanyA", "CompanyB"]}

        # Customer: 403
        res_cust = client.get("/api/companies", headers={"Authorization": cust_jwt})
        assert res_cust.status_code == 403


def test_ticket_report_guard_permits_admin():
    admin = CurrentUser(sub="1", username="admin@corob.com", roles=["admin"])
    emp = CurrentUser(sub="2", username="emp@corob.com", roles=["corob_employee"])
    cust = CurrentUser(sub="3", username="cust@client.com", roles=["customer"])
    other = CurrentUser(sub="4", username="other@anon.com", roles=["guest"])

    assert asyncio.run(ticket_pdf_role_guard(admin)) == admin
    assert asyncio.run(ticket_pdf_role_guard(emp)) == emp
    assert asyncio.run(ticket_pdf_role_guard(cust)) == cust

    with pytest.raises(HTTPException) as exc:
        asyncio.run(ticket_pdf_role_guard(other))
    assert exc.value.status_code == 403
