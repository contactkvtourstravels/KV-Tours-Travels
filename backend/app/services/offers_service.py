"""Domain service for KV Tours & Travels Best Offers management and dynamic pricing."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.catalog import BestOffer, Package
from app.models.content import AuditLog, SiteSetting
from app.schemas.offers import (
    AdminOfferCreate,
    AdminOfferItem,
    AdminOfferListResponse,
    AdminOfferUpdate,
    PublicOfferListItem,
    PublicOffersResponse,
)

logger = logging.getLogger(__name__)

TWO_PLACES = Decimal("0.01")
MASTER_SETTING_KEY = "best_offers_enabled"


def _quantize_money(amount: Decimal) -> Decimal:
    """Format and round financial amount to exact two decimal places."""
    return amount.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def _normalize_dt(dt: datetime | None) -> datetime | None:
    """Normalize datetime to timezone-aware UTC datetime."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def calculate_offer_discount(
    original_price: Decimal,
    discount_type: str,
    discount_value: Decimal,
    maximum_discount_amount: Decimal | None = None,
) -> tuple[Decimal, Decimal, Decimal]:
    """Calculate authoritative discount amount, final discounted price, and savings.

    Rules:
    - Percentage discount: discount = original_price * discount_percentage / 100
    - Fixed discount: discount = fixed_discount_amount
    - Final price: original_price - discount
    - Invariants: Never negative, never exceeding original price.
    Returns: (discount_amount, discounted_price, savings)
    """
    original = _quantize_money(original_price)
    d_val = _quantize_money(discount_value)

    if discount_type == "percentage":
        raw_discount = (original * d_val) / Decimal(100)
        if maximum_discount_amount is not None:
            max_cap = _quantize_money(maximum_discount_amount)
            raw_discount = min(raw_discount, max_cap)
    else:  # fixed_amount / fixed
        raw_discount = d_val

    # Safeguards: never exceed original price, never drop below zero
    capped_discount = max(Decimal("0.00"), min(raw_discount, original))
    discount_amount = _quantize_money(capped_discount)
    discounted_price = _quantize_money(max(Decimal("0.00"), original - discount_amount))
    savings = discount_amount

    return discount_amount, discounted_price, savings


def calculate_discount_and_final_price(
    package_price: Decimal,
    discount_type: str,
    discount_value: Decimal,
    maximum_discount: Decimal | None = None,
) -> tuple[Decimal, Decimal]:
    """Calculate discount amount and final price.

    Returns: (discount_amount, final_price)
    """
    disc, final, _ = calculate_offer_discount(
        original_price=package_price,
        discount_type=discount_type,
        discount_value=discount_value,
        maximum_discount_amount=maximum_discount,
    )
    return disc, final


def get_discount_badge_text(
    discount_type: str,
    discount_value: Decimal,
    discount_amount: Decimal,
    badge_text: str | None = None,
) -> str:
    """Generate clean, tasteful badge text like '15% OFF' or 'Save ₹2,000'."""
    if badge_text and badge_text.strip():
        return badge_text.strip()
    if discount_type == "percentage":
        clean_pct = (
            int(discount_value) if discount_value % 1 == 0 else f"{discount_value:.1f}"
        )
        return f"{clean_pct}% OFF"
    clean_amt = (
        int(discount_amount) if discount_amount % 1 == 0 else f"{discount_amount:,.2f}"
    )
    return (
        f"Save ₹{clean_amt:,}" if isinstance(clean_amt, int) else f"Save ₹{clean_amt}"
    )


class OffersService:
    """Production service for KV Tours & Travels Best Offers feature."""

    @staticmethod
    def is_master_toggle_enabled(db: Session) -> bool:
        """Check persistent master toggle for homepage best offers section."""
        setting = db.execute(
            select(SiteSetting).where(SiteSetting.key == MASTER_SETTING_KEY)
        ).scalar_one_or_none()
        if setting is None or setting.value is None:
            return True  # Default to ON
        val = setting.value
        if isinstance(val, dict):
            return bool(val.get("enabled", True))
        if isinstance(val, bool):
            return val
        return str(val).lower() in ("true", "1", "yes")

    @classmethod
    def set_master_toggle(
        cls,
        db: Session,
        enabled: bool,
        actor_id: UUID | None = None,
        ip_address: str | None = None,
    ) -> bool:
        """Persistently update master toggle in database with audit logging."""
        setting = db.execute(
            select(SiteSetting).where(SiteSetting.key == MASTER_SETTING_KEY)
        ).scalar_one_or_none()

        setting_val = {"enabled": enabled}
        if setting:
            setting.value = setting_val
            setting.is_public = True
        else:
            setting = SiteSetting(
                key=MASTER_SETTING_KEY,
                value=setting_val,
                description="Controls visibility of the Best Offers showcase section on the homepage.",
                is_public=True,
            )
            db.add(setting)

        # Audit log
        audit = AuditLog(
            actor_user_id=actor_id,
            action="update_best_offers_master_toggle",
            entity_type="site_setting",
            entity_id=MASTER_SETTING_KEY,
            ip_address=ip_address,
            metadata_json={"enabled": enabled},
        )
        db.add(audit)
        db.commit()
        logger.info(
            "Best Offers master toggle updated to %s by user %s", enabled, actor_id
        )
        return enabled

    @classmethod
    def get_public_offers(cls, db: Session) -> PublicOffersResponse:
        """Retrieve eligible, published best offers for the public homepage."""
        is_enabled = cls.is_master_toggle_enabled(db)
        if not is_enabled:
            return PublicOffersResponse(section_enabled=False, offers=[])

        now = datetime.now(timezone.utc)

        # Fetch active offers with published and non-deleted packages
        query = (
            select(BestOffer)
            .join(Package, BestOffer.package_id == Package.id)
            .options(
                joinedload(BestOffer.package).joinedload(Package.destination),
                joinedload(BestOffer.package).joinedload(Package.images),
            )
            .where(
                BestOffer.status.in_(["active", "published"]),
                Package.is_published.is_(True),
                Package.deleted_at.is_(None),
                or_(BestOffer.start_at.is_(None), BestOffer.start_at <= now),
                or_(BestOffer.end_at.is_(None), BestOffer.end_at >= now),
            )
            .order_by(BestOffer.display_order.asc(), BestOffer.created_at.desc())
        )

        offers = db.execute(query).unique().scalars().all()
        items: list[PublicOfferListItem] = []

        for offer in offers:
            pkg = offer.package
            if not pkg:
                continue

            start_norm = _normalize_dt(offer.start_at)
            end_norm = _normalize_dt(offer.end_at)
            if start_norm and start_norm > now:
                continue
            if end_norm and end_norm < now:
                continue

            dest_name = pkg.destination.name if pkg.destination else "Signature Journey"
            dest_slug = pkg.destination.slug if pkg.destination else "signature"

            discount_amt, disc_price, savings = calculate_offer_discount(
                original_price=pkg.price,
                discount_type=offer.discount_type,
                discount_value=offer.discount_value,
                maximum_discount_amount=offer.maximum_discount_amount,
            )

            badge = get_discount_badge_text(
                discount_type=offer.discount_type,
                discount_value=offer.discount_value,
                discount_amount=discount_amt,
                badge_text=offer.badge_text,
            )

            cover_img = pkg.cover_image_url
            if not cover_img and pkg.images:
                cover_img = pkg.images[0].image_url
            if not cover_img and pkg.destination:
                cover_img = pkg.destination.cover_image_url

            orig_str = f"{pkg.price:.2f}"
            disc_str = f"{discount_amt:.2f}"
            final_str = f"{disc_price:.2f}"
            sav_str = f"{savings:.2f}"
            val_str = f"{offer.discount_value:.2f}"

            items.append(
                PublicOfferListItem(
                    id=offer.id,
                    package_id=pkg.id,
                    package_name=pkg.name,
                    package_title=pkg.title or pkg.name,
                    package_slug=pkg.slug,
                    destination_name=dest_name,
                    destination_slug=dest_slug,
                    duration_days=pkg.duration_days,
                    duration_nights=pkg.duration_nights,
                    cover_image_url=cover_img,
                    original_price=orig_str,
                    discount_type=offer.discount_type,
                    discount_value=val_str,
                    discount_amount=disc_str,
                    discounted_price=final_str,
                    savings=sav_str,
                    discount_badge=badge,
                    offer_label=offer.offer_label,
                    is_featured=offer.is_featured,
                    start_at=offer.start_at,
                    end_at=offer.end_at,
                    currency=pkg.currency,
                )
            )

        return PublicOffersResponse(section_enabled=True, offers=items)

    @classmethod
    def get_admin_offers(
        cls,
        db: Session,
        page: int = 1,
        page_size: int = 20,
        status_filter: str | None = None,
        search: str | None = None,
    ) -> AdminOfferListResponse:
        """Administrative list of offers with search, filters, pricing warnings, and expiry indicators."""
        section_enabled = cls.is_master_toggle_enabled(db)
        now = datetime.now(timezone.utc)

        query = (
            select(BestOffer)
            .join(Package, BestOffer.package_id == Package.id)
            .options(joinedload(BestOffer.package).joinedload(Package.destination))
        )

        if status_filter and status_filter != "all":
            if status_filter == "expired":
                query = query.where(
                    BestOffer.end_at.is_not(None), BestOffer.end_at < now
                )
            else:
                query = query.where(BestOffer.status == status_filter)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    BestOffer.title.ilike(term),
                    BestOffer.offer_label.ilike(term),
                    Package.name.ilike(term),
                )
            )

        total = db.execute(
            select(func.count()).select_from(query.subquery())
        ).scalar_one()

        query = query.order_by(
            BestOffer.display_order.asc(), BestOffer.created_at.desc()
        )
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        rows = db.execute(query).scalars().all()
        items: list[AdminOfferItem] = []

        for offer in rows:
            pkg = offer.package
            pkg_name = pkg.name if pkg else "Unknown Package"
            pkg_slug = pkg.slug if pkg else ""
            dest_name = (
                pkg.destination.name
                if (pkg and pkg.destination)
                else "Unknown Destination"
            )
            duration_days = pkg.duration_days if pkg else 0
            duration_nights = pkg.duration_nights if pkg else 0
            cover_img = (
                pkg.cover_image_url
                if (pkg and pkg.cover_image_url)
                else (
                    pkg.destination.cover_image_url
                    if (pkg and pkg.destination)
                    else None
                )
            )
            pkg_published = bool(pkg and pkg.is_published and not pkg.deleted_at)
            curr_pkg_price = pkg.price if pkg else Decimal("0.00")

            # Check if package price changed since offer snapshot
            price_warning = False
            if (
                offer.original_price_snapshot is not None
                and pkg
                and _quantize_money(offer.original_price_snapshot)
                != _quantize_money(pkg.price)
            ):
                price_warning = True

            discount_amt, disc_price, savings = calculate_offer_discount(
                original_price=curr_pkg_price,
                discount_type=offer.discount_type,
                discount_value=offer.discount_value,
                maximum_discount_amount=offer.maximum_discount_amount,
            )

            badge = get_discount_badge_text(
                discount_type=offer.discount_type,
                discount_value=offer.discount_value,
                discount_amount=discount_amt,
                badge_text=offer.badge_text,
            )

            end_norm = _normalize_dt(offer.end_at)
            is_expired = bool(end_norm and end_norm < now)

            items.append(
                AdminOfferItem(
                    id=offer.id,
                    package_id=offer.package_id,
                    package_name=pkg_name,
                    package_title=pkg_name,
                    package_slug=pkg_slug,
                    destination_name=dest_name,
                    duration_days=duration_days,
                    duration_nights=duration_nights,
                    cover_image_url=cover_img,
                    package_is_published=pkg_published,
                    current_package_price=f"{curr_pkg_price:.2f}",
                    original_price_snapshot=f"{offer.original_price_snapshot:.2f}"
                    if offer.original_price_snapshot is not None
                    else None,
                    original_package_price=f"{offer.original_price_snapshot:.2f}"
                    if offer.original_price_snapshot is not None
                    else f"{curr_pkg_price:.2f}",
                    price_changed_warning=price_warning,
                    title=offer.title,
                    short_description=offer.short_description,
                    discount_type=offer.discount_type,
                    discount_value=f"{offer.discount_value:.2f}",
                    calculated_discount_amount=f"{discount_amt:.2f}",
                    discount_amount=f"{discount_amt:.2f}",
                    calculated_discounted_price=f"{disc_price:.2f}",
                    discounted_price=f"{disc_price:.2f}",
                    savings=f"{savings:.2f}",
                    discount_badge=badge,
                    offer_badge=badge,
                    minimum_booking_amount=offer.minimum_booking_amount,
                    maximum_discount_amount=offer.maximum_discount_amount,
                    offer_label=offer.offer_label,
                    badge_text=offer.badge_text,
                    is_featured=offer.is_featured,
                    status=offer.status,
                    is_expired=is_expired,
                    start_at=offer.start_at,
                    end_at=offer.end_at,
                    display_order=offer.display_order,
                    created_at=offer.created_at,
                    updated_at=offer.updated_at,
                )
            )

        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1

        return AdminOfferListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            section_enabled=section_enabled,
        )

    @classmethod
    def get_admin_offer_by_id(cls, db: Session, offer_id: UUID) -> AdminOfferItem:
        """Fetch single offer by ID with authoritative package pricing status and warnings."""
        offer = (
            db.execute(
                select(BestOffer)
                .join(Package, BestOffer.package_id == Package.id)
                .options(joinedload(BestOffer.package).joinedload(Package.destination))
                .where(BestOffer.id == offer_id)
            )
            .scalars()
            .one_or_none()
        )
        if not offer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offer not found.",
            )

        pkg = offer.package
        now = datetime.now(timezone.utc)
        pkg_name = pkg.name if pkg else "Unknown Package"
        pkg_slug = pkg.slug if pkg else ""
        dest_name = (
            pkg.destination.name if (pkg and pkg.destination) else "Unknown Destination"
        )
        duration_days = pkg.duration_days if pkg else 0
        duration_nights = pkg.duration_nights if pkg else 0
        cover_img = (
            pkg.cover_image_url
            if (pkg and pkg.cover_image_url)
            else (
                pkg.destination.cover_image_url if (pkg and pkg.destination) else None
            )
        )
        pkg_published = bool(pkg and pkg.is_published and not pkg.deleted_at)
        curr_pkg_price = pkg.price if pkg else Decimal("0.00")

        price_warning = False
        if (
            offer.original_price_snapshot is not None
            and pkg
            and _quantize_money(offer.original_price_snapshot)
            != _quantize_money(pkg.price)
        ):
            price_warning = True

        discount_amt, disc_price, savings = calculate_offer_discount(
            original_price=curr_pkg_price,
            discount_type=offer.discount_type,
            discount_value=offer.discount_value,
            maximum_discount_amount=offer.maximum_discount_amount,
        )

        badge = get_discount_badge_text(
            discount_type=offer.discount_type,
            discount_value=offer.discount_value,
            discount_amount=discount_amt,
            badge_text=offer.badge_text,
        )

        end_norm = _normalize_dt(offer.end_at)
        is_expired = bool(end_norm and end_norm < now)

        item = AdminOfferItem(
            id=offer.id,
            package_id=offer.package_id,
            package_name=pkg_name,
            package_title=pkg_name,
            package_slug=pkg_slug,
            destination_name=dest_name,
            duration_days=duration_days,
            duration_nights=duration_nights,
            cover_image_url=cover_img,
            package_is_published=pkg_published,
            current_package_price=f"{curr_pkg_price:.2f}",
            original_price_snapshot=f"{offer.original_price_snapshot:.2f}"
            if offer.original_price_snapshot is not None
            else None,
            original_package_price=f"{offer.original_price_snapshot:.2f}"
            if offer.original_price_snapshot is not None
            else f"{curr_pkg_price:.2f}",
            price_changed_warning=price_warning,
            title=offer.title,
            short_description=offer.short_description,
            discount_type=offer.discount_type,
            discount_value=f"{offer.discount_value:.2f}",
            calculated_discount_amount=f"{discount_amt:.2f}",
            discount_amount=f"{discount_amt:.2f}",
            calculated_discounted_price=f"{disc_price:.2f}",
            discounted_price=f"{disc_price:.2f}",
            savings=f"{savings:.2f}",
            discount_badge=badge,
            offer_badge=badge,
            minimum_booking_amount=offer.minimum_booking_amount,
            maximum_discount_amount=offer.maximum_discount_amount,
            offer_label=offer.offer_label,
            badge_text=offer.badge_text,
            is_featured=offer.is_featured,
            status=offer.status,
            is_expired=is_expired,
            start_at=offer.start_at,
            end_at=offer.end_at,
            display_order=offer.display_order,
            created_at=offer.created_at,
            updated_at=offer.updated_at,
        )
        return item

    @classmethod
    def create_offer(
        cls,
        db: Session,
        payload: AdminOfferCreate,
        actor_id: UUID | None = None,
        ip_address: str | None = None,
    ) -> BestOffer:
        """Create a new offer with rigorous server-side validation and audit logging."""
        package = db.execute(
            select(Package).where(
                Package.id == payload.package_id,
                Package.deleted_at.is_(None),
            )
        ).scalar_one_or_none()

        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected package not found in catalog.",
            )

        # Discount invariants validation
        if payload.discount_type == "percentage":
            if payload.discount_value <= Decimal(0) or payload.discount_value > Decimal(
                100
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Percentage discount must be greater than 0% and less than or equal to 100%.",
                )
        else:
            if payload.discount_value <= Decimal(0):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fixed discount amount must be greater than zero.",
                )
            if payload.discount_value > package.price:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Fixed discount (₹{payload.discount_value:,.2f}) cannot exceed the package base price (₹{package.price:,.2f}).",
                )

        if payload.start_at and payload.end_at and payload.end_at < payload.start_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Offer end date cannot be earlier than start date.",
            )

        offer_title = payload.title or f"{package.title or package.name} Special Offer"
        badge = payload.badge_text or payload.offer_badge

        offer = BestOffer(
            package_id=payload.package_id,
            title=offer_title,
            short_description=payload.short_description,
            discount_type=payload.discount_type,
            discount_value=_quantize_money(payload.discount_value),
            original_price_snapshot=_quantize_money(package.price),
            minimum_booking_amount=_quantize_money(payload.minimum_booking_amount)
            if payload.minimum_booking_amount
            else None,
            maximum_discount_amount=_quantize_money(payload.maximum_discount_amount)
            if payload.maximum_discount_amount
            else None,
            offer_label=payload.offer_label,
            badge_text=badge,
            is_featured=payload.is_featured,
            status=payload.status,
            start_at=payload.start_at,
            end_at=payload.end_at,
            display_order=payload.display_order,
        )

        db.add(offer)
        db.flush()

        audit = AuditLog(
            actor_user_id=actor_id,
            action="create_best_offer",
            entity_type="best_offer",
            entity_id=str(offer.id),
            ip_address=ip_address,
            metadata_json={
                "title": offer.title,
                "package_id": str(offer.package_id),
                "discount_type": offer.discount_type,
                "discount_value": str(offer.discount_value),
            },
        )
        db.add(audit)
        db.commit()
        db.refresh(offer)
        return offer

    @classmethod
    def update_offer(
        cls,
        db: Session,
        offer_id: UUID,
        payload: AdminOfferUpdate,
        actor_id: UUID | None = None,
        ip_address: str | None = None,
    ) -> BestOffer:
        """Update existing offer with full constraint checking and audit logging."""
        offer = db.execute(
            select(BestOffer).where(BestOffer.id == offer_id)
        ).scalar_one_or_none()

        if not offer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offer not found.",
            )

        pkg_id = (
            payload.package_id if payload.package_id is not None else offer.package_id
        )
        package = db.execute(
            select(Package).where(
                Package.id == pkg_id,
                Package.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if not package:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected package not found in catalog.",
            )

        disc_type = (
            payload.discount_type
            if payload.discount_type is not None
            else offer.discount_type
        )
        disc_val = (
            payload.discount_value
            if payload.discount_value is not None
            else offer.discount_value
        )

        if disc_type == "percentage":
            if disc_val <= Decimal(0) or disc_val > Decimal(100):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Percentage discount must be between 0% and 100%.",
                )
        else:
            if disc_val <= Decimal(0):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fixed discount amount must be greater than zero.",
                )
            if disc_val > package.price:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Fixed discount (₹{disc_val:,.2f}) cannot exceed the package base price (₹{package.price:,.2f}).",
                )

        start_time = (
            payload.start_at if payload.start_at is not None else offer.start_at
        )
        end_time = payload.end_at if payload.end_at is not None else offer.end_at
        if start_time and end_time and end_time < start_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Offer end date cannot be earlier than start date.",
            )

        update_dict = payload.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            if val is not None and hasattr(offer, key):
                if isinstance(val, Decimal):
                    setattr(offer, key, _quantize_money(val))
                else:
                    setattr(offer, key, val)

        audit = AuditLog(
            actor_user_id=actor_id,
            action="update_best_offer",
            entity_type="best_offer",
            entity_id=str(offer.id),
            ip_address=ip_address,
            metadata_json={"updated_fields": list(update_dict.keys())},
        )
        db.add(audit)
        db.commit()
        db.refresh(offer)
        return offer

    @classmethod
    def delete_or_archive_offer(
        cls,
        db: Session,
        offer_id: UUID,
        actor_id: UUID | None = None,
        ip_address: str | None = None,
    ) -> None:
        """Safely delete or archive an offer without affecting existing booking history."""
        offer = db.execute(
            select(BestOffer).where(BestOffer.id == offer_id)
        ).scalar_one_or_none()
        if not offer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offer not found.",
            )

        # Check if any bookings reference this offer
        from app.models.commerce import Booking

        has_bookings = (
            db.execute(
                select(func.count(Booking.id)).where(Booking.offer_id == offer.id)
            ).scalar_one()
            > 0
        )

        if has_bookings:
            # Archive so foreign keys remain intact for historical records
            offer.status = "archived"
            logger.info(
                "Offer %s has historical bookings; archived instead of hard-deleted.",
                offer_id,
            )
        else:
            db.delete(offer)

        audit = AuditLog(
            actor_user_id=actor_id,
            action="archive_best_offer" if has_bookings else "delete_best_offer",
            entity_type="best_offer",
            entity_id=str(offer_id),
            ip_address=ip_address,
            metadata_json={"title": offer.title, "has_bookings": has_bookings},
        )
        db.add(audit)
        db.commit()

    @classmethod
    def validate_offer_for_booking(
        cls,
        db: Session,
        offer_id: UUID,
        package_id: UUID,
    ) -> BestOffer:
        """Authoritatively validate an offer for booking calculation or submission.

        Enforces:
        - Master toggle is ON
        - Offer exists
        - Offer package_id matches request package_id
        - Package is published and not deleted
        - Offer status is active or published
        - Date bounds: start_at <= now <= end_at
        """
        if not cls.is_master_toggle_enabled(db):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Promotional offers are currently not active.",
            )

        offer = db.execute(
            select(BestOffer)
            .options(joinedload(BestOffer.package))
            .where(BestOffer.id == offer_id)
        ).scalar_one_or_none()

        if not offer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected promotional offer not found.",
            )

        if offer.package_id != package_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This offer does not apply to the selected travel package.",
            )

        pkg = offer.package
        if not pkg or not pkg.is_published or pkg.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The package associated with this offer is currently unavailable.",
            )

        if offer.status not in ("active", "published"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This offer is currently {offer.status} and cannot be used for booking.",
            )

        now = datetime.now(timezone.utc)
        start_norm = _normalize_dt(offer.start_at)
        end_norm = _normalize_dt(offer.end_at)
        if start_norm and start_norm > now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This promotional offer has not started yet.",
            )

        if end_norm and end_norm < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This promotional offer has expired.",
            )

        return offer
