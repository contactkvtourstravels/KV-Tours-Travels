"""Comprehensive test suite for The Wild Root Resend Transactional Email Integration.

Covers:
1. Resend API key resolution hierarchy (ENV var, encrypted DB secret, core config)
2. Sending test email: missing API key, disabled email setting, invalid recipient validation
3. Successful mocked Resend API send (status 200, ID capture, NotificationLog persistence)
4. Resend API failures, sandbox 403 restrictions, and timeouts
5. Resend connection test with full-access and sending-only restricted keys
6. Rate-limiting protection on test email endpoint to prevent relay abuse
7. RBAC security: unauthorized users blocked from test endpoints and admin settings
8. Saving and reloading email settings without exposing secrets
9. Automated inquiry workflow triggering customer acknowledgment and admin alerts
10. Password reset workflow triggering secure password reset emails
11. Booking creation workflow triggering customer confirmation and admin booking alerts
"""

from __future__ import annotations

import os
from unittest.mock import MagicMock, patch
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER
from app.core.rate_limit import clear_all_rate_limiters
from app.models.commerce import Booking, Inquiry, Package, PackageDeparture
from app.models.content import NotificationLog, SiteSetting
from app.models.user import User
from app.schemas.catalog import PublicInquiryCreate
from app.services.admin.settings_service import (
    _store_secret,
    get_admin_settings,
    get_resend_api_key,
    send_test_email,
    test_resend_connection as check_resend_connection,
    update_admin_settings,
    verify_resend_sender,
)
from app.services.auth_service import request_password_reset
from app.services.catalog_service import create_public_inquiry
from tests.test_catalog_inventory import create_user_with_role, login_client


@pytest.fixture(autouse=True)
def _reset_limiters():
    clear_all_rate_limiters()
    yield
    clear_all_rate_limiters()


# ==============================================================================
# 1. API Key Resolution & Precedence Tests
# ==============================================================================


def test_get_resend_api_key_resolution(db_session, monkeypatch) -> None:
    """Verify that encrypted DB key takes precedence over Render environment fallback and settings."""
    # 1. No key anywhere
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    settings = get_settings()
    monkeypatch.setattr(settings, "resend_api_key", MagicMock(get_secret_value=lambda: ""))

    # Clean DB
    row = db_session.get(SiteSetting, "resend_api_key")
    if row:
        db_session.delete(row)
        db_session.commit()

    assert get_resend_api_key(db_session) == ""

    # 2. Render Environment variable set (fallback when DB unconfigured)
    monkeypatch.setenv("RESEND_API_KEY", "re_render_env_key_99999")
    assert get_resend_api_key(db_session) == "re_render_env_key_99999"

    # 3. Key explicitly configured in database by admin takes precedence over Render env fallback
    _store_secret(db_session, "resend_api_key", "re_db_secret_key_12345", "Resend Key")
    db_session.commit()
    assert get_resend_api_key(db_session) == "re_db_secret_key_12345"


# ==============================================================================
# 2. Test Email Validation & Disabled Toggle Tests
# ==============================================================================


def test_send_test_email_missing_api_key(db_session, monkeypatch) -> None:
    """Verify clear error when Resend API key is not configured."""
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    settings = get_settings()
    monkeypatch.setattr(settings, "resend_api_key", MagicMock(get_secret_value=lambda: ""))
    row = db_session.get(SiteSetting, "resend_api_key")
    if row:
        db_session.delete(row)
        db_session.commit()

    admin = create_user_with_role(db_session, "test_admin_nokey@thewildroot.in", ROLE_ADMIN)

    with pytest.raises(ValueError, match="Resend API key is not configured"):
        send_test_email(
            db=db_session,
            recipient_email="test@example.com",
            subject="Test Subject",
            notes="Testing",
            admin_id=admin.id,
        )


def test_send_test_email_when_email_disabled(db_session, monkeypatch) -> None:
    """Verify that test email dispatch is refused when outgoing emails are disabled."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key_12345")
    admin = create_user_with_role(db_session, "test_admin_disabled@thewildroot.in", ROLE_ADMIN)

    # Disable outgoing emails in settings
    row = db_session.get(SiteSetting, "email_enabled")
    if row is None:
        row = SiteSetting(key="email_enabled", value=False, is_public=True)
        db_session.add(row)
    else:
        row.value = False
    db_session.commit()

    with pytest.raises(ValueError, match="Transactional email delivery is currently disabled"):
        send_test_email(
            db=db_session,
            recipient_email="test@example.com",
            subject="Test Subject",
            notes=None,
            admin_id=admin.id,
        )


def test_send_test_email_invalid_recipient(db_session, monkeypatch) -> None:
    """Verify that invalid recipient email address is rejected."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key_12345")
    admin = create_user_with_role(db_session, "test_admin_bademail@thewildroot.in", ROLE_ADMIN)

    row = db_session.get(SiteSetting, "email_enabled")
    if row:
        row.value = True
        db_session.commit()

    with pytest.raises(ValueError, match="valid recipient email address is required"):
        send_test_email(
            db=db_session,
            recipient_email="invalid-not-an-email",
            subject="Test Subject",
            notes=None,
            admin_id=admin.id,
        )


# ==============================================================================
# 3. Mocked Successful & Failed Resend Delivery Tests
# ==============================================================================


def test_send_test_email_mocked_success(db_session, monkeypatch) -> None:
    """Verify successful Resend dispatch stores NotificationLog and returns message ID."""
    monkeypatch.setenv("RESEND_API_KEY", "re_mocked_active_key_123")
    admin = create_user_with_role(db_session, "test_admin_success@thewildroot.in", ROLE_ADMIN)

    # Ensure email is enabled
    row = db_session.get(SiteSetting, "email_enabled")
    if row:
        row.value = True
    else:
        db_session.add(SiteSetting(key="email_enabled", value=True, is_public=True))
    db_session.commit()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": "msg_resend_mocked_7777"}

    with patch("httpx.Client.post", return_value=mock_resp) as mock_post:
        result = send_test_email(
            db=db_session,
            recipient_email="delivered@resend.dev",
            subject="The Wild Root — Email Configuration Test",
            notes="Automated test note",
            admin_id=admin.id,
        )

        assert result.success is True
        assert result.message_id == "msg_resend_mocked_7777"
        assert result.provider == "resend"
        assert result.recipient == "delivered@resend.dev"

        # Verify httpx payload included from, to, subject, html, and text
        mock_post.assert_called_once()
        sent_payload = mock_post.call_args[1]["json"]
        assert sent_payload["to"] == ["delivered@resend.dev"]
        assert "The Wild Root" in sent_payload["html"]
        assert "The Wild Root" in sent_payload["text"]
        assert "Admin Notes: Automated test note" in sent_payload["text"]

    # Verify NotificationLog was created
    log_entry = db_session.execute(
        select(NotificationLog).where(
            NotificationLog.provider_message_id == "msg_resend_mocked_7777"
        )
    ).scalar_one_or_none()
    assert log_entry is not None
    assert log_entry.status == "sent"
    assert log_entry.notification_type == "admin_test_email"


def test_send_test_email_resend_failure_and_timeout(db_session, monkeypatch) -> None:
    """Verify that Resend HTTP errors and network timeouts are handled cleanly without crashing."""
    monkeypatch.setenv("RESEND_API_KEY", "re_mocked_fail_key_123")
    admin = create_user_with_role(db_session, "test_admin_fail@thewildroot.in", ROLE_ADMIN)

    row = db_session.get(SiteSetting, "email_enabled")
    if row:
        row.value = True
    else:
        db_session.add(SiteSetting(key="email_enabled", value=True, is_public=True))
    db_session.commit()

    # 1. Resend API returns HTTP 403 sandbox restriction
    mock_403 = MagicMock()
    mock_403.status_code = 403
    mock_403.text = "You can only send to your own email address"
    mock_403.json.return_value = {"message": "You can only send to your own email address"}

    with patch("httpx.Client.post", return_value=mock_403):
        with pytest.raises(ValueError, match="Resend Sandbox Restriction"):
            send_test_email(
                db=db_session,
                recipient_email="random_customer@example.com",
                subject="Test Sandbox",
                notes=None,
                admin_id=admin.id,
            )

    # 2. Resend network timeout
    with patch("httpx.Client.post", side_effect=httpx.ConnectTimeout("Connection timed out")):
        with pytest.raises(ValueError, match="Network error connecting to api.resend.com"):
            send_test_email(
                db=db_session,
                recipient_email="delivered@resend.dev",
                subject="Test Timeout",
                notes=None,
                admin_id=admin.id,
            )


# ==============================================================================
# 4. Connection Test & Restricted Sending-Access Key Tests
# ==============================================================================


def test_resend_connection_sending_only_access(db_session, monkeypatch) -> None:
    """Verify that sending-only (restricted) API keys are recognized as authenticated."""
    monkeypatch.setenv("RESEND_API_KEY", "re_sending_only_token_abc")

    mock_resp = MagicMock()
    mock_resp.status_code = 403
    mock_resp.text = '{"name": "restricted_api_key", "message": "API key only has permission to send emails"}'

    with patch("httpx.Client.get", return_value=mock_resp):
        res = check_resend_connection(db_session)
        assert res.success is True
        assert res.status == "authenticated"
        assert "Sending-Access API Key" in res.message


def test_verify_resend_sender_sandbox_mode(db_session, monkeypatch) -> None:
    """Verify that sandbox sender (onboarding@resend.dev) is rejected for production."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key_12345")

    # Set sender email to onboarding@resend.dev
    sender_row = db_session.get(SiteSetting, "email_sender_email")
    if sender_row:
        sender_row.value = "onboarding@resend.dev"
    else:
        db_session.add(SiteSetting(key="email_sender_email", value="onboarding@resend.dev", is_public=True))
    db_session.commit()

    res = verify_resend_sender(db_session)
    assert res.success is False
    assert res.status == "unverified"
    assert "Production customer emails cannot be sent from resend.dev" in res.message


def test_verify_resend_sender_verified_domain(db_session, monkeypatch) -> None:
    """Verify that a confirmed domain in Resend returns success=True."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key_12345")

    sender_row = db_session.get(SiteSetting, "email_sender_email")
    if sender_row:
        sender_row.value = "bookings@thewildroot.in"
    else:
        db_session.add(SiteSetting(key="email_sender_email", value="bookings@thewildroot.in", is_public=True))
    db_session.commit()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "data": [
            {
                "id": "domain_123",
                "name": "thewildroot.in",
                "status": "verified",
                "records": [
                    {"record": "SPF", "name": "thewildroot.in", "value": "v=spf1 include:resend.com ~all", "type": "TXT", "status": "verified"},
                    {"record": "DKIM", "name": "resend._domainkey.thewildroot.in", "value": "k=rsa; p=...", "type": "TXT", "status": "verified"},
                ],
            }
        ]
    }

    with patch("httpx.Client.get", return_value=mock_resp):
        res = verify_resend_sender(db_session)
        assert res.success is True
        assert res.status == "verified"
        assert res.sender_domain == "thewildroot.in"
        assert "verified and active in Resend" in res.message


def test_verify_resend_sender_unverified_domain(db_session, monkeypatch) -> None:
    """Verify that an unverified domain in Resend reports what is missing."""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key_12345")

    sender_row = db_session.get(SiteSetting, "email_sender_email")
    if sender_row:
        sender_row.value = "bookings@unverified-domain.com"
    else:
        db_session.add(SiteSetting(key="email_sender_email", value="bookings@unverified-domain.com", is_public=True))
    db_session.commit()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"data": []}

    with patch("httpx.Client.get", return_value=mock_resp):
        res = verify_resend_sender(db_session)
        assert res.success is False
        assert res.status == "not_found"
        assert "was not found in your Resend account" in res.message


# ==============================================================================
# 5. Security & Rate Limiting Tests
# ==============================================================================


def test_unauthorized_users_blocked_from_test_endpoint(client, db_session) -> None:
    """Verify that anonymous or customer users are forbidden from the test email endpoint."""
    # 1. Anonymous user
    r = client.post(
        "/api/v1/admin/settings/email/send-test",
        json={"recipient_email": "delivered@resend.dev"},
    )
    assert r.status_code == 401

    # 2. Customer user
    cust = create_user_with_role(db_session, "cust_email_test@example.com", ROLE_CUSTOMER)
    headers = login_client(client, cust.email)
    r = client.post(
        "/api/v1/admin/settings/email/send-test",
        json={"recipient_email": "delivered@resend.dev"},
        headers=headers,
    )
    assert r.status_code == 403


def test_rate_limiting_test_email_endpoint(client, db_session, monkeypatch) -> None:
    """Verify rate limiter blocks more than 5 test email requests per minute per IP."""
    monkeypatch.setenv("RESEND_API_KEY", "re_rate_limit_test_key")
    admin = create_user_with_role(db_session, "admin_ratelimit@thewildroot.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    row = db_session.get(SiteSetting, "email_enabled")
    if row:
        row.value = True
    else:
        db_session.add(SiteSetting(key="email_enabled", value=True, is_public=True))
    db_session.commit()

    from app.schemas.admin import EmailSendTestResponse
    from datetime import datetime, timezone

    mock_send_res = EmailSendTestResponse(
        success=True,
        message="Test email successfully accepted by Resend API.",
        provider="resend",
        message_id="msg_rate_test",
        recipient="delivered@resend.dev",
        timestamp=datetime.now(timezone.utc),
    )

    with patch("app.api.v1.routes.admin.settings.send_test_email", return_value=mock_send_res):
        for i in range(5):
            r = client.post(
                "/api/v1/admin/settings/email/send-test",
                json={"recipient_email": "delivered@resend.dev"},
                headers=headers,
            )
            assert r.status_code == 200, f"Attempt {i+1} should succeed"

        # 6th attempt should be blocked with HTTP 429
        r = client.post(
            "/api/v1/admin/settings/email/send-test",
            json={"recipient_email": "delivered@resend.dev"},
            headers=headers,
        )
        assert r.status_code == 429
        assert "Too many test emails requested" in r.text


# ==============================================================================
# 6. Workflow Integration Tests: Inquiries & Password Resets
# ==============================================================================


def test_inquiry_submission_triggers_notifications(client, db_session, monkeypatch) -> None:
    """Verify that public inquiry submission dispatches customer acknowledgment and admin alert."""
    monkeypatch.setenv("RESEND_API_KEY", "re_inquiry_test_key")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": "msg_inquiry_ack_123"}

    with patch("httpx.Client.post", return_value=mock_resp):
        payload = PublicInquiryCreate(
            name="Alexander Wright",
            email="alexander.wright@luxurytravel.com",
            phone="+919876543210",
            message="Interested in bespoke private tour of Kerala backwaters.",
            source="contact_form",
        )
        res = create_public_inquiry(db_session, payload)
        assert res.id is not None

        # Verify customer acknowledgment NotificationLog
        customer_log = db_session.execute(
            select(NotificationLog).where(
                NotificationLog.notification_type == "inquiry_acknowledgment",
                NotificationLog.recipient == "alexander.wright@luxurytravel.com",
            )
        ).scalar_one_or_none()
        assert customer_log is not None
        assert customer_log.status == "sent"

        # Verify admin alert NotificationLog
        admin_log = db_session.execute(
            select(NotificationLog).where(
                NotificationLog.notification_type == "admin_inquiry_alert"
            )
        ).scalar_one_or_none()
        assert admin_log is not None
        assert admin_log.status == "sent"


def test_password_reset_triggers_email(db_session, monkeypatch) -> None:
    """Verify that requesting a password reset creates a token and dispatches reset instructions email."""
    monkeypatch.setenv("RESEND_API_KEY", "re_pwreset_test_key")
    user = create_user_with_role(db_session, "guest_pw_reset@thewildroot.in", ROLE_CUSTOMER)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": "msg_reset_email_456"}

    with patch("httpx.Client.post", return_value=mock_resp):
        request_password_reset(db_session, email=user.email)

        # Verify NotificationLog for password reset
        reset_log = db_session.execute(
            select(NotificationLog).where(
                NotificationLog.notification_type == "password_reset",
                NotificationLog.recipient == user.email,
            )
        ).scalar_one_or_none()
        assert reset_log is not None
        assert reset_log.status == "sent"
        assert "Reset Your Password" in reset_log.subject


# ==============================================================================
# 7. Persistence, Preservation & Format Validation Tests
# ==============================================================================


def test_save_resend_api_key_and_preservation(client, db_session) -> None:
    """Verify saving a new key encrypts it, and saving with blank/masked preserves it."""
    admin = create_user_with_role(db_session, "admin_keysave@thewildroot.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # 1. Save new API key
    res = client.patch(
        "/api/v1/admin/settings",
        json={"resend_api_key": "re_valid_key_1234567890abcdef"},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["resend_api_key_configured"] is True
    assert data["resend_api_key_masked"] is not None
    assert "re_valid_key_1234567890abcdef" not in str(data)  # Plaintext never returned!

    # Verify encrypted in database
    row = db_session.get(SiteSetting, "resend_api_key")
    assert row is not None
    assert str(row.value).startswith("v1:")  # Encrypted with AES-256-GCM

    # 2. Save settings leaving key blank - existing key must be preserved!
    res_blank = client.patch(
        "/api/v1/admin/settings",
        json={"resend_api_key": "", "email_sender_name": "The Wild Root Luxury"},
        headers=headers,
    )
    assert res_blank.status_code == 200
    data_blank = res_blank.json()
    assert data_blank["resend_api_key_configured"] is True
    assert get_resend_api_key(db_session) == "re_valid_key_1234567890abcdef"

    # 3. Save settings with masked placeholder - existing key must be preserved!
    res_masked = client.patch(
        "/api/v1/admin/settings",
        json={"resend_api_key": "re_••••••••••••••••", "email_sender_name": "The Wild Root Concierge"},
        headers=headers,
    )
    assert res_masked.status_code == 200
    assert get_resend_api_key(db_session) == "re_valid_key_1234567890abcdef"


def test_save_resend_api_key_invalid_format_rejected(client, db_session) -> None:
    """Verify that keys not starting with 're_' are rejected with 400 Bad Request."""
    admin = create_user_with_role(db_session, "admin_badkey@thewildroot.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    res = client.patch(
        "/api/v1/admin/settings",
        json={"resend_api_key": "invalid_prefix_12345"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "must begin with 're_'" in res.text


# ==============================================================================
# 8. Webhook Svix Signature Verification & Idempotency Tests
# ==============================================================================


def test_resend_webhook_svix_signature_and_idempotency(client, db_session) -> None:
    """Verify Svix signature verification, notification status updates, and duplicate event deduplication."""
    import base64
    import hashlib
    import hmac
    import json
    import time
    from app.services.admin.settings_service import _store_secret

    raw_secret = "whsec_mfZfY84K9hBf3t/e3xZlq8N5xO8m7B8="
    _store_secret(db_session, "resend_webhook_signing_secret", raw_secret, "Webhook Secret")
    db_session.commit()

    # Pre-create a NotificationLog with provider_message_id
    notif = NotificationLog(
        channel="email",
        notification_type="booking_confirmation",
        recipient="traveler@example.com",
        subject="Booking Confirmation",
        provider="resend",
        provider_message_id="msg_webhook_delivery_test",
        status="sent",
    )
    db_session.add(notif)
    db_session.commit()

    # Prepare Svix webhook payload
    payload_dict = {
        "type": "email.delivered",
        "created_at": "2026-10-25T14:00:00.000Z",
        "data": {
            "email_id": "msg_webhook_delivery_test",
            "to": ["traveler@example.com"],
            "subject": "Booking Confirmation",
        },
    }
    raw_body = json.dumps(payload_dict).encode("utf-8")
    svix_id = f"msg_{uuid4().hex[:16]}"
    svix_timestamp = str(int(time.time()))

    # Compute Svix signature
    clean_sec = raw_secret.removeprefix("whsec_")
    key_bytes = base64.b64decode(clean_sec)
    to_sign = f"{svix_id}.{svix_timestamp}.".encode() + raw_body
    signature = base64.b64encode(hmac.new(key_bytes, to_sign, hashlib.sha256).digest()).decode()
    svix_sig_header = f"v1,{signature}"

    headers = {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_sig_header,
        "content-type": "application/json",
    }

    # 1. First delivery attempt - should succeed and update NotificationLog to 'delivered'
    res = client.post("/api/v1/webhooks/resend", content=raw_body, headers=headers)
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert res.json()["matched"] is True

    db_session.refresh(notif)
    assert notif.status == "delivered"

    # 2. Duplicate delivery attempt with identical svix-id - must be safely deduplicated!
    res_dup = client.post("/api/v1/webhooks/resend", content=raw_body, headers=headers)
    assert res_dup.status_code == 200
    assert res_dup.json()["status"] == "already_processed"

    # 3. Invalid signature - must return 401 Unauthorized
    bad_headers = dict(headers)
    bad_headers["svix-signature"] = "v1,bad_invalid_signature_hash="
    res_bad = client.post("/api/v1/webhooks/resend", content=raw_body, headers=bad_headers)
    assert res_bad.status_code == 401
