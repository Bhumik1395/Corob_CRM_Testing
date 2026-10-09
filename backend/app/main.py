import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.db import get_connection
from app.api import me, companies, combined_upload, login
from app.core.security_middleware import CsrfOriginCheckMiddleware, SecurityHeadersMiddleware
from app.domains.pm import upload_router as pm_upload_router
from app.domains.pm import dashboard_router as pm_dashboard_router
from app.domains.service_calls import (
    router as service_calls_router,
    quarterly_router,
    employees_router,
    utilization_router,
    filters_router,
    reports_router,
    session_router,
)

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")

# Hostnames this API will answer for (the Host header it sees). Behind our
# Nginx that is the public domain; on a platform like Render it is the
# platform's own hostname. List any extras in ALLOWED_HOSTS (comma separated),
# or set ALLOWED_HOSTS=* to allow any host.
_origin_host = ALLOWED_ORIGIN.split("://", 1)[-1].split("/", 1)[0].split(":")[0]
_extra_hosts = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()]

if "*" in _extra_hosts:
    ALLOWED_HOSTS = ["*"]
else:
    ALLOWED_HOSTS = list({_origin_host, "localhost", "127.0.0.1", *_extra_hosts})

app = FastAPI(title="Corob Service Analytics API")

app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CsrfOriginCheckMiddleware, allowed_origin=ALLOWED_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Content-Disposition"],
)

app.include_router(login.router)
app.include_router(service_calls_router.router)
app.include_router(quarterly_router.router)
app.include_router(employees_router.router)
app.include_router(utilization_router.router)
app.include_router(filters_router.router)
app.include_router(reports_router.router)
app.include_router(session_router.router)
app.include_router(pm_upload_router.router)
app.include_router(pm_dashboard_router.router)
app.include_router(me.router)
app.include_router(combined_upload.router)
app.include_router(companies.router)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 AS ok")
        return cur.fetchone()