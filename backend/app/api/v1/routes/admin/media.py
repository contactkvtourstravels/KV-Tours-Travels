"""Administrative media governance, signed upload, and direct upload routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.csrf import verify_csrf_token
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
)
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.admin import (
    MediaUploadRequest,
    MediaUploadResponse,
    SignedUploadRequest,
    SignedUploadResponse,
)
from app.services.admin.media_service import generate_signed_upload, upload_media

router = APIRouter(prefix="/media", tags=["admin-media"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


def _extract_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/sign-upload", response_model=SignedUploadResponse)
def sign_upload_endpoint(
    payload: SignedUploadRequest,
    request: Request,
    admin: StaffOrAbove,
) -> SignedUploadResponse:
    """Generate authenticated parameters for direct-to-Cloudinary upload.

    Never exposes Cloudinary API secret to the client. CSRF protected.
    """
    verify_csrf_token(request)
    return generate_signed_upload(payload=payload, current_admin_id=admin.id)


@router.post("/upload", response_model=MediaUploadResponse, status_code=201)
def upload_media_endpoint(
    payload: MediaUploadRequest,
    request: Request,
    admin: StaffOrAbove,
    db: DbSession,
) -> MediaUploadResponse:
    """Upload media asset directly. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return upload_media(
        db=db,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )
