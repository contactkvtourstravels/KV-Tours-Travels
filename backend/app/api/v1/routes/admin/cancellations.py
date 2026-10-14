"""Administrative routes for reviewing customer cancellation requests."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.auth import require_role
from app.core.csrf import verify_csrf_token
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
)
from app.db.session import get_db_session
from app.models.commerce import Booking, BookingCancellationRequest
from app.models.user import User
from app.schemas.customer import (
    CancellationRequestDetailResponse,
    CancellationRequestReview,
)
from app.services.customer_portal_service import get_customer_portal_service

router = APIRouter(prefix="/cancellations", tags=["admin-cancellations"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


@router.get("", response_model=list[CancellationRequestDetailResponse])
def list_cancellation_requests(
    _admin: StaffOrAbove,
    db: DbSession,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[CancellationRequestDetailResponse]:
    """List all booking cancellation requests with related customer and booking metadata."""
    stmt = (
        select(BookingCancellationRequest)
        .options(
            joinedload(BookingCancellationRequest.booking).joinedload(Booking.package),
            joinedload(BookingCancellationRequest.user),
        )
        .order_by(BookingCancellationRequest.created_at.desc())
    )

    if status_filter:
        stmt = stmt.where(BookingCancellationRequest.status == status_filter)

    offset = (page - 1) * page_size
    requests = db.execute(stmt.offset(offset).limit(page_size)).scalars().all()

    results: list[CancellationRequestDetailResponse] = []
    for r in requests:
        booking = r.booking
        user = r.user
        results.append(
            CancellationRequestDetailResponse(
                id=r.id,
                booking_id=r.booking_id,
                user_id=r.user_id,
                reason=r.reason,
                status=r.status,
                admin_notes=r.admin_notes,
                resolved_at=r.resolved_at,
                created_at=r.created_at,
                updated_at=r.updated_at,
                booking_reference=booking.booking_reference if booking else "N/A",
                package_title=booking.package.title
                if booking and booking.package
                else "N/A",
                customer_name=f"{user.first_name} {user.last_name}"
                if user
                else "Customer",
                customer_email=user.email if user else "N/A",
                total_amount=booking.total if booking else 0,
                currency=booking.currency if booking else "INR",
            )
        )

    return results


@router.post("/{request_id}/review", response_model=CancellationRequestDetailResponse)
def review_cancellation_request(
    request_id: UUID,
    payload: CancellationRequestReview,
    request: Request,
    admin_user: StaffOrAbove,
    db: DbSession,
) -> CancellationRequestDetailResponse:
    """Approve or reject a cancellation request with optional notes. CSRF protected."""
    verify_csrf_token(request)
    service = get_customer_portal_service()
    updated = service.review_cancellation_request(
        db=db,
        admin_user=admin_user,
        request_id=request_id,
        new_status=payload.status,
        admin_notes=payload.admin_notes,
    )
    db.commit()
    db.refresh(updated)

    booking = updated.booking
    user = updated.user
    return CancellationRequestDetailResponse(
        id=updated.id,
        booking_id=updated.booking_id,
        user_id=updated.user_id,
        reason=updated.reason,
        status=updated.status,
        admin_notes=updated.admin_notes,
        resolved_at=updated.resolved_at,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        booking_reference=booking.booking_reference if booking else "N/A",
        package_title=booking.package.title if booking and booking.package else "N/A",
        customer_name=f"{user.first_name} {user.last_name}" if user else "Customer",
        customer_email=user.email if user else "N/A",
        total_amount=booking.total if booking else 0,
        currency=booking.currency if booking else "INR",
    )
