"""Public read-only package catalog routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.catalog import (
    PublicDepartureSummary,
    PublicItineraryDaySummary,
    PublicPackageDetail,
    PublicPackageListItem,
)
from app.services.catalog_service import (
    get_public_package_by_slug,
    get_public_package_departures,
    get_public_package_itinerary,
    get_public_packages,
)

import json
from typing import Any
from fastapi import APIRouter, Depends, Query, Response
from app.core.cache import catalog_cache

router = APIRouter(prefix="/packages", tags=["public-packages"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get("", response_model=list[PublicPackageListItem])
def list_packages(
    db: DbSession,
    destination_slug: Annotated[str | None, Query()] = None,
    travel_type: Annotated[str | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    is_featured: Annotated[bool | None, Query()] = None,
    limit: Annotated[int | None, Query(ge=1, le=500)] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Any:
    """Retrieve public published packages with optional filtering and pagination."""
    cache_key = f"packages_raw_json:{destination_slug or ''}:{travel_type or ''}:{category or ''}:{is_featured}:{limit}:{offset}"
    cached_raw = catalog_cache.get(cache_key)
    if cached_raw:
        return Response(content=cached_raw, media_type="application/json")

    packages = get_public_packages(
        db=db,
        destination_slug=destination_slug,
        travel_type=travel_type,
        category=category,
        is_featured=is_featured,
        limit=limit,
        offset=offset,
    )
    raw = json.dumps([p.model_dump(mode="json") for p in packages])
    catalog_cache.set(cache_key, raw, ttl_seconds=60, tags=["packages"])
    return Response(content=raw, media_type="application/json")


@router.get("/{slug}", response_model=PublicPackageDetail)
def get_package(
    slug: str,
    db: DbSession,
) -> PublicPackageDetail:
    """Retrieve complete package details including itinerary, hotels, and departures."""
    return get_public_package_by_slug(db=db, slug=slug)


@router.get("/{slug}/itinerary", response_model=list[PublicItineraryDaySummary])
def get_package_itinerary(
    slug: str,
    db: DbSession,
) -> list[PublicItineraryDaySummary]:
    """Retrieve day-by-day itinerary with activities for a package."""
    return get_public_package_itinerary(db=db, slug=slug)


@router.get("/{slug}/departures", response_model=list[PublicDepartureSummary])
def get_package_departures(
    slug: str,
    db: DbSession,
) -> list[PublicDepartureSummary]:
    """Retrieve open upcoming group departures with capacity availability."""
    return get_public_package_departures(db=db, slug=slug)
