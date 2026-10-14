"""Public read-only add-on services catalog routes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.catalog import PublicAddOnSummary
from app.services.catalog_service import get_public_add_ons

router = APIRouter(prefix="/add-ons", tags=["public-add-ons"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get("", response_model=list[PublicAddOnSummary])
def list_public_add_ons(
    db: DbSession,
    package_id: UUID | None = None,
    destination_id: UUID | None = None,
) -> list[PublicAddOnSummary]:
    """Retrieve all active add-on extra services available for package bookings."""
    return get_public_add_ons(
        db=db, package_id=package_id, destination_id=destination_id
    )
