"""Administrative hotel management routes."""

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
    HotelCreateRequest,
    HotelResponse,
    HotelUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.hotel_service import (
    create_hotel,
    delete_hotel,
    get_hotel_by_id,
    list_hotels,
    update_hotel,
)

router = APIRouter(prefix="/hotels", tags=["admin-hotels"])

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


@router.get("", response_model=PaginatedResponse[HotelResponse])
def get_hotels(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query()] = None,
    destination_id: Annotated[UUID | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> PaginatedResponse[HotelResponse]:
    """Query hotels with search, destination filter, and pagination."""
    return list_hotels(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        destination_id=destination_id,
        is_active=is_active,
    )


@router.post("", response_model=HotelResponse, status_code=201)
def create_new_hotel(
    payload: HotelCreateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> HotelResponse:
    """Create a new hotel. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return create_hotel(
        db=db,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.get("/{hotel_id}", response_model=HotelResponse)
def get_hotel(
    hotel_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> HotelResponse:
    """Get single hotel details."""
    return get_hotel_by_id(db=db, hotel_id=hotel_id)


@router.patch("/{hotel_id}", response_model=HotelResponse)
def update_existing_hotel(
    hotel_id: UUID,
    payload: HotelUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> HotelResponse:
    """Update hotel details. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_hotel(
        db=db,
        hotel_id=hotel_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete("/{hotel_id}", response_model=HotelResponse)
def deactivate_hotel(
    hotel_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> HotelResponse:
    """Soft-delete/deactivate hotel. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return delete_hotel(
        db=db,
        hotel_id=hotel_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )
