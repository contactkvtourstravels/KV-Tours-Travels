"""Service for administrative travel package catalog management."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ApiError
from app.models.catalog import Destination, Package
from app.models.commerce import Booking
from app.schemas.admin import (
    PackageCreateRequest,
    PackageResponse,
    PackageUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.audit_service import record_audit_log
from app.services.admin.utils import generate_unique_slug, paginate, slugify


def serialize_package(pkg: Package) -> PackageResponse:
    """Serialize Package model into PackageResponse schema."""
    is_active = pkg.deleted_at is None
    dest_name = pkg.destination.name if pkg.destination else None
    dest_is_published = pkg.destination.is_published if pkg.destination else None
    return PackageResponse(
        id=pkg.id,
        destination_id=pkg.destination_id,
        destination_name=dest_name,
        destination_is_published=dest_is_published,
        name=pkg.name,
        slug=pkg.slug,
        short_description=pkg.short_description,
        description=pkg.description,
        base_price=pkg.base_price,
        currency=pkg.currency,
        duration_days=pkg.duration_days,
        duration_nights=pkg.duration_nights,
        minimum_travellers=pkg.minimum_travellers,
        maximum_travellers=pkg.maximum_travellers,
        category=pkg.category,
        travel_type=pkg.travel_type,
        difficulty_level=pkg.difficulty_level,
        departure_location=pkg.departure_location,
        cover_image_url=pkg.cover_image_url,
        inclusions_json=pkg.inclusions_json,
        exclusions_json=pkg.exclusions_json,
        child_price=pkg.child_price,
        infant_price=pkg.infant_price,
        single_room_supplement=pkg.single_room_supplement,
        booking_cutoff_days=pkg.booking_cutoff_days or 0,
        cancellation_policy=pkg.cancellation_policy,
        is_featured=pkg.is_featured,
        is_published=pkg.is_published,
        is_active=is_active,
        deleted_at=pkg.deleted_at,
        seo_title=pkg.seo_title,
        seo_description=pkg.seo_description,
        created_at=pkg.created_at,
        updated_at=pkg.updated_at,
    )


def list_packages(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    destination_id: UUID | None = None,
    is_published: bool | None = None,
    is_featured: bool | None = None,
    is_active: bool | None = None,
) -> PaginatedResponse[PackageResponse]:
    """Query packages with pagination, filters, and destination details."""
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = select(Package).options(joinedload(Package.destination))

    if is_active is True:
        query = query.where(Package.deleted_at.is_(None))
    elif is_active is False:
        query = query.where(Package.deleted_at.is_not(None))

    if is_published is not None:
        query = query.where(Package.is_published == is_published)

    if is_featured is not None:
        query = query.where(Package.is_featured == is_featured)

    if destination_id is not None:
        query = query.where(Package.destination_id == destination_id)

    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.outerjoin(
            Destination, Package.destination_id == Destination.id
        ).where(
            or_(
                func.lower(Package.name).like(search_term),
                func.lower(Package.slug).like(search_term),
                func.lower(Destination.name).like(search_term),
                func.lower(Destination.country).like(search_term),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.execute(count_query).scalar_one()

    # Query items
    query = (
        query.order_by(desc(Package.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    packages = db.execute(query).unique().scalars().all()

    items = [serialize_package(p) for p in packages]
    return paginate(items, total, page, page_size)


def get_package_by_id(db: Session, package_id: UUID) -> PackageResponse:
    """Retrieve single package by ID or raise 404."""
    package = (
        db.execute(
            select(Package)
            .options(joinedload(Package.destination))
            .where(Package.id == package_id)
        )
        .unique()
        .scalar_one_or_none()
    )

    if package is None:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package with ID {package_id} was not found.",
        )

    return serialize_package(package)


def create_package(
    db: Session,
    payload: PackageCreateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageResponse:
    """Create a new package with constraint validation and audit logging."""
    # Ensure destination exists
    destination = db.execute(
        select(Destination).where(
            Destination.id == payload.destination_id,
            Destination.deleted_at.is_(None),
        )
    ).scalar_one_or_none()

    if destination is None:
        raise ApiError(
            status_code=404,
            code="DESTINATION_NOT_FOUND",
            message=f"Active destination with ID {payload.destination_id} was not found.",
        )

    # Validate travellers range
    if (
        payload.maximum_travellers is not None
        and payload.maximum_travellers < payload.minimum_travellers
    ):
        raise ApiError(
            status_code=400,
            code="INVALID_TRAVELLER_RANGE",
            message="Maximum travellers cannot be less than minimum travellers.",
        )

    # Handle slug
    if payload.slug:
        candidate_slug = slugify(payload.slug, max_length=220)
        existing = db.execute(
            select(Package.id).where(Package.slug == candidate_slug)
        ).scalar_one_or_none()
        if existing:
            raise ApiError(
                status_code=409,
                code="SLUG_ALREADY_EXISTS",
                message=f"A package with slug '{candidate_slug}' already exists.",
            )
        slug = candidate_slug
    else:
        slug = generate_unique_slug(db, Package, payload.name, max_length=220)

    package = Package(
        destination_id=payload.destination_id,
        name=payload.name.strip(),
        slug=slug,
        short_description=payload.short_description.strip()
        if payload.short_description
        else None,
        description=payload.description.strip() if payload.description else None,
        base_price=payload.base_price,
        currency=payload.currency.upper(),
        duration_days=payload.duration_days,
        duration_nights=payload.duration_nights,
        minimum_travellers=payload.minimum_travellers,
        maximum_travellers=payload.maximum_travellers,
        category=payload.category.strip() if payload.category else None,
        travel_type=payload.travel_type.strip() if payload.travel_type else None,
        difficulty_level=payload.difficulty_level.strip()
        if payload.difficulty_level
        else None,
        departure_location=payload.departure_location.strip()
        if payload.departure_location
        else None,
        cover_image_url=payload.cover_image_url.strip()
        if payload.cover_image_url
        else None,
        inclusions_json=payload.inclusions_json,
        exclusions_json=payload.exclusions_json,
        child_price=payload.child_price,
        infant_price=payload.infant_price,
        single_room_supplement=payload.single_room_supplement,
        booking_cutoff_days=payload.booking_cutoff_days,
        cancellation_policy=payload.cancellation_policy.strip()
        if payload.cancellation_policy
        else None,
        is_featured=payload.is_featured,
        is_published=payload.is_published,
        seo_title=payload.seo_title.strip() if payload.seo_title else None,
        seo_description=payload.seo_description.strip()
        if payload.seo_description
        else None,
    )
    db.add(package)
    db.flush()

    record_audit_log(
        db=db,
        action="package_created",
        entity_type="package",
        entity_id=str(package.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "name": package.name,
            "slug": package.slug,
            "destination_id": str(package.destination_id),
            "base_price": str(package.base_price),
            "currency": package.currency,
        },
    )
    db.commit()

    # Re-query with destination loaded
    return get_package_by_id(db, package.id)


def update_package(
    db: Session,
    package_id: UUID,
    payload: PackageUpdateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageResponse:
    """Update package attributes, validate constraints, and record audit log."""
    package = (
        db.execute(
            select(Package)
            .options(joinedload(Package.destination))
            .where(Package.id == package_id)
        )
        .unique()
        .scalar_one_or_none()
    )

    if package is None:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package with ID {package_id} was not found.",
        )

    changes: dict[str, object] = {}

    if (
        payload.destination_id is not None
        and payload.destination_id != package.destination_id
    ):
        destination = db.execute(
            select(Destination.id).where(
                Destination.id == payload.destination_id,
                Destination.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if destination is None:
            raise ApiError(
                status_code=404,
                code="DESTINATION_NOT_FOUND",
                message=f"Active destination with ID {payload.destination_id} was not found.",
            )
        changes["destination_id"] = {
            "old": str(package.destination_id),
            "new": str(payload.destination_id),
        }
        package.destination_id = payload.destination_id

    if payload.name is not None and payload.name.strip() != package.name:
        changes["name"] = {"old": package.name, "new": payload.name.strip()}
        package.name = payload.name.strip()

    if payload.slug is not None:
        candidate_slug = slugify(payload.slug, max_length=220)
        if candidate_slug != package.slug:
            existing = db.execute(
                select(Package.id).where(
                    Package.slug == candidate_slug,
                    Package.id != package.id,
                )
            ).scalar_one_or_none()
            if existing:
                raise ApiError(
                    status_code=409,
                    code="SLUG_ALREADY_EXISTS",
                    message=f"A package with slug '{candidate_slug}' already exists.",
                )
            changes["slug"] = {"old": package.slug, "new": candidate_slug}
            package.slug = candidate_slug

    if payload.short_description is not None:
        package.short_description = (
            payload.short_description.strip() if payload.short_description else None
        )
    if payload.description is not None:
        package.description = (
            payload.description.strip() if payload.description else None
        )
    if payload.base_price is not None:
        changes["base_price"] = {
            "old": str(package.base_price),
            "new": str(payload.base_price),
        }
        package.base_price = payload.base_price
    if payload.currency is not None:
        package.currency = payload.currency.upper()
    if payload.duration_days is not None:
        package.duration_days = payload.duration_days
    if payload.duration_nights is not None:
        package.duration_nights = payload.duration_nights

    # Traveller range validation
    new_min = (
        payload.minimum_travellers
        if payload.minimum_travellers is not None
        else package.minimum_travellers
    )
    new_max = (
        payload.maximum_travellers
        if payload.maximum_travellers is not None
        else package.maximum_travellers
    )
    if new_max is not None and new_max < new_min:
        raise ApiError(
            status_code=400,
            code="INVALID_TRAVELLER_RANGE",
            message="Maximum travellers cannot be less than minimum travellers.",
        )
    if payload.minimum_travellers is not None:
        package.minimum_travellers = payload.minimum_travellers
    if payload.maximum_travellers is not None:
        package.maximum_travellers = payload.maximum_travellers

    if "category" in payload.model_fields_set:
        package.category = payload.category.strip() if payload.category else None
    if "travel_type" in payload.model_fields_set:
        package.travel_type = (
            payload.travel_type.strip() if payload.travel_type else None
        )
    if "difficulty_level" in payload.model_fields_set:
        package.difficulty_level = (
            payload.difficulty_level.strip() if payload.difficulty_level else None
        )
    if payload.departure_location is not None:
        package.departure_location = (
            payload.departure_location.strip() if payload.departure_location else None
        )
    if payload.cover_image_url is not None:
        package.cover_image_url = (
            payload.cover_image_url.strip() if payload.cover_image_url else None
        )
    if payload.inclusions_json is not None:
        package.inclusions_json = payload.inclusions_json
    if payload.exclusions_json is not None:
        package.exclusions_json = payload.exclusions_json
    if payload.child_price is not None:
        package.child_price = payload.child_price
    if payload.infant_price is not None:
        package.infant_price = payload.infant_price
    if payload.single_room_supplement is not None:
        package.single_room_supplement = payload.single_room_supplement
    if payload.booking_cutoff_days is not None:
        package.booking_cutoff_days = payload.booking_cutoff_days
    if payload.cancellation_policy is not None:
        package.cancellation_policy = (
            payload.cancellation_policy.strip() if payload.cancellation_policy else None
        )

    if payload.is_featured is not None:
        changes["is_featured"] = {
            "old": package.is_featured,
            "new": payload.is_featured,
        }
        package.is_featured = payload.is_featured
    if payload.is_published is not None:
        changes["is_published"] = {
            "old": package.is_published,
            "new": payload.is_published,
        }
        package.is_published = payload.is_published
    if payload.seo_title is not None:
        package.seo_title = payload.seo_title.strip() if payload.seo_title else None
    if payload.seo_description is not None:
        package.seo_description = (
            payload.seo_description.strip() if payload.seo_description else None
        )

    # Handle active status toggle
    if payload.is_active is not None:
        is_currently_active = package.deleted_at is None
        if payload.is_active != is_currently_active:
            if not payload.is_active:
                package.deleted_at = datetime.now(timezone.utc)
                package.is_published = False
                changes["is_active"] = {"old": True, "new": False}
            else:
                package.deleted_at = None
                changes["is_active"] = {"old": False, "new": True}

    record_audit_log(
        db=db,
        action="package_updated",
        entity_type="package",
        entity_id=str(package.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"changes": changes},
    )
    db.commit()

    return get_package_by_id(db, package.id)


def delete_package(
    db: Session,
    package_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageResponse:
    """Soft-delete/deactivate a package to preserve booking and itinerary history safely."""
    package = (
        db.execute(
            select(Package)
            .options(joinedload(Package.destination))
            .where(Package.id == package_id)
        )
        .unique()
        .scalar_one_or_none()
    )

    if package is None:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package with ID {package_id} was not found.",
        )

    # Check for dependent bookings to document safe deletion reasoning
    booking_count = db.execute(
        select(func.count(Booking.id)).where(Booking.package_id == package.id)
    ).scalar_one()

    # Soft-delete preserves financial history and audit trails
    package.deleted_at = datetime.now(timezone.utc)
    package.is_published = False

    record_audit_log(
        db=db,
        action="package_deactivated",
        entity_type="package",
        entity_id=str(package.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "slug": package.slug,
            "name": package.name,
            "dependent_bookings_count": booking_count,
        },
    )
    db.commit()

    return get_package_by_id(db, package.id)
