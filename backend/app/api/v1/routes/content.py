"""Public content pages API routes (About, Contact)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.auth import get_optional_current_user
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
    has_any_role,
)
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.content import PublicPageResponse
from app.services.content_service import get_public_page

router = APIRouter(prefix="/content", tags=["public-content"])

DbSession = Annotated[Session, Depends(get_db_session)]
OptionalUser = Annotated[User | None, Depends(get_optional_current_user)]


@router.get("/pages/{slug}", response_model=PublicPageResponse)
def get_page_content_endpoint(
    slug: str,
    db: DbSession,
    user: OptionalUser = None,
    preview: bool = Query(False, description="Preview draft content (requires staff/admin authentication)"),
) -> PublicPageResponse:
    """Retrieve published content for a public page (or draft content if preview requested by staff)."""
    is_authorized_for_preview = False
    if preview and user and has_any_role(user, (ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)):
        is_authorized_for_preview = True

    return get_public_page(
        db=db,
        slug=slug,
        is_preview=is_authorized_for_preview,
    )
