from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.auth import (
    clear_auth_cookie,
    get_token_from_request,
    require_authenticated_user,
    require_role,
    set_auth_cookie,
)
from app.core.config import get_settings
from app.core.csrf import (
    clear_csrf_cookie,
    generate_csrf_token,
    set_csrf_cookie,
    verify_csrf_token,
)
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_STAFF,
    verify_ownership_or_admin,
)
from app.core.rate_limit import password_reset_limiter, register_limiter
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    CsrfResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    SafeUserResponse,
    SocialLoginRequest,
)
from app.services.auth_service import (
    login_user,
    logout_user,
    register_customer,
    request_password_reset,
    reset_password,
    social_login_user,
    to_safe_user_response,
)

DbSession = Annotated[Session, Depends(get_db_session)]
CurrentUser = Annotated[User, Depends(require_authenticated_user)]
AdminUser = Annotated[User, Depends(require_role(ROLE_ADMIN))]
StaffUser = Annotated[User, Depends(require_role(ROLE_STAFF))]

router = APIRouter(prefix="/auth", tags=["auth"])


def _extract_client_ip(request: Request) -> str | None:
    """Safely extract remote client IP address."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("/csrf", response_model=CsrfResponse)
def get_csrf_token(
    request: Request,
    response: Response,
    refresh: bool = False,
) -> CsrfResponse:
    """Issue a new CSRF token and set it in a client-readable cookie.

    If an active CSRF cookie already exists and refresh is not requested,
    return it so concurrent calls don't desynchronize active sessions.
    """
    settings = get_settings()
    existing_cookie = request.cookies.get(settings.csrf_cookie_name)
    if not refresh and existing_cookie and len(existing_cookie) == 64:
        return CsrfResponse(csrf_token=existing_cookie)

    token = generate_csrf_token()
    set_csrf_cookie(response, token)
    return CsrfResponse(csrf_token=token)


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> AuthResponse:
    """Register a new customer account.

    Enforces email format, password complexity, duplicate checks, and assigns
    only the 'customer' role. Sets secure session and CSRF cookies.
    """
    verify_csrf_token(request)
    ip_address = _extract_client_ip(request)
    register_limiter.check(ip_address or "127.0.0.1")
    user_agent = request.headers.get("User-Agent")

    user, raw_token = register_customer(
        db=db,
        payload=payload,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    set_auth_cookie(response, raw_token)
    new_csrf_token = generate_csrf_token()
    set_csrf_cookie(response, new_csrf_token)

    return AuthResponse(
        user=to_safe_user_response(user),
        message="Registration successful.",
    )


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> AuthResponse:
    """Authenticate with email and password.

    Sets HttpOnly session cookie and client CSRF cookie on success.
    """
    verify_csrf_token(request)
    ip_address = _extract_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    user, raw_token = login_user(
        db=db,
        payload=payload,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    set_auth_cookie(response, raw_token)
    new_csrf_token = generate_csrf_token()
    set_csrf_cookie(response, new_csrf_token)

    return AuthResponse(
        user=to_safe_user_response(user),
        message="Login successful.",
    )


@router.post("/social-login", response_model=AuthResponse)
def social_login(
    payload: SocialLoginRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> AuthResponse:
    """Authenticate or register a user via Google or Apple Sign-In.

    Validates identity provider ID token cryptographically, sets secure HttpOnly
    session cookie and client CSRF cookie on success.
    """
    verify_csrf_token(request)
    ip_address = _extract_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    user, raw_token = social_login_user(
        db=db,
        payload=payload,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    set_auth_cookie(response, raw_token)
    new_csrf_token = generate_csrf_token()
    set_csrf_cookie(response, new_csrf_token)

    provider_label = "Apple" if "apple" in (payload.provider or "").lower() else "Google"
    return AuthResponse(
        user=to_safe_user_response(user),
        message=f"Signed in successfully with {provider_label}.",
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    current_user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    """Invalidate current user session and remove auth/csrf cookies."""
    verify_csrf_token(request)
    raw_token = get_token_from_request(request)
    logout_user(db=db, user=current_user, raw_token=raw_token)

    clear_auth_cookie(response)
    clear_csrf_cookie(response)

    return MessageResponse(message="Successfully logged out.")


@router.get("/me", response_model=SafeUserResponse)
def get_current_user_profile(
    current_user: CurrentUser,
) -> SafeUserResponse:
    """Return sanitized profile information for the authenticated user."""
    return to_safe_user_response(current_user)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: DbSession,
) -> MessageResponse:
    """Initiate password recovery.

    Always returns a generic confirmation to prevent user enumeration.
    """
    verify_csrf_token(request)
    cleaned_email = payload.email.strip().lower()
    password_reset_limiter.check(cleaned_email)
    ip_address = _extract_client_ip(request)
    request_password_reset(db=db, email=payload.email, ip_address=ip_address)

    return MessageResponse(
        message="If this email is registered, instructions to reset your password have been sent."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password_endpoint(
    payload: ResetPasswordRequest,
    request: Request,
    db: DbSession,
) -> MessageResponse:
    """Complete password reset using a single-use token."""
    verify_csrf_token(request)
    ip_address = _extract_client_ip(request)
    password_reset_limiter.check(ip_address or "127.0.0.1")
    reset_password(db=db, payload=payload, ip_address=ip_address)

    return MessageResponse(
        message="Your password has been successfully reset. Please log in with your new credentials."
    )


# -------------------------------------------------------------------------
# Verification endpoints for authorization & customer data ownership
# -------------------------------------------------------------------------


@router.get("/verify-role-admin", response_model=MessageResponse)
def verify_admin_access(
    _: AdminUser,
) -> MessageResponse:
    """Protected endpoint requiring ADMIN or SUPER_ADMIN role."""
    return MessageResponse(message="Admin authorization verified.")


@router.get("/verify-role-staff", response_model=MessageResponse)
def verify_staff_access(
    _: StaffUser,
) -> MessageResponse:
    """Protected endpoint requiring STAFF or SUPER_ADMIN role."""
    return MessageResponse(message="Staff authorization verified.")


@router.get("/verify-ownership/{target_user_id}", response_model=MessageResponse)
def verify_customer_ownership(
    target_user_id: UUID,
    current_user: CurrentUser,
) -> MessageResponse:
    """Protected endpoint verifying that current user owns the resource or is admin."""
    verify_ownership_or_admin(target_user_id, current_user)
    return MessageResponse(message="Resource ownership verified.")
