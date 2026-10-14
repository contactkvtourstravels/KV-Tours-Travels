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

router = APIRouter(prefix="/destinations", tags=["public-destinations"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get("", response_model=list[PublicDestinationListItem])
def list_destinations(
    db: DbSession,
    country: Annotated[str | None, Query()] = None,
    is_featured: Annotated[bool | None, Query()] = None,
) -> list[PublicDestinationListItem]:
    """Retrieve public published destinations."""
    return get_public_destinations(db=db, country=country, is_featured=is_featured)


@router.get("/{slug}", response_model=PublicDestinationDetail)
def get_destination(
    slug: str,
    db: DbSession,
) -> PublicDestinationDetail:
    """Retrieve public destination details with galleries and SEO tags."""
    return get_public_destination_by_slug(db=db, slug=slug)
