"""Administrative departures and group trip capacity management routes."""

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
    PackageDepartureCreateRequest,
    PackageDepartureResponse,
    PackageDepartureUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.departure_service import (
    create_departure,
    delete_or_cancel_departure,
    get_departure_by_id,
    list_departures,
    update_departure,
)

router = APIRouter(prefix="/departures", tags=["admin-departures"])

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


@router.get("", response_model=PaginatedResponse[PackageDepartureResponse])
def get_departures(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    package_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    from_date: Annotated[str | None, Query()] = None,
    to_date: Annotated[str | None, Query()] = None,
) -> PaginatedResponse[PackageDepartureResponse]:
    """Query group departures across packages with date and status filters."""
    return list_departures(
        db=db,
        page=page,
        page_size=page_size,
        package_id=package_id,
        status=status,
        from_date=from_date,
        to_date=to_date,
    )


@router.post("", response_model=PackageDepartureResponse, status_code=201)
def create_new_departure(
    payload: PackageDepartureCreateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageDepartureResponse:
    """Create a new group departure. Package ID must be present in payload or route. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return create_departure(
        db=db,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.get("/{departure_id}", response_model=PackageDepartureResponse)
def get_departure(
    departure_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> PackageDepartureResponse:
    """Get single departure details."""
    return get_departure_by_id(db=db, departure_id=departure_id)


@router.put("/{departure_id}", response_model=PackageDepartureResponse)
@router.patch("/{departure_id}", response_model=PackageDepartureResponse)
def update_existing_departure(
    departure_id: UUID,
    payload: PackageDepartureUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageDepartureResponse:
    """Update departure capacity, status, or pricing with row-level concurrency lock. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_departure(
        db=db,
        departure_id=departure_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete("/{departure_id}", response_model=PackageDepartureResponse)
def cancel_or_delete_departure(
    departure_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageDepartureResponse:
    """Safely delete departure or cancel if active bookings exist. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return delete_or_cancel_departure(
        db=db,
        departure_id=departure_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )
