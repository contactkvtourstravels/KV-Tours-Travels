"""Authentication state, cookie handling, session management, and authorization dependencies."""

from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request, Response
from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.errors import ApiError
from app.core.permissions import has_any_role
from app.core.security import generate_secure_token, hash_token
from app.db.session import get_db_session
from app.models.user import User, UserRole, UserSession

DbSession = Annotated[Session, Depends(get_db_session)]


def create_user_session(
    db: Session,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[UserSession, str]:
    """Create a new server-side session, persisting only the SHA-256 hash of the token."""
    settings = get_settings()
    raw_token = generate_secure_token()
    token_hash = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=settings.session_max_age_seconds
    )

    session_record = UserSession(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent[:255] if user_agent else None,
    )
    db.add(session_record)
    db.commit()
    db.refresh(session_record)
    return session_record, raw_token


def set_auth_cookie(response: Response, raw_token: str) -> None:
    """Attach the secure HttpOnly session cookie to an HTTP response."""
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=raw_token,
        max_age=settings.session_max_age_seconds,
        path=settings.auth_cookie_path,
        domain=settings.auth_cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,  # Mandatory: inaccessible to client-side scripts
        samesite=settings.cookie_samesite,
    )


def clear_auth_cookie(response: Response) -> None:
    """Clear the session cookie from the browser."""
    settings = get_settings()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path=settings.auth_cookie_path,
        domain=settings.auth_cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )


def revoke_session_by_token(db: Session, raw_token: str) -> None:
    """Invalidate a specific session token in the database."""
    token_hash = hash_token(raw_token)
    db.execute(
        update(UserSession)
        .where(UserSession.token_hash == token_hash)
        .values(is_revoked=True)
    )
    db.commit()


def revoke_all_sessions_for_user(db: Session, user_id: UUID) -> None:
    """Invalidate all active sessions for a user (e.g. after password reset)."""
    db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id, UserSession.is_revoked.is_(False))
        .values(is_revoked=True)
    )
    db.commit()


def get_token_from_request(request: Request) -> str | None:
    """Extract session token from cookie (preferred) or Authorization header fallback."""
    settings = get_settings()
    # 1. Primary: Cookie
    cookie_token = request.cookies.get(settings.auth_cookie_name)
    if cookie_token:
        return cookie_token

    # 2. Fallback: Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()

    return None


def get_current_user(
    request: Request,
    db: DbSession,
) -> User:
    """Authenticate the current user using cookie or header token.

    Validates session state, expiration, user status, and active revocation.
    """
    token = get_token_from_request(request)
    if not token:
        raise ApiError(
            status_code=401,
            code="UNAUTHENTICATED",
            message="Authentication credentials were not provided.",
        )

    token_hash = hash_token(token)
    now = datetime.now(timezone.utc)

    stmt = (
        select(UserSession)
        .options(
            joinedload(UserSession.user)
            .joinedload(User.role_assignments)
            .joinedload(UserRole.role)
        )
        .where(
            UserSession.token_hash == token_hash,
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > now,
        )
    )
    session_record = db.execute(stmt).unique().scalar_one_or_none()
    if session_record is None or session_record.user is None:
        # Fallback for direct Firebase / Google ID token in Authorization header
        if token.count(".") == 2:
            try:
                from app.services.firebase_auth_service import verify_firebase_id_token
                claims = verify_firebase_id_token(token)
                email = claims.get("email")
                if email:
                    from app.core.security import normalize_email
                    jwt_user = db.execute(
                        select(User)
                        .options(
                            joinedload(User.role_assignments).joinedload(UserRole.role)
                        )
                        .where(User.email_normalized == normalize_email(email))
                    ).unique().scalar_one_or_none()
                    if jwt_user and not jwt_user.is_deleted and jwt_user.status == "active":
                        return jwt_user
            except Exception:
                pass

        raise ApiError(
            status_code=401,
            code="INVALID_SESSION",
            message="Session is invalid or has expired.",
        )

    user = session_record.user
    if user.is_deleted or user.status != "active":
        raise ApiError(
            status_code=403,
            code="ACCOUNT_INACTIVE",
            message="Account is inactive or has been disabled.",
        )

    # Bump last active timestamp
    session_record.last_active_at = now
    db.commit()

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_optional_current_user(
    request: Request,
    db: DbSession,
) -> User | None:
    """Return the authenticated user if session token is provided and valid, otherwise None."""
    token = get_token_from_request(request)
    if not token:
        return None
    try:
        return get_current_user(request=request, db=db)
    except Exception:
        return None


OptionalCurrentUser = Annotated[User | None, Depends(get_optional_current_user)]


def require_authenticated_user(
    current_user: CurrentUser,
) -> User:
    """FastAPI dependency requiring any valid authenticated active user."""
    return current_user


def require_role(*allowed_roles: str) -> Callable[..., User]:
    """Dependency factory enforcing that the authenticated user possesses at least one allowed role."""

    def role_dependency(
        current_user: CurrentUser,
    ) -> User:
        if not has_any_role(current_user, list(allowed_roles)):
            roles_str = ", ".join(allowed_roles)
            raise ApiError(
                status_code=403,
                code="INSUFFICIENT_PERMISSIONS",
                message=f"Access denied. Requires one of the following roles: {roles_str}.",
            )
        return current_user

    return role_dependency


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """Semantic alias for require_role."""
    return require_role(*allowed_roles)
