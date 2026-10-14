"""Public customer-facing promotional Best Offers endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.offers import PublicOffersResponse
from app.services.offers_service import OffersService

router = APIRouter(prefix="/offers", tags=["public-offers"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get("", response_model=PublicOffersResponse)
def get_public_best_offers(db: DbSession) -> PublicOffersResponse:
    """Retrieve currently active and eligible best offers for the homepage.

    Returns empty list if the Best Offers master toggle is disabled.
    """
    return OffersService.get_public_offers(db=db)
