"""Administrative activities management routes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.csrf import verify_csrf_token
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
)
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.admin import (
    ActivityCreateRequest,
    ActivityResponse,
    ActivityUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.activity_service import (
    create_activity,
    delete_activity,
    get_activity_by_id,
    list_activities,
    update_activity,
)

router = APIRouter(prefix="/activities", tags=["admin-activities"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]
ManagerOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


def _extract_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("", response_model=PaginatedResponse[ActivityResponse])
def get_activities(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query()] = None,
    destination_id: Annotated[UUID | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
) -> PaginatedResponse[ActivityResponse]:
    """Query activities with search, category, destination, status filtering and pagination."""
    return list_activities(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        destination_id=destination_id,
        category=category,
        status=status,
    )


@router.post("", response_model=ActivityResponse, status_code=201)
def create_new_activity(
    payload: ActivityCreateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> ActivityResponse:
    """Create a reusable activity. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return create_activity(
        db=db,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(
    activity_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> ActivityResponse:
    """Get single activity details."""
    return get_activity_by_id(db=db, activity_id=activity_id)


@router.patch("/{activity_id}", response_model=ActivityResponse)
@router.put("/{activity_id}", response_model=ActivityResponse)
def update_existing_activity(
    activity_id: UUID,
    payload: ActivityUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> ActivityResponse:
    """Update activity metadata or status. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_activity(
        db=db,
        activity_id=activity_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete("/{activity_id}", response_model=ActivityResponse)
def deactivate_activity(
    activity_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> ActivityResponse:
    """Soft-delete/deactivate activity. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return delete_activity(
        db=db,
        activity_id=activity_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )
