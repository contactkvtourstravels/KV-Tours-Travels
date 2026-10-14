"""Administrative audit log explorer routes."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.permissions import ROLE_ADMIN, ROLE_SUPER_ADMIN
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.admin import AuditLogResponse, PaginatedResponse
from app.services.admin.audit_service import list_audit_logs

router = APIRouter(prefix="/audit-logs", tags=["admin-audit-logs"])

DbSession = Annotated[Session, Depends(get_db_session)]
AdminOnlyUser = Annotated[
    User,
    Depends(require_role(ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


@router.get("", response_model=PaginatedResponse[AuditLogResponse])
def get_audit_logs(
    _admin: AdminOnlyUser,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    actor_user_id: Annotated[UUID | None, Query()] = None,
    action: Annotated[str | None, Query()] = None,
    entity_type: Annotated[str | None, Query()] = None,
    from_date: Annotated[datetime | None, Query()] = None,
    to_date: Annotated[datetime | None, Query()] = None,
) -> PaginatedResponse[AuditLogResponse]:
    """Query administrative audit log records with pagination and filtering.

    Accessible to admin and super_admin only. Sensitive fields are redacted.
    """
    return list_audit_logs(
        db=db,
        page=page,
        page_size=page_size,
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        from_date=from_date,
        to_date=to_date,
    )
