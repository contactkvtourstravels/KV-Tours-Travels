"""Administrative user management routes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.csrf import verify_csrf_token
from app.core.permissions import ROLE_ADMIN, ROLE_SUPER_ADMIN
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.admin import (
    AdminUserResponse,
    AdminUserRolesUpdateRequest,
    AdminUserStatusUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.user_service import (
    get_user_by_id,
    list_users,
    update_user_roles,
    update_user_status,
)

router = APIRouter(prefix="/users", tags=["admin-users"])

DbSession = Annotated[Session, Depends(get_db_session)]
AdminOnlyUser = Annotated[
    User,
    Depends(require_role(ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]
SuperAdminOnlyUser = Annotated[
    User,
    Depends(require_role(ROLE_SUPER_ADMIN)),
]


def _extract_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("", response_model=PaginatedResponse[AdminUserResponse])
def get_users(
    _admin: AdminOnlyUser,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query()] = None,
    role: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
) -> PaginatedResponse[AdminUserResponse]:
    """List registered users with pagination, role/status filtering, and search.

    Accessible to admin and super_admin.
    """
    return list_users(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        role_name=role,
        status=status,
    )


@router.get("/{user_id}", response_model=AdminUserResponse)
def get_user(
    user_id: UUID,
    _admin: AdminOnlyUser,
    db: DbSession,
) -> AdminUserResponse:
    """Retrieve detailed user profile. Accessible to admin and super_admin."""
    return get_user_by_id(db=db, user_id=user_id)


@router.patch("/{user_id}/status", response_model=AdminUserResponse)
def update_status(
    user_id: UUID,
    payload: AdminUserStatusUpdateRequest,
    request: Request,
    admin: AdminOnlyUser,
    db: DbSession,
) -> AdminUserResponse:
    """Update user account status (e.g. active, suspended).

    Accessible to admin and super_admin. CSRF protected.
    """
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_user_status(
        db=db,
        user_id=user_id,
        new_status=payload.status,
        current_admin_id=admin.id,
        ip_address=ip_address,
        reason=payload.reason,
    )


@router.patch("/{user_id}/roles", response_model=AdminUserResponse)
def update_roles(
    user_id: UUID,
    payload: AdminUserRolesUpdateRequest,
    request: Request,
    admin: SuperAdminOnlyUser,
    db: DbSession,
) -> AdminUserResponse:
    """Update assigned roles for a user.

    Strictly restricted to super_admin. CSRF protected.
    """
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_user_roles(
        db=db,
        user_id=user_id,
        new_roles=payload.roles,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )
