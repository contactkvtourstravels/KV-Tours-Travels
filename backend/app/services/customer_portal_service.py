"""Customer portal service: dashboard aggregation, traveller profiles, cancellations, receipts, vouchers."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.config import get_settings
from app.models.catalog import Package, PackageDeparture
from app.models.commerce import (
    Booking,
    BookingCancellationRequest,
    SavedTraveller,
)
from app.models.user import User
from app.schemas.booking import BookingSummaryResponse
from app.schemas.customer import (
    CustomerDashboardSummary,
    CustomerProfileResponse,
    CustomerProfileUpdate,
    PaymentReceiptData,
    SavedTravellerCreate,
    SavedTravellerResponse,
    SavedTravellerUpdate,
    TravelVoucherData,
    WhatsAppConciergeAction,
)
from app.services.catalog_service import get_public_settings
from app.services.email_service import get_email_service
from app.services.whatsapp_service import get_whatsapp_service

logger = logging.getLogger(__name__)


def _booking_to_summary(booking: Booking) -> BookingSummaryResponse:
    """Format SQLAlchemy Booking to BookingSummaryResponse."""
    return BookingSummaryResponse(
        id=booking.id,
        booking_reference=booking.booking_reference,
        package_id=booking.package_id,
        package_title=booking.package.title,
        package_slug=booking.package.slug,
        destination_name=booking.package.destination.name
        if booking.package.destination
        else "Destinations",
        departure_id=booking.departure_id,
        departure_date=booking.departure.departure_date,
        return_date=booking.departure.return_date,
        status=booking.status,
        payment_status=booking.payment_status,
        number_of_travellers=booking.number_of_travellers,
        total=booking.total,
        currency=booking.currency,
        created_at=booking.created_at,
        hold_expires_at=booking.hold_expires_at,
    )


class CustomerPortalService:
    """Operations supporting the customer dashboard, profile, and travel documents."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.email_service = get_email_service()
        self.whatsapp_service = get_whatsapp_service()

    def get_dashboard_summary(
        self, db: Session, user: User
    ) -> CustomerDashboardSummary:
        """Aggregate customer dashboard metrics, upcoming trips, and recent bookings."""
        today = datetime.now(timezone.utc).date()

        # Query all bookings for user with package, destination, departure loaded

        stmt = (
            select(Booking)
            .where(Booking.user_id == user.id)
            .options(
                joinedload(Booking.package).joinedload(Package.destination),
                joinedload(Booking.departure),
            )
            .order_by(Booking.created_at.desc())
        )
        all_user_bookings = db.execute(stmt).scalars().all()

        total_bookings = len(all_user_bookings)
        active_count = 0
        completed_count = 0
        upcoming_trips: list[BookingSummaryResponse] = []
        recent_bookings: list[BookingSummaryResponse] = []

        for b in all_user_bookings:
            if b.status in ("confirmed", "pending", "payment_pending"):
                active_count += 1
            elif b.status == "completed":
                completed_count += 1

            # Upcoming trips: confirmed with departure date in the future or today
            if b.status == "confirmed" and b.departure.departure_date >= today:
                upcoming_trips.append(_booking_to_summary(b))

            if len(recent_bookings) < 5:
                recent_bookings.append(_booking_to_summary(b))

        # Sort upcoming trips by departure date ascending
        upcoming_trips.sort(key=lambda item: item.departure_date)

        # Count saved travellers
        saved_travellers_count = (
            db.execute(
                select(func.count(SavedTraveller.id)).where(
                    SavedTraveller.user_id == user.id
                )
            ).scalar()
            or 0
        )

        # Build WhatsApp concierge prefilled info
        wa_url = self.whatsapp_service.build_general_support_url(db)
        wa_phone = self.whatsapp_service.get_configured_phone(db)
        pub = get_public_settings(db)
        agency_display = pub.public_display_name or pub.agency_name or "our concierge"
        concierge_message = pub.whatsapp_prefilled_message or f"Hi {agency_display}, I would like to inquire about your curated travel experiences."

        return CustomerDashboardSummary(
            user_name=f"{user.first_name} {user.last_name}",
            user_email=user.email,
            total_bookings=total_bookings,
            active_bookings_count=active_count,
            completed_trips_count=completed_count,
            upcoming_trips=upcoming_trips,
            recent_bookings=recent_bookings,
            saved_travellers_count=saved_travellers_count,
            whatsapp_concierge=WhatsAppConciergeAction(
                action_type="concierge_help",
                label="Direct Concierge Support",
                prefilled_message=concierge_message,
                click_to_chat_url=wa_url,
                display_phone=wa_phone,
            ),
        )

    # -------------------------------------------------------------
    # Customer Profile
    # -------------------------------------------------------------

    def get_profile(self, user: User, db: Session | None = None) -> CustomerProfileResponse:
        res = CustomerProfileResponse.model_validate(user)
        if db is not None:
            pub = get_public_settings(db)
            agency_name = pub.public_display_name or pub.agency_name or "our concierge"
            res.email_immutability_notice = (
                f"Email address is locked to protect customer security. "
                f"To request an email change, please contact {agency_name} concierge support."
            )
        return res

    def update_profile(
        self, db: Session, user: User, payload: CustomerProfileUpdate
    ) -> CustomerProfileResponse:
        """Update allowed self-service customer profile fields. Email is deliberately immutable."""
        if payload.first_name is not None:
            user.first_name = payload.first_name.strip()
        if payload.last_name is not None:
            user.last_name = payload.last_name.strip()
        if payload.phone is not None:
            user.phone = payload.phone.strip()

        db.flush()
        db.refresh(user)
        return self.get_profile(user=user, db=db)

    # -------------------------------------------------------------
    # Saved Travellers Management
    # -------------------------------------------------------------

    def list_saved_travellers(
        self, db: Session, user_id: UUID
    ) -> list[SavedTravellerResponse]:
        stmt = (
            select(SavedTraveller)
            .where(SavedTraveller.user_id == user_id)
            .order_by(SavedTraveller.is_primary.desc(), SavedTraveller.created_at.asc())
        )
        travellers = db.execute(stmt).scalars().all()
        return [SavedTravellerResponse.model_validate(t) for t in travellers]

    def create_saved_traveller(
        self, db: Session, user_id: UUID, payload: SavedTravellerCreate
    ) -> SavedTravellerResponse:
        # If is_primary set to True, unmark previous primary travellers for this user
        if payload.is_primary:
            db.query(SavedTraveller).filter(SavedTraveller.user_id == user_id).update(
                {"is_primary": False}
            )

        traveller = SavedTraveller(
            user_id=user_id,
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            date_of_birth=payload.date_of_birth,
            gender=payload.gender,
            nationality=payload.nationality,
            contact_email=payload.contact_email.strip().lower()
            if payload.contact_email
            else None,
            contact_phone=payload.contact_phone.strip()
            if payload.contact_phone
            else None,
            relationship_label=payload.relationship_label.strip()
            if payload.relationship_label
            else "Companion",
            is_primary=payload.is_primary,
            passport_number=payload.passport_number.strip().upper()
            if payload.passport_number
            else None,
            passport_expiry=payload.passport_expiry,
            passport_issuing_country=payload.passport_issuing_country.strip().upper()
            if payload.passport_issuing_country
            else None,
        )
        db.add(traveller)
        db.flush()
        db.refresh(traveller)
        return SavedTravellerResponse.model_validate(traveller)

    def update_saved_traveller(
        self,
        db: Session,
        user_id: UUID,
        traveller_id: UUID,
        payload: SavedTravellerUpdate,
    ) -> SavedTravellerResponse:
        traveller = db.execute(
            select(SavedTraveller).where(
                SavedTraveller.id == traveller_id,
                SavedTraveller.user_id == user_id,
            )
        ).scalar_one_or_none()

        if not traveller:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved traveller profile not found.",
            )

        if payload.is_primary:
            db.query(SavedTraveller).filter(
                SavedTraveller.user_id == user_id,
                SavedTraveller.id != traveller_id,
            ).update({"is_primary": False})

        update_dict = payload.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            if val is not None and isinstance(val, str):
                val = val.strip()
            setattr(traveller, key, val)

        db.flush()
        db.refresh(traveller)
        return SavedTravellerResponse.model_validate(traveller)

    def delete_saved_traveller(
        self, db: Session, user_id: UUID, traveller_id: UUID
    ) -> None:
        traveller = db.execute(
            select(SavedTraveller).where(
                SavedTraveller.id == traveller_id,
                SavedTraveller.user_id == user_id,
            )
        ).scalar_one_or_none()

        if not traveller:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved traveller profile not found.",
            )

        db.delete(traveller)
        db.flush()

    # -------------------------------------------------------------
    # Cancellation Request
    # -------------------------------------------------------------

    def submit_cancellation_request(
        self, db: Session, user: User, booking_id: UUID, reason: str
    ) -> BookingCancellationRequest:
        """Customer submits cancellation request. Never issues automatic instant refunds."""
        booking = db.execute(
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                joinedload(Booking.package),
                joinedload(Booking.cancellation_request),
            )
        ).scalar_one_or_none()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found.",
            )

        # IDOR check: must belong to authenticated customer
        if booking.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to cancel this booking.",
            )

        if booking.status in ("cancelled", "completed"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot request cancellation for a booking with status '{booking.status}'.",
            )

        existing_req = db.execute(
            select(BookingCancellationRequest).where(
                BookingCancellationRequest.booking_id == booking.id
            )
        ).scalar_one_or_none()

        if existing_req is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A cancellation request has already been submitted for this booking (Status: {existing_req.status}).",
            )

        clean_reason = reason.strip()
        if len(clean_reason) < 5:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Please provide a valid cancellation reason with at least 5 characters.",
            )

        cancel_req = BookingCancellationRequest(
            booking_id=booking.id,
            user_id=user.id,
            reason=clean_reason,
            status="pending",
        )
        db.add(cancel_req)
        db.flush()

        # Send email confirmation of request receipt
        try:
            self.email_service.send_cancellation_received(db, booking, cancel_req, user)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send cancellation request email: %s", exc)

        return cancel_req

    def review_cancellation_request(
        self,
        db: Session,
        admin_user: User,
        request_id: UUID,
        new_status: str,
        admin_notes: str | None = None,
    ) -> BookingCancellationRequest:
        """Staff/Admin reviews customer cancellation request."""
        cancel_req = db.execute(
            select(BookingCancellationRequest)
            .where(BookingCancellationRequest.id == request_id)
            .options(
                joinedload(BookingCancellationRequest.booking).joinedload(
                    Booking.package
                ),
                joinedload(BookingCancellationRequest.booking).joinedload(
                    Booking.departure
                ),
                joinedload(BookingCancellationRequest.user),
            )
        ).scalar_one_or_none()

        if not cancel_req:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cancellation request not found.",
            )

        cancel_req.status = new_status
        cancel_req.admin_notes = admin_notes
        cancel_req.resolved_by_id = admin_user.id
        cancel_req.resolved_at = datetime.now(timezone.utc)

        booking = cancel_req.booking
        if new_status == "approved":
            booking.status = "cancelled"

        db.flush()

        # Send notification to customer
        try:
            if new_status == "approved":
                self.email_service.send_cancellation_approved(
                    db, booking, cancel_req, cancel_req.user
                )
                self.whatsapp_service.send_cancellation_update(
                    db, booking, cancel_req.user, "Approved"
                )
            else:
                self.email_service.send_cancellation_rejected(
                    db, booking, cancel_req, cancel_req.user
                )
                self.whatsapp_service.send_cancellation_update(
                    db, booking, cancel_req.user, "Rejected"
                )
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send cancellation review notification: %s", exc)

        return cancel_req

    # -------------------------------------------------------------
    # Travel Documents: Receipt & Voucher
    # -------------------------------------------------------------

    def get_payment_receipt(
        self, db: Session, user: User, booking_reference: str
    ) -> PaymentReceiptData:
        """Retrieve authoritative payment receipt based on immutable booking and payment snapshots."""
        booking = db.execute(
            select(Booking)
            .where(Booking.booking_reference == booking_reference)
            .options(
                joinedload(Booking.package).joinedload(Package.destination),
                joinedload(Booking.departure),
                selectinload(Booking.payments),
                joinedload(Booking.user),
            )
        ).scalar_one_or_none()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found.",
            )

        # IDOR protection: only owner or admin can access
        is_admin = any(
            role.name in ("admin", "super_admin")
            for ur in user.role_assignments
            if (role := getattr(ur, "role", None))
        )
        if booking.user_id != user.id and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden to this receipt.",
            )

        # Find verified payment
        captured_payment = next(
            (p for p in booking.payments if p.status in ("captured", "completed")),
            None,
        )

        payment_provider = captured_payment.provider if captured_payment else "Razorpay"
        payment_id = captured_payment.provider_payment_id or str(
            captured_payment.id if captured_payment else booking.id
        )

        payment_date = (
            captured_payment.created_at if captured_payment else booking.created_at
        )
        amount_paid = (
            captured_payment.amount
            if captured_payment
            else (
                booking.total if booking.payment_status == "paid" else Decimal("0.00")
            )
        )
        razorpay_order_id = (
            captured_payment.provider_order_id if captured_payment else None
        )

        travel_dates = f"{booking.departure.departure_date}"
        if booking.departure.return_date:
            travel_dates += f" to {booking.departure.return_date}"

        pub_settings = get_public_settings(db)

        return PaymentReceiptData(
            receipt_number=f"RCP-{booking.booking_reference}",
            agency_name=pub_settings.agency_name,
            public_display_name=pub_settings.public_display_name or pub_settings.agency_name,
            legal_business_name=pub_settings.legal_business_name or pub_settings.agency_name,
            logo_url=pub_settings.logo_url,
            tax_id=pub_settings.tax_id,
            registration_number=pub_settings.registration_number,
            agency_location=pub_settings.agency_location,
            agency_phone=pub_settings.contact_phone,
            agency_email=pub_settings.contact_email,
            booking_reference=booking.booking_reference,
            customer_name=f"{booking.user.first_name} {booking.user.last_name}",
            customer_email=booking.user.email,
            package_title=booking.package.title,
            destination_name=booking.package.destination.name
            if booking.package.destination
            else "Travel Destination",
            travel_dates=travel_dates,
            payment_provider=payment_provider,
            payment_id=payment_id,
            razorpay_order_id=razorpay_order_id,
            payment_date=payment_date,
            payment_status=booking.payment_status,
            currency=booking.currency,
            subtotal=booking.subtotal,
            discount=booking.discount,
            tax=booking.tax,
            total_amount=booking.total,
            amount_paid=amount_paid,
            receipt_issued_at=datetime.now(timezone.utc),
        )

    def get_travel_voucher(
        self, db: Session, user: User, booking_reference: str
    ) -> TravelVoucherData:
        """Generate structured travel voucher using immutable booking roster and package catalog."""
        booking = db.execute(
            select(Booking)
            .where(Booking.booking_reference == booking_reference)
            .options(
                joinedload(Booking.package).joinedload(Package.destination),
                joinedload(Booking.package).selectinload(Package.days),
                joinedload(Booking.package).selectinload(Package.hotel_links),
                joinedload(Booking.departure),
                selectinload(Booking.travellers),
                joinedload(Booking.user),
            )
        ).scalar_one_or_none()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found.",
            )

        # IDOR protection
        is_admin = any(
            role.name in ("admin", "super_admin")
            for ur in user.role_assignments
            if (role := getattr(ur, "role", None))
        )
        if booking.user_id != user.id and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden to this voucher.",
            )

        # Travellers list
        travellers = [
            {
                "name": f"{t.first_name} {t.last_name}",
                "gender": t.gender or "N/A",
                "is_primary": t.is_primary,
                "contact_phone": t.contact_phone or "N/A",
            }
            for t in booking.travellers
        ]

        # Itinerary summary
        itinerary_days = [
            {
                "day_number": day.day_number,
                "title": day.title,
                "description": day.description,
            }
            for day in sorted(booking.package.days, key=lambda d: d.day_number)
        ]

        # Hotel information
        hotels = [
            {
                "hotel_id": str(ph.hotel_id),
                "room_type": ph.room_type or "Standard Premium Room",
                "nights": ph.nights,
            }
            for ph in booking.package.hotel_links
        ]

        pub_settings = get_public_settings(db)

        return TravelVoucherData(
            agency_name=pub_settings.agency_name,
            public_display_name=pub_settings.public_display_name or pub_settings.agency_name,
            legal_business_name=pub_settings.legal_business_name or pub_settings.agency_name,
            logo_url=pub_settings.logo_url,
            tax_id=pub_settings.tax_id,
            registration_number=pub_settings.registration_number,
            agency_location=pub_settings.agency_location,
            agency_phone=pub_settings.contact_phone,
            agency_email=pub_settings.contact_email,
            whatsapp_number=pub_settings.whatsapp_number,
            booking_reference=booking.booking_reference,
            customer_name=f"{booking.user.first_name} {booking.user.last_name}",
            customer_email=booking.user.email,
            package_title=booking.package.title,
            destination_name=booking.package.destination.name
            if booking.package.destination
            else "Destination",
            departure_date=booking.departure.departure_date,
            return_date=booking.departure.return_date,
            number_of_travellers=booking.number_of_travellers,
            travellers=travellers,
            itinerary_days=itinerary_days,
            hotel_information=hotels,
            activities=[],
            booking_status=booking.status,
            payment_status=booking.payment_status,
            special_notes=booking.customer_notes,
            issued_at=datetime.now(timezone.utc),
            pdf_header_title=pub_settings.pdf_header_title,
            pdf_header_subtitle=pub_settings.pdf_header_subtitle,
            pdf_office_address=pub_settings.pdf_office_address,
            pdf_contact_info=pub_settings.pdf_contact_info,
            pdf_checkin_instructions=pub_settings.pdf_checkin_instructions,
            pdf_logistics_notice=pub_settings.pdf_logistics_notice,
            pdf_helpline_info=pub_settings.pdf_helpline_info,
            pdf_footer_declaration=pub_settings.pdf_footer_declaration,
            pdf_badge_label=pub_settings.pdf_badge_label,
            pdf_logo_url=pub_settings.pdf_logo_url,
        )

    # -------------------------------------------------------------
    # Scheduled Reminders Dispatcher
    # -------------------------------------------------------------

    def dispatch_trip_reminders(self, db: Session, target_days_ahead: int = 7) -> int:
        """Find confirmed bookings departing in target_days_ahead days and dispatch reminders."""
        target_date = datetime.now(timezone.utc).date() + timedelta(
            days=target_days_ahead
        )
        stmt = (
            select(Booking)
            .join(PackageDeparture, Booking.departure_id == PackageDeparture.id)
            .where(
                Booking.status == "confirmed",
                PackageDeparture.departure_date == target_date,
            )
            .options(
                joinedload(Booking.package),
                joinedload(Booking.departure),
                joinedload(Booking.user),
            )
        )
        bookings = db.execute(stmt).scalars().all()
        dispatched_count = 0

        for b in bookings:
            try:
                self.email_service.send_trip_reminder(
                    db, b, b.user, days_left=target_days_ahead
                )
                self.whatsapp_service.send_trip_reminder(
                    db, b, b.user, days_left=target_days_ahead
                )
                dispatched_count += 1
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "Failed to send trip reminder for booking %s: %s",
                    b.booking_reference,
                    exc,
                )

        return dispatched_count


_customer_portal_service: CustomerPortalService | None = None


def get_customer_portal_service() -> CustomerPortalService:
    global _customer_portal_service
    if _customer_portal_service is None:
        _customer_portal_service = CustomerPortalService()
    return _customer_portal_service
