"""Administrative content management routes for About and Contact pages."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.csrf import verify_csrf_token
from app.core.permissions import ROLE_ADMIN, ROLE_SUPER_ADMIN
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.content import (
    AdminPageEnvelopeResponse,
    AdminPageUpdateRequest,
)
from app.services.content_service import (
    discard_admin_page_draft,
    get_admin_page,
    publish_admin_page,
    update_admin_page,
)

router = APIRouter(prefix="/content", tags=["admin-content"])

DbSession = Annotated[Session, Depends(get_db_session)]
AdminOnly = Annotated[User, Depends(require_role(ROLE_ADMIN, ROLE_SUPER_ADMIN))]


def _extract_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("/pages/{slug}", response_model=AdminPageEnvelopeResponse)
def get_admin_page_endpoint(
    slug: str,
    _admin: AdminOnly,
    db: DbSession,
) -> AdminPageEnvelopeResponse:
    """Load complete draft and published state for an administrative page editor."""
    return get_admin_page(db=db, slug=slug)


@router.put("/pages/{slug}", response_model=AdminPageEnvelopeResponse)
def update_admin_page_endpoint(
    slug: str,
    payload: AdminPageUpdateRequest,
    request: Request,
    admin: AdminOnly,
    db: DbSession,
) -> AdminPageEnvelopeResponse:
    """Save draft content or immediately publish changes to a page."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_admin_page(
        db=db,
        slug=slug,
        draft_data=payload.draft,
        admin_id=admin.id,
        ip_address=ip_address,
        publish_immediately=payload.publish_immediately,
    )


@router.post("/pages/{slug}/publish", response_model=AdminPageEnvelopeResponse)
def publish_admin_page_endpoint(
    slug: str,
    request: Request,
    admin: AdminOnly,
    db: DbSession,
) -> AdminPageEnvelopeResponse:
    """Publish the active draft content to the live public page."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return publish_admin_page(
        db=db,
        slug=slug,
        admin_id=admin.id,
        ip_address=ip_address,
    )


@router.post("/pages/{slug}/discard", response_model=AdminPageEnvelopeResponse)
def discard_admin_page_draft_endpoint(
    slug: str,
    request: Request,
    admin: AdminOnly,
    db: DbSession,
) -> AdminPageEnvelopeResponse:
    """Discard all uncommitted draft changes and reset draft to published version."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return discard_admin_page_draft(
        db=db,
        slug=slug,
        admin_id=admin.id,
        ip_address=ip_address,
    )
