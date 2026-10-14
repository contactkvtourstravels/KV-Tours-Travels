"""Public group trip departures routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.catalog import PublicDepartureListItem
from app.services.catalog_service import get_public_all_departures

router = APIRouter(prefix="/departures", tags=["public-departures"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get("", response_model=list[PublicDepartureListItem])
def list_public_departures(db: DbSession) -> list[PublicDepartureListItem]:
    """Retrieve all open upcoming departures across all published packages."""
    return get_public_all_departures(db=db)
