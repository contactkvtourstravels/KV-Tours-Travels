"""Administrative booking management routes."""

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
from app.schemas.booking import (
    BookingDetailResponse,
    BookingListResponse,
    BookingStatusUpdateRequest,
)
from app.services.booking_service import BookingService

router = APIRouter(prefix="/bookings", tags=["admin-bookings"])

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


@router.get("", response_model=BookingListResponse)
def list_admin_bookings(
    _admin: StaffOrAbove,
    db: DbSession,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    payment_status_filter: Annotated[str | None, Query(alias="payment_status")] = None,
    package_id: Annotated[UUID | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> BookingListResponse:
    """Lists bookings across packages with search, status filters, and pagination."""
    return BookingService.get_admin_bookings(
        db=db,
        status_filter=status_filter,
        payment_status_filter=payment_status_filter,
        package_id=package_id,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/{booking_id}", response_model=BookingDetailResponse)
def get_admin_booking_detail(
    booking_id: UUID,
    admin: StaffOrAbove,
    db: DbSession,
) -> BookingDetailResponse:
    """Retrieves full administrative detail of a booking including travellers and add-ons."""
    user_roles = [r.role.name for r in admin.role_assignments if r.role]
    return BookingService.get_booking_detail(
        db=db,
        booking_identifier=booking_id,
        current_user=admin,
        user_roles=user_roles,
    )


@router.patch("/{booking_id}", response_model=BookingDetailResponse)
@router.patch("/{booking_id}/status", response_model=BookingDetailResponse)
def update_booking_status(
    booking_id: UUID,
    payload: BookingStatusUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> BookingDetailResponse:
    """Updates booking status with strict state transition validation. CSRF protected."""
    verify_csrf_token(request)
    client_ip = _extract_ip(request)
    booking = BookingService.update_booking_status(
        db=db,
        booking_id=booking_id,
        new_status=payload.status,
        current_user=admin,
        reason=payload.reason,
        client_ip=client_ip,
    )

    user_roles = [r.role.name for r in admin.role_assignments if r.role]
    return BookingService.get_booking_detail(
        db=db,
        booking_identifier=booking.id,
        current_user=admin,
        user_roles=user_roles,
    )
