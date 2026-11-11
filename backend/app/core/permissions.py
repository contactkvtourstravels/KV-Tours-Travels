"""Role constants, role hierarchy mapping, and permission utilities."""

from typing import Final
from uuid import UUID

from app.core.errors import ApiError
from app.models.user import User

ROLE_CUSTOMER: Final[str] = "customer"
ROLE_STAFF: Final[str] = "staff"
ROLE_MANAGER: Final[str] = "manager"
ROLE_ADMIN: Final[str] = "admin"
ROLE_SUPER_ADMIN: Final[str] = "super_admin"

# Authorized Super Administrator emails for the agency platform
AUTHORIZED_SUPER_ADMIN_EMAILS: Final[set[str]] = {
    "contact.kvtourstravels@gmail.com",
}
AUTHORIZED_SUPER_ADMIN_EMAIL: Final[str] = "contact.kvtourstravels@gmail.com"

ALL_ROLES: Final[list[str]] = [
    ROLE_CUSTOMER,
    ROLE_STAFF,
    ROLE_MANAGER,
    ROLE_ADMIN,
    ROLE_SUPER_ADMIN,
]

# Role rank hierarchy
ROLE_RANKS: Final[dict[str, int]] = {
    ROLE_CUSTOMER: 10,
    ROLE_STAFF: 20,
    ROLE_MANAGER: 30,
    ROLE_ADMIN: 40,
    ROLE_SUPER_ADMIN: 50,
}


def normalize_admin_email(email: str | None) -> str:
    """Safely normalize email for authorization checks (trimmed and lowercase)."""
    if not email:
        return ""
    return email.strip().lower()


def is_authorized_super_admin(user: User) -> bool:
    """Validate if user is the authorized super admin account with verified email.

    Strict Invariants:
    1. Account must be active and not soft-deleted.
    2. Email must match authorized super admin emails when normalized.
    3. Email ownership must be verified (is_email_verified).
    """
    if not user or getattr(user, "is_deleted", False) or getattr(user, "status", "") != "active":
        return False

    email = normalize_admin_email(getattr(user, "email_normalized", None) or getattr(user, "email", None))
    if email not in AUTHORIZED_SUPER_ADMIN_EMAILS:
        return False

    # Email verification check
    is_verified = bool(getattr(user, "is_email_verified", False))
    if not is_verified:
        return False

    return True


def get_user_roles(user: User) -> list[str]:
    """Extract list of role names assigned to a user.

    Strict Security Invariant:
    'super_admin' is EXCLUSIVELY permitted for the authorized super admin emails.
    Under NO circumstances will super_admin be acknowledged for any other user,
    regardless of database records or request payloads.
    """
    roles = []
    authorized_super = is_authorized_super_admin(user)
    for assignment in getattr(user, "role_assignments", []):
        if assignment.role is not None:
            role_name = assignment.role.name
            if role_name == ROLE_SUPER_ADMIN and not authorized_super:
                continue
            roles.append(role_name)
    return roles


def has_role(user: User, role_name: str) -> bool:
    """Check if the user directly has the specified role."""
    if role_name == ROLE_SUPER_ADMIN and not is_authorized_super_admin(user):
        return False
    return role_name in get_user_roles(user)


def has_any_role(user: User, allowed_roles: set[str] | list[str]) -> bool:
    """Check if the user has at least one of the allowed roles, with super_admin override."""
    user_roles = set(get_user_roles(user))
    if ROLE_SUPER_ADMIN in user_roles and is_authorized_super_admin(user):
        return True
    return bool(user_roles.intersection(allowed_roles))


def verify_ownership_or_admin(resource_owner_id: UUID, current_user: User) -> None:
    """Ensure the current user owns the target resource or possesses administrative privileges.

    Raises HTTP 403 ApiError if ownership check fails.
    """
    if current_user.id == resource_owner_id:
        return

    user_roles = set(get_user_roles(current_user))
    if ROLE_ADMIN in user_roles or (ROLE_SUPER_ADMIN in user_roles and is_authorized_super_admin(current_user)):
        return

    raise ApiError(
        status_code=403,
        code="FORBIDDEN_OWNERSHIP",
        message="You do not have permission to access or modify this resource.",
    )
