"""Service for calculating real administrative dashboard metrics and summaries."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.catalog import Activity, Destination, Hotel, Package, PackageDeparture
from app.models.commerce import Booking, Inquiry, Payment
from app.models.content import AuditLog
from app.models.user import Role, User, UserRole
from app.schemas.admin import (
    AdminDashboardMetricsResponse,
    RecentAuditItem,
    RecentBookingItem,
    RecentInquiryItem,
)


def get_dashboard_metrics(db: Session) -> AdminDashboardMetricsResponse:
    """Query live PostgreSQL database models for genuine business metrics.

    All counts and lists are derived from actual domain tables without mocked numbers.
    """
    # 1. Total users (excluding soft-deleted)
    total_users = db.execute(
        select(func.count(User.id)).where(User.is_deleted.is_(False))
    ).scalar_one()

    # 2. Total customers (users with 'customer' role)
    customer_role_id = db.execute(
        select(Role.id).where(Role.name == "customer")
    ).scalar_one_or_none()

    if customer_role_id:
        total_customers = db.execute(
            select(func.count(UserRole.id))
            .join(User, UserRole.user_id == User.id)
            .where(
                UserRole.role_id == customer_role_id,
                User.is_deleted.is_(False),
            )
        ).scalar_one()
    else:
        total_customers = 0

    # 3. Destination counts
    total_destinations = db.execute(
        select(func.count(Destination.id)).where(Destination.deleted_at.is_(None))
    ).scalar_one()

    published_destinations = db.execute(
        select(func.count(Destination.id)).where(
            Destination.deleted_at.is_(None),
            Destination.is_published.is_(True),
        )
    ).scalar_one()

    # 4. Package counts
    total_packages = db.execute(
        select(func.count(Package.id)).where(Package.deleted_at.is_(None))
    ).scalar_one()

    published_packages = db.execute(
        select(func.count(Package.id)).where(
            Package.deleted_at.is_(None),
            Package.is_published.is_(True),
        )
    ).scalar_one()

    # 5. Booking counts
    total_bookings = db.execute(select(func.count(Booking.id))).scalar_one()
    pending_bookings = db.execute(
        select(func.count(Booking.id)).where(Booking.status == "pending")
    ).scalar_one()
    confirmed_bookings = db.execute(
        select(func.count(Booking.id)).where(Booking.status == "confirmed")
    ).scalar_one()

    # 6. Inquiry counts
    total_inquiries = db.execute(select(func.count(Inquiry.id))).scalar_one()
    unread_inquiries = db.execute(
        select(func.count(Inquiry.id)).where(Inquiry.status == "new")
    ).scalar_one()

    # 7. Recent Bookings (up to 5)
    recent_bookings_stmt = (
        select(Booking)
        .options(joinedload(Booking.user), joinedload(Booking.package))
        .order_by(desc(Booking.created_at))
        .limit(5)
    )
    booking_records = db.execute(recent_bookings_stmt).unique().scalars().all()
    recent_bookings: list[RecentBookingItem] = []
    for b in booking_records:
        cust_name = (
            f"{b.user.first_name} {b.user.last_name}" if b.user else "Guest Customer"
        )
        cust_email = b.user.email if b.user else "N/A"
        pkg_name = b.package.name if b.package else "Custom Experience"
        recent_bookings.append(
            RecentBookingItem(
                id=b.id,
                booking_reference=b.booking_reference,
                customer_name=cust_name,
                customer_email=cust_email,
                package_name=pkg_name,
                total_amount=b.total,
                currency=b.currency,
                status=b.status,
                payment_status=b.payment_status,
                created_at=b.created_at,
            )
        )

    # 8. Recent Inquiries (up to 5)
    recent_inquiries_stmt = select(Inquiry).order_by(desc(Inquiry.created_at)).limit(5)
    inquiry_records = db.execute(recent_inquiries_stmt).scalars().all()
    recent_inquiries = [
        RecentInquiryItem(
            id=inq.id,
            name=inq.name,
            email=inq.email,
            message_preview=inq.message[:100]
            + ("..." if len(inq.message) > 100 else ""),
            status=inq.status,
            source=inq.source,
            created_at=inq.created_at,
        )
        for inq in inquiry_records
    ]

    # 9. Recent Audit Activity (up to 5)
    recent_audit_stmt = (
        select(AuditLog)
        .options(joinedload(AuditLog.actor))
        .order_by(desc(AuditLog.created_at))
        .limit(5)
    )
    audit_records = db.execute(recent_audit_stmt).unique().scalars().all()
    recent_audit_activity = [
        RecentAuditItem(
            id=a.id,
            action=a.action,
            entity_type=a.entity_type,
            entity_id=a.entity_id,
            actor_email=a.actor.email if a.actor else "System",
            created_at=a.created_at,
        )
        for a in audit_records
    ]

    # 10. Catalog inventory counts
    active_hotels = db.execute(
        select(func.count(Hotel.id)).where(
            Hotel.is_active.is_(True),
            Hotel.deleted_at.is_(None),
        )
    ).scalar_one()

    active_activities = db.execute(
        select(func.count(Activity.id)).where(
            Activity.status == "active",
            Activity.deleted_at.is_(None),
        )
    ).scalar_one()

    now_date = datetime.now(timezone.utc).date()
    upcoming_departures = db.execute(
        select(func.count(PackageDeparture.id)).where(
            PackageDeparture.status == "open",
            PackageDeparture.departure_date >= now_date,
        )
    ).scalar_one()

    total_revenue = db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == "captured"
        )
    ).scalar_one()

    return AdminDashboardMetricsResponse(
        total_customers=total_customers,
        total_users=total_users,
        total_destinations=total_destinations,
        published_destinations=published_destinations,
        total_packages=total_packages,
        published_packages=published_packages,
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        confirmed_bookings=confirmed_bookings,
        total_inquiries=total_inquiries,
        unread_inquiries=unread_inquiries,
        active_hotels=active_hotels,
        active_activities=active_activities,
        upcoming_departures=upcoming_departures,
        total_revenue=total_revenue,
        recent_bookings=recent_bookings,
        recent_inquiries=recent_inquiries,
        recent_audit_activity=recent_audit_activity,
    )
