"""Administrative add-ons management routes."""

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
    AddOnCreateRequest,
    AddOnResponse,
    AddOnUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.add_on_service import (
    create_add_on,
    delete_add_on,
    get_add_on_by_id,
    list_add_ons,
    update_add_on,
)

router = APIRouter(prefix="/add-ons", tags=["admin-add-ons"])

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


@router.get("", response_model=PaginatedResponse[AddOnResponse])
def get_add_ons(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> PaginatedResponse[AddOnResponse]:
    """Query extra add-on services with pagination and search."""
    return list_add_ons(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active,
    )


@router.post("", response_model=AddOnResponse, status_code=201)
def create_new_add_on(
    payload: AddOnCreateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> AddOnResponse:
    """Create a new optional add-on service. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return create_add_on(
        db=db,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.get("/{add_on_id}", response_model=AddOnResponse)
def get_add_on(
    add_on_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> AddOnResponse:
    """Get single add-on details."""
    return get_add_on_by_id(db=db, add_on_id=add_on_id)


@router.patch("/{add_on_id}", response_model=AddOnResponse)
def update_existing_add_on(
    add_on_id: UUID,
    payload: AddOnUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> AddOnResponse:
    """Update add-on pricing or description. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_add_on(
        db=db,
        add_on_id=add_on_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete("/{add_on_id}", response_model=AddOnResponse)
def deactivate_add_on(
    add_on_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> AddOnResponse:
    """Deactivate an add-on service. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return delete_add_on(
        db=db,
        add_on_id=add_on_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )
