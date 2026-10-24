"""WhatsApp communication service supporting Click-to-Chat URLs and Meta Cloud API."""

from __future__ import annotations

import logging
import re
import urllib.parse
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.commerce import Booking, Payment
from app.models.content import NotificationLog, SiteSetting
from app.models.user import User

logger = logging.getLogger(__name__)


def _sanitize_phone(phone: str) -> str:
    """Strip all non-numeric characters except leading '+' for international standard."""
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    # wa.me format expects digits only without leading '+'
    return cleaned.lstrip("+")


class WhatsAppService:
    """WhatsApp communication service with Click-to-Chat and Meta Cloud API support."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def get_configured_phone(self, db: Session | None = None) -> str:
        """Resolve WhatsApp support number from database SiteSetting or fallback to env settings."""
        if db is not None:
            try:
                setting = db.get(SiteSetting, "whatsapp_number")
                if setting and setting.value:
                    val = str(setting.value).strip()
                    if val:
                        return val
            except Exception as exc:  # noqa: BLE001
                logger.warning("Could not read whatsapp_number site setting: %s", exc)

        return self.settings.whatsapp_number

    def get_configured_agency_name(self, db: Session | None = None) -> str:
        """Resolve public agency display name from SiteSetting or fallback."""
        if db is not None:
            try:
                from app.services.catalog_service import get_public_settings

                pub = get_public_settings(db)
                val = pub.public_display_name or pub.agency_name
                if val:
                    return val
            except Exception as exc:  # noqa: BLE001
                logger.warning("Could not read public settings for WhatsApp: %s", exc)
        return self.settings.agency_name

    def generate_click_to_chat_url(
        self, message: str, db: Session | None = None
    ) -> str:
        """Build direct wa.me click-to-chat URL with prefilled URL-encoded message."""
        phone = self.get_configured_phone(db)
        clean_phone = _sanitize_phone(phone)
        encoded_msg = urllib.parse.quote(message)
        return f"https://wa.me/{clean_phone}?text={encoded_msg}"

    def build_booking_inquiry_url(
        self, booking_ref: str, db: Session | None = None
    ) -> str:
        """Contextual action: Ask About My Booking."""
        agency = self.get_configured_agency_name(db)
        msg = f"Hi {agency}, I need help with booking {booking_ref}."
        return self.generate_click_to_chat_url(msg, db)

    def build_trip_inquiry_url(
        self, booking_ref: str, package_title: str, db: Session | None = None
    ) -> str:
        """Contextual action: Ask About My Trip."""
        agency = self.get_configured_agency_name(db)
        msg = f"Hi {agency}, I have a question regarding my upcoming trip '{package_title}' (Booking: {booking_ref})."
        return self.generate_click_to_chat_url(msg, db)

    def build_payment_help_url(
        self, booking_ref: str, db: Session | None = None
    ) -> str:
        """Contextual action: Need Help With Payment."""
        agency = self.get_configured_agency_name(db)
        msg = f"Hi {agency}, I need assistance with payment for booking {booking_ref}."
        return self.generate_click_to_chat_url(msg, db)

    def build_general_support_url(self, db: Session | None = None) -> str:
        """Contextual action: General Concierge Support."""
        agency = self.get_configured_agency_name(db)
        msg = f"Hi {agency}, I would like to inquire about your curated travel experiences."
        return self.generate_click_to_chat_url(msg, db)

    # -------------------------------------------------------------
    # Meta WhatsApp Business Cloud API Integration / Fallback
    # -------------------------------------------------------------

    def _send_cloud_api(
        self, recipient_phone: str, text_message: str, db: Session | None = None
    ) -> str:
        """Dispatch message via WhatsApp Business Cloud API if configured."""
        phone_id = None
        token = None
        api_ver = "v20.0"
        if db is not None:
            p_row = db.get(SiteSetting, "whatsapp_phone_number_id")
            if p_row and p_row.value:
                phone_id = str(p_row.value).strip()
            v_row = db.get(SiteSetting, "whatsapp_api_version")
            if v_row and v_row.value:
                api_ver = str(v_row.value).strip()
            from app.services.admin.settings_service import get_decrypted_secret
            token = get_decrypted_secret(db, "whatsapp_access_token")

        if not phone_id:
            phone_id = self.settings.whatsapp_business_phone_id
        if not token:
            token = self.settings.whatsapp_access_token.get_secret_value()

        if not phone_id or not token:
            logger.warning(
                "Meta WhatsApp Cloud API credentials missing; skipping API dispatch."
            )
            return f"wa-skipped-{uuid4().hex[:8]}"

        url = f"https://graph.facebook.com/{api_ver}/{phone_id}/messages"
        payload: dict[str, Any] = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": _sanitize_phone(recipient_phone),
            "type": "text",
            "text": {"preview_url": True, "body": text_message},
        }

        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            messages = data.get("messages") or [{}]
            return str(messages[0].get("id") or f"wa-api-{uuid4().hex[:8]}")

    def dispatch(
        self,
        db: Session,
        *,
        recipient_phone: str,
        message_body: str,
        notification_type: str,
        booking_id: UUID | None = None,
        recipient_user_id: UUID | None = None,
        idempotency_key: str | None = None,
    ) -> NotificationLog:
        """Dispatch WhatsApp message or record click-to-chat notification log."""
        if idempotency_key:
            existing = (
                db.execute(
                    select(NotificationLog).where(
                        NotificationLog.idempotency_key == idempotency_key
                    )
                )
                .scalars()
                .first()
            )
            if existing:
                return existing

        cloud_enabled_row = db.get(SiteSetting, "whatsapp_cloud_api_enabled")
        cloud_enabled = (
            str(cloud_enabled_row.value).lower() in ("true", "1", "yes")
            if cloud_enabled_row and cloud_enabled_row.value is not None
            else False
        )

        provider = "cloud_api" if cloud_enabled else self.settings.whatsapp_provider.lower()
        log_entry = NotificationLog(
            channel="whatsapp",
            notification_type=notification_type,
            recipient=recipient_phone,
            recipient_user_id=recipient_user_id,
            booking_id=booking_id,
            idempotency_key=idempotency_key,
            subject="WhatsApp Message",
            provider=provider,
            status="pending",
        )
        db.add(log_entry)
        db.flush()

        try:
            if provider == "cloud_api":
                msg_id = self._send_cloud_api(recipient_phone, message_body, db=db)
                log_entry.provider_message_id = msg_id
                log_entry.status = "sent"
                log_entry.sent_at = datetime.now(timezone.utc)
            else:
                # Direct click-to-chat fallback or mock
                log_entry.provider_message_id = f"wa-click-{uuid4().hex[:8]}"
                log_entry.status = "sent"
                log_entry.sent_at = datetime.now(timezone.utc)
            db.flush()
        except Exception as exc:
            logger.exception("WhatsApp dispatch error to %s", recipient_phone)
            log_entry.status = "failed"

            log_entry.error_message = str(exc)[:500]
            db.flush()

        return log_entry

    def send_booking_confirmation(
        self, db: Session, booking: Booking, user: User
    ) -> NotificationLog:
        phone = user.phone or self.get_configured_phone(db)
        agency = self.get_configured_agency_name(db)
        msg = (
            f"Hello {user.first_name}! Your booking {booking.booking_reference} with {agency} "
            f"for '{booking.package.title}' is confirmed. Departure: {booking.departure.departure_date}. "
            f"View your voucher at {self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        )
        return self.dispatch(
            db,
            recipient_phone=phone,
            message_body=msg,
            notification_type="whatsapp_booking_confirmed",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=f"wa:booking_confirmed:{booking.id}",
        )

    def send_payment_confirmation(
        self, db: Session, booking: Booking, payment: Payment, user: User
    ) -> NotificationLog:
        phone = user.phone or self.get_configured_phone(db)
        msg = (
            f"Hello {user.first_name}, payment of INR {payment.amount:,.2f} for booking "
            f"{booking.booking_reference} has been received successfully. Thank you!"
        )
        return self.dispatch(
            db,
            recipient_phone=phone,
            message_body=msg,
            notification_type="whatsapp_payment_confirmed",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=f"wa:payment_confirmed:{payment.id}",
        )

    def send_payment_failure(
        self, db: Session, booking: Booking, user: User
    ) -> NotificationLog:
        phone = user.phone or self.get_configured_phone(db)
        msg = (
            f"Hello {user.first_name}, the payment attempt for booking {booking.booking_reference} "
            f"could not be completed. You can retry at {self.settings.frontend_url}/booking"
        )
        return self.dispatch(
            db,
            recipient_phone=phone,
            message_body=msg,
            notification_type="whatsapp_payment_failed",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=f"wa:payment_failed:{booking.id}:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
        )

    def send_cancellation_update(
        self, db: Session, booking: Booking, user: User, status: str
    ) -> NotificationLog:
        phone = user.phone or self.get_configured_phone(db)
        msg = (
            f"Hello {user.first_name}, your cancellation request for booking {booking.booking_reference} "
            f"has been marked as '{status}'. Check your customer dashboard for details."
        )
        return self.dispatch(
            db,
            recipient_phone=phone,
            message_body=msg,
            notification_type="whatsapp_cancellation_update",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=f"wa:cancellation_update:{booking.id}:{status}",
        )

    def send_trip_reminder(
        self, db: Session, booking: Booking, user: User, days_left: int = 7
    ) -> NotificationLog:
        phone = user.phone or self.get_configured_phone(db)
        agency = self.get_configured_agency_name(db)
        msg = (
            f"Hello {user.first_name}! Your {agency} journey to '{booking.package.title}' "
            f"is only {days_left} days away (Departure: {booking.departure.departure_date}). We look forward to hosting you!"
        )
        return self.dispatch(
            db,
            recipient_phone=phone,
            message_body=msg,
            notification_type="whatsapp_trip_reminder",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=f"wa:trip_reminder_{days_left}d:{booking.id}:{booking.departure.departure_date}",
        )


_whatsapp_service: WhatsAppService | None = None


def get_whatsapp_service() -> WhatsAppService:
    global _whatsapp_service
    if _whatsapp_service is None:
        _whatsapp_service = WhatsAppService()
    return _whatsapp_service
