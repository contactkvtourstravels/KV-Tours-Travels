"""Booking domain service.

Manages the complete booking lifecycle:
- Concurrency-safe departure capacity reservation using SELECT ... FOR UPDATE
- Authoritative server-side price calculation with Decimal money precision
- Historical price snapshotting for base prices and add-ons
- Server-side coupon validation, limits, and concurrency protection
- Cryptographically random unique human-friendly booking references
- Strict customer ownership and IDOR barriers
- Complete transactional rollback on failure
- Idempotency protection against duplicate submissions
- Comprehensive audit logging without sensitive credential data
"""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

logger = logging.getLogger(__name__)


from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.catalog import Package, PackageDeparture
from app.models.commerce import (
    AddOn,
    AddOnDestination,
    AddOnPackage,
    Booking,
    BookingAddOn,
    BookingTraveller,
    Coupon,
    CouponUsage,
)
from app.models.content import AuditLog
from app.models.user import User
from app.schemas.booking import (
    AddOnCalculationDetail,
    BookingCreateRequest,
    BookingDetailResponse,
    BookingListResponse,
    BookingSummaryResponse,
    PriceCalculationRequest,
    PriceCalculationResponse,
)
from app.schemas.payment import PaymentDetailResponse
from app.services.offers_service import OffersService, calculate_offer_discount

REFERENCE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
TWO_PLACES = Decimal("0.01")


def _quantize_money(amount: Decimal) -> Decimal:
    """Format and round financial amount to exact two decimal places."""
    return amount.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def _generate_booking_reference(db: Session) -> str:
    """Generate a unique human-friendly booking reference like KV-2026-X9K4M2."""
    current_year = datetime.now(timezone.utc).year
    for _ in range(10):
        random_suffix = "".join(secrets.choice(REFERENCE_CHARS) for _ in range(6))
        reference = f"KV-{current_year}-{random_suffix}"
        existing = db.execute(
            select(Booking.id).where(Booking.booking_reference == reference)
        ).scalar_one_or_none()
        if not existing:
            return reference
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not generate unique booking reference. Please try again.",
    )


class BookingService:
    """Production service for KV Tours & Travels booking operations."""

    @staticmethod
    def calculate_price(
        db: Session,
        request: PriceCalculationRequest,
        user_id: UUID | None = None,
    ) -> PriceCalculationResponse:
        """Authoritatively calculates the full booking price server-side."""
        package = db.execute(
            select(Package).where(
                Package.id == request.package_id,
                Package.is_published.is_(True),
                Package.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected package not found or no longer published.",
            )

        departure = db.execute(
            select(PackageDeparture).where(
                PackageDeparture.id == request.departure_id,
                PackageDeparture.package_id == request.package_id,
            )
        ).scalar_one_or_none()
        if not departure:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected departure date not found for this package.",
            )

        base_unit_price = (
            departure.special_price
            if departure.special_price is not None
            else package.price
        )
        base_unit_price = _quantize_money(base_unit_price)

        num_travellers = request.number_of_travellers
        if num_travellers < 1 or num_travellers > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Number of travellers must be between 1 and 100.",
            )
        package_subtotal = _quantize_money(base_unit_price * Decimal(num_travellers))

        # Calculate Add-ons with Authoritative Scope & Pricing Verification
        add_ons_subtotal = Decimal("0.00")
        add_ons_details: list[AddOnCalculationDetail] = []
        if request.add_ons:
            for item in request.add_ons:
                addon = db.execute(
                    select(AddOn).where(
                        AddOn.id == item.add_on_id,
                        AddOn.is_active.is_(True),
                    )
                ).scalar_one_or_none()
                if not addon:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Add-on {item.add_on_id} is invalid or no longer available.",
                    )

                # Authoritative applicability scope check
                scope = addon.applicability_scope or "all_packages"
                is_eligible = False
                if scope == "all_packages":
                    is_eligible = True
                elif scope in ("selected_packages", "single_package"):
                    is_eligible = (
                        db.execute(
                            select(AddOnPackage.add_on_id).where(
                                AddOnPackage.add_on_id == addon.id,
                                AddOnPackage.package_id == package.id,
                            )
                        ).scalar_one_or_none()
                        is not None
                    )
                elif scope == "selected_destinations":
                    is_eligible = (
                        db.execute(
                            select(AddOnDestination.add_on_id).where(
                                AddOnDestination.add_on_id == addon.id,
                                AddOnDestination.destination_id
                                == package.destination_id,
                            )
                        ).scalar_one_or_none()
                        is not None
                    )

                if not is_eligible:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Add-on '{addon.name}' is not applicable to the selected package.",
                    )

                # Quantity bounds validation
                min_qty = addon.min_quantity or 1
                max_qty = addon.max_quantity or 10
                if item.quantity < min_qty or item.quantity > max_qty:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Quantity for add-on '{addon.name}' must be between {min_qty} and {max_qty}.",
                    )

                item_unit_price = _quantize_money(addon.price)
                if addon.price_type in ("per_traveller", "per_person"):
                    item_total_price = _quantize_money(
                        item_unit_price
                        * Decimal(item.quantity)
                        * Decimal(num_travellers)
                    )
                else:
                    item_total_price = _quantize_money(
                        item_unit_price * Decimal(item.quantity)
                    )

                add_ons_subtotal += item_total_price
                add_ons_details.append(
                    AddOnCalculationDetail(
                        add_on_id=addon.id,
                        name=addon.name,
                        quantity=item.quantity,
                        unit_price=item_unit_price,
                        total_price=item_total_price,
                        currency=addon.currency,
                    )
                )

        add_ons_subtotal = _quantize_money(add_ons_subtotal)
        subtotal = _quantize_money(package_subtotal + add_ons_subtotal)

        # Promotion Evaluation (Offers & Coupons)
        discount = Decimal("0.00")
        coupon_code = None
        coupon_valid: bool | None = None
        coupon_message: str | None = None
        applied_offer_id: UUID | None = None
        offer_title: str | None = None
        offer_discount_per_traveller: Decimal | None = None

        if request.offer_id and request.coupon_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Promotional offers and coupons cannot be combined.",
            )

        if request.offer_id:
            offer = OffersService.validate_offer_for_booking(
                db=db, offer_id=request.offer_id, package_id=package.id
            )
            if offer.minimum_booking_amount and subtotal < offer.minimum_booking_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Minimum booking amount of ₹{offer.minimum_booking_amount:,.2f} required for this offer.",
                )

            offer_disc_amt, _, _ = calculate_offer_discount(
                original_price=base_unit_price,
                discount_type=offer.discount_type,
                discount_value=offer.discount_value,
                maximum_discount_amount=offer.maximum_discount_amount,
            )
            total_offer_discount = _quantize_money(
                offer_disc_amt * Decimal(num_travellers)
            )
            discount = total_offer_discount
            applied_offer_id = offer.id
            offer_title = offer.title
            offer_discount_per_traveller = offer_disc_amt
        elif request.coupon_code:
            norm_code = request.coupon_code.strip().upper()
            coupon_code = norm_code
            coupon = db.execute(
                select(Coupon).where(Coupon.code_normalized == norm_code)
            ).scalar_one_or_none()

            now = datetime.now(timezone.utc)
            if not coupon:
                coupon_valid = False
                coupon_message = "Invalid promo coupon code."
            elif not coupon.is_active:
                coupon_valid = False
                coupon_message = "This coupon is no longer active."
            elif coupon.valid_from and coupon.valid_from > now:
                coupon_valid = False
                coupon_message = "This coupon is not yet valid."
            elif coupon.valid_until and coupon.valid_until < now:
                coupon_valid = False
                coupon_message = "This coupon has expired."
            elif (
                coupon.minimum_booking_amount
                and subtotal < coupon.minimum_booking_amount
            ):
                coupon_valid = False
                coupon_message = f"Minimum booking amount of ₹{coupon.minimum_booking_amount:,.2f} required."
            elif coupon.currency and coupon.currency != package.currency:
                coupon_valid = False
                coupon_message = f"Coupon currency ({coupon.currency}) does not match package currency ({package.currency})."
            else:
                # Check usage limits
                if coupon.total_usage_limit is not None:
                    total_used = db.execute(
                        select(func.count(CouponUsage.id)).where(
                            CouponUsage.coupon_id == coupon.id
                        )
                    ).scalar_one()
                    if total_used >= coupon.total_usage_limit:
                        coupon_valid = False
                        coupon_message = "Coupon total usage limit has been reached."

                if (
                    coupon_valid is None
                    and user_id
                    and coupon.per_user_usage_limit is not None
                ):
                    user_used = db.execute(
                        select(func.count(CouponUsage.id)).where(
                            CouponUsage.coupon_id == coupon.id,
                            CouponUsage.user_id == user_id,
                        )
                    ).scalar_one()
                    if user_used >= coupon.per_user_usage_limit:
                        coupon_valid = False
                        coupon_message = (
                            "You have already reached the usage limit for this coupon."
                        )

                if coupon_valid is None:
                    coupon_valid = True
                    if coupon.discount_type == "percentage":
                        raw_discount = (subtotal * coupon.discount_value) / Decimal(100)
                    else:  # fixed or fixed_amount
                        raw_discount = coupon.discount_value

                    if coupon.maximum_discount_amount is not None:
                        raw_discount = min(raw_discount, coupon.maximum_discount_amount)

                    raw_discount = min(raw_discount, subtotal)
                    discount = _quantize_money(raw_discount)
                    coupon_message = f"Coupon applied: savings of ₹{discount:,.2f}"

        tax = Decimal("0.00")
        total = _quantize_money(max(Decimal("0.00"), subtotal - discount + tax))

        return PriceCalculationResponse(
            package_id=package.id,
            departure_id=departure.id,
            number_of_travellers=num_travellers,
            base_price_per_traveller=base_unit_price,
            package_subtotal=package_subtotal,
            add_ons_subtotal=add_ons_subtotal,
            add_ons_details=add_ons_details,
            subtotal=subtotal,
            discount=discount,
            tax=tax,
            total=total,
            currency=package.currency,
            coupon_code=coupon_code,
            coupon_valid=coupon_valid,
            coupon_message=coupon_message,
            offer_id=applied_offer_id,
            offer_title=offer_title,
            offer_discount_per_traveller=offer_discount_per_traveller,
        )

    @classmethod
    def create_booking(
        cls,
        db: Session,
        request: BookingCreateRequest,
        current_user: User,
        client_ip: str | None = None,
    ) -> Booking:
        """Concurrency-safe transactional booking creation."""
        # 1. Idempotency Check
        if request.idempotency_key:
            existing = db.execute(
                select(Booking).where(
                    Booking.user_id == current_user.id,
                    Booking.idempotency_key == request.idempotency_key,
                )
            ).scalar_one_or_none()
            if existing:
                return existing

        # 2. Validate Traveller Counts and Form Details
        num_travellers = request.number_of_travellers
        if num_travellers < 1 or num_travellers > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Number of travellers must be between 1 and 100.",
            )
        if len(request.travellers) != num_travellers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Traveller count ({num_travellers}) does not match provided traveller details ({len(request.travellers)}).",
            )

        # 3. Concurrency-Safe Transaction: Lock Package & Departure
        # Fetch package
        package = db.execute(
            select(Package)
            .options(joinedload(Package.destination))
            .where(
                Package.id == request.package_id,
                Package.is_published.is_(True),
                Package.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected package not found or is no longer published.",
            )

        if package.min_travellers and num_travellers < package.min_travellers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This journey requires a minimum of {package.min_travellers} traveller(s).",
            )
        if package.max_travellers and num_travellers > package.max_travellers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This journey allows a maximum of {package.max_travellers} traveller(s).",
            )

        # ROW-LEVEL LOCK ON DEPARTURE: SELECT ... FOR UPDATE
        departure = db.execute(
            select(PackageDeparture)
            .where(
                PackageDeparture.id == request.departure_id,
                PackageDeparture.package_id == request.package_id,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if not departure:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected departure date not found for this package.",
            )

        if departure.status in ("cancelled", "closed"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This departure is no longer open for booking.",
            )

        if departure.departure_date < datetime.now(timezone.utc).date():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot book a departure date that has already passed.",
            )

        if departure.available_capacity < num_travellers:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Insufficient seats available. Only {departure.available_capacity} seat(s) remaining.",
            )

        # Allocate seats atomically
        departure.available_capacity -= num_travellers
        departure.reserved_capacity += num_travellers
        if departure.available_capacity == 0:
            departure.status = "sold_out"

        # 4. Coupon Validation with Row Lock
        coupon: Coupon | None = None
        applied_discount = Decimal("0.00")
        if request.coupon_code:
            norm_code = request.coupon_code.strip().upper()
            coupon = db.execute(
                select(Coupon)
                .where(Coupon.code_normalized == norm_code)
                .with_for_update()
            ).scalar_one_or_none()

            now = datetime.now(timezone.utc)
            if not coupon or not coupon.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or inactive coupon code.",
                )
            if (coupon.valid_from and coupon.valid_from > now) or (
                coupon.valid_until and coupon.valid_until < now
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The provided coupon has expired or is not yet valid.",
                )
            if coupon.total_usage_limit is not None:
                usage_count = db.execute(
                    select(func.count(CouponUsage.id)).where(
                        CouponUsage.coupon_id == coupon.id
                    )
                ).scalar_one()
                if usage_count >= coupon.total_usage_limit:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="This coupon has reached its total usage limit.",
                    )
            if coupon.per_user_usage_limit is not None:
                user_usage_count = db.execute(
                    select(func.count(CouponUsage.id)).where(
                        CouponUsage.coupon_id == coupon.id,
                        CouponUsage.user_id == current_user.id,
                    )
                ).scalar_one()
                if user_usage_count >= coupon.per_user_usage_limit:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="You have already reached the maximum usage limit for this coupon.",
                    )

        # 5. Authoritative Price Calculation & Snapshot
        calc_request = PriceCalculationRequest(
            package_id=request.package_id,
            departure_id=request.departure_id,
            number_of_travellers=num_travellers,
            add_ons=request.add_ons,
            coupon_code=request.coupon_code,
            offer_id=request.offer_id,
        )
        pricing = cls.calculate_price(db, calc_request, user_id=current_user.id)
        if request.coupon_code and not pricing.coupon_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=pricing.coupon_message or "Coupon conditions not met.",
            )
        applied_discount = pricing.discount

        # 6. Generate Unique Reference & Expiry
        reference = _generate_booking_reference(db)
        hold_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        # Build full JSON snapshot
        price_breakdown = {
            "base_unit_price": str(pricing.base_price_per_traveller),
            "number_of_travellers": num_travellers,
            "package_subtotal": str(pricing.package_subtotal),
            "add_ons_subtotal": str(pricing.add_ons_subtotal),
            "add_ons": [
                {
                    "add_on_id": str(item.add_on_id),
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit_price": str(item.unit_price),
                    "total_price": str(item.total_price),
                    "currency": item.currency,
                }
                for item in pricing.add_ons_details
            ],
            "subtotal": str(pricing.subtotal),
            "discount": str(pricing.discount),
            "tax": str(pricing.tax),
            "total": str(pricing.total),
            "currency": pricing.currency,
            "coupon_code": pricing.coupon_code,
            "hold_expires_at": hold_expires_at.isoformat(),
            "idempotency_key": request.idempotency_key,
        }
        if pricing.offer_id:
            price_breakdown["offer"] = {
                "offer_id": str(pricing.offer_id),
                "offer_title": pricing.offer_title,
                "discount_per_traveller": str(pricing.offer_discount_per_traveller),
                "total_offer_discount": str(pricing.discount),
            }

        # 7. Create Booking Entity
        booking = Booking(
            booking_reference=reference,
            user_id=current_user.id,
            package_id=package.id,
            departure_id=departure.id,
            coupon_id=coupon.id
            if (coupon and applied_discount > Decimal("0.00"))
            else None,
            offer_id=pricing.offer_id,
            status="pending",
            payment_status="pending",
            number_of_travellers=num_travellers,
            subtotal=pricing.subtotal,
            discount=pricing.discount,
            tax=pricing.tax,
            total=pricing.total,
            currency=package.currency,
            customer_notes=request.customer_notes,
            price_breakdown=price_breakdown,
            idempotency_key=request.idempotency_key,
            hold_expires_at=hold_expires_at,
        )
        db.add(booking)
        db.flush()

        # 8. Record Coupon Usage
        if coupon and applied_discount > Decimal("0.00"):
            coupon_usage = CouponUsage(
                coupon_id=coupon.id,
                user_id=current_user.id,
                booking_id=booking.id,
                discount_amount=applied_discount,
                currency=package.currency,
            )
            db.add(coupon_usage)

        # 9. Create Travellers
        is_international = False
        if package.destination and getattr(package.destination, "country", None):
            is_international = package.destination.country.strip().lower() not in (
                "india",
                "domestic",
            )

        lead_assigned = False
        for i, t in enumerate(request.travellers):
            is_lead = t.is_primary or (
                not lead_assigned and (i == 0 or len(request.travellers) == 1)
            )
            if is_lead:
                lead_assigned = True

            # Privacy: do not record passport data for domestic trips
            traveller_entity = BookingTraveller(
                booking_id=booking.id,
                first_name=t.first_name.strip(),
                last_name=t.last_name.strip(),
                date_of_birth=t.date_of_birth,
                gender=t.gender,
                nationality=t.nationality.upper() if t.nationality else None,
                passport_number=t.passport_number.strip()
                if (is_international and t.passport_number)
                else None,
                passport_expiry=t.passport_expiry if is_international else None,
                passport_issuing_country=t.passport_issuing_country.upper()
                if (is_international and t.passport_issuing_country)
                else None,
                contact_email=t.contact_email,
                contact_phone=t.contact_phone,
                is_primary=is_lead,
            )
            db.add(traveller_entity)

        # 10. Create Add-on Snapshots
        for item in pricing.add_ons_details:
            booking_addon = BookingAddOn(
                booking_id=booking.id,
                add_on_id=item.add_on_id,
                name_snapshot=item.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
                currency=item.currency,
            )
            db.add(booking_addon)

        # 11. Audit Log Entry
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="booking_created",
            entity_type="booking",
            entity_id=str(booking.id),
            ip_address=client_ip,
            metadata_json={
                "booking_reference": reference,
                "package_id": str(package.id),
                "departure_id": str(departure.id),
                "traveller_count": num_travellers,
                "total": str(pricing.total),
                "currency": package.currency,
                "coupon_code": pricing.coupon_code,
            },
        )
        db.add(audit)
        db.commit()
        db.refresh(booking)

        # Trigger authoritative booking created notifications safely
        try:
            from app.services.email_service import get_email_service

            email_svc = get_email_service()
            email_svc.send_booking_created(db, booking, current_user)
            email_svc.send_admin_booking_notification(db, booking, current_user)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to dispatch booking notification emails: %s", exc)

        return booking

    @staticmethod
    def get_booking_detail(
        db: Session,
        booking_identifier: UUID | str,
        current_user: User,
        user_roles: list[str],
    ) -> BookingDetailResponse:
        """Fetch booking with strict customer ownership and staff RBAC checks."""
        try:
            target_uuid = UUID(str(booking_identifier))
            cond = Booking.id == target_uuid
        except (ValueError, AttributeError):
            cond = Booking.booking_reference == str(booking_identifier)

        booking = (
            db.execute(
                select(Booking)
                .options(
                    joinedload(Booking.package).joinedload(Package.destination),
                    joinedload(Booking.departure),
                    joinedload(Booking.travellers),
                    joinedload(Booking.add_ons),
                    joinedload(Booking.user),
                    joinedload(Booking.payments),
                )
                .where(cond)
            )
            .unique()
            .scalar_one_or_none()
        )

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found.",
            )

        is_staff_or_admin = any(
            role in ("staff", "manager", "admin", "super_admin") for role in user_roles
        )

        if not is_staff_or_admin and booking.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this booking.",
            )

        dest_name = (
            booking.package.destination.name
            if booking.package and booking.package.destination
            else "Curated Destination"
        )
        customer_name = (
            f"{booking.user.first_name} {booking.user.last_name}".strip()
            if booking.user
            else "Guest"
        )
        customer_email = booking.user.email if booking.user else ""

        total_paid = sum(
            (p.amount for p in booking.payments if p.status == "captured"),
            Decimal("0.00"),
        )
        outstanding_balance = max(Decimal("0.00"), booking.total - total_paid)
        default_deposit_pct = Decimal("25.0")
        min_dep = Decimal("5000.00")
        deposit_amt = min(
            booking.total,
            max(
                min_dep,
                (booking.total * default_deposit_pct / Decimal(100)).quantize(
                    Decimal("0.01")
                ),
            ),
        )
        is_fully_paid = total_paid >= booking.total and booking.total > 0

        return BookingDetailResponse(
            id=booking.id,
            booking_reference=booking.booking_reference,
            user_id=booking.user_id,
            customer_name=customer_name,
            customer_email=customer_email,
            package_id=booking.package_id,
            package_title=booking.package.title if booking.package else "Tour Package",
            package_slug=booking.package.slug if booking.package else "",
            destination_name=dest_name,
            departure_id=booking.departure_id,
            departure_date=booking.departure.departure_date
            if booking.departure
            else datetime.now(timezone.utc).date(),
            return_date=booking.departure.return_date if booking.departure else None,
            status=booking.status,
            payment_status=booking.payment_status,
            number_of_travellers=booking.number_of_travellers,
            subtotal=booking.subtotal,
            discount=booking.discount,
            tax=booking.tax,
            total=booking.total,
            currency=booking.currency,
            total_paid=total_paid,
            outstanding_balance=outstanding_balance,
            deposit_amount=deposit_amt,
            is_fully_paid=is_fully_paid,
            customer_notes=booking.customer_notes,
            price_breakdown=booking.price_breakdown,
            travellers=[
                {
                    "id": t.id,
                    "first_name": t.first_name,
                    "last_name": t.last_name,
                    "date_of_birth": t.date_of_birth,
                    "gender": t.gender,
                    "nationality": t.nationality,
                    "contact_email": t.contact_email,
                    "contact_phone": t.contact_phone,
                    "is_primary": t.is_primary,
                    "passport_number": t.passport_number,
                    "passport_expiry": t.passport_expiry,
                    "passport_issuing_country": t.passport_issuing_country,
                }
                for t in booking.travellers
            ],
            add_ons=[
                {
                    "id": a.id,
                    "add_on_id": a.add_on_id,
                    "name_snapshot": a.name_snapshot,
                    "quantity": a.quantity,
                    "unit_price": a.unit_price,
                    "total_price": a.total_price,
                    "currency": a.currency,
                }
                for a in booking.add_ons
            ],
            payments=[
                PaymentDetailResponse.model_validate(p) for p in booking.payments
            ],
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            hold_expires_at=booking.hold_expires_at,
        )

    @staticmethod
    def get_my_bookings(
        db: Session,
        current_user: User,
        status_filter: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> BookingListResponse:
        """Returns customer bookings with pagination and status filtering."""
        query = (
            select(Booking)
            .options(
                joinedload(Booking.package).joinedload(Package.destination),
                joinedload(Booking.departure),
            )
            .where(Booking.user_id == current_user.id)
        )
        count_query = select(func.count(Booking.id)).where(
            Booking.user_id == current_user.id
        )
        if status_filter:
            query = query.where(Booking.status == status_filter)
            count_query = count_query.where(Booking.status == status_filter)

        total = db.execute(count_query).scalar_one()

        items_query = (
            query.order_by(Booking.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        bookings = db.execute(items_query).unique().scalars().all()

        summaries: list[BookingSummaryResponse] = []
        for b in bookings:
            dest_name = (
                b.package.destination.name
                if b.package and b.package.destination
                else "Destination"
            )
            summaries.append(
                BookingSummaryResponse(
                    id=b.id,
                    booking_reference=b.booking_reference,
                    package_id=b.package_id,
                    package_title=b.package.title if b.package else "Package",
                    package_slug=b.package.slug if b.package else "",
                    destination_name=dest_name,
                    departure_id=b.departure_id,
                    departure_date=b.departure.departure_date
                    if b.departure
                    else datetime.now(timezone.utc).date(),
                    return_date=b.departure.return_date if b.departure else None,
                    status=b.status,
                    payment_status=b.payment_status,
                    number_of_travellers=b.number_of_travellers,
                    total=b.total,
                    currency=b.currency,
                    created_at=b.created_at,
                    hold_expires_at=b.hold_expires_at,
                )
            )

        return BookingListResponse(
            items=summaries,
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def cancel_booking(
        db: Session,
        booking_id: UUID,
        current_user: User,
        user_roles: list[str],
        reason: str | None = None,
        client_ip: str | None = None,
    ) -> Booking:
        """Cancels a pending booking and restores departure capacity atomically."""
        booking = db.execute(
            select(Booking).where(Booking.id == booking_id)
        ).scalar_one_or_none()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found.",
            )

        is_staff_or_admin = any(
            role in ("staff", "manager", "admin", "super_admin") for role in user_roles
        )
        if not is_staff_or_admin and booking.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to cancel this booking.",
            )

        if booking.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking is already cancelled.",
            )

        if booking.status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel a completed booking.",
            )

        # Lock departure row to restore capacity safely
        departure = db.execute(
            select(PackageDeparture)
            .where(PackageDeparture.id == booking.departure_id)
            .with_for_update()
        ).scalar_one_or_none()

        if departure:
            departure.available_capacity += booking.number_of_travellers
            departure.reserved_capacity = max(
                0, departure.reserved_capacity - booking.number_of_travellers
            )
            if departure.status == "sold_out" and departure.available_capacity > 0:
                departure.status = "open"

        # Remove coupon usage if applicable
        coupon_usage = db.execute(
            select(CouponUsage).where(CouponUsage.booking_id == booking.id)
        ).scalar_one_or_none()
        if coupon_usage:
            db.delete(coupon_usage)

        booking.status = "cancelled"

        audit = AuditLog(
            actor_user_id=current_user.id,
            action="booking_cancelled",
            entity_type="booking",
            entity_id=str(booking.id),
            ip_address=client_ip,
            metadata_json={
                "booking_reference": booking.booking_reference,
                "reason": reason or "Customer requested cancellation",
            },
        )
        db.add(audit)
        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def get_admin_bookings(
        db: Session,
        status_filter: str | None = None,
        payment_status_filter: str | None = None,
        package_id: UUID | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> BookingListResponse:
        """Administrative booking listing with search and filters."""
        query = select(Booking).options(
            joinedload(Booking.package).joinedload(Package.destination),
            joinedload(Booking.departure),
            joinedload(Booking.user),
        )

        if status_filter:
            query = query.where(Booking.status == status_filter)
        if payment_status_filter:
            query = query.where(Booking.payment_status == payment_status_filter)
        if package_id:
            query = query.where(Booking.package_id == package_id)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.join(Booking.user).where(
                or_(
                    Booking.booking_reference.ilike(search_term),
                    User.email.ilike(search_term),
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                )
            )

        count_query = select(func.count(Booking.id))
        if status_filter:
            count_query = count_query.where(Booking.status == status_filter)
        if payment_status_filter:
            count_query = count_query.where(
                Booking.payment_status == payment_status_filter
            )
        if package_id:
            count_query = count_query.where(Booking.package_id == package_id)
        if search:
            count_query = count_query.join(Booking.user).where(
                or_(
                    Booking.booking_reference.ilike(search_term),
                    User.email.ilike(search_term),
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                )
            )

        total = db.execute(count_query).scalar_one()

        items_query = (
            query.order_by(Booking.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        bookings = db.execute(items_query).unique().scalars().all()

        summaries: list[BookingSummaryResponse] = []
        for b in bookings:
            dest_name = (
                b.package.destination.name
                if b.package and b.package.destination
                else "Destination"
            )
            summaries.append(
                BookingSummaryResponse(
                    id=b.id,
                    booking_reference=b.booking_reference,
                    package_id=b.package_id,
                    package_title=b.package.title if b.package else "Package",
                    package_slug=b.package.slug if b.package else "",
                    destination_name=dest_name,
                    departure_id=b.departure_id,
                    departure_date=b.departure.departure_date
                    if b.departure
                    else datetime.now(timezone.utc).date(),
                    return_date=b.departure.return_date if b.departure else None,
                    status=b.status,
                    payment_status=b.payment_status,
                    number_of_travellers=b.number_of_travellers,
                    total=b.total,
                    currency=b.currency,
                    created_at=b.created_at,
                    hold_expires_at=b.hold_expires_at,
                )
            )

        return BookingListResponse(
            items=summaries,
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def update_booking_status(
        db: Session,
        booking_id: UUID,
        new_status: str,
        current_user: User,
        reason: str | None = None,
        client_ip: str | None = None,
    ) -> Booking:
        """Administrative booking status update with strict transition controls."""
        booking = db.execute(
            select(Booking).where(Booking.id == booking_id)
        ).scalar_one_or_none()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found.",
            )

        old_status = booking.status
        if old_status == new_status:
            return booking

        # Validate allowed transitions
        valid_transitions = {
            "pending": ("confirmed", "cancelled"),
            "confirmed": ("completed", "cancelled"),
            "cancelled": (),  # Cannot un-cancel directly
            "completed": (),
        }

        if new_status not in valid_transitions.get(old_status, ()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid booking status transition from '{old_status}' to '{new_status}'.",
            )

        # If transitioning to cancelled, restore departure capacity
        if new_status == "cancelled":
            departure = db.execute(
                select(PackageDeparture)
                .where(PackageDeparture.id == booking.departure_id)
                .with_for_update()
            ).scalar_one_or_none()
            if departure:
                departure.available_capacity += booking.number_of_travellers
                departure.reserved_capacity = max(
                    0, departure.reserved_capacity - booking.number_of_travellers
                )
                if departure.status == "sold_out" and departure.available_capacity > 0:
                    departure.status = "open"

        booking.status = new_status
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="booking_updated",
            entity_type="booking",
            entity_id=str(booking.id),
            ip_address=client_ip,
            metadata_json={
                "old_status": old_status,
                "new_status": new_status,
                "reason": reason or "Administrative update",
            },
        )
        db.add(audit)
        db.commit()
        db.refresh(booking)
        return booking
