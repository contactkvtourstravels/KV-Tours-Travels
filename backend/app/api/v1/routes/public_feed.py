"""Consolidated public catalog feeds for optimized zero-waterfall page rendering."""

from __future__ import annotations

import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.cache import catalog_cache
from app.db.session import get_db_session
from app.schemas.catalog import PublicHomeFeed
from app.services.catalog_service import get_public_home_feed

router = APIRouter(prefix="/public", tags=["public-feeds"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get("/home-feed", response_model=PublicHomeFeed)
def get_home_feed_endpoint(
    db: DbSession,
    preview: Annotated[bool, Query()] = False,
) -> Any:
    """Consolidated public home feed returning destinations, packages, departures, settings, and content.

    Allows Next.js server components to hydrate the entire homepage in a single query pass,
    completely eliminating client-side API request waterfalls and stale content flashes.
    """
    raw_cache_key = f"home_feed_raw_json:{preview}"
    cached_raw = catalog_cache.get(raw_cache_key)
    if cached_raw:
        return Response(content=cached_raw, media_type="application/json")

    feed = get_public_home_feed(db, is_preview=preview)
    raw = feed.model_dump_json()
    catalog_cache.set(
        raw_cache_key,
        raw,
        ttl_seconds=60,
        tags=["home_feed", "destinations", "packages", "departures", "settings"],
    )
    return Response(content=raw, media_type="application/json")
