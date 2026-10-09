from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class CsrfOriginCheckMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, allowed_origin: str):
        super().__init__(app)
        self.allowed_host = urlparse(allowed_origin).netloc if allowed_origin else None

    async def dispatch(self, request: Request, call_next):
        if request.method not in SAFE_METHODS and self.allowed_host:
            origin = request.headers.get("origin") or request.headers.get("referer")
            origin_host = urlparse(origin).netloc if origin else None
            if origin_host != self.allowed_host:
                return JSONResponse(
                    status_code=403,
                    content={"error": "csrf_check_failed", "message": "Request origin did not match expected host."},
                )
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # HSTS only makes sense once you're actually serving over HTTPS (see nginx.conf note).
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response
