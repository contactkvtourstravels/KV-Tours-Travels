"""FastAPI application entry point and shared HTTP error handlers."""

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import ApiError
from app.core.logging import configure_logging

configure_logging()
logger = logging.getLogger(__name__)
settings = get_settings()

# Optional Sentry initialization in production
if settings.sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.app_env,
            traces_sample_rate=0.2 if settings.is_production else 1.0,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        )
        logger.info("Sentry monitoring initialized.")
    except ImportError:
        logger.warning("sentry-sdk not installed; monitoring is disabled.")


from app.core.cache import attach_cache_invalidation_listeners


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Application lifespan; database connections remain lazy until used."""
    logger.info("FastAPI service initializing under %s mode", settings.app_env)
    attach_cache_invalidation_listeners()
    yield
    logger.info("FastAPI service shutting down gracefully.")


app = FastAPI(
    title="KV Tours & Travels API",
    version="1.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan,
)


# 1. Request ID and performance logging middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next) -> Response:
    """Assign request ID and log request latency without leaking sensitive payload data."""
    request_id = request.headers.get("X-Request-ID") or uuid4().hex
    request.state.request_id = request_id
    start_time = time.perf_counter()

    response: Response = await call_next(request)

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id

    # Suppress health check logging to eliminate container log flooding
    if not request.url.path.endswith("/health"):
        logger.info(
            "%s %s -> %s (%sms) [req_id=%s]",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )

    return response


# 2. Strict Production Security Headers Middleware
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next) -> Response:
    """Attach defensive HTTP security headers to all outgoing responses."""
    response: Response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-XSS-Protection"] = "0"

    # Strict Content Security Policy compatible with Razorpay Checkout, Cloudinary, and Google Fonts
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com https://images.unsplash.com; "
        "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://res.cloudinary.com; "
        "frame-src https://api.razorpay.com https://checkout.razorpay.com; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    response.headers["Content-Security-Policy"] = csp

    if settings.is_production:
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

    return response


# 3. Public Catalog Cache-Control Headers Middleware for Edge CDN & Browser Acceleration
@app.middleware("http")
async def public_catalog_cache_middleware(request: Request, call_next) -> Response:
    """Attach Cache-Control headers to public read-only catalog queries for CDN Edge & browser performance."""
    response: Response = await call_next(request)

    if request.method == "GET" and 200 <= response.status_code < 300:
        path = request.url.path
        is_public_catalog = (
            path.startswith("/api/v1/destinations")
            or path.startswith("/api/v1/packages")
            or path.startswith("/api/v1/departures")
            or path.startswith("/api/v1/offers")
            or path.startswith("/api/v1/settings")
            or path.startswith("/api/v1/add-ons")
            or path.startswith("/api/v1/content/pages")
            or path.startswith("/uploads")
        )
        is_preview = "preview=true" in str(request.url.query).lower()
        has_auth = "authorization" in request.headers or "travel_session" in request.cookies

        if is_public_catalog and not is_preview and not has_auth:
            if "Cache-Control" not in response.headers:
                response.headers["Cache-Control"] = (
                    "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
                )

    return response


# 4. CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Request-ID",
        "X-Idempotency-Key",
        settings.csrf_header_name,
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["X-Request-ID", settings.csrf_header_name],
)

app.include_router(api_router, prefix="/api/v1")

# Mount static storage for media assets (images, documents)
uploads_dir = Path(__file__).resolve().parent.parent / "static" / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.exception_handler(ApiError)
async def handle_api_error(_: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = [
        {
            "location": [str(part) for part in error.get("loc", ())],
            "message": error.get("msg", "Invalid value"),
            "type": error.get("type", "value_error"),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": errors,
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def handle_http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "HTTP_ERROR", "message": detail}},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled request error", exc_info=(type(exc), exc, exc.__traceback__)
    )
    # Never leak internal exceptions, DB credentials, or stack traces to clients
    message = "An unexpected server error occurred."
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": message}},
    )
