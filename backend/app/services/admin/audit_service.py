"""Service for recording, querying, and sanitizing administrative audit logs."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.content import AuditLog
from app.schemas.admin import AuditLogResponse, PaginatedResponse
from app.services.admin.utils import paginate

SENSITIVE_KEYS: frozenset[str] = frozenset(
    {
        "password",
        "password_hash",
        "password_hash_raw",
        "token",
        "token_hash",
        "session_token",
        "csrf_token",
        "secret",
        "credit_card",
        "cvv",
        "auth_token",
    }
)


def sanitize_metadata(data: dict[str, Any] | None) -> dict[str, Any] | None:
    """Remove any sensitive fields, secrets, or credential material from audit metadata."""
    if not data:
        return None

    cleaned: dict[str, Any] = {}
    for key, value in data.items():
        lower_key = key.lower()
        if any(sensitive in lower_key for sensitive in SENSITIVE_KEYS):
            cleaned[key] = "[REDACTED]"
        elif isinstance(value, dict):
            cleaned[key] = sanitize_metadata(value)
        else:
            cleaned[key] = value
    return cleaned


def record_audit_log(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    actor_user_id: UUID | None = None,
    ip_address: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    """Persist an immutable audit log record with sanitized metadata."""
    safe_metadata = sanitize_metadata(metadata)
    entry = AuditLog(
        action=action[:100],
        entity_type=entity_type[:100],
        entity_id=str(entity_id)[:100] if entity_id else None,
        actor_user_id=actor_user_id,
        ip_address=ip_address,
        metadata_json=safe_metadata,
    )
    db.add(entry)
    db.flush()
    return entry


def list_audit_logs(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    actor_user_id: UUID | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> PaginatedResponse[AuditLogResponse]:
    """Query audit logs with filtering, sorting (newest first), and pagination."""
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = select(AuditLog).options(joinedload(AuditLog.actor))

    if actor_user_id is not None:
        query = query.where(AuditLog.actor_user_id == actor_user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if from_date:
        query = query.where(AuditLog.created_at >= from_date)
    if to_date:
        query = query.where(AuditLog.created_at <= to_date)

    # Count total matching
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.execute(count_query).scalar_one()

    # Apply ordering and limit/offset
    query = (
        query.order_by(desc(AuditLog.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    records = db.execute(query).unique().scalars().all()

    items: list[AuditLogResponse] = []
    for log in records:
        actor_name = None
        actor_email = None
        if log.actor:
            actor_name = f"{log.actor.first_name} {log.actor.last_name}".strip()
            actor_email = log.actor.email

        items.append(
            AuditLogResponse(
                id=log.id,
                actor_user_id=log.actor_user_id,
                actor_email=actor_email,
                actor_name=actor_name,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                ip_address=log.ip_address,
                metadata_json=sanitize_metadata(log.metadata_json),
                created_at=log.created_at,
            )
        )

    return paginate(items, total, page, page_size)
