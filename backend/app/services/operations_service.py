"""Administrative and operational business management service for KV Tours & Travels."""

from __future__ import annotations

import csv
import io
import urllib.parse
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ApiError
from app.models.catalog import Package, PackageDeparture
from app.models.commerce import (
    Booking,
    BookingCancellationRequest,
    Inquiry,
    Payment,
    SavedTraveller,
)
from app.models.content import AuditLog
from app.models.user import Role, User, UserRole
from app.schemas.admin import (
    RecentAuditItem,
    RecentBookingItem,
    RecentInquiryItem,
)
from app.schemas.admin_operations import (
    ContactCustomerEmailResponse,
    ContactCustomerWhatsAppResponse,
    CustomerCancellationHistoryItem,
    CustomerDetailResponse,
    CustomerInquiryHistoryItem,
    CustomerListItem,
    CustomerPaymentHistoryItem,
    DepartureManifestBooking,
    DepartureManifestResponse,
    DepartureManifestTraveller,
    DepartureOperationalItem,
    InquiryDetailResponse,
    InquiryListItem,
    OperationsDashboardMetricsResponse,
    PaymentReconciliationItem,
    PaymentReconciliationResponse,
)
from app.services.admin.audit_service import record_audit_log
from app.services.email_service import EmailService
from app.services.notes_service import NotesService
from app.services.whatsapp_service import _sanitize_phone

KOLKATA_TZ = ZoneInfo("Asia/Kolkata")


def _get_kolkata_now() -> datetime:
    return datetime.now(timezone.utc).astimezone(KOLKATA_TZ)


class OperationsService:
    """Core administrative operations service."""

    # ==========================================================================
    # 1. Operations Dashboard
    # ==========================================================================

    @staticmethod
    def get_dashboard_metrics(db: Session) -> OperationsDashboardMetricsResponse:
        """Derive genuine database-driven operational indicators."""
        now_k = _get_kolkata_now()
        today_date = now_k.date()

        start_today_utc = datetime.combine(
            today_date, time.min, tzinfo=KOLKATA_TZ
        ).astimezone(timezone.utc)
        end_today_utc = datetime.combine(
            today_date, time.max, tzinfo=KOLKATA_TZ
        ).astimezone(timezone.utc)

        # Today's bookings count
        today_bookings = db.execute(
            select(func.count(Booking.id)).where(
                Booking.created_at >= start_today_utc,
                Booking.created_at <= end_today_utc,
            )
        ).scalar_one()

        # Pending payments count
        pending_payments = db.execute(
            select(func.count(Booking.id)).where(
                Booking.payment_status.in_(["pending", "partially_paid"]),
                Booking.status != "cancelled",
            )
        ).scalar_one()

        # Confirmed bookings count
        confirmed_bookings = db.execute(
            select(func.count(Booking.id)).where(Booking.status == "confirmed")
        ).scalar_one()

        # Upcoming departures count
        upcoming_departures = db.execute(
            select(func.count(PackageDeparture.id)).where(
                PackageDeparture.departure_date >= today_date,
                PackageDeparture.status != "cancelled",
            )
        ).scalar_one()

        # Cancellation requests count (pending review)
        cancellation_requests = db.execute(
            select(func.count(BookingCancellationRequest.id)).where(
                BookingCancellationRequest.status == "pending"
            )
        ).scalar_one()

        # Pending inquiries count
        pending_inquiries = db.execute(
            select(func.count(Inquiry.id)).where(
                Inquiry.status.in_(["new", "contacted", "follow_up", "in_progress"])
            )
        ).scalar_one()

        # Total revenue (captured payments)
        revenue_stmt = select(
            func.coalesce(func.sum(Payment.amount), Decimal("0.00"))
        ).where(Payment.status == "captured")
        total_revenue = db.execute(revenue_stmt).scalar_one()

        # Outstanding payments (sum of total for payment_pending bookings)
        outstanding_stmt = select(
            func.coalesce(func.sum(Booking.total), Decimal("0.00"))
        ).where(
            Booking.payment_status.in_(["pending", "partially_paid"]),
            Booking.status != "cancelled",
        )
        outstanding_payments = db.execute(outstanding_stmt).scalar_one()

        # Recent bookings (5)
        recent_bookings_stmt = (
            select(Booking)
            .options(joinedload(Booking.user), joinedload(Booking.package))
            .order_by(desc(Booking.created_at))
            .limit(5)
        )
        booking_records = db.execute(recent_bookings_stmt).unique().scalars().all()
        recent_bookings = [
            RecentBookingItem(
                id=b.id,
                booking_reference=b.booking_reference,
                customer_name=(
                    f"{b.user.first_name} {b.user.last_name}"
                    if b.user
                    else "Guest Customer"
                ),
                customer_email=b.user.email if b.user else "N/A",
                package_name=b.package.name if b.package else "Custom Experience",
                total_amount=b.total,
                currency=b.currency,
                status=b.status,
                payment_status=b.payment_status,
                created_at=b.created_at,
            )
            for b in booking_records
        ]

        # Recent inquiries (5)
        recent_inq_stmt = select(Inquiry).order_by(desc(Inquiry.created_at)).limit(5)
        inquiry_records = db.execute(recent_inq_stmt).scalars().all()
        recent_inquiries = [
            RecentInquiryItem(
                id=inq.id,
                name=inq.name,
                email=inq.email,
                message_preview=(
                    inq.message[:100] + ("..." if len(inq.message) > 100 else "")
                ),
                status=inq.status,
                source=inq.source,
                created_at=inq.created_at,
            )
            for inq in inquiry_records
        ]

        # Recent audit logs (5)
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

        return OperationsDashboardMetricsResponse(
            today_bookings=today_bookings,
            pending_payments=pending_payments,
            confirmed_bookings=confirmed_bookings,
            upcoming_departures=upcoming_departures,
            cancellation_requests=cancellation_requests,
            pending_inquiries=pending_inquiries,
            total_revenue=total_revenue,
            outstanding_payments=outstanding_payments,
            recent_bookings=recent_bookings,
            recent_inquiries=recent_inquiries,
            recent_audit_activity=recent_audit_activity,
        )

    # ==========================================================================
    # 2. Departure Operations & Manifests
    # ==========================================================================

    @staticmethod
    def list_operational_departures(
        db: Session,
        package_id: UUID | None = None,
        status: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[DepartureOperationalItem]:
        """Fetch departure records enhanced with operational statuses and traveler counts."""
        now_date = _get_kolkata_now().date()
        stmt = (
            select(PackageDeparture)
            .options(
                joinedload(PackageDeparture.package).joinedload(Package.destination)
            )
            .order_by(PackageDeparture.departure_date.asc())
        )

        if package_id:
            stmt = stmt.where(PackageDeparture.package_id == package_id)
        if status and status != "all":
            stmt = stmt.where(PackageDeparture.status == status)
        if from_date:
            stmt = stmt.where(
                PackageDeparture.departure_date >= date.fromisoformat(from_date)
            )
        if to_date:
            stmt = stmt.where(
                PackageDeparture.departure_date <= date.fromisoformat(to_date)
            )

        departures = db.execute(stmt).unique().scalars().all()

        results: list[DepartureOperationalItem] = []
        for dep in departures:
            # Query confirmed & pending traveller counts
            b_stmt = select(Booking).where(Booking.departure_id == dep.id)
            dep_bookings = db.execute(b_stmt).scalars().all()

            confirmed_travellers = sum(
                b.number_of_travellers
                for b in dep_bookings
                if b.status in ["confirmed", "completed"]
            )
            pending_travellers = sum(
                b.number_of_travellers
                for b in dep_bookings
                if b.status in ["pending", "payment_pending"]
                or b.payment_status in ["pending", "partially_paid"]
            )

            # Determine operational status
            if dep.status == "cancelled":
                op_status = "cancelled"
            elif dep.departure_date < now_date:
                op_status = "departed"
            elif dep.available_capacity == 0 or dep.status == "sold_out":
                op_status = "sold_out"
            elif dep.available_capacity <= 3:
                op_status = "limited"
            elif dep.status == "draft":
                op_status = "scheduled"
            else:
                op_status = "open"

            pkg_name = dep.package.name if dep.package else "Custom Package"
            dest_name = (
                dep.package.destination.name
                if dep.package and dep.package.destination
                else "Unassigned"
            )

            results.append(
                DepartureOperationalItem(
                    id=dep.id,
                    package_id=dep.package_id,
                    package_name=pkg_name,
                    destination_name=dest_name,
                    departure_date=dep.departure_date.isoformat(),
                    return_date=(
                        dep.return_date.isoformat() if dep.return_date else None
                    ),
                    total_capacity=dep.total_capacity,
                    reserved_capacity=dep.reserved_capacity,
                    available_capacity=dep.available_capacity,
                    confirmed_travellers=confirmed_travellers,
                    pending_travellers=pending_travellers,
                    operational_status=op_status,
                    status=dep.status,
                    special_price=dep.special_price,
                    currency=dep.currency,
                )
            )

        return results

    @staticmethod
    def get_departure_manifest(
        db: Session,
        departure_id: UUID,
        is_manager_or_admin: bool = False,
    ) -> DepartureManifestResponse:
        """Generate departure manifest with privacy-restricted passport handling."""
        dep = (
            db.execute(
                select(PackageDeparture)
                .options(
                    joinedload(PackageDeparture.package).joinedload(Package.destination)
                )
                .where(PackageDeparture.id == departure_id)
            )
            .unique()
            .scalar_one_or_none()
        )
        if not dep:
            raise ApiError(status_code=404, message="Departure not found.")

        # Load bookings and travellers for this departure
        b_stmt = (
            select(Booking)
            .options(
                joinedload(Booking.user),
                joinedload(Booking.travellers),
            )
            .where(Booking.departure_id == departure_id)
            .order_by(Booking.created_at.asc())
        )
        bookings = db.execute(b_stmt).unique().scalars().all()

        manifest_bookings: list[DepartureManifestBooking] = []
        for b in bookings:
            lead_name = (
                f"{b.user.first_name} {b.user.last_name}".strip() if b.user else "Guest"
            )
            lead_phone = b.user.phone if b.user else None
            lead_email = b.user.email if b.user else None

            travellers_list: list[DepartureManifestTraveller] = []
            for t in b.travellers:
                # Mask passport unless specifically authorized manager/admin
                masked_passport = None
                if t.passport_number:
                    if is_manager_or_admin:
                        masked_passport = t.passport_number
                    else:
                        masked_passport = (
                            f"•••• {t.passport_number[-4:]}"
                            if len(t.passport_number) >= 4
                            else "••••"
                        )

                travellers_list.append(
                    DepartureManifestTraveller(
                        id=t.id,
                        first_name=t.first_name,
                        last_name=t.last_name,
                        date_of_birth=(
                            t.date_of_birth.isoformat() if t.date_of_birth else None
                        ),
                        gender=t.gender,
                        nationality=t.nationality,
                        passport_number_masked=masked_passport,
                        is_primary=t.is_primary,
                    )
                )

            manifest_bookings.append(
                DepartureManifestBooking(
                    booking_id=b.id,
                    booking_reference=b.booking_reference,
                    lead_traveller_name=lead_name,
                    lead_traveller_phone=lead_phone,
                    lead_traveller_email=lead_email,
                    traveller_count=b.number_of_travellers,
                    payment_status=b.payment_status,
                    customer_notes=b.customer_notes,
                    travellers=travellers_list,
                )
            )

        internal_notes = NotesService.list_notes(
            db=db, entity_type="departure", entity_id=dep.id
        )

        return DepartureManifestResponse(
            departure_id=dep.id,
            departure_date=dep.departure_date.isoformat(),
            return_date=dep.return_date.isoformat() if dep.return_date else None,
            package_name=dep.package.name if dep.package else "Custom Package",
            destination_name=(
                dep.package.destination.name
                if dep.package and dep.package.destination
                else "Unassigned"
            ),
            total_capacity=dep.total_capacity,
            reserved_capacity=dep.reserved_capacity,
            available_capacity=dep.available_capacity,
            status=dep.status,
            bookings=manifest_bookings,
            internal_notes=internal_notes,
        )

    # ==========================================================================
    # 3. Customer Management
    # ==========================================================================

    @staticmethod
    def list_customers(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> tuple[list[CustomerListItem], int]:
        """Query customers with total bookings, trip statuses, and paid totals."""
        now_date = _get_kolkata_now().date()
        customer_role_id = db.execute(
            select(Role.id).where(Role.name == "customer")
        ).scalar_one_or_none()

        query = select(User).where(User.is_deleted.is_(False))

        if customer_role_id:
            query = query.join(UserRole, UserRole.user_id == User.id).where(
                UserRole.role_id == customer_role_id
            )

        if search:
            s = f"%{search.strip().lower()}%"
            query = query.where(
                or_(
                    func.lower(User.first_name).like(s),
                    func.lower(User.last_name).like(s),
                    func.lower(User.email).like(s),
                    func.lower(User.phone).like(s),
                )
            )

        count_query = select(func.count()).select_from(query.order_by(None).subquery())
        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        users = (
            db.execute(
                query.order_by(desc(User.created_at)).offset(offset).limit(page_size)
            )
            .scalars()
            .all()
        )

        items: list[CustomerListItem] = []
        for u in users:
            # Query bookings for this user
            b_stmt = (
                select(Booking)
                .options(joinedload(Booking.departure))
                .where(Booking.user_id == u.id)
            )
            user_bookings = db.execute(b_stmt).scalars().all()

            booking_count = len(user_bookings)
            upcoming = 0
            completed = 0
            for b in user_bookings:
                if b.status in ["confirmed", "completed"] and b.departure:
                    if b.departure.departure_date >= now_date:
                        upcoming += 1
                    else:
                        completed += 1

            # Total paid value from captured payments
            paid_stmt = (
                select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
                .join(Booking, Payment.booking_id == Booking.id)
                .where(Booking.user_id == u.id, Payment.status == "captured")
            )
            total_paid = db.execute(paid_stmt).scalar_one()

            items.append(
                CustomerListItem(
                    id=u.id,
                    first_name=u.first_name,
                    last_name=u.last_name,
                    email=u.email,
                    phone=u.phone,
                    status=u.status,
                    created_at=u.created_at,
                    booking_count=booking_count,
                    upcoming_trips_count=upcoming,
                    completed_trips_count=completed,
                    total_paid_value=total_paid,
                )
            )

        return items, total

    @staticmethod
    def get_customer_detail(
        db: Session,
        customer_id: UUID,
    ) -> CustomerDetailResponse:
        """Fetch comprehensive customer profile and operations history."""
        user = db.get(User, customer_id)
        if not user or user.is_deleted:
            raise ApiError(status_code=404, message="Customer not found.")

        # Bookings history
        b_stmt = (
            select(Booking)
            .options(joinedload(Booking.package), joinedload(Booking.user))
            .where(Booking.user_id == customer_id)
            .order_by(desc(Booking.created_at))
        )
        bookings = db.execute(b_stmt).unique().scalars().all()
        booking_items = [
            RecentBookingItem(
                id=b.id,
                booking_reference=b.booking_reference,
                customer_name=f"{user.first_name} {user.last_name}",
                customer_email=user.email,
                package_name=b.package.name if b.package else "Custom Experience",
                total_amount=b.total,
                currency=b.currency,
                status=b.status,
                payment_status=b.payment_status,
                created_at=b.created_at,
            )
            for b in bookings
        ]

        # Payments history
        p_stmt = (
            select(Payment)
            .join(Booking, Payment.booking_id == Booking.id)
            .where(Booking.user_id == customer_id)
            .order_by(desc(Payment.created_at))
        )
        payments = db.execute(p_stmt).scalars().all()
        payment_items = [
            CustomerPaymentHistoryItem(
                id=p.id,
                booking_id=p.booking_id,
                booking_reference=p.booking.booking_reference if p.booking else "N/A",
                provider=p.provider,
                provider_payment_id=p.provider_payment_id,
                amount=p.amount,
                currency=p.currency,
                status=p.status,
                captured_at=p.captured_at,
                created_at=p.created_at,
            )
            for p in payments
        ]

        # Cancellations history
        c_stmt = (
            select(BookingCancellationRequest)
            .options(joinedload(BookingCancellationRequest.booking))
            .where(BookingCancellationRequest.user_id == customer_id)
            .order_by(desc(BookingCancellationRequest.created_at))
        )
        cancellations = db.execute(c_stmt).unique().scalars().all()
        cancellation_items = [
            CustomerCancellationHistoryItem(
                id=c.id,
                booking_id=c.booking_id,
                booking_reference=c.booking.booking_reference if c.booking else "N/A",
                reason=c.reason,
                status=c.status,
                resolved_at=c.resolved_at,
                created_at=c.created_at,
            )
            for c in cancellations
        ]

        # Inquiries
        inq_stmt = (
            select(Inquiry)
            .where(Inquiry.user_id == customer_id)
            .order_by(desc(Inquiry.created_at))
        )
        inquiries = db.execute(inq_stmt).scalars().all()
        inquiry_items = [
            CustomerInquiryHistoryItem(
                id=inq.id,
                message=inq.message,
                status=inq.status,
                created_at=inq.created_at,
            )
            for inq in inquiries
        ]

        # Saved travellers count
        saved_count = db.execute(
            select(func.count(SavedTraveller.id)).where(
                SavedTraveller.user_id == customer_id
            )
        ).scalar_one()

        # Internal notes
        internal_notes = NotesService.list_notes(
            db=db, entity_type="customer", entity_id=customer_id
        )

        return CustomerDetailResponse(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            phone=user.phone,
            status=user.status,
            created_at=user.created_at,
            saved_traveller_count=saved_count,
            bookings=booking_items,
            payments=payment_items,
            cancellations=cancellation_items,
            inquiries=inquiry_items,
            internal_notes=internal_notes,
        )

    # ==========================================================================
    # 4. Inquiry / Lead Management
    # ==========================================================================

    @staticmethod
    def list_inquiries(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
        priority: str | None = None,
        destination_id: UUID | None = None,
        package_id: UUID | None = None,
        search: str | None = None,
    ) -> tuple[list[InquiryListItem], int]:
        """Query inquiries with operational filtering, staff assignments, and pagination."""
        query = select(Inquiry).options(
            joinedload(Inquiry.destination),
            joinedload(Inquiry.package),
            joinedload(Inquiry.assigned_to),
        )

        if status and status != "all":
            query = query.where(Inquiry.status == status)
        if priority and priority != "all":
            query = query.where(Inquiry.priority == priority)
        if destination_id:
            query = query.where(Inquiry.destination_id == destination_id)
        if package_id:
            query = query.where(Inquiry.package_id == package_id)
        if search:
            s = f"%{search.strip().lower()}%"
            query = query.where(
                or_(
                    func.lower(Inquiry.name).like(s),
                    func.lower(Inquiry.email).like(s),
                    func.lower(Inquiry.phone).like(s),
                    func.lower(Inquiry.message).like(s),
                )
            )

        count_query = select(func.count()).select_from(query.order_by(None).subquery())
        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        inquiries = (
            db.execute(
                query.order_by(desc(Inquiry.created_at)).offset(offset).limit(page_size)
            )
            .unique()
            .scalars()
            .all()
        )

        items = [
            InquiryListItem(
                id=inq.id,
                name=inq.name,
                email=inq.email,
                phone=inq.phone,
                destination_name=(
                    inq.destination.name if inq.destination else "General"
                ),
                package_name=inq.package.name if inq.package else "Custom Trip",
                message=inq.message,
                status=inq.status,
                priority=inq.priority,
                source=inq.source,
                assigned_to_name=(
                    f"{inq.assigned_to.first_name} {inq.assigned_to.last_name}".strip()
                    if inq.assigned_to
                    else None
                ),
                assigned_to_user_id=inq.assigned_to_user_id,
                created_at=inq.created_at,
                updated_at=inq.updated_at,
            )
            for inq in inquiries
        ]

        return items, total

    @staticmethod
    def get_inquiry_detail(db: Session, inquiry_id: UUID) -> InquiryDetailResponse:
        """Retrieve full inquiry details with staff internal notes."""
        inq = (
            db.execute(
                select(Inquiry)
                .options(
                    joinedload(Inquiry.destination),
                    joinedload(Inquiry.package),
                    joinedload(Inquiry.assigned_to),
                )
                .where(Inquiry.id == inquiry_id)
            )
            .unique()
            .scalar_one_or_none()
        )
        if not inq:
            raise ApiError(status_code=404, message="Inquiry not found.")

        internal_notes = NotesService.list_notes(
            db=db, entity_type="inquiry", entity_id=inq.id
        )

        return InquiryDetailResponse(
            id=inq.id,
            name=inq.name,
            email=inq.email,
            phone=inq.phone,
            destination_name=inq.destination.name if inq.destination else "General",
            destination_id=inq.destination_id,
            package_name=inq.package.name if inq.package else "Custom Trip",
            package_id=inq.package_id,
            message=inq.message,
            status=inq.status,
            priority=inq.priority,
            source=inq.source,
            assigned_to_name=(
                f"{inq.assigned_to.first_name} {inq.assigned_to.last_name}".strip()
                if inq.assigned_to
                else None
            ),
            assigned_to_user_id=inq.assigned_to_user_id,
            created_at=inq.created_at,
            updated_at=inq.updated_at,
            internal_notes=internal_notes,
        )

    @staticmethod
    def update_inquiry(
        db: Session,
        inquiry_id: UUID,
        admin_user_id: UUID,
        status: str | None = None,
        priority: str | None = None,
        assigned_to_user_id: UUID | None = None,
        ip_address: str | None = None,
    ) -> InquiryDetailResponse:
        """Update inquiry operational state, assignment, or priority with audit logging."""
        inq = db.get(Inquiry, inquiry_id)
        if not inq:
            raise ApiError(status_code=404, message="Inquiry not found.")

        changes: dict[str, Any] = {}
        if status and inq.status != status:
            changes["previous_status"] = inq.status
            changes["new_status"] = status
            inq.status = status

        if priority and inq.priority != priority:
            changes["previous_priority"] = inq.priority
            changes["new_priority"] = priority
            inq.priority = priority

        if assigned_to_user_id is not None:
            changes["previous_assignee"] = str(inq.assigned_to_user_id)
            changes["new_assignee"] = str(assigned_to_user_id)
            inq.assigned_to_user_id = assigned_to_user_id

        db.flush()

        record_audit_log(
            db=db,
            action="update_inquiry",
            entity_type="inquiry",
            entity_id=str(inquiry_id),
            actor_user_id=admin_user_id,
            ip_address=ip_address,
            metadata=changes,
        )

        return OperationsService.get_inquiry_detail(db=db, inquiry_id=inquiry_id)

    # ==========================================================================
    # 5. Payment Reconciliation
    # ==========================================================================

    @staticmethod
    def get_payment_reconciliation(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
        mismatch_type: str | None = None,
        search: str | None = None,
    ) -> PaymentReconciliationResponse:
        """Run authoritative reconciliation between payments, bookings, and refunds."""
        query = (
            select(Payment)
            .options(
                joinedload(Payment.booking).joinedload(Booking.user),
                joinedload(Payment.refunds),
            )
            .order_by(desc(Payment.created_at))
        )

        if status and status != "all":
            query = query.where(Payment.status == status)

        if search:
            s = f"%{search.strip().lower()}%"
            query = query.join(Booking, Payment.booking_id == Booking.id).where(
                or_(
                    func.lower(Booking.booking_reference).like(s),
                    func.lower(Payment.provider_order_id).like(s),
                    func.lower(Payment.provider_payment_id).like(s),
                )
            )

        all_payments = db.execute(query).unique().scalars().all()

        mismatch_summary: dict[str, int] = {
            "booking_confirmed_payment_missing": 0,
            "payment_captured_booking_unconfirmed": 0,
            "refund_mismatch": 0,
            "webhook_mismatch": 0,
        }

        reconciled_items: list[PaymentReconciliationItem] = []
        for p in all_payments:
            b = p.booking
            mismatches: list[str] = []

            # 1. Payment captured but booking not confirmed
            if (
                p.status == "captured"
                and b
                and b.status not in ["confirmed", "completed"]
            ):
                mismatches.append("payment_captured_booking_unconfirmed")

            # 2. Booking confirmed but payment not captured
            if b and b.status in ["confirmed", "completed"] and p.status != "captured":
                mismatches.append("booking_confirmed_payment_missing")

            # 3. Webhook mismatch (e.g. captured without provider_payment_id)
            if p.status == "captured" and not p.provider_payment_id:
                mismatches.append("webhook_mismatch")

            # 4. Refund mismatch (sum of processed refunds > payment amount)
            processed_refunds = sum(
                (r.amount for r in p.refunds if r.status == "processed"),
                Decimal("0.00"),
            )
            if processed_refunds > p.amount:
                mismatches.append("refund_mismatch")

            # Update summary counts
            for m in mismatches:
                mismatch_summary[m] = mismatch_summary.get(m, 0) + 1

            # Filter if mismatch_type requested
            if (
                mismatch_type
                and mismatch_type != "all"
                and mismatch_type not in mismatches
            ):
                continue

            cust_name = (
                f"{b.user.first_name} {b.user.last_name}" if b and b.user else "Guest"
            )
            cust_email = b.user.email if b and b.user else "N/A"
            b_ref = b.booking_reference if b else "N/A"
            b_status = b.status if b else "N/A"
            b_pay_status = b.payment_status if b else "N/A"

            reconciled_items.append(
                PaymentReconciliationItem(
                    payment_id=p.id,
                    booking_id=p.booking_id,
                    booking_reference=b_ref,
                    customer_name=cust_name,
                    customer_email=cust_email,
                    provider=p.provider,
                    provider_order_id=p.provider_order_id,
                    provider_payment_id=p.provider_payment_id,
                    amount=p.amount,
                    currency=p.currency,
                    payment_status=p.status,
                    booking_status=b_status,
                    booking_payment_status=b_pay_status,
                    created_at=p.created_at,
                    captured_at=p.captured_at,
                    mismatch_types=mismatches,
                )
            )

        total = len(reconciled_items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start_idx = (page - 1) * page_size
        paginated_items = reconciled_items[start_idx : start_idx + page_size]

        return PaymentReconciliationResponse(
            items=paginated_items,
            mismatch_summary=mismatch_summary,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    # ==========================================================================
    # 6. Report Exports (CSV)
    # ==========================================================================

    @staticmethod
    def export_csv_bookings(db: Session) -> io.StringIO:
        """Generate safe operational CSV report for bookings."""
        stmt = (
            select(Booking)
            .options(
                joinedload(Booking.user),
                joinedload(Booking.package),
                joinedload(Booking.departure),
            )
            .order_by(desc(Booking.created_at))
        )
        bookings = db.execute(stmt).unique().scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Booking Reference",
                "Customer Name",
                "Customer Email",
                "Customer Phone",
                "Package Name",
                "Departure Date",
                "Travellers",
                "Subtotal",
                "Discount",
                "Tax",
                "Total",
                "Currency",
                "Booking Status",
                "Payment Status",
                "Created At (UTC)",
            ]
        )

        for b in bookings:
            cust_name = f"{b.user.first_name} {b.user.last_name}" if b.user else "Guest"
            cust_email = b.user.email if b.user else "N/A"
            cust_phone = b.user.phone if b.user else "N/A"
            pkg_name = b.package.name if b.package else "Custom Package"
            dep_date = b.departure.departure_date.isoformat() if b.departure else "N/A"

            writer.writerow(
                [
                    b.booking_reference,
                    cust_name,
                    cust_email,
                    cust_phone,
                    pkg_name,
                    dep_date,
                    b.number_of_travellers,
                    str(b.subtotal),
                    str(b.discount),
                    str(b.tax),
                    str(b.total),
                    b.currency,
                    b.status,
                    b.payment_status,
                    b.created_at.isoformat(),
                ]
            )

        output.seek(0)
        return output

    @staticmethod
    def export_csv_customers(db: Session) -> io.StringIO:
        """Generate safe operational CSV report for customers (strictly no secrets/hashes)."""
        stmt = (
            select(User)
            .where(User.is_deleted.is_(False))
            .order_by(desc(User.created_at))
        )
        users = db.execute(stmt).scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Customer ID",
                "First Name",
                "Last Name",
                "Email",
                "Phone",
                "Status",
                "Registered At (UTC)",
            ]
        )

        for u in users:
            writer.writerow(
                [
                    str(u.id),
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone or "N/A",
                    u.status,
                    u.created_at.isoformat(),
                ]
            )

        output.seek(0)
        return output

    @staticmethod
    def export_csv_payments(db: Session) -> io.StringIO:
        """Generate safe financial CSV report for payments."""
        stmt = (
            select(Payment)
            .options(joinedload(Payment.booking))
            .order_by(desc(Payment.created_at))
        )
        payments = db.execute(stmt).unique().scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Payment ID",
                "Booking Reference",
                "Provider",
                "Provider Order ID",
                "Provider Payment ID",
                "Amount",
                "Currency",
                "Status",
                "Payment Method",
                "Captured At (UTC)",
                "Created At (UTC)",
            ]
        )

        for p in payments:
            b_ref = p.booking.booking_reference if p.booking else "N/A"
            writer.writerow(
                [
                    str(p.id),
                    b_ref,
                    p.provider,
                    p.provider_order_id or "N/A",
                    p.provider_payment_id or "N/A",
                    str(p.amount),
                    p.currency,
                    p.status,
                    p.payment_method or "N/A",
                    p.captured_at.isoformat() if p.captured_at else "N/A",
                    p.created_at.isoformat(),
                ]
            )

        output.seek(0)
        return output

    @staticmethod
    def export_csv_departures(db: Session) -> io.StringIO:
        """Generate operational CSV report for scheduled group departures."""
        stmt = (
            select(PackageDeparture)
            .options(
                joinedload(PackageDeparture.package).joinedload(Package.destination)
            )
            .order_by(PackageDeparture.departure_date.asc())
        )
        departures = db.execute(stmt).unique().scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Departure ID",
                "Package Name",
                "Destination",
                "Departure Date",
                "Return Date",
                "Total Capacity",
                "Reserved Capacity",
                "Available Capacity",
                "Special Price",
                "Currency",
                "Status",
            ]
        )

        for dep in departures:
            pkg_name = dep.package.name if dep.package else "Custom"
            dest_name = (
                dep.package.destination.name
                if dep.package and dep.package.destination
                else "Unassigned"
            )
            writer.writerow(
                [
                    str(dep.id),
                    pkg_name,
                    dest_name,
                    dep.departure_date.isoformat(),
                    dep.return_date.isoformat() if dep.return_date else "N/A",
                    dep.total_capacity,
                    dep.reserved_capacity,
                    dep.available_capacity,
                    str(dep.special_price) if dep.special_price else "Standard",
                    dep.currency,
                    dep.status,
                ]
            )

        output.seek(0)
        return output

    @staticmethod
    def export_csv_inquiries(db: Session) -> io.StringIO:
        """Generate operational CSV report for customer inquiries."""
        stmt = (
            select(Inquiry)
            .options(joinedload(Inquiry.destination), joinedload(Inquiry.package))
            .order_by(desc(Inquiry.created_at))
        )
        inquiries = db.execute(stmt).unique().scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Inquiry ID",
                "Customer Name",
                "Email",
                "Phone",
                "Destination",
                "Package",
                "Priority",
                "Status",
                "Source",
                "Message Preview",
                "Created At (UTC)",
            ]
        )

        for inq in inquiries:
            dest_name = inq.destination.name if inq.destination else "General"
            pkg_name = inq.package.name if inq.package else "Custom Trip"
            msg_snippet = inq.message.replace("\n", " ")[:150]
            writer.writerow(
                [
                    str(inq.id),
                    inq.name,
                    inq.email,
                    inq.phone or "N/A",
                    dest_name,
                    pkg_name,
                    inq.priority,
                    inq.status,
                    inq.source,
                    msg_snippet,
                    inq.created_at.isoformat(),
                ]
            )

        output.seek(0)
        return output

    @staticmethod
    def export_csv_manifest(
        db: Session,
        departure_id: UUID,
        is_manager_or_admin: bool = False,
    ) -> io.StringIO:
        """Generate operational CSV passenger manifest for a departure."""
        manifest = OperationsService.get_departure_manifest(
            db=db, departure_id=departure_id, is_manager_or_admin=is_manager_or_admin
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Departure ID",
                "Package Name",
                "Destination",
                "Departure Date",
                "Booking Reference",
                "Lead Passenger Name",
                "Lead Passenger Phone",
                "Lead Passenger Email",
                "Traveller Name",
                "Date of Birth",
                "Gender",
                "Nationality",
                "Passport (Masked)",
                "Is Primary",
                "Payment Status",
                "Customer Notes",
            ]
        )

        for b in manifest.bookings:
            for t in b.travellers:
                writer.writerow(
                    [
                        str(manifest.departure_id),
                        manifest.package_name,
                        manifest.destination_name,
                        manifest.departure_date,
                        b.booking_reference,
                        b.lead_traveller_name,
                        b.lead_traveller_phone or "N/A",
                        b.lead_traveller_email or "N/A",
                        f"{t.first_name} {t.last_name}",
                        t.date_of_birth or "N/A",
                        t.gender or "N/A",
                        t.nationality or "N/A",
                        t.passport_number_masked or "N/A",
                        "Yes" if t.is_primary else "No",
                        b.payment_status,
                        (b.customer_notes or "").replace("\n", " "),
                    ]
                )

        output.seek(0)
        return output

    @staticmethod
    def export_csv_revenue(
        db: Session,
        period: str = "30d",
        custom_start: str | None = None,
        custom_end: str | None = None,
    ) -> io.StringIO:
        """Generate safe financial CSV report for revenue analytics time series."""
        from app.services.analytics_service import AnalyticsService

        rev = AnalyticsService.get_revenue_analytics(
            db=db,
            period=period,
            custom_start=custom_start,
            custom_end=custom_end,
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Date",
                "Paid Revenue",
                "Refunded Amount",
                "Net Revenue",
                "Bookings Count",
            ]
        )

        for item in rev.time_series:
            writer.writerow(
                [
                    item.date,
                    str(item.paid_revenue),
                    str(item.refunded_amount),
                    str(item.net_revenue),
                    item.bookings_count,
                ]
            )

        output.seek(0)
        return output

    # ==========================================================================
    # 7. Customer Communication (Email & WhatsApp)
    # ==========================================================================

    @staticmethod
    def contact_customer_email(
        db: Session,
        admin_user_id: UUID,
        subject: str,
        body: str,
        booking_id: UUID | None = None,
        inquiry_id: UUID | None = None,
        ip_address: str | None = None,
    ) -> ContactCustomerEmailResponse:
        """Send a contextual staff email message to a customer."""
        from app.services.email_service import _render_base_email

        recipient_email: str | None = None
        recipient_name: str | None = None
        recipient_user_id: UUID | None = None

        if booking_id:
            booking = (
                db.execute(
                    select(Booking)
                    .options(joinedload(Booking.user))
                    .where(Booking.id == booking_id)
                )
                .unique()
                .scalar_one_or_none()
            )
            if not booking:
                raise ApiError(status_code=404, message="Booking not found.")
            if booking.user:
                recipient_email = booking.user.email
                recipient_name = f"{booking.user.first_name} {booking.user.last_name}"
                recipient_user_id = booking.user.id
        elif inquiry_id:
            inquiry = db.get(Inquiry, inquiry_id)
            if not inquiry:
                raise ApiError(status_code=404, message="Inquiry not found.")
            recipient_email = inquiry.email
            recipient_name = inquiry.name
            recipient_user_id = inquiry.user_id

        if not recipient_email:
            raise ApiError(
                status_code=400,
                message="Recipient email could not be resolved from provided booking or inquiry.",
            )

        # Dispatch via configured EmailService
        email_service = EmailService()
        html_body = _render_base_email(
            title=subject,
            content_html=(
                f"<div style='font-size: 15px; line-height: 1.6; color: #333333;'>"
                f"<p>Dear {recipient_name or 'Valued Customer'},</p>"
                f"<p>{body.replace(chr(10), '<br>')}</p>"
                f"<p>Warm regards,<br>KV Tours & Travels Operations Team</p></div>"
            ),
        )
        email_service.dispatch(
            db=db,
            to_email=recipient_email,
            subject=subject,
            html_body=html_body,
            notification_type="staff_operational_message",
            booking_id=booking_id,
            recipient_user_id=recipient_user_id,
        )

        record_audit_log(
            db=db,
            action="contact_customer_email",
            entity_type="customer_communication",
            entity_id=str(booking_id or inquiry_id),
            actor_user_id=admin_user_id,
            ip_address=ip_address,
            metadata={"recipient": recipient_email, "subject": subject},
        )

        return ContactCustomerEmailResponse(
            status="sent",
            message="Operational email dispatched successfully.",
            recipient=recipient_email,
        )

    @staticmethod
    def get_whatsapp_contact_url(
        db: Session,
        admin_user_id: UUID,
        booking_id: UUID | None = None,
        inquiry_id: UUID | None = None,
    ) -> ContactCustomerWhatsAppResponse:
        """Build contextual Click-to-Chat WhatsApp URL for staff to contact customer."""
        target_phone: str | None = None
        target_name: str | None = None
        ref_text = ""

        if booking_id:
            booking = (
                db.execute(
                    select(Booking)
                    .options(joinedload(Booking.user), joinedload(Booking.package))
                    .where(Booking.id == booking_id)
                )
                .unique()
                .scalar_one_or_none()
            )
            if not booking:
                raise ApiError(status_code=404, message="Booking not found.")
            target_phone = booking.user.phone if booking.user else None
            target_name = (
                f"{booking.user.first_name} {booking.user.last_name}"
                if booking.user
                else "Valued Traveller"
            )
            ref_text = f"regarding your booking {booking.booking_reference} for {booking.package.name if booking.package else 'your travel experience'}"
        elif inquiry_id:
            inquiry = db.get(Inquiry, inquiry_id)
            if not inquiry:
                raise ApiError(status_code=404, message="Inquiry not found.")
            target_phone = inquiry.phone
            target_name = inquiry.name
            ref_text = "regarding your recent travel inquiry with KV Tours & Travels"

        if not target_phone:
            raise ApiError(
                status_code=400,
                message="Customer phone number is not available for this record.",
            )

        clean_phone = _sanitize_phone(target_phone)
        message = f"Hi {target_name}, this is KV Tours & Travels {ref_text}. How can we assist you today?"
        encoded_msg = urllib.parse.quote(message)
        click_to_chat_url = f"https://wa.me/{clean_phone}?text={encoded_msg}"

        return ContactCustomerWhatsAppResponse(
            click_to_chat_url=click_to_chat_url,
            recipient_phone=target_phone,
            message=message,
        )
