"""Administrative payment control center, transactions, refunds, and gateway management routes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
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
from app.models.commerce import Payment
from app.models.user import User
from app.schemas.payment import (
    BankSettingsAdminResponse,
    BankSettingsUpdateRequest,
    BankTransferRejectionRequest,
    BankTransferVerificationRequest,
    PaymentDetailResponse,
    PaymentHoldExpirySummary,
    PaymentOverviewMetricsResponse,
    PaymentRefundRequest,
    PaymentRefundResponse,
    PaymentSettingsResponse,
    PaymentSettingsUpdateRequest,
    PaymentTransactionsListResponse,
    PaymentWebhookListResponse,
    RazorpayDiagnosticRequest,
    RazorpayDiagnosticResponse,
    RazorpayWebhookVerificationResponse,
    RazorpayWebhookVerifyRequest,
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["admin-payments"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]
ManagerOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]
AdminOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


def _extract_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("/overview", response_model=PaymentOverviewMetricsResponse)
def get_payments_overview(
    _admin: StaffOrAbove,
    db: DbSession,
) -> PaymentOverviewMetricsResponse:
    """Retrieve financial volume totals, transaction counts, and gateway health status."""
    return PaymentService.get_payments_overview(db=db)


@router.get("/transactions", response_model=PaymentTransactionsListResponse)
def list_payment_transactions(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    provider: Annotated[str | None, Query()] = None,
) -> PaymentTransactionsListResponse:
    """Search and filter complete transaction logs with pagination and reconciliation status."""
    return PaymentService.list_transactions(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        provider=provider,
    )


@router.get("/settings", response_model=PaymentSettingsResponse)
def get_payment_settings(
    _admin: StaffOrAbove,
    db: DbSession,
) -> PaymentSettingsResponse:
    """Retrieve global payment status, enabled gateways, and live readiness checklist."""
    return PaymentService.get_payment_settings(db=db)


@router.put("/settings", response_model=PaymentSettingsResponse)
@router.patch("/settings", response_model=PaymentSettingsResponse)
def update_payment_settings(
    payload: PaymentSettingsUpdateRequest,
    request: Request,
    admin_user: ManagerOrAbove,
    db: DbSession,
) -> PaymentSettingsResponse:
    """Update global payment master switch, maintenance notice, and gateway environment."""
    verify_csrf_token(request)
    ip_addr = _extract_ip(request)
    return PaymentService.update_payment_settings(
        db=db,
        payload=payload,
        admin_user=admin_user,
        ip_address=ip_addr,
    )


@router.get("/refunds", response_model=list[PaymentRefundResponse])
def list_payment_refunds(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[PaymentRefundResponse]:
    """Retrieve chronologically ordered refund records across all payments."""
    return PaymentService.list_refunds(db=db, page=page, page_size=page_size)


@router.get("/webhooks", response_model=PaymentWebhookListResponse)
def list_payment_webhooks(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaymentWebhookListResponse:
    """Query received webhook events from audit history."""
    return PaymentService.list_webhook_events(db=db, page=page, page_size=page_size)


@router.post("/webhooks/{audit_id}/retry")
def retry_payment_webhook(
    audit_id: UUID,
    request: Request,
    admin_user: ManagerOrAbove,
    db: DbSession,
) -> dict:
    """Simulate re-processing of an eligible logged webhook event."""
    verify_csrf_token(request)
    return PaymentService.retry_webhook_event(
        db=db,
        audit_id=audit_id,
        admin_user=admin_user,
    )


@router.post("/razorpay/diagnostic", response_model=RazorpayDiagnosticResponse)
def run_razorpay_diagnostic(
    request: Request,
    admin_user: AdminOrAbove,
    db: DbSession,
    payload: RazorpayDiagnosticRequest | None = None,
) -> RazorpayDiagnosticResponse:
    """Execute a gateway diagnostic probe and verify connectivity and credentials."""
    verify_csrf_token(request)
    ip_addr = _extract_ip(request)
    target_env = payload.environment if payload else None
    return PaymentService.run_gateway_diagnostic(
        db=db,
        admin_user=admin_user,
        target_env=target_env,
        ip_address=ip_addr,
    )


@router.post("/razorpay/webhook/verify", response_model=RazorpayWebhookVerificationResponse)
def verify_razorpay_webhook_configuration(
    request: Request,
    admin_user: AdminOrAbove,
    db: DbSession,
    payload: RazorpayWebhookVerifyRequest | None = None,
) -> RazorpayWebhookVerificationResponse:
    """Verify webhook secret configuration, HMAC signature verification, and delivery history."""
    verify_csrf_token(request)
    ip_addr = _extract_ip(request)
    target_env = payload.environment if payload else None
    return PaymentService.run_webhook_verification(
        db=db,
        admin_user=admin_user,
        target_env=target_env,
        ip_address=ip_addr,
    )




@router.post(
    "/expire-holds",
    response_model=PaymentHoldExpirySummary,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_csrf_token)],
)
def trigger_expire_holds(
    _admin: StaffOrAbove,
    db: DbSession,
) -> PaymentHoldExpirySummary:
    """Manually trigger batch cancellation and seat release for expired payment holds."""
    return PaymentService.expire_abandoned_payment_holds(db=db)


@router.get("/{payment_id}", response_model=PaymentDetailResponse)
def get_payment_detail(
    payment_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> PaymentDetailResponse:
    """Retrieve detailed payment record including refund history."""
    stmt = select(Payment).where(Payment.id == payment_id)
    payment = db.execute(stmt).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    refunds = [
        PaymentRefundResponse(
            id=r.id,
            payment_id=r.payment_id,
            provider=r.provider,
            provider_refund_id=r.provider_refund_id,
            amount=r.amount,
            currency=r.currency,
            status=r.status,
            reason=r.reason,
            processed_at=r.processed_at,
            created_at=r.created_at,
        )
        for r in payment.refunds
    ]

    return PaymentDetailResponse(
        id=payment.id,
        booking_id=payment.booking_id,
        provider=payment.provider,
        provider_order_id=payment.provider_order_id,
        provider_payment_id=payment.provider_payment_id,
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status,
        payment_method=payment.payment_method,
        failure_code=payment.failure_code,
        failure_message=payment.failure_message,
        captured_at=payment.captured_at,
        created_at=payment.created_at,
        refunds=refunds,
    )


@router.post(
    "/{payment_id}/refund",
    response_model=PaymentRefundResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_csrf_token)],
)
def process_payment_refund(
    payment_id: UUID,
    payload: PaymentRefundRequest,
    admin_user: ManagerOrAbove,
    db: DbSession,
) -> PaymentRefundResponse:
    """Authorize and execute a full or partial refund for a captured payment."""
    return PaymentService.process_refund(
        db=db,
        admin_user=admin_user,
        payment_id=payment_id,
        payload=payload,
    )


@router.get("/bank-settings", response_model=BankSettingsAdminResponse)
def get_admin_bank_settings(
    _admin: StaffOrAbove,
    db: DbSession,
) -> BankSettingsAdminResponse:
    """Retrieve administrative bank details, masking, and payment limits."""
    return PaymentService.get_bank_settings(db=db, admin_view=True)


@router.put("/bank-settings", response_model=BankSettingsAdminResponse)
@router.patch("/bank-settings", response_model=BankSettingsAdminResponse)
def update_admin_bank_settings(
    payload: BankSettingsUpdateRequest,
    request: Request,
    admin_user: ManagerOrAbove,
    db: DbSession,
) -> BankSettingsAdminResponse:
    """Update bank account details, instructions, and payment thresholds."""
    verify_csrf_token(request)
    ip_addr = _extract_ip(request)
    return PaymentService.update_bank_settings(
        db=db,
        payload=payload,
        admin_user=admin_user,
        ip_address=ip_addr,
    )


@router.post(
    "/{payment_id}/verify-bank-transfer",
    response_model=PaymentDetailResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_csrf_token)],
)
def verify_bank_transfer(
    payment_id: UUID,
    payload: BankTransferVerificationRequest,
    admin_user: StaffOrAbove,
    db: DbSession,
) -> PaymentDetailResponse:
    """Verify bank transfer submission and update booking reconciliation."""
    return PaymentService.verify_bank_transfer(
        db=db,
        admin_user=admin_user,
        payment_id=payment_id,
        payload=payload,
    )


@router.post(
    "/{payment_id}/reject-bank-transfer",
    response_model=PaymentDetailResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_csrf_token)],
)
def reject_bank_transfer(
    payment_id: UUID,
    payload: BankTransferRejectionRequest,
    admin_user: StaffOrAbove,
    db: DbSession,
) -> PaymentDetailResponse:
    """Reject unverified bank transfer submission with mandatory reason."""
    return PaymentService.reject_bank_transfer(
        db=db,
        admin_user=admin_user,
        payment_id=payment_id,
        payload=payload,
    )

