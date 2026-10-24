"""Service for administrative destination catalog management."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.catalog import Destination, Package
from app.schemas.admin import (
    DestinationCreateRequest,
    DestinationResponse,
    DestinationUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.audit_service import record_audit_log
from app.services.admin.utils import generate_unique_slug, paginate, slugify
from app.core.cache import catalog_cache


def serialize_destination(
    dest: Destination, package_count: int = 0
) -> DestinationResponse:
    """Serialize Destination model into DestinationResponse schema."""
    is_active = dest.deleted_at is None
    return DestinationResponse(
        id=dest.id,
        name=dest.name,
        slug=dest.slug,
        short_description=dest.short_description,
        description=dest.description,
        country=dest.country,
        region=dest.region,
        state_or_city=dest.state_or_city,
        category=dest.category,
        travel_type=dest.travel_type,
        cover_image_url=dest.cover_image_url,
        display_order=dest.display_order or 0,
        highlights_json=dest.highlights_json,
        travel_guide_json=dest.travel_guide_json,
        faqs_json=dest.faqs_json,
        social_image_url=dest.social_image_url,
        is_featured=dest.is_featured,
        is_published=dest.is_published,
        is_active=is_active,
        deleted_at=dest.deleted_at,
        seo_title=dest.seo_title,
        seo_description=dest.seo_description,
        created_at=dest.created_at,
        updated_at=dest.updated_at,
        package_count=package_count,
    )


def list_destinations(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    is_published: bool | None = None,
    is_featured: bool | None = None,
    is_active: bool | None = None,
) -> PaginatedResponse[DestinationResponse]:
    """Query destinations with pagination, filters, and package counts."""
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = select(Destination)

    if is_active is True:
        query = query.where(Destination.deleted_at.is_(None))
    elif is_active is False:
        query = query.where(Destination.deleted_at.is_not(None))

    if is_published is not None:
        query = query.where(Destination.is_published == is_published)

    if is_featured is not None:
        query = query.where(Destination.is_featured == is_featured)

    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Destination.name).like(search_term),
                func.lower(Destination.country).like(search_term),
                func.lower(Destination.region).like(search_term),
                func.lower(Destination.slug).like(search_term),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.execute(count_query).scalar_one()

    # Query items
    query = (
        query.order_by(desc(Destination.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    destinations = db.execute(query).scalars().all()

    # Fetch package counts for the selected destinations
    dest_ids = [d.id for d in destinations]
    package_counts: dict[UUID, int] = {}
    if dest_ids:
        counts = db.execute(
            select(Package.destination_id, func.count(Package.id))
            .where(Package.destination_id.in_(dest_ids), Package.deleted_at.is_(None))
            .group_by(Package.destination_id)
        ).all()
        package_counts = {dest_id: count for dest_id, count in counts}

    items = [
        serialize_destination(d, package_counts.get(d.id, 0)) for d in destinations
    ]
    return paginate(items, total, page, page_size)


def get_destination_by_id(db: Session, destination_id: UUID) -> DestinationResponse:
    """Retrieve single destination by ID or raise 404."""
    destination = db.execute(
        select(Destination).where(Destination.id == destination_id)
    ).scalar_one_or_none()

    if destination is None:
        raise ApiError(
            status_code=404,
            code="DESTINATION_NOT_FOUND",
            message=f"Destination with ID {destination_id} was not found.",
        )

    # Get active package count
    package_count = db.execute(
        select(func.count(Package.id)).where(
            Package.destination_id == destination.id,
            Package.deleted_at.is_(None),
        )
    ).scalar_one()

    return serialize_destination(destination, package_count)


def create_destination(
    db: Session,
    payload: DestinationCreateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> DestinationResponse:
    """Create a new destination with unique slug verification and audit logging."""
    if payload.slug:
        candidate_slug = slugify(payload.slug)
        existing = db.execute(
            select(Destination.id).where(Destination.slug == candidate_slug)
        ).scalar_one_or_none()
        if existing:
            raise ApiError(
                status_code=409,
                code="SLUG_ALREADY_EXISTS",
                message=f"A destination with slug '{candidate_slug}' already exists.",
            )
        slug = candidate_slug
    else:
        slug = generate_unique_slug(db, Destination, payload.name)

    destination = Destination(
        name=payload.name.strip(),
        slug=slug,
        short_description=payload.short_description.strip()
        if payload.short_description
        else None,
        description=payload.description.strip() if payload.description else None,
        country=payload.country.strip(),
        region=payload.region.strip() if payload.region else None,
        state_or_city=payload.state_or_city.strip() if payload.state_or_city else None,
        category=payload.category.strip() if payload.category else None,
        travel_type=payload.travel_type.strip() if payload.travel_type else None,
        cover_image_url=payload.cover_image_url.strip()
        if payload.cover_image_url
        else None,
        display_order=payload.display_order,
        highlights_json=payload.highlights_json,
        travel_guide_json=payload.travel_guide_json,
        faqs_json=payload.faqs_json,
        social_image_url=payload.social_image_url.strip()
        if payload.social_image_url
        else None,
        is_featured=payload.is_featured,
        is_published=payload.is_published,
        seo_title=payload.seo_title.strip() if payload.seo_title else None,
        seo_description=payload.seo_description.strip()
        if payload.seo_description
        else None,
    )
    db.add(destination)
    db.flush()

    record_audit_log(
        db=db,
        action="destination_created",
        entity_type="destination",
        entity_id=str(destination.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "name": destination.name,
            "slug": destination.slug,
            "country": destination.country,
            "is_published": destination.is_published,
        },
    )
    db.commit()
    catalog_cache.invalidate(["destinations"])
    return serialize_destination(destination, 0)


def update_destination(
    db: Session,
    destination_id: UUID,
    payload: DestinationUpdateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> DestinationResponse:
    """Update destination fields, check slug collisions, handle active status, and record audit log."""
    destination = db.execute(
        select(Destination).where(Destination.id == destination_id)
    ).scalar_one_or_none()

    if destination is None:
        raise ApiError(
            status_code=404,
            code="DESTINATION_NOT_FOUND",
            message=f"Destination with ID {destination_id} was not found.",
        )

    changes: dict[str, object] = {}

    if payload.name is not None and payload.name.strip() != destination.name:
        changes["name"] = {"old": destination.name, "new": payload.name.strip()}
        destination.name = payload.name.strip()

    if payload.slug is not None:
        candidate_slug = slugify(payload.slug)
        if candidate_slug != destination.slug:
            existing = db.execute(
                select(Destination.id).where(
                    Destination.slug == candidate_slug,
                    Destination.id != destination.id,
                )
            ).scalar_one_or_none()
            if existing:
                raise ApiError(
                    status_code=409,
                    code="SLUG_ALREADY_EXISTS",
                    message=f"A destination with slug '{candidate_slug}' already exists.",
                )
            changes["slug"] = {"old": destination.slug, "new": candidate_slug}
            destination.slug = candidate_slug

    if payload.short_description is not None:
        destination.short_description = (
            payload.short_description.strip() if payload.short_description else None
        )
    if payload.description is not None:
        destination.description = (
            payload.description.strip() if payload.description else None
        )
    if payload.country is not None:
        destination.country = payload.country.strip()
    if payload.region is not None:
        destination.region = payload.region.strip() if payload.region else None
    if payload.state_or_city is not None:
        destination.state_or_city = (
            payload.state_or_city.strip() if payload.state_or_city else None
        )
    if "category" in payload.model_fields_set:
        destination.category = payload.category.strip() if payload.category else None
    if "travel_type" in payload.model_fields_set:
        destination.travel_type = (
            payload.travel_type.strip() if payload.travel_type else None
        )
    if payload.cover_image_url is not None:
        destination.cover_image_url = (
            payload.cover_image_url.strip() if payload.cover_image_url else None
        )
    if payload.display_order is not None:
        destination.display_order = payload.display_order
    if payload.highlights_json is not None:
        destination.highlights_json = payload.highlights_json
    if payload.travel_guide_json is not None:
        destination.travel_guide_json = payload.travel_guide_json
    if payload.faqs_json is not None:
        destination.faqs_json = payload.faqs_json
    if payload.social_image_url is not None:
        destination.social_image_url = (
            payload.social_image_url.strip() if payload.social_image_url else None
        )
    if payload.is_featured is not None:
        changes["is_featured"] = {
            "old": destination.is_featured,
            "new": payload.is_featured,
        }
        destination.is_featured = payload.is_featured
    if payload.is_published is not None:
        changes["is_published"] = {
            "old": destination.is_published,
            "new": payload.is_published,
        }
        destination.is_published = payload.is_published
    if payload.seo_title is not None:
        destination.seo_title = payload.seo_title.strip() if payload.seo_title else None
    if payload.seo_description is not None:
        destination.seo_description = (
            payload.seo_description.strip() if payload.seo_description else None
        )

    # Handle active/deleted_at toggle
    if payload.is_active is not None:
        is_currently_active = destination.deleted_at is None
        if payload.is_active != is_currently_active:
            if not payload.is_active:
                destination.deleted_at = datetime.now(timezone.utc)
                destination.is_published = False
                changes["is_active"] = {"old": True, "new": False}
            else:
                destination.deleted_at = None
                changes["is_active"] = {"old": False, "new": True}

    record_audit_log(
        db=db,
        action="destination_updated",
        entity_type="destination",
        entity_id=str(destination.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"changes": changes},
    )
    db.commit()
    catalog_cache.invalidate(["destinations"])

    package_count = db.execute(
        select(func.count(Package.id)).where(
            Package.destination_id == destination.id,
            Package.deleted_at.is_(None),
        )
    ).scalar_one()

    return serialize_destination(destination, package_count)


def delete_destination(
    db: Session,
    destination_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> DestinationResponse:
    """Soft-delete/deactivate destination and record audit log."""
    destination = db.execute(
        select(Destination).where(Destination.id == destination_id)
    ).scalar_one_or_none()

    if destination is None:
        raise ApiError(
            status_code=404,
            code="DESTINATION_NOT_FOUND",
            message=f"Destination with ID {destination_id} was not found.",
        )

    destination.deleted_at = datetime.now(timezone.utc)
    destination.is_published = False

    record_audit_log(
        db=db,
        action="destination_deactivated",
        entity_type="destination",
        entity_id=str(destination.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"slug": destination.slug, "name": destination.name},
    )
    db.commit()
    catalog_cache.invalidate(["destinations"])

    package_count = db.execute(
        select(func.count(Package.id)).where(
            Package.destination_id == destination.id,
            Package.deleted_at.is_(None),
        )
    ).scalar_one()

    return serialize_destination(destination, package_count)
