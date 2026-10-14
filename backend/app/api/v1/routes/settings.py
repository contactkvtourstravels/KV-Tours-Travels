"""Public agency configuration and settings routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.catalog import PublicSiteSettings
from app.services.catalog_service import get_public_settings

router = APIRouter(prefix="/settings", tags=["public-settings"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get("", response_model=PublicSiteSettings)
def get_site_settings(db: DbSession) -> PublicSiteSettings:
    """Retrieve public agency branding, location, contact, and WhatsApp config."""
    return get_public_settings(db=db)
