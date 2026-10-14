"""Administrative destination management routes."""

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
    DestinationCreateRequest,
    DestinationImageCreateRequest,
    DestinationImageResponse,
    DestinationImageUpdateRequest,
    DestinationResponse,
    DestinationUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.destination_image_service import (
    add_destination_image,
    delete_destination_image,
    list_destination_images,
    update_destination_image,
)
from app.services.admin.destination_service import (
    create_destination,
    delete_destination,
    get_destination_by_id,
    list_destinations,
    update_destination,
)

router = APIRouter(prefix="/destinations", tags=["admin-destinations"])

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


@router.get("", response_model=PaginatedResponse[DestinationResponse])
def get_destinations(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query()] = None,
    is_published: Annotated[bool | None, Query()] = None,
    is_featured: Annotated[bool | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> PaginatedResponse[DestinationResponse]:
    """Query destinations with pagination, status filters, and search.

    Accessible to staff, manager, admin, and super_admin.
    """
    return list_destinations(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        is_published=is_published,
        is_featured=is_featured,
        is_active=is_active,
    )


@router.post("", response_model=DestinationResponse, status_code=201)
def create_new_destination(
    payload: DestinationCreateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> DestinationResponse:
    """Create a new destination. Accessible to manager, admin, and super_admin. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return create_destination(
        db=db,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.get("/{destination_id}", response_model=DestinationResponse)
def get_destination(
    destination_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> DestinationResponse:
    """Retrieve detailed destination information."""
    return get_destination_by_id(db=db, destination_id=destination_id)


@router.patch("/{destination_id}", response_model=DestinationResponse)
@router.put("/{destination_id}", response_model=DestinationResponse)
def update_existing_destination(
    destination_id: UUID,
    payload: DestinationUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> DestinationResponse:
    """Update destination attributes. Accessible to manager and above. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_destination(
        db=db,
        destination_id=destination_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete("/{destination_id}", response_model=DestinationResponse)
def deactivate_destination(
    destination_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> DestinationResponse:
    """Soft-delete/deactivate a destination. Accessible to manager and above. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return delete_destination(
        db=db,
        destination_id=destination_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


# ==============================================================================
# Destination Images
# ==============================================================================


@router.get("/{destination_id}/images", response_model=list[DestinationImageResponse])
def get_images(
    destination_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> list[DestinationImageResponse]:
    """List gallery images for a destination."""
    return list_destination_images(db=db, destination_id=destination_id)


@router.post(
    "/{destination_id}/images",
    response_model=DestinationImageResponse,
    status_code=201,
)
def add_image(
    destination_id: UUID,
    payload: DestinationImageCreateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> DestinationImageResponse:
    """Add gallery image to a destination. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return add_destination_image(
        db=db,
        destination_id=destination_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.patch(
    "/{destination_id}/images/{image_id}",
    response_model=DestinationImageResponse,
)
def update_image(
    destination_id: UUID,
    image_id: UUID,
    payload: DestinationImageUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> DestinationImageResponse:
    """Update destination image metadata or featured status. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_destination_image(
        db=db,
        destination_id=destination_id,
        image_id=image_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete("/{destination_id}/images/{image_id}", status_code=204)
def remove_image(
    destination_id: UUID,
    image_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> None:
    """Remove gallery image from a destination. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    delete_destination_image(
        db=db,
        destination_id=destination_id,
        image_id=image_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )
