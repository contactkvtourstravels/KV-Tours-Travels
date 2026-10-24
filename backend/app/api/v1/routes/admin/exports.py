"""Administrative CSV export routes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
    has_any_role,
)
from app.db.session import get_db_session
from app.models.user import User
from app.services.operations_service import OperationsService

router = APIRouter(prefix="/exports", tags=["admin-exports"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]
ManagerOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


import re
from app.services.catalog_service import get_public_settings


def _agency_export_prefix(db: Session) -> str:
    try:
        pub = get_public_settings(db)
        name = (pub.short_name or pub.public_display_name or pub.agency_name or "agency").lower()
        slug = re.sub(r"[^a-z0-9]+", "_", name).strip("_")
        return slug or "agency"
    except Exception:
        return "agency"


def _csv_response(csv_buffer, filename: str) -> Response:
    content = csv_buffer.getvalue()
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/bookings")
def export_bookings(_admin: StaffOrAbove, db: DbSession) -> Response:
    """Export operational bookings report as CSV."""
    buf = OperationsService.export_csv_bookings(db=db)
    prefix = _agency_export_prefix(db)
    return _csv_response(buf, f"{prefix}_bookings.csv")


@router.get("/customers")
def export_customers(_admin: StaffOrAbove, db: DbSession) -> Response:
    """Export customer directory as CSV (strictly omits secrets and password hashes)."""
    buf = OperationsService.export_csv_customers(db=db)
    prefix = _agency_export_prefix(db)
    return _csv_response(buf, f"{prefix}_customers.csv")


@router.get("/departures")
def export_departures(_admin: StaffOrAbove, db: DbSession) -> Response:
    """Export scheduled group departures report as CSV."""
    buf = OperationsService.export_csv_departures(db=db)
    prefix = _agency_export_prefix(db)
    return _csv_response(buf, f"{prefix}_departures.csv")


@router.get("/inquiries")
def export_inquiries(_admin: StaffOrAbove, db: DbSession) -> Response:
    """Export customer inquiries and leads as CSV."""
    buf = OperationsService.export_csv_inquiries(db=db)
    prefix = _agency_export_prefix(db)
    return _csv_response(buf, f"{prefix}_inquiries.csv")


@router.get("/manifest/{departure_id}")
def export_manifest(
    departure_id: UUID,
    admin_user: StaffOrAbove,
    db: DbSession,
) -> Response:
    """Export passenger manifest for a departure (passports masked unless manager/admin)."""
    is_mgr_or_admin = has_any_role(
        admin_user, [ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN]
    )
    buf = OperationsService.export_csv_manifest(
        db=db,
        departure_id=departure_id,
        is_manager_or_admin=is_mgr_or_admin,
    )
    prefix = _agency_export_prefix(db)
    return _csv_response(buf, f"{prefix}_manifest_{departure_id}.csv")


@router.get("/payments")
def export_payments(_admin: ManagerOrAbove, db: DbSession) -> Response:
    """Export financial payment transaction records as CSV (Manager+)."""
    buf = OperationsService.export_csv_payments(db=db)
    prefix = _agency_export_prefix(db)
    return _csv_response(buf, f"{prefix}_payments.csv")


@router.get("/revenue")
def export_revenue(
    _admin: ManagerOrAbove,
    db: DbSession,
    period: str = Query(
        default="30d",
        pattern="^(today|7d|30d|90d|this_year|custom)$",
    ),
    custom_start: str | None = Query(default=None),
    custom_end: str | None = Query(default=None),
) -> Response:
    """Export revenue time-series aggregation as CSV (Manager+)."""
    buf = OperationsService.export_csv_revenue(
        db=db,
        period=period,
        custom_start=custom_start,
        custom_end=custom_end,
    )
    prefix = _agency_export_prefix(db)
    return _csv_response(buf, f"{prefix}_revenue_{period}.csv")
