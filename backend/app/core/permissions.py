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


def get_user_roles(user: User) -> list[str]:
    """Extract list of role names assigned to a user."""
    return [
        assignment.role.name
        for assignment in user.role_assignments
        if assignment.role is not None
    ]


def has_role(user: User, role_name: str) -> bool:
    """Check if the user directly has the specified role."""
    return role_name in get_user_roles(user)


def has_any_role(user: User, allowed_roles: set[str] | list[str]) -> bool:
    """Check if the user has at least one of the allowed roles, with super_admin override."""
    user_roles = set(get_user_roles(user))
    if ROLE_SUPER_ADMIN in user_roles:
        return True
    return bool(user_roles.intersection(allowed_roles))


def verify_ownership_or_admin(resource_owner_id: UUID, current_user: User) -> None:
    """Ensure the current user owns the target resource or possesses administrative privileges.

    Raises HTTP 403 ApiError if ownership check fails.
    """
    if current_user.id == resource_owner_id:
        return

    user_roles = set(get_user_roles(current_user))
    if ROLE_ADMIN in user_roles or ROLE_SUPER_ADMIN in user_roles:
        return

    raise ApiError(
        status_code=403,
        code="FORBIDDEN_OWNERSHIP",
        message="You do not have permission to access or modify this resource.",
    )
