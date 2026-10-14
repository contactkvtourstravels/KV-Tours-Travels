"""Incoming webhook endpoints for third-party providers (Resend)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.content import AuditLog, NotificationLog
from app.services.admin.audit_service import record_audit_log
from app.services.admin.settings_service import resolve_resend_signing_secret

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
DbSession = Annotated[Session, Depends(get_db_session)]


def verify_resend_svix_signature(
    raw_body: bytes,
    svix_id: str | None,
    svix_timestamp: str | None,
    svix_signature: str | None,
    secret: str | None,
    tolerance_seconds: int = 300,
) -> bool:
    """Verify Svix HMAC-SHA256 signature according to Resend webhook documentation."""
    if not svix_id or not svix_timestamp or not svix_signature or not secret:
        return False

    # Check timestamp freshness
    try:
        ts = int(svix_timestamp)
        now = int(time.time())
        if abs(now - ts) > tolerance_seconds:
            logger.warning("Resend webhook timestamp drift exceeded tolerance (%s vs %s)", ts, now)
            return False
    except ValueError:
        return False

    # Normalize secret
    clean_sec = secret.strip().removeprefix("whsec_")

    try:
        key_bytes = base64.b64decode(clean_sec)
    except Exception:  # noqa: BLE001
        key_bytes = clean_sec.encode()

    to_sign = f"{svix_id}.{svix_timestamp}.".encode() + raw_body
    computed_digest = hmac.new(key_bytes, to_sign, hashlib.sha256).digest()
    expected_sig = base64.b64encode(computed_digest).decode()

    # Match against provided signatures
    for item in svix_signature.split(" "):
        parts = item.split(",", 1)
        if len(parts) == 2 and parts[0] == "v1" and hmac.compare_digest(parts[1], expected_sig):
            return True

    return False



@router.post("/resend")
async def receive_resend_webhook(
    request: Request,
    db: DbSession,
    svix_id: Annotated[str | None, Header(alias="svix-id")] = None,
    svix_timestamp: Annotated[str | None, Header(alias="svix-timestamp")] = None,
    svix_signature: Annotated[str | None, Header(alias="svix-signature")] = None,
) -> dict[str, Any]:
    """Process incoming Resend delivery events (sent, delivered, bounced, complained, delayed).

    Verifies Svix signature, ensures idempotency, and updates notification logs without
    ever altering customer payment or booking confirmation states.
    """
    raw_body = await request.body()

    # 1. Resolve signing secret from database or environment
    signing_secret, _source = resolve_resend_signing_secret(db)
    if not signing_secret:
        logger.warning("Received Resend webhook but no signing secret is configured.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resend webhook signing secret is not configured.",
        )

    # 2. Validate required Svix headers
    missing_headers: list[str] = []
    if not svix_id:
        missing_headers.append("svix-id")
    if not svix_timestamp:
        missing_headers.append("svix-timestamp")
    if not svix_signature:
        missing_headers.append("svix-signature")
    if missing_headers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required Svix signature headers: {', '.join(missing_headers)}",
        )

    # 3. Validate timestamp freshness / replay attack window
    try:
        ts = int(svix_timestamp)  # type: ignore[arg-type]
        now = int(time.time())
        if abs(now - ts) > 300:
            logger.warning("Resend webhook timestamp drift exceeded tolerance (%s vs %s)", ts, now)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Webhook timestamp outside tolerance window.",
            )
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid svix-timestamp header format.",
        ) from exc

    # 4. Verify Svix signature
    is_valid = verify_resend_svix_signature(
        raw_body=raw_body,
        svix_id=svix_id,
        svix_timestamp=svix_timestamp,
        svix_signature=svix_signature,
        secret=signing_secret,
    )
    if not is_valid:
        logger.warning("Rejected Resend webhook due to invalid Svix signature.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature.",
        )

    # 3. Parse JSON payload
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON payload: {exc}",
        ) from exc

    event_type = str(payload.get("type", "unknown"))
    data = payload.get("data") or {}
    email_id = str(data.get("email_id") or "")

    # 4. Idempotency protection against duplicate event processing
    if svix_id:
        existing_event = db.execute(
            select(AuditLog).where(
                AuditLog.action == "resend_webhook_received",
                AuditLog.entity_id == svix_id,
            )
        ).scalars().first()
        if existing_event:
            return {"status": "already_processed", "event_id": svix_id}

    # 5. Correlate with NotificationLog by provider_message_id
    notification_log: NotificationLog | None = None
    if email_id:
        notification_log = db.execute(
            select(NotificationLog).where(NotificationLog.provider_message_id == email_id)
        ).scalars().first()

    now = datetime.now(timezone.utc)

    if notification_log:
        if event_type == "email.delivered":
            notification_log.status = "delivered"
            if not notification_log.sent_at:
                notification_log.sent_at = now
        elif event_type == "email.bounced":
            notification_log.status = "failed"
            bounce_data = data.get("bounce") or {}
            b_type = bounce_data.get("type") or "Hard"
            b_msg = bounce_data.get("message") or "Mailbox rejected"
            notification_log.error_message = f"Bounced ({b_type}): {b_msg}"
        elif event_type == "email.complained":
            notification_log.status = "failed"
            notification_log.error_message = "Recipient marked email as spam / complaint."
        elif event_type == "email.sent":
            if notification_log.status == "pending":
                notification_log.status = "sent"
        elif event_type == "email.delivery_delayed":
            notification_log.error_message = "Delivery temporarily delayed by recipient mail server."

        db.flush()

    # 6. Record audit log entry
    record_audit_log(
        db=db,
        action="resend_webhook_received",
        entity_type="notification",
        entity_id=svix_id or email_id or "unknown",
        metadata={
            "event_type": event_type,
            "email_id": email_id,
            "recipient": data.get("to"),
            "subject": data.get("subject"),
            "matched_log_id": str(notification_log.id) if notification_log else None,
        },
    )
    db.commit()

    return {
        "success": True,
        "event": event_type,
        "email_id": email_id,
        "matched": bool(notification_log),
    }
