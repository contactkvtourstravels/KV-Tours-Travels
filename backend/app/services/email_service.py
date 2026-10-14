"""Transactional email service with Resend, SMTP, and Mock providers.

Features:
- Full idempotency via NotificationLog (never sends duplicate emails on webhook retries)
- Safe error handling (email failures NEVER abort or roll back payments or bookings)
- 9 transactional templates with KV Tours & Travels gold/black brand styling
- Configurable providers: 'mock', 'resend', 'smtp'
"""

from __future__ import annotations

import logging
import smtplib
from datetime import datetime, timezone
from decimal import Decimal
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any
from uuid import UUID, uuid4

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.commerce import (
    Booking,
    BookingCancellationRequest,
    Payment,
    PaymentRefund,
)
from app.models.content import NotificationLog, SiteSetting
from app.models.user import User

logger = logging.getLogger(__name__)


def _render_base_email(
    title: str,
    content_html: str,
    action_url: str | None = None,
    action_label: str | None = None,
    db: Session | None = None,
) -> str:
    """Render branded HTML email wrapper matching KV Tours & Travels visual identity."""
    settings = get_settings()
    agency_name = settings.agency_name
    agency_location = settings.agency_location
    whatsapp_number = settings.whatsapp_number
    if db is not None:
        try:
            r_name = db.get(SiteSetting, "agency_name")
            if r_name and r_name.value:
                agency_name = str(r_name.value)
            r_loc = db.get(SiteSetting, "agency_location")
            if r_loc and r_loc.value:
                agency_location = str(r_loc.value)
            r_wa = db.get(SiteSetting, "whatsapp_number")
            if r_wa and r_wa.value:
                whatsapp_number = str(r_wa.value)
        except Exception as exc:  # noqa: BLE001
            logger.debug("Could not read dynamic agency profile in email template: %s", exc)

    button_html = ""
    if action_url and action_label:
        button_html = f"""
        <div style="margin: 28px 0; text-align: center;">
            <a href="{action_url}" style="background: #D4AF37; color: #0A0A0A; padding: 12px 28px; text-decoration: none; font-weight: 700; border-radius: 4px; display: inline-block; letter-spacing: 0.05em; font-size: 14px; text-transform: uppercase;">
                {action_label}
            </a>
        </div>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #E5E5E5; line-height: 1.6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: #141414; border: 1px solid #262626; border-radius: 8px; overflow: hidden;">
                    <!-- Brand Header -->
                    <tr>
                        <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #262626; background: #0A0A0A;">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.15em; color: #D4AF37; text-transform: uppercase;">
                                {agency_name}
                            </h1>
                            <p style="margin: 6px 0 0; font-size: 12px; color: #737373; letter-spacing: 0.08em; text-transform: uppercase;">
                                {agency_location}
                            </p>
                        </td>
                    </tr>
                    <!-- Main Body -->
                    <tr>
                        <td style="padding: 36px 32px;">
                            <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 700; color: #FFFFFF; border-left: 3px solid #D4AF37; padding-left: 12px;">
                                {title}
                            </h2>
                            <div style="font-size: 14px; color: #D4D4D4; line-height: 1.7;">
                                {content_html}
                            </div>
                            {button_html}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 32px; background: #0A0A0A; border-top: 1px solid #262626; font-size: 12px; color: #737373; text-align: center;">
                            <p style="margin: 0 0 8px;">
                                Need immediate assistance? Contact our concierge on WhatsApp at <strong style="color: #D4AF37;">{whatsapp_number}</strong>
                            </p>
                            <p style="margin: 0;">
                                &copy; 2026 {agency_name}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""


class EmailService:
    """High-reliability email dispatch service."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def _send_via_mock(self, to_email: str, subject: str, _html_body: str) -> str:
        """Simulate email dispatch in test or development environments."""
        provider_id = f"mock-msg-{uuid4().hex[:12]}"
        logger.info(
            "MOCK EMAIL SENT: to=%s, subject=%s, id=%s", to_email, subject, provider_id
        )
        return provider_id

    def _send_via_resend(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        db: Session | None = None,
    ) -> str:
        """Send email via Resend API."""
        api_key = None
        if db is not None:
            from app.services.admin.settings_service import get_decrypted_secret
            api_key = get_decrypted_secret(db, "resend_api_key")
        if not api_key:
            api_key = self.settings.resend_api_key.get_secret_value()
        if not api_key:
            raise ValueError("Resend API key is not configured in settings or RESEND_API_KEY")

        email_from = self.settings.email_from
        email_reply_to = self.settings.email_reply_to
        if db is not None:
            s_name = db.get(SiteSetting, "email_sender_name")
            s_email = db.get(SiteSetting, "email_sender_email")
            s_reply = db.get(SiteSetting, "email_reply_to")
            if s_name and s_email and s_name.value and s_email.value:
                email_from = f"{s_name.value} <{s_email.value}>"
            elif s_email and s_email.value:
                email_from = str(s_email.value)
            if s_reply and s_reply.value:
                email_reply_to = str(s_reply.value)

        payload = {
            "from": email_from,
            "to": [to_email],
            "reply_to": email_reply_to,
            "subject": subject,
            "html": html_body,
        }

        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return str(data.get("id") or f"resend-{uuid4().hex[:8]}")

    def _send_via_smtp(self, to_email: str, subject: str, html_body: str) -> str:
        """Send email via standard SMTP."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.settings.email_from
        msg["To"] = to_email
        if self.settings.email_reply_to:
            msg["Reply-To"] = self.settings.email_reply_to

        part = MIMEText(html_body, "html", "utf-8")
        msg.attach(part)

        host = self.settings.smtp_host
        port = self.settings.smtp_port
        username = self.settings.smtp_username
        password = self.settings.smtp_password.get_secret_value()

        with smtplib.SMTP(host, port, timeout=10) as server:
            server.ehlo()
            if port == 587:
                server.starttls()
            server.ehlo()
            if username and password:
                server.login(username, password)
            server.sendmail(self.settings.email_from, [to_email], msg.as_string())

        return f"smtp-{uuid4().hex[:12]}"

    def dispatch(
        self,
        db: Session,
        *,
        to_email: str,
        subject: str,
        html_body: str,
        notification_type: str,
        booking_id: UUID | None = None,
        recipient_user_id: UUID | None = None,
        idempotency_key: str | None = None,
    ) -> NotificationLog:
        """Dispatches an email with idempotency guarding and database audit logging."""
        # 1. Check idempotency
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
                logger.info(
                    "Notification idempotency hit for key=%s (status=%s)",
                    idempotency_key,
                    existing.status,
                )
                return existing

        # Check master email toggle
        email_enabled_row = db.get(SiteSetting, "email_enabled")
        if email_enabled_row is not None and str(email_enabled_row.value).lower() in ("false", "0", "no"):
            logger.info("Transactional emails are paused by administrator.")
            log_entry = NotificationLog(
                channel="email",
                notification_type=notification_type,
                recipient=to_email,
                recipient_user_id=recipient_user_id,
                booking_id=booking_id,
                idempotency_key=idempotency_key,
                subject=subject,
                provider="disabled",
                status="failed",
                error_message="Transactional email delivery disabled in Admin Settings",
            )
            db.add(log_entry)
            db.flush()
            return log_entry

        provider_row = db.get(SiteSetting, "email_provider")
        provider = str(provider_row.value).lower() if provider_row and provider_row.value else self.settings.email_provider.lower()
        if provider == "resend":
            from app.services.admin.settings_service import get_decrypted_secret
            api_key = get_decrypted_secret(db, "resend_api_key") or self.settings.resend_api_key.get_secret_value()
            if not api_key:
                provider = "mock"

        log_entry = NotificationLog(
            channel="email",
            notification_type=notification_type,
            recipient=to_email,
            recipient_user_id=recipient_user_id,
            booking_id=booking_id,
            idempotency_key=idempotency_key,
            subject=subject,
            provider=provider,
            status="pending",
        )
        db.add(log_entry)
        db.flush()

        # 2. Attempt dispatch
        try:
            if provider == "resend":
                provider_msg_id = self._send_via_resend(to_email, subject, html_body, db=db)
            elif provider == "smtp":
                provider_msg_id = self._send_via_smtp(to_email, subject, html_body)
            else:
                provider_msg_id = self._send_via_mock(to_email, subject, html_body)

            log_entry.status = "sent"
            log_entry.provider_message_id = provider_msg_id
            log_entry.sent_at = datetime.now(timezone.utc)
            db.flush()
        except Exception as exc:
            logger.exception("Failed to deliver email to %s", to_email)
            log_entry.status = "failed"

            log_entry.error_message = str(exc)[:500]
            db.flush()

        return log_entry

    def retry_notification(self, db: Session, notification_id: UUID) -> NotificationLog:
        """Retry a previously failed notification entry."""
        log_entry = db.get(NotificationLog, notification_id)
        if not log_entry:
            raise ValueError(f"Notification with ID {notification_id} not found.")

        provider = self.settings.email_provider.lower()
        log_entry.retry_count += 1

        try:
            html_body = f"<p>Retried notification for: {log_entry.subject}</p>"
            if provider == "resend":
                provider_msg_id = self._send_via_resend(
                    log_entry.recipient, log_entry.subject or "Notification", html_body
                )
            elif provider == "smtp":
                provider_msg_id = self._send_via_smtp(
                    log_entry.recipient, log_entry.subject or "Notification", html_body
                )
            else:
                provider_msg_id = self._send_via_mock(
                    log_entry.recipient, log_entry.subject or "Notification", html_body
                )

            log_entry.status = "sent"
            log_entry.provider_message_id = provider_msg_id
            log_entry.sent_at = datetime.now(timezone.utc)
            log_entry.error_message = None
            db.flush()
        except Exception as exc:  # noqa: BLE001
            logger.error("Notification retry failed: %s", exc)
            log_entry.status = "failed"
            log_entry.error_message = str(exc)[:500]
            db.flush()

        return log_entry

    # -------------------------------------------------------------
    # 9 Transactional Templates
    # -------------------------------------------------------------

    def send_booking_created(
        self, db: Session, booking: Booking, user: User
    ) -> NotificationLog:
        """Template 1: Booking created (awaiting payment)."""
        subject = (
            f"Booking Reserved: {booking.booking_reference} — {booking.package.title}"
        )
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        content = f"""
        <p>Dear {user.first_name},</p>
        <p>Thank you for choosing KV Tours & Travels. Your booking reservation has been created successfully.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Booking Reference</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #D4AF37;">{booking.booking_reference}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Package</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">{booking.package.title}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Departure Date</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">{booking.departure.departure_date}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Travellers</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">{booking.number_of_travellers}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #A3A3A3;">Total Payable</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #FFFFFF;">INR {booking.total:,.2f}</td>
            </tr>
        </table>
        <p>Please complete payment to secure your group departure seats.</p>
        """
        html = _render_base_email(
            "Booking Reservation Created", content, action_url, "View Booking"
        )
        idempotency_key = f"email:booking_created:{booking.id}"
        return self.dispatch(
            db,
            to_email=user.email,
            subject=subject,
            html_body=html,
            notification_type="booking_created",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=idempotency_key,
        )

    def send_payment_successful(
        self, db: Session, booking: Booking, payment: Payment, user: User
    ) -> NotificationLog:
        """Template 2: Payment successful."""
        subject = (
            f"Payment Received: INR {payment.amount:,.2f} — {booking.booking_reference}"
        )
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        content = f"""
        <p>Dear {user.first_name},</p>
        <p>We have successfully received your payment via {payment.provider.title()}.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">

            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Payment ID</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #FFFFFF;">{payment.provider_payment_id or str(payment.id)[:12]}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Amount Paid</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #22C55E;">INR {payment.amount:,.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Booking Reference</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #D4AF37;">{booking.booking_reference}</td>
            </tr>
        </table>
        <p>Your payment receipt is now accessible in your customer dashboard.</p>
        """
        html = _render_base_email(
            "Payment Successful", content, action_url, "Download Receipt"
        )
        idempotency_key = f"email:payment_successful:{payment.id}"
        return self.dispatch(
            db,
            to_email=user.email,
            subject=subject,
            html_body=html,
            notification_type="payment_successful",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=idempotency_key,
        )

    def send_deposit_received(
        self,
        db: Session,
        booking: Booking,
        payment: Payment,
        outstanding_balance: Decimal | None = None,
        user: User | None = None,
        deposit_amount: Decimal | None = None,
        **kwargs: Any,
    ) -> NotificationLog:
        """Template 2B: Deposit received for booking."""
        user = user or booking.user
        amount = deposit_amount if deposit_amount is not None else payment.amount
        balance = (
            outstanding_balance
            if outstanding_balance is not None
            else max(Decimal("0.00"), booking.total - amount)
        )
        subject = f"Deposit Received: INR {amount:,.2f} — {booking.booking_reference}"
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        user_name = user.first_name if user else "Traveller"
        to_email = user.email if user else "concierge@kvtours.in"
        user_id = user.id if user else None

        content = f"""
        <p>Dear {user_name},</p>
        <p>We have successfully received your deposit payment of <strong>INR {amount:,.2f}</strong> for booking <strong>{booking.booking_reference}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Deposit Paid</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #22C55E;">INR {amount:,.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Total Package Amount</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">INR {booking.total:,.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Outstanding Balance</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #EAB308;">INR {balance:,.2f}</td>
            </tr>
        </table>
        <p>Your seats are securely reserved. You can pay the remaining balance before the departure date via your customer portal or direct bank transfer.</p>
        """
        html = _render_base_email("Deposit Confirmed", content, action_url, "View Booking")
        idempotency_key = f"email:deposit_received:{payment.id}"
        return self.dispatch(
            db,
            to_email=to_email,
            subject=subject,
            html_body=html,
            notification_type="deposit_received",
            booking_id=booking.id,
            recipient_user_id=user_id,
            idempotency_key=idempotency_key,
        )

    def send_bank_transfer_submitted(
        self,
        db: Session,
        booking: Booking,
        payment: Payment,
        user: User | None = None,
        transfer_reference: str | None = None,
        submitted_amount: Decimal | None = None,
        **kwargs: Any,
    ) -> NotificationLog:
        """Template: Bank transfer submitted by customer, awaiting verification."""
        user = user or booking.user
        ref = transfer_reference or payment.provider_payment_id or "Submitted"
        amount = submitted_amount if submitted_amount is not None else payment.amount
        subject = f"Bank Transfer Awaiting Verification — {booking.booking_reference}"
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        user_name = user.first_name if user else "Traveller"
        to_email = user.email if user else "concierge@kvtours.in"
        user_id = user.id if user else None

        content = f"""
        <p>Dear {user_name},</p>
        <p>Thank you for submitting your bank transfer reference for booking <strong>{booking.booking_reference}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Transfer Reference / UTR</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #FFFFFF;">{ref}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Submitted Amount</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #EAB308;">INR {amount:,.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Verification Status</td>
                <td style="padding: 8px 0; text-align: right; color: #F59E0B; font-weight: 700;">Awaiting Verification</td>
            </tr>
        </table>
        <p>Our accounts team in Coimbatore will reconcile your transfer within 2–4 business hours and update your booking status.</p>
        """
        html = _render_base_email("Transfer Submitted", content, action_url, "Track Status")
        idempotency_key = f"email:bank_transfer_submitted:{payment.id}"
        return self.dispatch(
            db,
            to_email=to_email,
            subject=subject,
            html_body=html,
            notification_type="bank_transfer_submitted",
            booking_id=booking.id,
            recipient_user_id=user_id,
            idempotency_key=idempotency_key,
        )

    def send_bank_transfer_verified(
        self,
        db: Session,
        booking: Booking,
        payment: Payment,
        outstanding_balance: Decimal | None = None,
        user: User | None = None,
        verified_amount: Decimal | None = None,
        notes: str | None = None,
        reconciliation_notes: str | None = None,
        **kwargs: Any,
    ) -> NotificationLog:
        """Template: Bank transfer verified by staff."""
        user = user or booking.user
        amount = verified_amount if verified_amount is not None else payment.amount
        balance = (
            outstanding_balance
            if outstanding_balance is not None
            else max(Decimal("0.00"), booking.total - amount)
        )
        subject = f"Payment Verified: INR {amount:,.2f} — {booking.booking_reference}"
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        user_name = user.first_name if user else "Traveller"
        to_email = user.email if user else "concierge@kvtours.in"
        user_id = user.id if user else None

        status_text = "Paid in Full" if balance <= Decimal("0.00") else f"Partially Paid (INR {balance:,.2f} remaining)"

        content = f"""
        <p>Dear {user_name},</p>
        <p>Your bank transfer has been <strong>successfully verified</strong> by our accounts desk.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Verified Amount</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #22C55E;">INR {amount:,.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">UTR / Transaction Ref</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #FFFFFF;">{payment.provider_payment_id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Payment Status</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #D4AF37;">{status_text}</td>
            </tr>
        </table>
        <p>Your official tax invoice and payment receipt are now available in your portal.</p>
        """
        html = _render_base_email("Payment Verified", content, action_url, "Download Receipt")
        idempotency_key = f"email:bank_transfer_verified:{payment.id}"
        return self.dispatch(
            db,
            to_email=to_email,
            subject=subject,
            html_body=html,
            notification_type="bank_transfer_verified",
            booking_id=booking.id,
            recipient_user_id=user_id,
            idempotency_key=idempotency_key,
        )

    def send_bank_transfer_rejected(
        self,
        db: Session,
        booking: Booking,
        payment: Payment,
        reason: str,
        user: User | None = None,
        **kwargs: Any,
    ) -> NotificationLog:
        """Template: Bank transfer rejected by staff."""
        user = user or booking.user
        subject = f"Bank Transfer Not Verified — {booking.booking_reference}"
        action_url = f"{self.settings.frontend_url}/booking/payment/{booking.booking_reference}"
        user_name = user.first_name if user else "Traveller"
        to_email = user.email if user else "concierge@kvtours.in"
        user_id = user.id if user else None

        content = f"""
        <p>Dear {user_name},</p>
        <p>We could not verify the bank transfer reference submitted for booking <strong>{booking.booking_reference}</strong>.</p>
        <p style="color: #EF4444; background: #261111; padding: 12px; border-radius: 4px; font-size: 13px;">
            Reason: {reason}
        </p>
        <p>Please double-check your bank transfer UTR and re-submit the correct reference, or contact our accounts desk directly.</p>
        """
        html = _render_base_email("Transfer Rejected", content, action_url, "Update Transfer Details")
        idempotency_key = f"email:bank_transfer_rejected:{payment.id}"
        return self.dispatch(
            db,
            to_email=to_email,
            subject=subject,
            html_body=html,
            notification_type="bank_transfer_rejected",
            booking_id=booking.id,
            recipient_user_id=user_id,
            idempotency_key=idempotency_key,
        )

    def send_balance_due(
        self,
        db: Session,
        booking: Booking,
        outstanding_balance: Decimal,
        payment_deadline: str | None = None,
    ) -> NotificationLog:
        """Template: Balance due notification."""
        user = booking.user
        subject = f"Balance Due: INR {outstanding_balance:,.2f} — {booking.booking_reference}"
        action_url = f"{self.settings.frontend_url}/booking/payment/{booking.booking_reference}"
        user_name = user.first_name if user else "Traveller"
        to_email = user.email if user else "concierge@kvtours.in"
        user_id = user.id if user else None

        deadline_str = f"<p>Payment Deadline: <strong>{payment_deadline}</strong></p>" if payment_deadline else ""

        content = f"""
        <p>Dear {user_name},</p>
        <p>This is a gentle reminder that an outstanding balance of <strong>INR {outstanding_balance:,.2f}</strong> is due for your upcoming journey (Booking: {booking.booking_reference}).</p>
        {deadline_str}
        <p>Please complete your payment online or via bank transfer to confirm final vouchers and travel documents.</p>
        """
        html = _render_base_email("Balance Due", content, action_url, "Pay Balance Now")
        idempotency_key = f"email:balance_due:{booking.id}:{datetime.now(timezone.utc).strftime('%Y%m%d')}"
        return self.dispatch(
            db,
            to_email=to_email,
            subject=subject,
            html_body=html,
            notification_type="balance_due",
            booking_id=booking.id,
            recipient_user_id=user_id,
            idempotency_key=idempotency_key,
        )

    def send_balance_paid_in_full(
        self,
        db: Session,
        booking: Booking,
        payment: Payment,
        user: User | None = None,
        **kwargs: Any,
    ) -> NotificationLog:
        """Template: Final balance paid in full."""
        user = user or booking.user
        subject = f"Journey Paid in Full! Booking Confirmed — {booking.booking_reference}"
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        user_name = user.first_name if user else "Traveller"
        to_email = user.email if user else "concierge@kvtours.in"
        user_id = user.id if user else None

        content = f"""
        <p>Dear {user_name},</p>
        <p>We are delighted to confirm that your booking <strong>{booking.booking_reference}</strong> is now <strong>PAID IN FULL</strong>!</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Total Paid</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #22C55E;">INR {booking.total:,.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Outstanding Balance</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #22C55E;">INR 0.00</td>
            </tr>
        </table>
        <p>Our concierge team is finalizing your hotel vouchers, itinerary guide, and driver allocation.</p>
        """
        html = _render_base_email("Journey Paid in Full", content, action_url, "Download Vouchers")
        idempotency_key = f"email:balance_paid_in_full:{payment.id}"
        return self.dispatch(
            db,
            to_email=to_email,
            subject=subject,
            html_body=html,
            notification_type="balance_paid_in_full",
            booking_id=booking.id,
            recipient_user_id=user_id,
            idempotency_key=idempotency_key,
        )

    def send_payment_failed(
        self,
        db: Session,
        booking: Booking,
        payment: Payment,
        user: User,
        reason: str | None = None,
    ) -> NotificationLog:
        """Template 3: Payment failed."""
        subject = f"Payment Unsuccessful for Booking {booking.booking_reference}"
        action_url = f"{self.settings.frontend_url}/booking"
        content = f"""
        <p>Dear {user.first_name},</p>
        <p>We were unable to process your payment for booking <strong>{booking.booking_reference}</strong>.</p>
        <p style="color: #EF4444; background: #261111; padding: 12px; border-radius: 4px; font-size: 13px;">
            Reason: {reason or "Transaction declined or expired by bank."}
        </p>
        <p>No funds were deducted from your account. You can retry checkout or reach out to our concierge on WhatsApp.</p>
        """
        html = _render_base_email(
            "Payment Failed", content, action_url, "Retry Payment"
        )
        idempotency_key = f"email:payment_failed:{payment.id}:{payment.updated_at.isoformat() if payment.updated_at else 'init'}"
        return self.dispatch(
            db,
            to_email=user.email,
            subject=subject,
            html_body=html,
            notification_type="payment_failed",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=idempotency_key,
        )

    def send_booking_confirmed(
        self, db: Session, booking: Booking, payment: Payment, user: User
    ) -> NotificationLog:
        """Template 4: Booking confirmed after authoritative payment."""
        subject = (
            f"Booking Confirmed: {booking.booking_reference} — {booking.package.title}"
        )
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        content = f"""
        <p>Dear {user.first_name},</p>
        <p>Pack your bags! Your journey with KV Tours & Travels is officially confirmed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Booking Reference</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #D4AF37;">{booking.booking_reference}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Package</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">{booking.package.title}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Destination</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">{booking.package.destination.name if booking.package.destination else "Travel Destination"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Departure Date</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">{booking.departure.departure_date}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Travellers Count</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">{booking.number_of_travellers}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Amount Paid</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #22C55E;">INR {payment.amount:,.2f}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #A3A3A3;">Payment ID</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #FFFFFF;">{payment.provider_payment_id or str(payment.id)[:12]}</td>
            </tr>
        </table>
        <p>Your official <strong>Travel Voucher</strong> is ready for download in your customer dashboard.</p>
        """
        html = _render_base_email(
            "Booking Confirmed!", content, action_url, "Download Voucher"
        )
        idempotency_key = f"email:booking_confirmed:{booking.id}:{payment.id}"
        return self.dispatch(
            db,
            to_email=user.email,
            subject=subject,
            html_body=html,
            notification_type="booking_confirmed",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=idempotency_key,
        )

    def send_cancellation_received(
        self, db: Session, booking: Booking, req: BookingCancellationRequest, user: User
    ) -> NotificationLog:
        """Template 5: Cancellation request received."""
        subject = f"Cancellation Request Received: {booking.booking_reference}"
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        content = f"""
        <p>Dear {user.first_name},</p>
        <p>We have received your cancellation request for booking <strong>{booking.booking_reference}</strong> ({booking.package.title}).</p>
        <p style="background: #1C1917; border-left: 3px solid #F59E0B; padding: 12px; margin: 16px 0; font-size: 13px;">
            <strong>Reason Submitted:</strong> {req.reason}
        </p>
        <p><strong>Next Steps:</strong> Our team will review your request against the booking terms and hotel/airline fare rules. Submitting a cancellation request does not automatically grant a refund. You will be updated once reviewed.</p>
        """
        html = _render_base_email(
            "Cancellation Request Received", content, action_url, "Check Status"
        )
        idempotency_key = f"email:cancellation_received:{req.id}"
        return self.dispatch(
            db,
            to_email=user.email,
            subject=subject,
            html_body=html,
            notification_type="cancellation_received",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=idempotency_key,
        )

    def send_cancellation_approved(
        self, db: Session, booking: Booking, req: BookingCancellationRequest, user: User
    ) -> NotificationLog:
        """Template 6: Cancellation approved."""
        subject = f"Cancellation Approved: {booking.booking_reference}"
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        content = f"""
        <p>Dear {user.first_name},</p>
        <p>Your cancellation request for booking <strong>{booking.booking_reference}</strong> has been <strong>approved</strong> by our operations team.</p>
        {f'<p style="color: #A3A3A3; font-size: 13px;">Notes: {req.admin_notes}</p>' if req.admin_notes else ""}
        <p>If applicable under our refund policy, our finance desk will process the refund to your original payment method.</p>
        """
        html = _render_base_email(
            "Cancellation Request Approved", content, action_url, "View Booking"
        )
        idempotency_key = f"email:cancellation_approved:{req.id}"
        return self.dispatch(
            db,
            to_email=user.email,
            subject=subject,
            html_body=html,
            notification_type="cancellation_approved",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=idempotency_key,
        )

    def send_cancellation_rejected(
        self, db: Session, booking: Booking, req: BookingCancellationRequest, user: User
    ) -> NotificationLog:
        """Template 7: Cancellation rejected."""
        subject = f"Update on Cancellation Request: {booking.booking_reference}"
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        content = f"""
        <p>Dear {user.first_name},</p>
        <p>Regarding your cancellation request for booking <strong>{booking.booking_reference}</strong>: our team was unable to approve this request under the non-refundable fare/supplier policies.</p>
        {f'<p style="background: #261111; color: #FCA5A5; padding: 12px; border-radius: 4px; font-size: 13px;">Reason: {req.admin_notes}</p>' if req.admin_notes else ""}
        <p>Your booking remains confirmed. If you have questions, please reach out to our concierge team directly.</p>
        """
        html = _render_base_email(
            "Cancellation Request Update", content, action_url, "View Booking"
        )
        idempotency_key = f"email:cancellation_rejected:{req.id}"
        return self.dispatch(
            db,
            to_email=user.email,
            subject=subject,
            html_body=html,
            notification_type="cancellation_rejected",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=idempotency_key,
        )

    def send_refund_processed(
        self, db: Session, booking: Booking, refund: PaymentRefund, user: User
    ) -> NotificationLog:
        """Template 8: Refund processed."""
        subject = (
            f"Refund Processed: INR {refund.amount:,.2f} — {booking.booking_reference}"
        )
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        content = f"""
        <p>Dear {user.first_name},</p>
        <p>A refund has been initiated for booking <strong>{booking.booking_reference}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Refund Amount</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #22C55E;">INR {refund.amount:,.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Refund Reference</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #FFFFFF;">{refund.provider_refund_id or str(refund.id)[:12]}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #A3A3A3;">Reason</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">{refund.reason or "Approved cancellation"}</td>
            </tr>
        </table>
        <p>The funds typically reflect in your original payment method within 5–7 business days.</p>
        """
        html = _render_base_email(
            "Refund Processed", content, action_url, "View Booking"
        )
        idempotency_key = f"email:refund_processed:{refund.id}"
        return self.dispatch(
            db,
            to_email=user.email,
            subject=subject,
            html_body=html,
            notification_type="refund_processed",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=idempotency_key,
        )

    def send_trip_reminder(
        self, db: Session, booking: Booking, user: User, days_left: int = 7
    ) -> NotificationLog:
        """Template 9: Trip reminder."""
        subject = (
            f"Your Adventure Begins in {days_left} Days! — {booking.package.title}"
        )
        action_url = f"{self.settings.frontend_url}/dashboard/bookings/{booking.booking_reference}"
        content = f"""
        <p>Dear {user.first_name},</p>
        <p>Your journey with KV Tours & Travels to <strong>{booking.package.title}</strong> is just <strong>{days_left} days away</strong>!</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Departure Date</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #D4AF37;">{booking.departure.departure_date}</td>
            </tr>
            <tr style="border-bottom: 1px solid #262626;">
                <td style="padding: 8px 0; color: #A3A3A3;">Booking Reference</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">{booking.booking_reference}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #A3A3A3;">Travellers Count</td>
                <td style="padding: 8px 0; text-align: right; color: #FFFFFF;">{booking.number_of_travellers}</td>
            </tr>
        </table>
        <p>Please review your itinerary and make sure your travel vouchers and identity proofs are downloaded and ready.</p>
        """
        html = _render_base_email(
            f"Trip Reminder ({days_left} Days Remaining)",
            content,
            action_url,
            "View Itinerary & Voucher",
        )
        idempotency_key = f"email:trip_reminder_{days_left}d:{booking.id}:{booking.departure.departure_date}"
        return self.dispatch(
            db,
            to_email=user.email,
            subject=subject,
            html_body=html,
            notification_type=f"trip_reminder_{days_left}d",
            booking_id=booking.id,
            recipient_user_id=user.id,
            idempotency_key=idempotency_key,
        )


_email_service: EmailService | None = None


def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
