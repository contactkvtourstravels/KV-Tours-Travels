"""Service for recording, querying, and sanitizing administrative audit logs."""

from __future__ import annotations

import json
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


def sanitize_metadata(data: Any) -> dict[str, Any] | None:
    """Remove any sensitive fields, secrets, or credential material from audit metadata."""
    if not data:
        return None

    if isinstance(data, str):
        try:
            parsed = json.loads(data)
            if isinstance(parsed, dict):
                data = parsed
            else:
                return {"info": str(data)}
        except Exception:
            return {"info": str(data)}

    if not isinstance(data, dict):
        return {"info": str(data)}

    cleaned: dict[str, Any] = {}
    for key, value in data.items():
        lower_key = str(key).lower()
        if any(sensitive in lower_key for sensitive in SENSITIVE_KEYS):
            cleaned[str(key)] = "[REDACTED]"
        elif isinstance(value, dict):
            cleaned[str(key)] = sanitize_metadata(value)
        else:
            cleaned[str(key)] = value
    return cleaned


def sanitize_ip(ip: str | None) -> str | None:
    """Sanitize IP address string from request headers, stripping ports and proxy chains."""
    if not ip or not isinstance(ip, str):
        return None
    ip_str = ip.strip()
    if not ip_str:
        return None
    # If comma-separated (e.g. "client, proxy1, proxy2"), take the client IP
    if "," in ip_str:
        ip_str = ip_str.split(",")[0].strip()
    # Strip port if present in IPv4 (e.g. 1.2.3.4:8080)
    if ":" in ip_str and not ip_str.endswith("]"):
        if ip_str.count(":") == 1:
            ip_str = ip_str.split(":")[0].strip()
    # Strip brackets from IPv6 (e.g. [2001:db8::1] -> 2001:db8::1)
    if ip_str.startswith("[") and "]" in ip_str:
        ip_str = ip_str[1:ip_str.index("]")]
    # Limit length for database column safety
    clean = ip_str[:45].strip()
    return clean if clean else None


def record_audit_log(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    actor_user_id: UUID | None = None,
    ip_address: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog | None:
    """Persist an immutable audit log record with sanitized metadata.
    
    Resilient: audit log write failures never crash the primary business operation.
    """
    try:
        safe_metadata = sanitize_metadata(metadata)
        safe_ip = sanitize_ip(ip_address)
        entry = AuditLog(
            action=action[:100],
            entity_type=entity_type[:100],
            entity_id=str(entity_id)[:100] if entity_id else None,
            actor_user_id=actor_user_id,
            ip_address=safe_ip,
            metadata_json=safe_metadata,
        )
        db.add(entry)
        db.flush()
        return entry
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "Failed to record audit log (%s on %s): %s", action, entity_type, exc
        )
        return None


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

    # Filter conditions for both count and record queries
    filters = []
    if actor_user_id is not None:
        filters.append(AuditLog.actor_user_id == actor_user_id)
    if action:
        filters.append(AuditLog.action == action)
    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)
    if from_date:
        filters.append(AuditLog.created_at >= from_date)
    if to_date:
        filters.append(AuditLog.created_at <= to_date)

    # Count total matching records directly without subquery column collision
    count_query = select(func.count(AuditLog.id))
    if filters:
        count_query = count_query.where(*filters)
    total = db.execute(count_query).scalar_one()

    # Query records with actor eagerly loaded
    query = select(AuditLog).options(joinedload(AuditLog.actor))
    if filters:
        query = query.where(*filters)

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
            actor_name = f"{log.actor.first_name or ''} {log.actor.last_name or ''}".strip() or log.actor.email
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
                ip_address=str(log.ip_address) if log.ip_address is not None else None,
                metadata_json=sanitize_metadata(log.metadata_json),
                created_at=log.created_at,
            )
        )

    return paginate(items, total, page, page_size)
