"""Customer and webhook payment routes for Razorpay integration."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.core.csrf import verify_csrf_token
from app.core.rate_limit import payment_order_limiter, payment_verify_limiter
from app.db.session import get_db_session
from app.schemas.payment import (
    BankSettingsPublicResponse,
    BankTransferSubmitRequest,
    BankTransferSubmitResponse,
    RazorpayFailureRequest,
    RazorpayOrderCreateRequest,
    RazorpayOrderResponse,
    RazorpayVerifyRequest,
    RazorpayVerifyResponse,
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get(
    "/bank-details",
    response_model=BankSettingsPublicResponse,
    status_code=status.HTTP_200_OK,
)
def get_bank_details(
    current_user: CurrentUser,
    db: DbSession,
    booking_id: str | None = None,
) -> BankSettingsPublicResponse:
    """Retrieve customer-facing bank payment details and transfer instructions for active booking."""
    return PaymentService.get_bank_settings(
        db=db, admin_view=False, booking_id=booking_id
    )


@router.post(
    "/bank-transfer",
    response_model=BankTransferSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf_token)],
)
def submit_bank_transfer(
    payload: BankTransferSubmitRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> BankTransferSubmitResponse:
    """Submit a bank transfer reference / UTR for administrative verification and reservation confirmation."""
    return PaymentService.submit_bank_transfer(
        db=db,
        current_user=current_user,
        payload=payload,
    )



@router.post(
    "/razorpay/order",
    response_model=RazorpayOrderResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf_token)],
)
def create_razorpay_order(
    payload: RazorpayOrderCreateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> RazorpayOrderResponse:
    """Create or retrieve an active Razorpay checkout order for a booking."""
    payment_order_limiter.check(str(current_user.id))
    return PaymentService.create_payment_order(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.post(
    "/razorpay/verify",
    response_model=RazorpayVerifyResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_csrf_token)],
)
def verify_razorpay_payment(
    payload: RazorpayVerifyRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> RazorpayVerifyResponse:
    """Authoritatively verify Razorpay payment signature and confirm booking."""
    payment_verify_limiter.check(str(current_user.id))
    return PaymentService.verify_payment(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.post(
    "/razorpay/failure",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_csrf_token)],
)
def record_razorpay_failure(
    payload: RazorpayFailureRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> dict[str, Any]:
    """Record client-side payment dismissal or checkout failure."""
    return PaymentService.record_payment_failure(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.post(
    "/razorpay/webhook",
    status_code=status.HTTP_200_OK,
)
async def razorpay_webhook(
    request: Request,
    db: DbSession,
    x_razorpay_signature: str | None = Header(None, alias="X-Razorpay-Signature"),
) -> dict[str, Any]:
    """Process incoming server-to-server Razorpay webhook with HMAC signature verification."""
    if not x_razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Razorpay-Signature header.",
        )

    raw_body = await request.body()
    return PaymentService.handle_webhook(
        db=db,
        raw_body=raw_body,
        signature=x_razorpay_signature,
    )
