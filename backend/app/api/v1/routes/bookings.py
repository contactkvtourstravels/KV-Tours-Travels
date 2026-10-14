"""Customer-facing booking engine routes.

Provides endpoints for:
- Authoritative server-side price calculation and coupon preview
- Concurrency-safe, transactional booking creation
- Customer booking detail retrieval and list foundations
- Customer booking cancellation with departure seat restoration
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.csrf import verify_csrf_token
from app.core.errors import ApiError
from app.core.rate_limit import booking_limiter, cancellation_limiter
from app.db.session import get_db_session
from app.schemas.booking import (
    BookingCreateRequest,
    BookingDetailResponse,
    BookingListResponse,
    PriceCalculationRequest,
    PriceCalculationResponse,
)
from app.schemas.customer import (
    CancellationRequestCreate,
    CancellationRequestResponse,
    PaymentReceiptData,
    TravelVoucherData,
)
from app.services.booking_service import BookingService
from app.services.customer_portal_service import get_customer_portal_service

router = APIRouter(prefix="/bookings", tags=["bookings"])

DbSession = Annotated[Session, Depends(get_db_session)]


def _extract_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/calculate-price", response_model=PriceCalculationResponse)
@router.post("/calculate", response_model=PriceCalculationResponse)
def calculate_booking_price(
    payload: PriceCalculationRequest,
    request: Request,
    db: DbSession,
) -> PriceCalculationResponse:
    """Authoritatively calculates the full booking price including add-ons, offers, and coupons."""
    user_id = None
    try:
        user = get_current_user(request=request, db=db)
        if user:
            user_id = user.id
    except ApiError:
        user_id = None

    res = BookingService.calculate_price(db=db, request=payload, user_id=user_id)
    res.discount_amount = f"{res.discount:.2f}"
    if res.offer_id:
        res.offer_applied = {
            "offer_id": str(res.offer_id),
            "offer_title": res.offer_title,
            "discount_per_traveller": f"{res.offer_discount_per_traveller:.2f}"
            if res.offer_discount_per_traveller
            else "0.00",
            "discount_amount": f"{res.discount:.2f}",
        }
    res.data = {
        "discount_amount": f"{res.discount:.2f}",
        "subtotal": f"{res.subtotal:.2f}",
        "total": f"{res.total:.2f}",
        "offer_applied": res.offer_applied,
        "package_id": str(res.package_id),
        "departure_id": str(res.departure_id),
    }
    return res


@router.post(
    "", response_model=BookingDetailResponse, status_code=status.HTTP_201_CREATED
)
def create_booking(
    payload: BookingCreateRequest,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> BookingDetailResponse:
    """Creates a booking transactionally with concurrency locks and capacity reservation.

    CSRF protected. Supports idempotency via payload.idempotency_key or X-Idempotency-Key header.
    """
    verify_csrf_token(request)
    booking_limiter.check(str(current_user.id))

    if not payload.idempotency_key:
        header_key = request.headers.get("X-Idempotency-Key")
        if header_key:
            payload.idempotency_key = header_key.strip()

    client_ip = _extract_ip(request)
    booking = BookingService.create_booking(
        db=db,
        request=payload,
        current_user=current_user,
        client_ip=client_ip,
    )

    user_roles = [r.role.name for r in current_user.role_assignments if r.role]
    detail = BookingService.get_booking_detail(
        db=db,
        booking_identifier=booking.id,
        current_user=current_user,
        user_roles=user_roles,
    )
    detail.discount_amount = f"{detail.discount:.2f}"
    detail.total_price = f"{detail.total:.2f}"
    detail.offer_id = booking.offer_id
    detail.data = {
        "id": str(detail.id),
        "booking_reference": detail.booking_reference,
        "status": detail.status,
        "payment_status": detail.payment_status,
        "discount_amount": f"{detail.discount:.2f}",
        "total_price": f"{detail.total:.2f}",
        "total": f"{detail.total:.2f}",
        "subtotal": f"{detail.subtotal:.2f}",
        "offer_id": str(booking.offer_id) if booking.offer_id else None,
        "package_id": str(detail.package_id),
        "departure_id": str(detail.departure_id),
    }
    return detail


@router.get("/my", response_model=BookingListResponse)
def get_my_bookings(
    current_user: CurrentUser,
    db: DbSession,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> BookingListResponse:
    """Retrieves paginated bookings belonging strictly to the authenticated customer."""
    return BookingService.get_my_bookings(
        db=db,
        current_user=current_user,
        status_filter=status_filter,
        page=page,
        page_size=page_size,
    )


@router.get("/{booking_identifier}", response_model=BookingDetailResponse)
def get_booking_detail(
    booking_identifier: str,
    current_user: CurrentUser,
    db: DbSession,
) -> BookingDetailResponse:
    """Retrieves full details of a booking, enforcing customer ownership. Accepts UUID or reference."""
    user_roles = [r.role.name for r in current_user.role_assignments if r.role]
    return BookingService.get_booking_detail(
        db=db,
        booking_identifier=booking_identifier,
        current_user=current_user,
        user_roles=user_roles,
    )


@router.post("/{booking_id}/cancel", response_model=BookingDetailResponse)
def cancel_booking(
    booking_id: UUID,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> BookingDetailResponse:
    """Cancels a pending booking and restores departure seats atomically. CSRF protected."""
    verify_csrf_token(request)
    cancellation_limiter.check(str(current_user.id))
    user_roles = [r.role.name for r in current_user.role_assignments if r.role]
    client_ip = _extract_ip(request)

    booking = BookingService.cancel_booking(
        db=db,
        booking_id=booking_id,
        current_user=current_user,
        user_roles=user_roles,
        client_ip=client_ip,
    )

    return BookingService.get_booking_detail(
        db=db,
        booking_identifier=booking.id,
        current_user=current_user,
        user_roles=user_roles,
    )


@router.post(
    "/{booking_id}/cancellation-request",
    response_model=CancellationRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_cancellation_request(
    booking_id: UUID,
    payload: CancellationRequestCreate,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> CancellationRequestResponse:
    """Submit a cancellation request for review by KV Tours & Travels staff. CSRF protected."""
    verify_csrf_token(request)
    cancellation_limiter.check(str(current_user.id))
    portal_service = get_customer_portal_service()
    cancel_req = portal_service.submit_cancellation_request(
        db=db,
        user=current_user,
        booking_id=booking_id,
        reason=payload.reason,
    )
    db.commit()
    db.refresh(cancel_req)
    return CancellationRequestResponse.model_validate(cancel_req)


@router.get("/{booking_identifier}/voucher", response_model=TravelVoucherData)
def get_travel_voucher(
    booking_identifier: str,
    current_user: CurrentUser,
    db: DbSession,
) -> TravelVoucherData:
    """Retrieve official travel voucher based on confirmed booking and catalog data."""
    portal_service = get_customer_portal_service()
    return portal_service.get_travel_voucher(
        db=db, user=current_user, booking_reference=booking_identifier
    )


@router.get("/{booking_identifier}/receipt", response_model=PaymentReceiptData)
def get_payment_receipt(
    booking_identifier: str,
    current_user: CurrentUser,
    db: DbSession,
) -> PaymentReceiptData:
    """Retrieve immutable payment receipt based on verified transaction record."""
    portal_service = get_customer_portal_service()
    return portal_service.get_payment_receipt(
        db=db, user=current_user, booking_reference=booking_identifier
    )
