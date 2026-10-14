"""Administrative analytics routes for revenue, bookings, customers, packages, and destinations."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_SUPER_ADMIN,
)
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.admin_operations import (
    BookingAnalyticsResponse,
    CustomerAnalyticsResponse,
    DestinationPerformanceResponse,
    PackagePerformanceResponse,
    RevenueAnalyticsResponse,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["admin-analytics"])

DbSession = Annotated[Session, Depends(get_db_session)]
ManagerOrAdminUser = Annotated[
    User,
    Depends(require_role(ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


@router.get("/revenue", response_model=RevenueAnalyticsResponse)
def get_revenue_analytics(
    _admin: ManagerOrAdminUser,
    db: DbSession,
    period: Annotated[
        str,
        Query(
            pattern="^(today|7d|30d|90d|this_year|custom)$",
            description="Predefined time period or 'custom'",
        ),
    ] = "30d",
    custom_start: Annotated[
        str | None, Query(description="YYYY-MM-DD start date")
    ] = None,
    custom_end: Annotated[str | None, Query(description="YYYY-MM-DD end date")] = None,
) -> RevenueAnalyticsResponse:
    """Retrieve financial revenue aggregations with date range filtering.

    Accessible to Manager, Admin, and Super Admin.
    """
    return AnalyticsService.get_revenue_analytics(
        db=db,
        period=period,
        custom_start=custom_start,
        custom_end=custom_end,
    )


@router.get("/bookings", response_model=BookingAnalyticsResponse)
def get_booking_analytics(
    _admin: ManagerOrAdminUser,
    db: DbSession,
    period: Annotated[
        str,
        Query(pattern="^(today|7d|30d|90d|this_year|custom)$"),
    ] = "30d",
    destination_id: Annotated[UUID | None, Query()] = None,
    package_id: Annotated[UUID | None, Query()] = None,
    departure_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    custom_start: Annotated[str | None, Query()] = None,
    custom_end: Annotated[str | None, Query()] = None,
) -> BookingAnalyticsResponse:
    """Analyze booking trends, conversion rate, and status distributions.

    Accessible to Manager, Admin, and Super Admin.
    """
    return AnalyticsService.get_booking_analytics(
        db=db,
        period=period,
        destination_id=destination_id,
        package_id=package_id,
        departure_id=departure_id,
        status=status,
        custom_start=custom_start,
        custom_end=custom_end,
    )


@router.get("/customers", response_model=CustomerAnalyticsResponse)
def get_customer_analytics(
    _admin: ManagerOrAdminUser,
    db: DbSession,
) -> CustomerAnalyticsResponse:
    """Derive customer retention, repeat travelers, and upcoming trip counts.

    Accessible to Manager, Admin, and Super Admin.
    """
    return AnalyticsService.get_customer_analytics(db=db)


@router.get("/packages", response_model=PackagePerformanceResponse)
def get_package_performance(
    _admin: ManagerOrAdminUser,
    db: DbSession,
    sort_by: Annotated[
        str,
        Query(pattern="^(revenue|bookings|travellers)$"),
    ] = "revenue",
) -> PackagePerformanceResponse:
    """Evaluate performance metrics grouped by travel package.

    Accessible to Manager, Admin, and Super Admin.
    """
    return AnalyticsService.get_package_performance(db=db, sort_by=sort_by)


@router.get("/destinations", response_model=DestinationPerformanceResponse)
def get_destination_performance(
    _admin: ManagerOrAdminUser,
    db: DbSession,
) -> DestinationPerformanceResponse:
    """Evaluate performance metrics grouped by travel destination.

    Accessible to Manager, Admin, and Super Admin.
    """
    return AnalyticsService.get_destination_performance(db=db)
