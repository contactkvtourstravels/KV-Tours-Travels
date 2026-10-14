"""Administrative operations routes: Dashboard, Departures, Manifests, Reconciliation, and Contact."""

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
    has_any_role,
)
from app.core.rate_limit import admin_ops_limiter
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.admin_operations import (
    ContactCustomerEmailRequest,
    ContactCustomerEmailResponse,
    ContactCustomerWhatsAppResponse,
    DepartureManifestResponse,
    DepartureOperationalItem,
    OperationsDashboardMetricsResponse,
    PaymentReconciliationResponse,
)
from app.services.operations_service import OperationsService

router = APIRouter(prefix="/operations", tags=["admin-operations"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]
ManagerOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


@router.get("/dashboard", response_model=OperationsDashboardMetricsResponse)
def get_operations_dashboard(
    _admin: StaffOrAbove,
    db: DbSession,
) -> OperationsDashboardMetricsResponse:
    """Retrieve genuine operational cards for staff and management."""
    return OperationsService.get_dashboard_metrics(db=db)


@router.get("/departures", response_model=list[DepartureOperationalItem])
def list_operational_departures(
    _admin: StaffOrAbove,
    db: DbSession,
    package_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    from_date: Annotated[str | None, Query()] = None,
    to_date: Annotated[str | None, Query()] = None,
) -> list[DepartureOperationalItem]:
    """Retrieve operational departures with passenger counts and operational states."""
    return OperationsService.list_operational_departures(
        db=db,
        package_id=package_id,
        status=status,
        from_date=from_date,
        to_date=to_date,
    )


@router.get(
    "/departures/{departure_id}/manifest", response_model=DepartureManifestResponse
)
def get_departure_manifest(
    departure_id: UUID,
    admin_user: StaffOrAbove,
    db: DbSession,
) -> DepartureManifestResponse:
    """Generate printable and exportable passenger manifest for a group departure."""
    is_mgr_or_admin = has_any_role(
        admin_user, [ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN]
    )
    return OperationsService.get_departure_manifest(
        db=db,
        departure_id=departure_id,
        is_manager_or_admin=is_mgr_or_admin,
    )


@router.get("/reconciliation", response_model=PaymentReconciliationResponse)
def get_payment_reconciliation(
    _admin: ManagerOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    status: Annotated[str | None, Query()] = None,
    mismatch_type: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
) -> PaymentReconciliationResponse:
    """Analyze payment reconciliation and detect transaction mismatches."""
    return OperationsService.get_payment_reconciliation(
        db=db,
        page=page,
        page_size=page_size,
        status=status,
        mismatch_type=mismatch_type,
        search=search,
    )


@router.post(
    "/contact/email",
    response_model=ContactCustomerEmailResponse,
    dependencies=[Depends(verify_csrf_token)],
)
def contact_customer_email(
    payload: ContactCustomerEmailRequest,
    admin_user: StaffOrAbove,
    db: DbSession,
    request: Request,
) -> ContactCustomerEmailResponse:
    """Dispatch contextual operational email to customer."""
    admin_ops_limiter.check(str(admin_user.id))
    client_ip = request.client.host if request.client else None
    return OperationsService.contact_customer_email(
        db=db,
        admin_user_id=admin_user.id,
        subject=payload.subject,
        body=payload.body,
        booking_id=payload.booking_id,
        inquiry_id=payload.inquiry_id,
        ip_address=client_ip,
    )


@router.get("/contact/whatsapp", response_model=ContactCustomerWhatsAppResponse)
def get_contact_customer_whatsapp(
    admin_user: StaffOrAbove,
    db: DbSession,
    booking_id: Annotated[UUID | None, Query()] = None,
    inquiry_id: Annotated[UUID | None, Query()] = None,
) -> ContactCustomerWhatsAppResponse:
    """Generate contextual prefilled WhatsApp Click-to-Chat URL for customer communication."""
    return OperationsService.get_whatsapp_contact_url(
        db=db,
        admin_user_id=admin_user.id,
        booking_id=booking_id,
        inquiry_id=inquiry_id,
    )
