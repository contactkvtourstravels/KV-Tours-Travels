"""Public read-only destination catalog routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.catalog import (
    PublicDestinationDetail,
    PublicDestinationListItem,
)
from app.services.catalog_service import (
    get_public_destination_by_slug,
    get_public_destinations,
)

import json
from typing import Any
from fastapi import APIRouter, Depends, Query, Response
from app.core.cache import catalog_cache

router = APIRouter(prefix="/destinations", tags=["public-destinations"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get("", response_model=list[PublicDestinationListItem])
def list_destinations(
    db: DbSession,
    country: Annotated[str | None, Query()] = None,
    travel_type: Annotated[str | None, Query()] = None,
    is_featured: Annotated[bool | None, Query()] = None,
    limit: Annotated[int | None, Query(ge=1, le=500)] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Any:
    """Retrieve public published destinations with optional filtering and pagination."""
    cache_key = f"destinations_raw_json:{country or ''}:{travel_type or ''}:{is_featured}:{limit}:{offset}"
    cached_raw = catalog_cache.get(cache_key)
    if cached_raw:
        return Response(content=cached_raw, media_type="application/json")

    destinations = get_public_destinations(
        db=db,
        country=country,
        travel_type=travel_type,
        is_featured=is_featured,
        limit=limit,
        offset=offset,
    )
    raw = json.dumps([d.model_dump(mode="json") for d in destinations])
    catalog_cache.set(cache_key, raw, ttl_seconds=60, tags=["destinations"])
    return Response(content=raw, media_type="application/json")


@router.get("/{slug}", response_model=PublicDestinationDetail)
def get_destination(
    slug: str,
    db: DbSession,
) -> PublicDestinationDetail:
    """Retrieve public destination details with galleries and SEO tags."""
    return get_public_destination_by_slug(db=db, slug=slug)
