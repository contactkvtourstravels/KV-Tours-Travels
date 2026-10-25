"""CSRF protection for state-changing cookie-authenticated requests."""

import secrets

from fastapi import Request, Response

from app.core.config import get_settings
from app.core.errors import ApiError


def generate_csrf_token() -> str:
    """Generate a cryptographically random CSRF token."""
    return secrets.token_hex(32)


def set_csrf_cookie(response: Response, token: str) -> None:
    """Attach the CSRF token cookie to an outgoing HTTP response.

    The cookie is non-HttpOnly so client-side JavaScript can read it and attach
    it in the X-CSRF-Token header for subsequent state-changing mutations.
    """
    settings = get_settings()
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=token,
        max_age=settings.session_max_age_seconds,
        path=settings.auth_cookie_path,
        domain=settings.auth_cookie_domain,
        secure=settings.cookie_secure,
        httponly=False,  # Intentionally readable by frontend JS for header attachment
        samesite=settings.cookie_samesite,
    )


def clear_csrf_cookie(response: Response) -> None:
    """Clear the CSRF token cookie."""
    settings = get_settings()
    response.delete_cookie(
        key=settings.csrf_cookie_name,
        path=settings.auth_cookie_path,
        domain=settings.auth_cookie_domain,
        secure=settings.cookie_secure,
        httponly=False,
        samesite=settings.cookie_samesite,
    )


def verify_csrf_token(request: Request) -> None:
    """Verify CSRF token for state-changing requests.

    Enforcement rule:
    - Safe methods (GET, HEAD, OPTIONS) bypass CSRF checks.
    - If the client supplies an authentication session cookie or a CSRF cookie,
      the request MUST supply the matching CSRF token in the header.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    settings = get_settings()
    session_cookie = request.cookies.get(settings.auth_cookie_name)
    csrf_cookie = request.cookies.get(settings.csrf_cookie_name)

    # If the request carries an authenticated session cookie or existing CSRF cookie,
    # CSRF verification is mandatory.
    if session_cookie or csrf_cookie:
        header_token = request.headers.get(settings.csrf_header_name)
        if not header_token or not csrf_cookie:
            raise ApiError(
                status_code=403,
                code="CSRF_TOKEN_MISSING",
                message="CSRF token is required for this request.",
            )

        if not secrets.compare_digest(header_token, csrf_cookie):
            raise ApiError(
                status_code=403,
                code="CSRF_TOKEN_INVALID",
                message="CSRF token validation failed.",
            )
