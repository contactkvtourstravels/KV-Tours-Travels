"""Administrative routes for inspecting notification audit logs and retrying failed deliveries."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.csrf import verify_csrf_token
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
)
from app.core.rate_limit import admin_ops_limiter
from app.db.session import get_db_session
from app.models.content import NotificationLog
from app.models.user import User
from app.schemas.notification import (
    NotificationLogListResponse,
    NotificationLogResponse,
)
from app.services.email_service import get_email_service

router = APIRouter(prefix="/notifications", tags=["admin-notifications"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


@router.get("", response_model=NotificationLogListResponse)
def list_notifications(
    _admin: StaffOrAbove,
    db: DbSession,
    channel: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> NotificationLogListResponse:
    """List outbound communication logs (email, WhatsApp) with delivery statuses and provider IDs."""
    stmt = select(NotificationLog).order_by(NotificationLog.created_at.desc())
    count_stmt = select(func.count(NotificationLog.id))

    if channel:
        stmt = stmt.where(NotificationLog.channel == channel)
        count_stmt = count_stmt.where(NotificationLog.channel == channel)

    if status_filter:
        stmt = stmt.where(NotificationLog.status == status_filter)
        count_stmt = count_stmt.where(NotificationLog.status == status_filter)

    total = db.execute(count_stmt).scalar() or 0
    offset = (page - 1) * page_size
    items = db.execute(stmt.offset(offset).limit(page_size)).scalars().all()

    return NotificationLogListResponse(
        items=[NotificationLogResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{notification_id}/retry", response_model=NotificationLogResponse)
def retry_notification(
    notification_id: UUID,
    request: Request,
    _admin: StaffOrAbove,
    db: DbSession,
) -> NotificationLogResponse:
    """Retry dispatching a previously failed notification. CSRF protected."""
    verify_csrf_token(request)
    admin_ops_limiter.check(str(_admin.id))
    email_service = get_email_service()
    updated_log = email_service.retry_notification(db, notification_id)
    db.commit()
    db.refresh(updated_log)
    return NotificationLogResponse.model_validate(updated_log)
