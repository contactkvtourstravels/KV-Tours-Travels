"""Core authentication and authorization domain services."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload

from app.core.auth import (
    create_user_session,
    revoke_all_sessions_for_user,
    revoke_session_by_token,
)
from app.core.config import get_settings
from app.core.errors import ApiError
from app.core.permissions import ROLE_CUSTOMER, get_user_roles
from app.core.rate_limit import login_limiter
from app.core.security import (
    generate_secure_token,
    hash_password,
    hash_token,
    normalize_email,
    validate_password_strength,
    verify_password,
)
from app.models.content import AuditLog
from app.models.user import PasswordResetToken, Role, User, UserRole
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SafeUserResponse,
)

logger = logging.getLogger(__name__)

# Development/test hook to inspect token without requiring external SMTP provider
_dev_reset_tokens: dict[str, str] = {}


def get_dev_reset_token(email: str) -> str | None:
    """Retrieve the latest reset token for an email address (available in dev/test only)."""
    settings = get_settings()
    if settings.app_env in ("development", "test"):
        return _dev_reset_tokens.get(email.strip().lower())
    return None


def clear_dev_reset_tokens() -> None:
    """Clear memory test tokens."""
    _dev_reset_tokens.clear()


def to_safe_user_response(user: User) -> SafeUserResponse:
    """Transform internal User ORM entity into a sanitized public schema.

    Guarantees that password hashes, internal secrets, and salt values are NEVER serialized.
    """
    return SafeUserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        status=user.status,
        roles=get_user_roles(user),
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def register_customer(
    db: Session,
    payload: RegisterRequest,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, str]:
    """Register a new customer account.

    Public registration strictly assigns the 'customer' role.
    Prevents privilege escalation and rejects duplicate emails.
    """
    normalized_email = normalize_email(payload.email)
    validate_password_strength(payload.password)

    # Check for existing email
    existing_user = db.execute(
        select(User).where(User.email_normalized == normalized_email)
    ).scalar_one_or_none()
    if existing_user is not None:
        raise ApiError(
            status_code=409,
            code="EMAIL_ALREADY_EXISTS",
            message="An account with this email address already exists.",
        )

    # Ensure customer role exists in database
    customer_role = db.execute(
        select(Role).where(Role.name == ROLE_CUSTOMER)
    ).scalar_one_or_none()
    if customer_role is None:
        customer_role = Role(
            name=ROLE_CUSTOMER,
            description="Standard public customer account",
        )
        db.add(customer_role)
        db.flush()

    # Hash password using Argon2id
    hashed_pwd = hash_password(payload.password)

    new_user = User(
        email=payload.email.strip(),
        email_normalized=normalized_email,
        password_hash=hashed_pwd,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        status="active",
        is_deleted=False,
    )
    db.add(new_user)
    db.flush()

    # Solely assign CUSTOMER role
    role_assignment = UserRole(
        user_id=new_user.id,
        role_id=customer_role.id,
    )
    db.add(role_assignment)
    db.flush()

    # Create server-side session
    _, raw_token = create_user_session(db, new_user, ip_address, user_agent)

    # Record audit log
    audit = AuditLog(
        actor_user_id=new_user.id,
        action="auth.register",
        entity_type="user",
        entity_id=str(new_user.id),
        ip_address=ip_address,
        metadata_json={"user_agent": user_agent[:255]} if user_agent else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(new_user)

    return new_user, raw_token


def login_user(
    db: Session,
    payload: LoginRequest,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, str]:
    """Authenticate an active user by credentials.

    Enforces rate-limiting, generic failure messages, account status, and session creation.
    """
    cleaned_email = payload.email.strip().lower()

    # Rate limiting check
    login_limiter.check_rate_limit(cleaned_email)

    stmt = (
        select(User)
        .options(joinedload(User.role_assignments).joinedload(UserRole.role))
        .where(User.email_normalized == cleaned_email)
    )
    user = db.execute(stmt).unique().scalar_one_or_none()

    # Check existence and password
    if (
        user is None
        or user.is_deleted
        or user.password_hash is None
        or not verify_password(payload.password, user.password_hash)
    ):
        login_limiter.record_failure(cleaned_email)
        # Generic message avoids user enumeration
        raise ApiError(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="Invalid email or password.",
        )

    # Check status
    if user.status != "active":
        raise ApiError(
            status_code=403,
            code="ACCOUNT_INACTIVE",
            message="Account is inactive or disabled.",
        )

    # Successful login: reset rate limiter
    login_limiter.reset(cleaned_email)

    # Create server session
    _, raw_token = create_user_session(db, user, ip_address, user_agent)

    # Record audit event
    audit = AuditLog(
        actor_user_id=user.id,
        action="auth.login",
        entity_type="user",
        entity_id=str(user.id),
        ip_address=ip_address,
        metadata_json={"user_agent": user_agent[:255]} if user_agent else None,
    )
    db.add(audit)
    db.commit()

    return user, raw_token


def logout_user(
    db: Session,
    user: User,
    raw_token: str | None,
) -> None:
    """Invalidate active session and audit the logout action."""
    if raw_token:
        revoke_session_by_token(db, raw_token)

    audit = AuditLog(
        actor_user_id=user.id,
        action="auth.logout",
        entity_type="user",
        entity_id=str(user.id),
    )
    db.add(audit)
    db.commit()


def request_password_reset(
    db: Session,
    email: str,
    ip_address: str | None = None,
) -> None:
    """Initiate password recovery.

    Always finishes neutrally to prevent account enumeration.
    """
    settings = get_settings()
    cleaned_email = email.strip().lower()

    user = db.execute(
        select(User).where(User.email_normalized == cleaned_email)
    ).scalar_one_or_none()

    if user and not user.is_deleted and user.status == "active":
        # Invalidate any prior pending tokens for this user
        db.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.is_used.is_(False),
            )
            .values(is_used=True)
        )

        raw_token = generate_secure_token()
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.password_reset_expiry
        )

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False,
        )
        db.add(reset_record)

        audit = AuditLog(
            actor_user_id=user.id,
            action="auth.password_reset_requested",
            entity_type="user",
            entity_id=str(user.id),
            ip_address=ip_address,
        )
        db.add(audit)
        db.commit()

        # Cache token for dev/test verification
        if settings.app_env in ("development", "test"):
            _dev_reset_tokens[cleaned_email] = raw_token
            logger.info("Dev password reset token generated for %s", cleaned_email)


def reset_password(
    db: Session,
    payload: ResetPasswordRequest,
    ip_address: str | None = None,
) -> None:
    """Validate single-use reset token, update password, and revoke all existing sessions."""
    validate_password_strength(payload.new_password)
    token_hash = hash_token(payload.token)
    now = datetime.now(timezone.utc)

    stmt = (
        select(PasswordResetToken)
        .options(joinedload(PasswordResetToken.user))
        .where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.is_used.is_(False),
            PasswordResetToken.expires_at > now,
        )
    )
    reset_record = db.execute(stmt).scalar_one_or_none()

    if reset_record is None or reset_record.user is None:
        raise ApiError(
            status_code=400,
            code="INVALID_RESET_TOKEN",
            message="Reset token is invalid or has expired.",
        )

    user = reset_record.user
    if user.is_deleted or user.status != "active":
        raise ApiError(
            status_code=403,
            code="ACCOUNT_INACTIVE",
            message="Account is inactive or disabled.",
        )

    # Update password
    user.password_hash = hash_password(payload.new_password)
    reset_record.is_used = True
    reset_record.used_at = now

    # Invalidate all active user sessions (security requirement)
    revoke_all_sessions_for_user(db, user.id)

    # Record audit event
    audit = AuditLog(
        actor_user_id=user.id,
        action="auth.password_reset_completed",
        entity_type="user",
        entity_id=str(user.id),
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()
