"""Service for administrative user management foundation."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from sqlalchemy import delete, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.auth import revoke_all_sessions_for_user
from app.core.errors import ApiError
from app.models.user import Role, User, UserRole
from app.schemas.admin import AdminUserResponse, PaginatedResponse
from app.services.admin.audit_service import record_audit_log
from app.services.admin.utils import paginate


def serialize_admin_user(user: User) -> AdminUserResponse:
    """Safely serialize User model into AdminUserResponse without sensitive data."""
    roles = [
        assignment.role.name
        for assignment in user.role_assignments
        if assignment.role is not None
    ]
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        status=user.status,
        is_deleted=user.is_deleted,
        roles=roles,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def list_users(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    role_name: str | None = None,
    status: str | None = None,
) -> PaginatedResponse[AdminUserResponse]:
    """Query users with pagination, role/status filtering, and search."""
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = (
        select(User)
        .options(joinedload(User.role_assignments).joinedload(UserRole.role))
        .where(User.is_deleted.is_(False))
    )

    if status:
        query = query.where(User.status == status)

    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(User.email).like(search_term),
                func.lower(User.first_name).like(search_term),
                func.lower(User.last_name).like(search_term),
            )
        )

    if role_name:
        query = (
            query.join(User.role_assignments)
            .join(UserRole.role)
            .where(Role.name == role_name)
        )

    # Count total
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.execute(count_query).scalar_one()

    # Query distinct paginated users
    query = (
        query.order_by(desc(User.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    users = db.execute(query).unique().scalars().all()

    items = [serialize_admin_user(u) for u in users]
    return paginate(items, total, page, page_size)


def get_user_by_id(db: Session, user_id: UUID) -> AdminUserResponse:
    """Retrieve single user details or raise 404."""
    user = (
        db.execute(
            select(User)
            .options(joinedload(User.role_assignments).joinedload(UserRole.role))
            .where(User.id == user_id, User.is_deleted.is_(False))
        )
        .unique()
        .scalar_one_or_none()
    )
    if user is None:
        raise ApiError(
            status_code=404,
            code="USER_NOT_FOUND",
            message=f"User with ID {user_id} was not found.",
        )
    return serialize_admin_user(user)


def update_user_status(
    db: Session,
    user_id: UUID,
    new_status: Literal["active", "inactive", "suspended", "pending_verification"],
    current_admin_id: UUID,
    ip_address: str | None = None,
    reason: str | None = None,
) -> AdminUserResponse:
    """Update user account status, revoke sessions if disabling, and record audit log."""
    if user_id == current_admin_id:
        raise ApiError(
            status_code=400,
            code="CANNOT_MODIFY_OWN_STATUS",
            message="Administrators cannot modify their own account status to prevent accidental lockout.",
        )

    user = (
        db.execute(
            select(User)
            .options(joinedload(User.role_assignments).joinedload(UserRole.role))
            .where(User.id == user_id, User.is_deleted.is_(False))
        )
        .unique()
        .scalar_one_or_none()
    )
    if user is None:
        raise ApiError(
            status_code=404,
            code="USER_NOT_FOUND",
            message=f"User with ID {user_id} was not found.",
        )

    old_status = user.status
    user.status = new_status

    # If deactivating or suspending, revoke all active sessions immediately
    if new_status in ("inactive", "suspended"):
        revoke_all_sessions_for_user(db, user_id)

    record_audit_log(
        db=db,
        action="user_status_updated",
        entity_type="user",
        entity_id=str(user.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "old_status": old_status,
            "new_status": new_status,
            "reason": reason,
            "target_user_email": user.email,
        },
    )
    db.commit()
    return serialize_admin_user(user)


def update_user_roles(
    db: Session,
    user_id: UUID,
    new_roles: list[str],
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> AdminUserResponse:
    """Update assigned roles for a user. Restricted to super_admin only."""
    user = (
        db.execute(
            select(User)
            .options(joinedload(User.role_assignments).joinedload(UserRole.role))
            .where(User.id == user_id, User.is_deleted.is_(False))
        )
        .unique()
        .scalar_one_or_none()
    )
    if user is None:
        raise ApiError(
            status_code=404,
            code="USER_NOT_FOUND",
            message=f"User with ID {user_id} was not found.",
        )

    # Fetch available role records
    available_roles = (
        db.execute(select(Role).where(Role.name.in_(new_roles))).scalars().all()
    )
    found_role_names = {r.name for r in available_roles}
    for r_name in new_roles:
        if r_name not in found_role_names:
            raise ApiError(
                status_code=400,
                code="ROLE_NOT_FOUND",
                message=f"Role '{r_name}' is not a recognized system role.",
            )

    old_roles = [
        assignment.role.name
        for assignment in user.role_assignments
        if assignment.role is not None
    ]

    # Delete existing assignments
    db.execute(delete(UserRole).where(UserRole.user_id == user.id))
    db.flush()

    # Add new assignments
    for role_obj in available_roles:
        new_assignment = UserRole(
            user_id=user.id,
            role_id=role_obj.id,
            assigned_by_user_id=current_admin_id,
        )
        db.add(new_assignment)

    record_audit_log(
        db=db,
        action="user_roles_updated",
        entity_type="user",
        entity_id=str(user.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "old_roles": old_roles,
            "new_roles": new_roles,
            "target_user_email": user.email,
        },
    )
    db.commit()
    db.expire_all()

    # Refresh user
    refreshed_user = (
        db.execute(
            select(User)
            .options(joinedload(User.role_assignments).joinedload(UserRole.role))
            .where(User.id == user_id)
        )
        .unique()
        .scalar_one()
    )
    return serialize_admin_user(refreshed_user)
