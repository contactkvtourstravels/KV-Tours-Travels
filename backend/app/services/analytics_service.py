"""Analytics service providing server-side SQL aggregation for financial and operational metrics.

Timezone Handling:
All timestamps in the database are stored in UTC. For operational reporting and daily
aggregations, times are converted to the business timezone: Asia/Kolkata (UTC+05:30).

Financial Precision:
All monetary aggregations strictly use Python `Decimal` / SQL `Numeric` types. Floating-point
arithmetic is strictly forbidden for currency.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.catalog import Destination, Package, PackageDeparture
from app.models.commerce import Booking, Payment, PaymentRefund
from app.models.user import Role, User, UserRole
from app.schemas.admin_operations import (
    BookingAnalyticsResponse,
    BookingStatusCountItem,
    BookingTimeSeriesItem,
    CustomerAnalyticsResponse,
    DestinationPerformanceItem,
    DestinationPerformanceResponse,
    PackagePerformanceItem,
    PackagePerformanceResponse,
    RevenueAnalyticsResponse,
    RevenueTimeSeriesItem,
)

KOLKATA_TZ = ZoneInfo("Asia/Kolkata")


def _get_kolkata_now() -> datetime:
    """Current timestamp in business timezone Asia/Kolkata."""
    return datetime.now(timezone.utc).astimezone(KOLKATA_TZ)


def _resolve_date_range(
    preset: str,
    custom_start: str | None = None,
    custom_end: str | None = None,
) -> tuple[datetime, datetime, str, str]:
    """Calculate UTC datetime boundaries corresponding to Kolkata business days."""
    now_k = _get_kolkata_now()
    today_k = now_k.date()

    if preset == "today":
        start_date = today_k
        end_date = today_k
    elif preset == "7d":
        start_date = today_k - timedelta(days=6)
        end_date = today_k
    elif preset == "30d":
        start_date = today_k - timedelta(days=29)
        end_date = today_k
    elif preset == "90d":
        start_date = today_k - timedelta(days=89)
        end_date = today_k
    elif preset == "this_year":
        start_date = date(today_k.year, 1, 1)
        end_date = today_k
    elif preset == "custom" and custom_start and custom_end:
        start_date = date.fromisoformat(custom_start)
        end_date = date.fromisoformat(custom_end)
    else:
        # Default to 30 days
        start_date = today_k - timedelta(days=29)
        end_date = today_k

    # Convert Kolkata date midnight to UTC
    start_dt_k = datetime.combine(start_date, time.min, tzinfo=KOLKATA_TZ)
    end_dt_k = datetime.combine(end_date, time.max, tzinfo=KOLKATA_TZ)

    start_dt_utc = start_dt_k.astimezone(timezone.utc)
    end_dt_utc = end_dt_k.astimezone(timezone.utc)

    return start_dt_utc, end_dt_utc, start_date.isoformat(), end_date.isoformat()


class AnalyticsService:
    """Comprehensive analytical calculation engine using SQL aggregations."""

    @staticmethod
    def get_revenue_analytics(
        db: Session,
        period: str = "30d",
        custom_start: str | None = None,
        custom_end: str | None = None,
    ) -> RevenueAnalyticsResponse:
        """Compute authoritative revenue, refunds, and net income within the date window."""
        start_utc, end_utc, start_str, end_str = _resolve_date_range(
            preset=period, custom_start=custom_start, custom_end=custom_end
        )

        # 1. Paid Revenue (successfully captured payments)
        paid_stmt = select(
            func.coalesce(func.sum(Payment.amount), Decimal("0.00"))
        ).where(
            Payment.status == "captured",
            Payment.captured_at >= start_utc,
            Payment.captured_at <= end_utc,
        )
        paid_revenue = db.execute(paid_stmt).scalar_one()

        # 2. Refunded Amount (processed refunds)
        refund_stmt = select(
            func.coalesce(func.sum(PaymentRefund.amount), Decimal("0.00"))
        ).where(
            PaymentRefund.status == "processed",
            PaymentRefund.processed_at >= start_utc,
            PaymentRefund.processed_at <= end_utc,
        )
        refunded_amount = db.execute(refund_stmt).scalar_one()

        # 3. Pending Payments (unpaid active bookings created in window)
        pending_stmt = select(
            func.coalesce(func.sum(Booking.total), Decimal("0.00"))
        ).where(
            Booking.payment_status.in_(["pending", "partially_paid"]),
            Booking.status != "cancelled",
            Booking.created_at >= start_utc,
            Booking.created_at <= end_utc,
        )
        pending_payments = db.execute(pending_stmt).scalar_one()

        net_revenue = paid_revenue - refunded_amount
        total_revenue = paid_revenue

        # 4. Daily time series aggregation
        # Retrieve all captured payments in range to bucket by Kolkata date
        payments = db.execute(
            select(Payment.amount, Payment.captured_at).where(
                Payment.status == "captured",
                Payment.captured_at >= start_utc,
                Payment.captured_at <= end_utc,
            )
        ).all()

        refunds = db.execute(
            select(PaymentRefund.amount, PaymentRefund.processed_at).where(
                PaymentRefund.status == "processed",
                PaymentRefund.processed_at >= start_utc,
                PaymentRefund.processed_at <= end_utc,
            )
        ).all()

        bookings_count_rows = db.execute(
            select(Booking.created_at).where(
                Booking.created_at >= start_utc,
                Booking.created_at <= end_utc,
            )
        ).all()

        # Build day map from start_date to end_date
        cur = date.fromisoformat(start_str)
        end_d = date.fromisoformat(end_str)
        day_map: dict[str, dict[str, Any]] = {}
        while cur <= end_d:
            day_map[cur.isoformat()] = {
                "paid": Decimal("0.00"),
                "refunded": Decimal("0.00"),
                "bookings": 0,
            }
            cur += timedelta(days=1)

        for amt, dt in payments:
            if dt:
                k_date = dt.astimezone(KOLKATA_TZ).date().isoformat()
                if k_date in day_map:
                    day_map[k_date]["paid"] += amt

        for amt, dt in refunds:
            if dt:
                k_date = dt.astimezone(KOLKATA_TZ).date().isoformat()
                if k_date in day_map:
                    day_map[k_date]["refunded"] += amt

        for (dt,) in bookings_count_rows:
            if dt:
                k_date = dt.astimezone(KOLKATA_TZ).date().isoformat()
                if k_date in day_map:
                    day_map[k_date]["bookings"] += 1

        time_series: list[RevenueTimeSeriesItem] = [
            RevenueTimeSeriesItem(
                date=d_key,
                paid_revenue=vals["paid"],
                refunded_amount=vals["refunded"],
                net_revenue=vals["paid"] - vals["refunded"],
                bookings_count=vals["bookings"],
            )
            for d_key, vals in sorted(day_map.items())
        ]

        return RevenueAnalyticsResponse(
            total_revenue=total_revenue,
            paid_revenue=paid_revenue,
            pending_payments=pending_payments,
            refunded_amount=refunded_amount,
            net_revenue=net_revenue,
            period=period,
            start_date=start_str,
            end_date=end_str,
            time_series=time_series,
        )

    @staticmethod
    def get_booking_analytics(
        db: Session,
        period: str = "30d",
        destination_id: UUID | None = None,
        package_id: UUID | None = None,
        departure_id: UUID | None = None,
        status: str | None = None,
        custom_start: str | None = None,
        custom_end: str | None = None,
    ) -> BookingAnalyticsResponse:
        """Analyze booking volume, conversion efficiency, and value distributions."""
        start_utc, end_utc, start_str, end_str = _resolve_date_range(
            preset=period, custom_start=custom_start, custom_end=custom_end
        )

        stmt = select(Booking).where(
            Booking.created_at >= start_utc,
            Booking.created_at <= end_utc,
        )

        if package_id:
            stmt = stmt.where(Booking.package_id == package_id)
        if departure_id:
            stmt = stmt.where(Booking.departure_id == departure_id)
        if status:
            stmt = stmt.where(Booking.status == status)
        if destination_id:
            stmt = stmt.join(Package, Booking.package_id == Package.id).where(
                Package.destination_id == destination_id
            )

        all_bookings = db.execute(stmt).scalars().all()

        total_bookings = len(all_bookings)
        confirmed_count = sum(1 for b in all_bookings if b.status == "confirmed")
        pending_payment_count = sum(
            1
            for b in all_bookings
            if b.status in ["pending", "payment_pending"]
            or b.payment_status in ["pending", "partially_paid"]
        )
        cancelled_count = sum(1 for b in all_bookings if b.status == "cancelled")
        completed_count = sum(1 for b in all_bookings if b.status == "completed")

        conversion_rate = (
            round((confirmed_count + completed_count) / total_bookings, 4)
            if total_bookings > 0
            else 0.0
        )

        confirmed_bookings = [
            b for b in all_bookings if b.status in ["confirmed", "completed"]
        ]
        if confirmed_bookings:
            avg_value = sum(
                (b.total for b in confirmed_bookings), Decimal("0.00")
            ) / len(confirmed_bookings)
            avg_travellers = sum(
                b.number_of_travellers for b in confirmed_bookings
            ) / len(confirmed_bookings)
        else:
            avg_value = Decimal("0.00")
            avg_travellers = 0.0

        # Status distribution
        status_counts: dict[str, int] = {}
        for b in all_bookings:
            status_counts[b.status] = status_counts.get(b.status, 0) + 1

        by_status = [
            BookingStatusCountItem(status=k, count=v)
            for k, v in sorted(status_counts.items())
        ]

        # Time series bucketing
        cur = date.fromisoformat(start_str)
        end_d = date.fromisoformat(end_str)
        day_map: dict[str, dict[str, Any]] = {}
        while cur <= end_d:
            day_map[cur.isoformat()] = {"count": 0, "total": Decimal("0.00")}
            cur += timedelta(days=1)

        for b in all_bookings:
            if b.created_at:
                k_date = b.created_at.astimezone(KOLKATA_TZ).date().isoformat()
                if k_date in day_map:
                    day_map[k_date]["count"] += 1
                    day_map[k_date]["total"] += b.total

        time_series = [
            BookingTimeSeriesItem(
                date=k,
                count=v["count"],
                total_value=v["total"],
            )
            for k, v in sorted(day_map.items())
        ]

        return BookingAnalyticsResponse(
            total_bookings=total_bookings,
            confirmed_count=confirmed_count,
            pending_payment_count=pending_payment_count,
            cancelled_count=cancelled_count,
            completed_count=completed_count,
            conversion_rate=conversion_rate,
            average_booking_value=Decimal(str(round(avg_value, 2))),
            average_travellers_per_booking=round(avg_travellers, 1),
            by_status=by_status,
            time_series=time_series,
        )

    @staticmethod
    def get_customer_analytics(db: Session) -> CustomerAnalyticsResponse:
        """Calculate customer growth, repeat booking retention, and trip statuses."""
        now_k = _get_kolkata_now()
        thirty_days_ago = now_k - timedelta(days=30)
        today_date = now_k.date()

        # Find customer role ID
        customer_role_id = db.execute(
            select(Role.id).where(Role.name == "customer")
        ).scalar_one_or_none()

        # Users who are customers
        if customer_role_id:
            customer_ids_stmt = (
                select(User.id)
                .join(UserRole, UserRole.user_id == User.id)
                .where(
                    UserRole.role_id == customer_role_id,
                    User.is_deleted.is_(False),
                )
            )
            customer_ids = set(db.execute(customer_ids_stmt).scalars().all())
        else:
            customer_ids = set()

        # Also include any user who has placed a booking
        booking_user_ids = set(
            db.execute(select(Booking.user_id).distinct()).scalars().all()
        )
        all_customer_ids = customer_ids.union(booking_user_ids)
        total_customers = len(all_customer_ids)

        # New customers in last 30 days
        if all_customer_ids:
            new_customers = db.execute(
                select(func.count(User.id)).where(
                    User.id.in_(all_customer_ids),
                    User.created_at >= thirty_days_ago.astimezone(timezone.utc),
                )
            ).scalar_one()
        else:
            new_customers = 0

        # Returning customers (> 1 booking)
        repeat_cust_stmt = (
            select(Booking.user_id)
            .group_by(Booking.user_id)
            .having(func.count(Booking.id) > 1)
        )
        returning_customers = len(db.execute(repeat_cust_stmt).scalars().all())

        # Customers with upcoming trips (confirmed/completed bookings on departures >= today)
        upcoming_trips_stmt = (
            select(Booking.user_id)
            .join(PackageDeparture, Booking.departure_id == PackageDeparture.id)
            .where(
                Booking.status.in_(["confirmed", "completed"]),
                PackageDeparture.departure_date >= today_date,
            )
            .distinct()
        )
        customers_with_upcoming_trips = len(
            db.execute(upcoming_trips_stmt).scalars().all()
        )

        # Customers with completed trips (confirmed/completed bookings on departures < today)
        completed_trips_stmt = (
            select(Booking.user_id)
            .join(PackageDeparture, Booking.departure_id == PackageDeparture.id)
            .where(
                Booking.status.in_(["confirmed", "completed"]),
                PackageDeparture.departure_date < today_date,
            )
            .distinct()
        )
        customers_with_completed_trips = len(
            db.execute(completed_trips_stmt).scalars().all()
        )

        return CustomerAnalyticsResponse(
            total_customers=total_customers,
            new_customers=new_customers,
            returning_customers=returning_customers,
            customers_with_upcoming_trips=customers_with_upcoming_trips,
            customers_with_completed_trips=customers_with_completed_trips,
        )

    @staticmethod
    def get_package_performance(
        db: Session,
        sort_by: str = "revenue",
    ) -> PackagePerformanceResponse:
        """Derive performance metrics per travel experience package."""
        packages = (
            db.execute(
                select(Package)
                .join(Destination, Package.destination_id == Destination.id)
                .where(Package.deleted_at.is_(None))
            )
            .scalars()
            .all()
        )

        items: list[PackagePerformanceItem] = []
        for pkg in packages:
            # Query real bookings for this package
            b_stmt = select(Booking).where(Booking.package_id == pkg.id)
            bookings = db.execute(b_stmt).scalars().all()

            bookings_count = len(bookings)
            travellers_count = sum(b.number_of_travellers for b in bookings)
            gross_value = sum((b.total for b in bookings), Decimal("0.00"))

            confirmed_bookings = [
                b for b in bookings if b.status in ["confirmed", "completed"]
            ]
            confirmed_revenue = sum(
                (b.total for b in confirmed_bookings), Decimal("0.00")
            )
            cancellations_count = sum(1 for b in bookings if b.status == "cancelled")

            conversion = (
                round(len(confirmed_bookings) / bookings_count, 4)
                if bookings_count > 0
                else 0.0
            )

            dest_name = pkg.destination.name if pkg.destination else "Unassigned"

            items.append(
                PackagePerformanceItem(
                    package_id=pkg.id,
                    package_name=pkg.name,
                    destination_name=dest_name,
                    bookings_count=bookings_count,
                    travellers_count=travellers_count,
                    gross_booking_value=gross_value,
                    confirmed_revenue=confirmed_revenue,
                    cancellations_count=cancellations_count,
                    conversion_rate=conversion,
                )
            )

        if sort_by == "bookings":
            items.sort(key=lambda x: x.bookings_count, reverse=True)
        elif sort_by == "travellers":
            items.sort(key=lambda x: x.travellers_count, reverse=True)
        else:  # default revenue
            items.sort(key=lambda x: x.confirmed_revenue, reverse=True)

        return PackagePerformanceResponse(items=items)

    @staticmethod
    def get_destination_performance(db: Session) -> DestinationPerformanceResponse:
        """Derive performance metrics aggregated by destination."""
        destinations = (
            db.execute(select(Destination).where(Destination.deleted_at.is_(None)))
            .scalars()
            .all()
        )

        items: list[DestinationPerformanceItem] = []
        for dest in destinations:
            # Find packages under destination
            packages = (
                db.execute(
                    select(Package).where(
                        Package.destination_id == dest.id,
                        Package.deleted_at.is_(None),
                    )
                )
                .scalars()
                .all()
            )
            pkg_ids = [p.id for p in packages]

            if pkg_ids:
                bookings = (
                    db.execute(select(Booking).where(Booking.package_id.in_(pkg_ids)))
                    .scalars()
                    .all()
                )
                bookings_count = len(bookings)
                travellers_count = sum(b.number_of_travellers for b in bookings)
                confirmed_bookings = [
                    b for b in bookings if b.status in ["confirmed", "completed"]
                ]
                revenue = sum((b.total for b in confirmed_bookings), Decimal("0.00"))
            else:
                bookings_count = 0
                travellers_count = 0
                revenue = Decimal("0.00")

            items.append(
                DestinationPerformanceItem(
                    destination_id=dest.id,
                    destination_name=dest.name,
                    packages_count=len(packages),
                    bookings_count=bookings_count,
                    travellers_count=travellers_count,
                    revenue=revenue,
                )
            )

        items.sort(key=lambda x: x.revenue, reverse=True)
        return DestinationPerformanceResponse(items=items)
