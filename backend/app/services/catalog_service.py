"""Service for public customer-facing catalog exploration."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.errors import ApiError
from app.models.catalog import (
    Destination,
    Package,
    PackageActivity,
    PackageDay,
    PackageDayActivity,
    PackageDeparture,
    PackageHotel,
)
from app.models.commerce import AddOn, AddOnDestination, AddOnPackage, Inquiry
from app.models.content import SiteSetting
from app.schemas.catalog import (
    PublicActivitySummary,
    PublicAddOnSummary,
    PublicDepartureListItem,
    PublicDepartureSummary,
    PublicDestinationDetail,
    PublicDestinationListItem,
    PublicHotelSummary,
    PublicImageItem,
    PublicInquiryCreate,
    PublicInquiryResponse,
    PublicItineraryDaySummary,
    PublicPackageDetail,
    PublicPackageListItem,
    PublicSiteSettings,
)


def get_public_destinations(
    db: Session,
    country: str | None = None,
    is_featured: bool | None = None,
) -> list[PublicDestinationListItem]:
    query = (
        select(Destination)
        .options(joinedload(Destination.images))
        .where(
            Destination.is_published.is_(True),
            Destination.deleted_at.is_(None),
        )
    )

    if country:
        query = query.where(func.lower(Destination.country) == country.strip().lower())
    if is_featured is not None:
        query = query.where(Destination.is_featured == is_featured)

    destinations = db.execute(query.order_by(Destination.name)).unique().scalars().all()

    dest_ids = [d.id for d in destinations]
    package_counts: dict[UUID, int] = {}
    if dest_ids:
        counts = db.execute(
            select(Package.destination_id, func.count(Package.id))
            .where(
                Package.destination_id.in_(dest_ids),
                Package.is_published.is_(True),
                Package.deleted_at.is_(None),
            )
            .group_by(Package.destination_id)
        ).all()
        package_counts = {dest_id: c for dest_id, c in counts}

    results: list[PublicDestinationListItem] = []
    for d in destinations:
        featured_img: PublicImageItem | None = None
        if d.images:
            sorted_imgs = sorted(
                d.images, key=lambda i: (not i.is_featured, i.sort_order)
            )
            top = sorted_imgs[0]
            featured_img = PublicImageItem(
                image_url=top.image_url,
                alt_text=top.alt_text,
                is_featured=top.is_featured,
                sort_order=top.sort_order,
            )

        results.append(
            PublicDestinationListItem(
                id=d.id,
                name=d.name,
                slug=d.slug,
                country=d.country,
                region=d.region,
                state_or_city=d.state_or_city,
                category=d.category,
                travel_type=d.travel_type,
                cover_image_url=d.cover_image_url,
                display_order=d.display_order or 0,
                short_description=d.short_description,
                featured_image=featured_img,
                package_count=package_counts.get(d.id, 0),
            )
        )
    return results


def get_public_destination_by_slug(db: Session, slug: str) -> PublicDestinationDetail:
    dest = (
        db.execute(
            select(Destination)
            .options(joinedload(Destination.images))
            .where(
                Destination.slug == slug.strip().lower(),
                Destination.is_published.is_(True),
                Destination.deleted_at.is_(None),
            )
        )
        .unique()
        .scalar_one_or_none()
    )

    if not dest:
        raise ApiError(
            status_code=404,
            code="DESTINATION_NOT_FOUND",
            message=f"Destination '{slug}' not found.",
        )

    images = [
        PublicImageItem(
            image_url=img.image_url,
            alt_text=img.alt_text,
            is_featured=img.is_featured,
            sort_order=img.sort_order,
        )
        for img in sorted(dest.images, key=lambda i: i.sort_order)
    ]

    return PublicDestinationDetail(
        id=dest.id,
        name=dest.name,
        slug=dest.slug,
        country=dest.country,
        region=dest.region,
        state_or_city=dest.state_or_city,
        category=dest.category,
        travel_type=dest.travel_type,
        cover_image_url=dest.cover_image_url,
        display_order=dest.display_order or 0,
        short_description=dest.short_description,
        description=dest.description,
        highlights=dest.highlights_json or [],
        travel_guide=dest.travel_guide_json or {},
        faqs=dest.faqs_json or [],
        social_image_url=dest.social_image_url,
        images=images,
        seo_title=dest.seo_title,
        seo_description=dest.seo_description,
    )


def get_public_packages(
    db: Session,
    destination_slug: str | None = None,
    is_featured: bool | None = None,
) -> list[PublicPackageListItem]:
    query = (
        select(Package)
        .options(joinedload(Package.destination), joinedload(Package.images))
        .join(Destination, Package.destination_id == Destination.id)
        .where(
            Package.is_published.is_(True),
            Package.deleted_at.is_(None),
            Destination.is_published.is_(True),
            Destination.deleted_at.is_(None),
        )
    )

    if destination_slug:
        query = query.where(Destination.slug == destination_slug.strip().lower())
    if is_featured is not None:
        query = query.where(Package.is_featured == is_featured)

    packages = (
        db.execute(query.order_by(desc(Package.is_featured), Package.name))
        .unique()
        .scalars()
        .all()
    )

    results: list[PublicPackageListItem] = []
    for p in packages:
        featured_img: PublicImageItem | None = None
        if p.images:
            sorted_imgs = sorted(
                p.images, key=lambda i: (not i.is_featured, i.sort_order)
            )
            top = sorted_imgs[0]
            featured_img = PublicImageItem(
                image_url=top.image_url,
                alt_text=top.alt_text,
                is_featured=top.is_featured,
                sort_order=top.sort_order,
            )

        results.append(
            PublicPackageListItem(
                id=p.id,
                name=p.name,
                slug=p.slug,
                destination_name=p.destination.name,
                destination_slug=p.destination.slug,
                category=p.category,
                travel_type=p.travel_type,
                cover_image_url=p.cover_image_url,
                base_price=p.base_price,
                currency=p.currency,
                duration_days=p.duration_days,
                duration_nights=p.duration_nights,
                minimum_travellers=p.minimum_travellers,
                maximum_travellers=p.maximum_travellers,
                featured_image=featured_img,
                is_featured=p.is_featured,
            )
        )
    return results


def get_public_package_by_slug(db: Session, slug: str) -> PublicPackageDetail:
    pkg = (
        db.execute(
            select(Package)
            .options(
                joinedload(Package.destination),
                joinedload(Package.images),
                joinedload(Package.hotel_links).joinedload(PackageHotel.hotel),
                joinedload(Package.activity_links).joinedload(PackageActivity.activity),
                joinedload(Package.days)
                .joinedload(PackageDay.activity_links)
                .joinedload(PackageDayActivity.activity),
                joinedload(Package.departures),
            )
            .join(Destination, Package.destination_id == Destination.id)
            .where(
                Package.slug == slug.strip().lower(),
                Package.is_published.is_(True),
                Package.deleted_at.is_(None),
                Destination.is_published.is_(True),
                Destination.deleted_at.is_(None),
            )
        )
        .unique()
        .scalar_one_or_none()
    )

    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package '{slug}' not found.",
        )

    images = [
        PublicImageItem(
            image_url=img.image_url,
            alt_text=img.alt_text,
            is_featured=img.is_featured,
            sort_order=img.sort_order,
        )
        for img in sorted(pkg.images, key=lambda i: i.sort_order)
    ]

    hotels = [
        PublicHotelSummary(
            id=l.hotel.id,
            name=l.hotel.name,
            star_rating=l.hotel.star_rating,
            address=l.hotel.address,
        )
        for l in pkg.hotel_links
        if l.hotel and l.hotel.is_active and l.hotel.deleted_at is None
    ]

    activities = [
        PublicActivitySummary(
            id=l.activity.id,
            name=l.activity.name,
            category=l.activity.category,
            duration_minutes=l.activity.duration_minutes,
        )
        for l in pkg.activity_links
        if l.activity
        and l.activity.status == "active"
        and l.activity.deleted_at is None
    ]

    itinerary: list[PublicItineraryDaySummary] = []
    for day in sorted(pkg.days, key=lambda d: d.day_number):
        day_acts = [
            PublicActivitySummary(
                id=link.activity.id,
                name=link.activity.name,
                category=link.activity.category,
                duration_minutes=link.activity.duration_minutes,
            )
            for link in sorted(day.activity_links, key=lambda l: l.sort_order)
            if link.activity
            and link.activity.status == "active"
            and link.activity.deleted_at is None
        ]
        itinerary.append(
            PublicItineraryDaySummary(
                day_number=day.day_number,
                title=day.title,
                description=day.description,
                accommodation=day.accommodation,
                meals=day.meals,
                transportation=day.transportation,
                activities=day_acts,
            )
        )

    departures = [
        PublicDepartureSummary(
            id=d.id,
            departure_date=d.departure_date,
            return_date=d.return_date,
            total_capacity=d.total_capacity,
            available_capacity=d.available_capacity,
            special_price=d.special_price,
            currency=d.currency,
            status=d.status,
        )
        for d in sorted(pkg.departures, key=lambda dep: dep.departure_date)
        if d.status in ("open", "sold_out") and d.departure_date >= datetime.now(timezone.utc).date()
    ]

    # Authoritatively isolate eligible add-ons for this specific package and its destination
    active_addons = get_eligible_add_ons_for_package(db, pkg.id, pkg.destination_id)
    add_ons = [
        PublicAddOnSummary(
            id=a.id,
            name=a.name,
            description=a.description,
            price=a.price,
            currency=a.currency,
            applicability_scope=a.applicability_scope or "all_packages",
            price_type=a.price_type or "per_booking",
            min_quantity=a.min_quantity or 1,
            max_quantity=a.max_quantity or 10,
            is_mandatory=a.is_mandatory or False,
        )
        for a in active_addons
    ]

    return PublicPackageDetail(
        id=pkg.id,
        name=pkg.name,
        slug=pkg.slug,
        destination_name=pkg.destination.name,
        destination_slug=pkg.destination.slug,
        short_description=pkg.short_description,
        description=pkg.description,
        category=pkg.category,
        travel_type=pkg.travel_type,
        difficulty_level=pkg.difficulty_level,
        departure_location=pkg.departure_location,
        cover_image_url=pkg.cover_image_url,
        inclusions=pkg.inclusions_json or [],
        exclusions=pkg.exclusions_json or [],
        child_price=pkg.child_price,
        infant_price=pkg.infant_price,
        single_room_supplement=pkg.single_room_supplement,
        booking_cutoff_days=pkg.booking_cutoff_days or 0,
        cancellation_policy=pkg.cancellation_policy,
        base_price=pkg.base_price,
        currency=pkg.currency,
        duration_days=pkg.duration_days,
        duration_nights=pkg.duration_nights,
        minimum_travellers=pkg.minimum_travellers,
        maximum_travellers=pkg.maximum_travellers,
        seo_title=pkg.seo_title,
        seo_description=pkg.seo_description,
        images=images,
        hotels=hotels,
        activities=activities,
        itinerary=itinerary,
        upcoming_departures=departures,
        add_ons=add_ons,
    )


def get_eligible_add_ons_for_package(
    db: Session, package_id: UUID, destination_id: UUID
) -> list[AddOn]:
    """Retrieve authoritatively eligible active add-ons for a specific package and destination."""
    stmt = (
        select(AddOn)
        .outerjoin(AddOnPackage, AddOn.id == AddOnPackage.add_on_id)
        .outerjoin(AddOnDestination, AddOn.id == AddOnDestination.add_on_id)
        .where(
            AddOn.is_active.is_(True),
            or_(
                AddOn.applicability_scope == "all_packages",
                and_(
                    AddOn.applicability_scope.in_(
                        ["selected_packages", "single_package"]
                    ),
                    AddOnPackage.package_id == package_id,
                ),
                and_(
                    AddOn.applicability_scope == "selected_destinations",
                    AddOnDestination.destination_id == destination_id,
                ),
            ),
        )
        .order_by(AddOn.display_order.asc(), AddOn.name.asc())
        .distinct()
    )
    return db.execute(stmt).scalars().all()


def get_public_package_itinerary(
    db: Session, slug: str
) -> list[PublicItineraryDaySummary]:
    pkg = (
        db.execute(
            select(Package)
            .options(
                joinedload(Package.days)
                .joinedload(PackageDay.activity_links)
                .joinedload(PackageDayActivity.activity)
            )
            .join(Destination, Package.destination_id == Destination.id)
            .where(
                Package.slug == slug.strip().lower(),
                Package.is_published.is_(True),
                Package.deleted_at.is_(None),
                Destination.is_published.is_(True),
                Destination.deleted_at.is_(None),
            )
        )
        .unique()
        .scalar_one_or_none()
    )

    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package '{slug}' not found.",
        )

    itinerary: list[PublicItineraryDaySummary] = []
    for day in sorted(pkg.days, key=lambda d: d.day_number):
        day_acts = [
            PublicActivitySummary(
                id=link.activity.id,
                name=link.activity.name,
                category=link.activity.category,
                duration_minutes=link.activity.duration_minutes,
            )
            for link in sorted(day.activity_links, key=lambda l: l.sort_order)
            if link.activity
            and link.activity.status == "active"
            and link.activity.deleted_at is None
        ]
        itinerary.append(
            PublicItineraryDaySummary(
                day_number=day.day_number,
                title=day.title,
                description=day.description,
                accommodation=day.accommodation,
                meals=day.meals,
                transportation=day.transportation,
                activities=day_acts,
            )
        )
    return itinerary


def get_public_package_departures(
    db: Session, slug: str
) -> list[PublicDepartureSummary]:
    pkg = (
        db.execute(
            select(Package)
            .options(joinedload(Package.departures))
            .join(Destination, Package.destination_id == Destination.id)
            .where(
                Package.slug == slug.strip().lower(),
                Package.is_published.is_(True),
                Package.deleted_at.is_(None),
                Destination.is_published.is_(True),
                Destination.deleted_at.is_(None),
            )
        )
        .unique()
        .scalar_one_or_none()
    )

    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package '{slug}' not found.",
        )

    return [
        PublicDepartureSummary(
            id=d.id,
            departure_date=d.departure_date,
            return_date=d.return_date,
            total_capacity=d.total_capacity,
            available_capacity=d.available_capacity,
            special_price=d.special_price,
            currency=d.currency,
            status=d.status,
        )
        for d in sorted(pkg.departures, key=lambda dep: dep.departure_date)
        if d.status in ("open", "sold_out") and d.departure_date >= datetime.now(timezone.utc).date()
    ]


def get_public_all_departures(db: Session) -> list[PublicDepartureListItem]:
    """Retrieve all open upcoming departures across all published packages."""
    now_date = datetime.now(timezone.utc).date()
    departures = (
        db.execute(
            select(PackageDeparture)
            .join(Package, PackageDeparture.package_id == Package.id)
            .join(Destination, Package.destination_id == Destination.id)
            .options(
                joinedload(PackageDeparture.package).joinedload(Package.destination),
                joinedload(PackageDeparture.package).joinedload(Package.images),
            )
            .where(
                PackageDeparture.status.in_(["open", "sold_out"]),
                PackageDeparture.departure_date >= now_date,
                Package.is_published.is_(True),
                Package.deleted_at.is_(None),
                Destination.is_published.is_(True),
                Destination.deleted_at.is_(None),
            )
            .order_by(PackageDeparture.departure_date.asc())
        )
        .unique()
        .scalars()
        .all()
    )

    results: list[PublicDepartureListItem] = []
    for dep in departures:
        pkg = dep.package
        featured_img: PublicImageItem | None = None
        if pkg.images:
            sorted_imgs = sorted(
                pkg.images, key=lambda i: (not i.is_featured, i.sort_order)
            )
            top = sorted_imgs[0]
            featured_img = PublicImageItem(
                image_url=top.image_url,
                alt_text=top.alt_text,
                is_featured=top.is_featured,
                sort_order=top.sort_order,
            )

        results.append(
            PublicDepartureListItem(
                id=dep.id,
                departure_date=dep.departure_date,
                return_date=dep.return_date,
                total_capacity=dep.total_capacity,
                available_capacity=dep.available_capacity,
                special_price=dep.special_price,
                base_price=pkg.base_price,
                currency=dep.currency or pkg.currency,
                status=dep.status,
                package_id=pkg.id,
                package_name=pkg.name,
                package_slug=pkg.slug,
                duration_days=pkg.duration_days,
                duration_nights=pkg.duration_nights,
                destination_name=pkg.destination.name,
                destination_slug=pkg.destination.slug,
                featured_image=featured_img,
            )
        )
    return results


def get_public_add_ons(
    db: Session,
    package_id: UUID | None = None,
    destination_id: UUID | None = None,
) -> list[PublicAddOnSummary]:
    """Retrieve active catalog add-on services, optionally scoped to a package or destination."""
    if package_id is not None:
        if destination_id is None:
            pkg = db.get(Package, package_id)
            if pkg and pkg.destination_id:
                destination_id = pkg.destination_id
        if destination_id is not None:
            items = get_eligible_add_ons_for_package(db, package_id, destination_id)
        else:
            items = []
    elif destination_id is not None:
        stmt = (
            select(AddOn)
            .outerjoin(AddOnDestination, AddOn.id == AddOnDestination.add_on_id)
            .where(
                AddOn.is_active.is_(True),
                or_(
                    AddOn.applicability_scope == "all_packages",
                    and_(
                        AddOn.applicability_scope == "selected_destinations",
                        AddOnDestination.destination_id == destination_id,
                    ),
                ),
            )
            .order_by(AddOn.display_order.asc(), AddOn.name.asc())
            .distinct()
        )
        items = db.execute(stmt).scalars().all()
    else:
        items = (
            db.execute(
                select(AddOn)
                .where(AddOn.is_active.is_(True))
                .order_by(AddOn.display_order.asc(), AddOn.name.asc())
            )
            .scalars()
            .all()
        )

    return [
        PublicAddOnSummary(
            id=item.id,
            name=item.name,
            description=item.description,
            price=item.price,
            currency=item.currency,
        )
        for item in items
    ]


def create_public_inquiry(
    db: Session, payload: PublicInquiryCreate
) -> PublicInquiryResponse:
    """Store customer trip or contact inquiry into PostgreSQL."""
    if payload.package_id:
        pkg = db.execute(
            select(Package)
            .options(joinedload(Package.destination))
            .where(
                Package.id == payload.package_id,
                Package.is_published.is_(True),
                Package.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if (
            not pkg
            or not pkg.destination
            or not pkg.destination.is_published
            or pkg.destination.deleted_at is not None
        ):
            raise ApiError(
                status_code=404,
                code="PACKAGE_NOT_FOUND",
                message="Selected package does not exist or is currently unavailable.",
            )
    if payload.destination_id:
        dest = db.get(Destination, payload.destination_id)
        if not dest or not dest.is_published or dest.deleted_at:
            raise ApiError(
                status_code=404,
                code="DESTINATION_NOT_FOUND",
                message="Selected destination does not exist.",
            )

    allowed_sources = {"contact_form", "package", "destination", "whatsapp", "other"}
    source = payload.source if payload.source in allowed_sources else "contact_form"

    inquiry = Inquiry(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone=payload.phone.strip() if payload.phone else None,
        package_id=payload.package_id,
        destination_id=payload.destination_id,
        message=payload.message.strip(),
        status="new",
        source=source,
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    return PublicInquiryResponse(
        id=inquiry.id,
        status="new",
        message="Thank you for contacting KV Tours & Travels. Our Coimbatore travel concierge will connect with you shortly.",
    )


def get_public_settings(db: Session) -> PublicSiteSettings:
    """Retrieve public agency settings and WhatsApp configuration."""
    settings = get_settings()
    site_settings_rows = (
        db.execute(select(SiteSetting).where(SiteSetting.is_public.is_(True)))
        .scalars()
        .all()
    )
    overrides = {
        row.key: row.value for row in site_settings_rows if row.value is not None
    }

    def _bool(val: object, default: bool) -> bool:
        if val is None:
            return default
        if isinstance(val, bool):
            return val
        return str(val).lower() in ("true", "1", "yes")

    feat_dests = overrides.get("featured_destination_ids")
    featured_destination_ids = [str(x) for x in feat_dests] if isinstance(feat_dests, list) else []
    feat_pkgs = overrides.get("featured_package_ids")
    featured_package_ids = [str(x) for x in feat_pkgs] if isinstance(feat_pkgs, list) else []

    return PublicSiteSettings(
        legal_business_name=str(overrides.get("legal_business_name")) if overrides.get("legal_business_name") else None,
        agency_name=str(overrides.get("agency_name", settings.agency_name)),
        public_display_name=str(overrides.get("public_display_name")) if overrides.get("public_display_name") else str(overrides.get("agency_name", settings.agency_name)),
        tagline=str(overrides.get("tagline", "Your Journey. Our Expertise.")),
        logo_url=str(overrides.get("logo_url")) if overrides.get("logo_url") else None,
        favicon_url=str(overrides.get("favicon_url")) if overrides.get("favicon_url") else None,
        business_description=str(overrides.get("business_description")) if overrides.get("business_description") else None,
        registered_office_address=str(overrides.get("registered_office_address")) if overrides.get("registered_office_address") else None,
        office_address=str(
            overrides.get(
                "office_address",
                "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012",
            )
        ),
        agency_location=str(overrides.get("agency_location", settings.agency_location)),
        city=str(overrides.get("city", "Coimbatore")),
        state=str(overrides.get("state", "Tamil Nadu")),
        postal_code=str(overrides.get("postal_code", "641012")),
        country=str(overrides.get("country", "India")),
        time_zone=str(overrides.get("time_zone", "Asia/Kolkata")),
        currency=str(overrides.get("currency", "INR")),
        contact_phone=str(overrides.get("contact_phone", settings.contact_phone)),
        secondary_phone=str(overrides.get("secondary_phone")) if overrides.get("secondary_phone") else None,
        support_whatsapp=str(overrides.get("support_whatsapp")) if overrides.get("support_whatsapp") else str(overrides.get("whatsapp_number", settings.whatsapp_number)),
        emergency_phone=str(overrides.get("emergency_phone")) if overrides.get("emergency_phone") else None,
        contact_email=str(overrides.get("contact_email", settings.contact_email)),
        customer_support_email=str(overrides.get("customer_support_email")) if overrides.get("customer_support_email") else str(overrides.get("contact_email", settings.contact_email)),
        booking_email=str(overrides.get("booking_email")) if overrides.get("booking_email") else "bookings@kvtours.in",
        general_inquiry_email=str(overrides.get("general_inquiry_email")) if overrides.get("general_inquiry_email") else str(overrides.get("contact_email", settings.contact_email)),
        instagram_handle=str(overrides.get("instagram_handle", "@kvtours_travels")),
        instagram_url=str(overrides.get("instagram_url")) if overrides.get("instagram_url") else "https://instagram.com/kvtours_travels",
        facebook_url=str(overrides.get("facebook_url")) if overrides.get("facebook_url") else None,
        website_url=str(overrides.get("website_url")) if overrides.get("website_url") else "https://kvtours.in",
        google_maps_url=str(overrides.get("google_maps_url")) if overrides.get("google_maps_url") else None,
        operating_hours=str(overrides.get("operating_hours", overrides.get("business_hours", "Mon - Sat: 9:00 AM - 7:00 PM"))),
        business_hours=str(overrides.get("business_hours", overrides.get("operating_hours", "Mon - Sat: 9:00 AM - 7:00 PM"))),
        holiday_notice=str(overrides.get("holiday_notice")) if overrides.get("holiday_notice") else None,
        office_contact_instructions=str(overrides.get("office_contact_instructions")) if overrides.get("office_contact_instructions") else None,
        whatsapp_number=str(overrides.get("whatsapp_number", settings.whatsapp_number)),
        whatsapp_country_code=str(overrides.get("whatsapp_country_code", "+91")),
        whatsapp_prefilled_message=str(
            overrides.get(
                "whatsapp_prefilled_message",
                "Hi KV Tours, I am interested in planning a trip.",
            )
        ),
        whatsapp_package_message=str(overrides.get("whatsapp_package_message", "Hi KV Tours, I am interested in this package.")),
        whatsapp_destination_message=str(overrides.get("whatsapp_destination_message", "Hi KV Tours, I would like to know more about this destination.")),
        whatsapp_custom_trip_message=str(overrides.get("whatsapp_custom_trip_message", "Hi KV Tours, I would like to plan a custom holiday.")),
        whatsapp_booking_support_message=str(overrides.get("whatsapp_booking_support_message", "Hi KV Tours, I need assistance with my booking.")),
        whatsapp_enabled=_bool(overrides.get("whatsapp_enabled"), True),
        whatsapp_show_floating_concierge=_bool(overrides.get("whatsapp_show_floating_concierge"), True),
        whatsapp_show_header_button=_bool(overrides.get("whatsapp_show_header_button"), True),
        whatsapp_show_on_homepage=_bool(
            overrides.get("whatsapp_show_on_homepage"), True
        ),
        whatsapp_show_on_footer=_bool(overrides.get("whatsapp_show_on_footer"), True),
        whatsapp_show_on_package_pages=_bool(
            overrides.get("whatsapp_show_on_package_pages"), True
        ),
        whatsapp_show_on_contact_page=_bool(
            overrides.get("whatsapp_show_on_contact_page"), True
        ),
        hero_headline=str(overrides.get("hero_headline", "Handcrafted Journeys Beyond the Ordinary")),
        hero_subtitle=str(overrides.get("hero_subtitle", "Coimbatore's premier luxury travel curator crafting extraordinary journeys across India and the globe.")),
        hero_image_url=str(overrides.get("hero_image_url")) if overrides.get("hero_image_url") else None,
        contact_cta_text=str(overrides.get("contact_cta_text", "Speak With Concierge")),
        whatsapp_cta_text=str(overrides.get("whatsapp_cta_text", "Chat on WhatsApp")),
        promo_banner_active=_bool(overrides.get("promo_banner_active"), False),
        promo_banner_text=str(overrides.get("promo_banner_text")) if overrides.get("promo_banner_text") else None,
        promo_banner_link=str(overrides.get("promo_banner_link")) if overrides.get("promo_banner_link") else None,
        featured_destination_ids=featured_destination_ids,
        featured_package_ids=featured_package_ids,
        best_offers_enabled=_bool(overrides.get("best_offers_enabled"), True),
        online_payments_enabled=_bool(
            overrides.get("online_payments_enabled", {}).get("enabled")
            if isinstance(overrides.get("online_payments_enabled"), dict)
            else overrides.get("online_payments_enabled"),
            False,
        ),
        online_payments_maintenance_message=(
            str(overrides["online_payments_enabled"]["maintenance_message"])
            if isinstance(overrides.get("online_payments_enabled"), dict)
            and overrides["online_payments_enabled"].get("maintenance_message")
            else str(overrides["online_payments_maintenance_message"])
            if "online_payments_maintenance_message" in overrides
            else "Online payments are temporarily paused for routine maintenance. Please submit a booking request or reach out via WhatsApp."
        ),

        # Rebranding, Typography & Identity
        short_name=str(overrides.get("short_name")) if overrides.get("short_name") else None,
        secondary_logo_url=str(overrides.get("secondary_logo_url")) if overrides.get("secondary_logo_url") else None,
        brand_primary_color=str(overrides.get("brand_primary_color", "#24292F")),
        brand_secondary_color=str(overrides.get("brand_secondary_color", "#C5A880")),
        brand_accent_color=str(overrides.get("brand_accent_color", "#D4AF37")),
        primary_font=str(overrides.get("primary_font", "Playfair Display")),
        secondary_font=str(overrides.get("secondary_font", "Inter")),
        year_established=int(overrides["year_established"]) if overrides.get("year_established") is not None and str(overrides.get("year_established")).isdigit() else None,
        registration_number=str(overrides.get("registration_number")) if overrides.get("registration_number") else None,
        tax_id=str(overrides.get("tax_id")) if overrides.get("tax_id") else None,

        # Extended Social Media
        youtube_url=str(overrides.get("youtube_url")) if overrides.get("youtube_url") else None,
        linkedin_url=str(overrides.get("linkedin_url")) if overrides.get("linkedin_url") else None,
        twitter_url=str(overrides.get("twitter_url")) if overrides.get("twitter_url") else None,

        # Google Maps & Directions
        google_maps_embed_url=str(overrides.get("google_maps_embed_url")) if overrides.get("google_maps_embed_url") else None,
        google_maps_latitude=float(overrides["google_maps_latitude"]) if overrides.get("google_maps_latitude") is not None else None,
        google_maps_longitude=float(overrides["google_maps_longitude"]) if overrides.get("google_maps_longitude") is not None else None,
        google_maps_zoom=int(overrides["google_maps_zoom"]) if overrides.get("google_maps_zoom") is not None else 15,
        google_maps_display_enabled=_bool(overrides.get("google_maps_display_enabled"), True),
        google_maps_directions_url=str(overrides.get("google_maps_directions_url")) if overrides.get("google_maps_directions_url") else None,
        office_location_label=str(overrides.get("office_location_label")) if overrides.get("office_location_label") else None,

        # SEO & Social Metadata
        seo_website_title=str(overrides.get("seo_website_title")) if overrides.get("seo_website_title") else None,
        seo_meta_description=str(overrides.get("seo_meta_description")) if overrides.get("seo_meta_description") else None,
        seo_og_image_url=str(overrides.get("seo_og_image_url")) if overrides.get("seo_og_image_url") else None,
        seo_social_title=str(overrides.get("seo_social_title")) if overrides.get("seo_social_title") else None,
        seo_social_description=str(overrides.get("seo_social_description")) if overrides.get("seo_social_description") else None,
        organization_structured_data=overrides.get("organization_structured_data") if isinstance(overrides.get("organization_structured_data"), dict) else None,
    )
