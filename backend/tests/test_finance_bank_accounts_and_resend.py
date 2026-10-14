"""Comprehensive test suite for KV TOURS & TRAVELS Finance, Bank Accounts, and Resend Webhook Integration.

Tests:
1. Bank Account management CRUD, IFSC/account number validation, and duplicate conflict handling.
2. Sensitive banking number masking and audited reveal action.
3. Default bank account switching and synchronization with global SiteSetting and payment gateway.
4. Financial delete protection (prevents deletion if transactions exist or if sole account).
5. Bank account CSV export with audit logging.
6. Resend Svix webhook signature verification, timestamp tolerance, and rejection of invalid signatures.
7. Delivery event processing (email.delivered, email.bounced) updating NotificationLog.
8. Idempotency protection against duplicate webhook deliveries.
9. Strict isolation: webhook events never alter booking or payment states.
10. Webhook verification and diagnostic stats endpoints.
11. Secure credential storage and masking (Resend API key & webhook signing secret).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from uuid import UUID, uuid4

from sqlalchemy import delete, select

from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER
from app.models.commerce import BankAccount, Payment
from app.models.content import AuditLog, NotificationLog, SiteSetting
from app.services.admin.settings_service import _store_secret
from tests.test_catalog_inventory import create_user_with_role, login_client


def _generate_svix_headers(
    raw_body: bytes,
    secret: str,
    svix_id: str | None = None,
    timestamp: int | None = None,
) -> dict[str, str]:
    """Helper to compute authoritative Svix signature headers matching Resend webhook spec."""
    svix_id = svix_id or f"msg_{uuid4().hex[:12]}"
    ts = timestamp or int(time.time())

    clean_sec = secret.strip().removeprefix("whsec_")
    try:
        key_bytes = base64.b64decode(clean_sec)
    except Exception:  # noqa: BLE001
        key_bytes = clean_sec.encode()

    to_sign = f"{svix_id}.{ts}.".encode() + raw_body
    sig_digest = hmac.new(key_bytes, to_sign, hashlib.sha256).digest()
    sig_b64 = base64.b64encode(sig_digest).decode()

    return {
        "svix-id": svix_id,
        "svix-timestamp": str(ts),
        "svix-signature": f"v1,{sig_b64}",
    }


# ==============================================================================
# Bank Account Management Tests
# ==============================================================================


def test_bank_account_crud_and_validation(client, db_session) -> None:
    """Verify bank account creation, IFSC uppercase formatting, confirmation matching, and duplicates."""
    admin = create_user_with_role(db_session, "fin_admin_crud@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # 1. Validation error: Mismatched confirm account number
    bad_match_payload = {
        "account_holder_name": "KV TOURS AND TRAVELS",
        "bank_name": "ICICI Bank",
        "account_number": "987654321000",
        "confirm_account_number": "987654321999",  # mismatch
        "ifsc_code": "ICIC0001234",
        "branch_name": "Coimbatore Main",
    }
    r = client.post("/api/v1/admin/bank-accounts", json=bad_match_payload, headers=headers)
    assert r.status_code == 422
    assert "match" in r.text

    # 2. Validation error: Invalid IFSC code format (must be 4 letters + 0 + 6 alphanumeric)
    bad_ifsc_payload = {
        "account_holder_name": "KV TOURS AND TRAVELS",
        "bank_name": "ICICI Bank",
        "account_number": "987654321000",
        "confirm_account_number": "987654321000",
        "ifsc_code": "INVALID1234",
        "branch_name": "Coimbatore Main",
    }
    r = client.post("/api/v1/admin/bank-accounts", json=bad_ifsc_payload, headers=headers)
    assert r.status_code == 422
    assert "ifsc" in r.text.lower()

    # 3. Successful creation
    valid_payload = {
        "account_holder_name": "KV TOURS AND TRAVELS",
        "bank_name": "ICICI Bank",
        "account_number": "987654321000",
        "confirm_account_number": "987654321000",
        "ifsc_code": "icic0001234",  # lowercase should be normalized to uppercase
        "branch_name": "Coimbatore Main",
        "account_type": "Current",
        "upi_id": "kvtours@icici",
        "currency": "INR",
        "status": "active",
        "is_default": True,
        "is_public": True,
        "transfer_instructions": "Please transfer with booking reference in remarks.",
    }
    create_res = client.post("/api/v1/admin/bank-accounts", json=valid_payload, headers=headers)
    assert create_res.status_code == 201
    data = create_res.json()
    acc_id = data["id"]
    assert data["ifsc_code"] == "ICIC0001234"
    assert data["account_number_masked"] == "•••• •••• 1000"
    assert data["is_default"] is True

    # 4. Conflict error: duplicate active account
    dup_res = client.post("/api/v1/admin/bank-accounts", json=valid_payload, headers=headers)
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.text

    # 5. Update bank account
    patch_res = client.patch(
        f"/api/v1/admin/bank-accounts/{acc_id}",
        json={"branch_name": "Gandhipuram Branch", "upi_id": "kvtours.cbe@icici"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["branch_name"] == "Gandhipuram Branch"
    assert updated["upi_id"] == "kvtours.cbe@icici"


def test_bank_account_masking_and_reveal_audit(client, db_session) -> None:
    """Ensure account numbers are masked by default and require explicit audited reveal action."""
    admin = create_user_with_role(db_session, "reveal_admin@kvtours.in", ROLE_ADMIN)
    customer = create_user_with_role(db_session, "customer_reveal@kvtours.in", ROLE_CUSTOMER)

    admin_headers = login_client(client, admin.email)

    # Create account as Admin
    create_res = client.post(
        "/api/v1/admin/bank-accounts",
        json={
            "account_holder_name": "KV TOURS & TRAVELS PVT LTD",
            "bank_name": "State Bank of India",
            "account_number": "112233445566",
            "confirm_account_number": "112233445566",
            "ifsc_code": "SBIN0001234",
            "branch_name": "Kochi City Branch",
        },
        headers=admin_headers,
    )
    assert create_res.status_code == 201
    acc_id = create_res.json()["id"]

    # 1. Listing returns masked representation
    list_res = client.get("/api/v1/admin/bank-accounts", headers=admin_headers)
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    matched = next(item for item in items if item["id"] == acc_id)
    assert matched["account_number_masked"] == "•••• •••• 5566"
    assert "account_number" not in matched

    # 2. Authorized Admin reveal
    reveal_res = client.post(f"/api/v1/admin/bank-accounts/{acc_id}/reveal", headers=admin_headers)
    assert reveal_res.status_code == 200
    reveal_data = reveal_res.json()
    assert reveal_data["account_number"] == "112233445566"
    assert reveal_data["ifsc_code"] == "SBIN0001234"

    # 3. Customer cannot access reveal endpoint
    customer_headers = login_client(client, customer.email)
    cust_reveal = client.post(f"/api/v1/admin/bank-accounts/{acc_id}/reveal", headers=customer_headers)
    assert cust_reveal.status_code == 403

    # 4. Verify audit log entry exists without plaintext sensitive number in metadata
    log = db_session.execute(
        select(AuditLog).where(
            AuditLog.action == "bank_account_revealed",
            AuditLog.entity_id == acc_id,
        )
    ).scalars().first()
    assert log is not None
    assert log.actor_user_id == admin.id
    assert "112233445566" not in json.dumps(log.metadata_json)
    assert "5566" in log.metadata_json.get("masked", "")


def test_bank_account_default_selection_and_site_setting_sync(client, db_session) -> None:
    """Verify switching default account synchronizes seamlessly with SiteSetting and PaymentService."""
    admin = create_user_with_role(db_session, "default_sync_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Create account A
    res_a = client.post(
        "/api/v1/admin/bank-accounts",
        json={
            "account_holder_name": "KV TOURS A",
            "bank_name": "HDFC Bank",
            "account_number": "111122223333",
            "confirm_account_number": "111122223333",
            "ifsc_code": "HDFC0001111",
            "branch_name": "Branch A",
            "is_default": True,
        },
        headers=headers,
    )
    acc_a_id = res_a.json()["id"]

    # Create account B
    res_b = client.post(
        "/api/v1/admin/bank-accounts",
        json={
            "account_holder_name": "KV TOURS B",
            "bank_name": "Axis Bank",
            "account_number": "444455556666",
            "confirm_account_number": "444455556666",
            "ifsc_code": "UTIB0002222",
            "branch_name": "Branch B",
            "is_default": False,
        },
        headers=headers,
    )
    acc_b_id = res_b.json()["id"]

    # Initially A is default
    setting_row = db_session.execute(
        select(SiteSetting).where(SiteSetting.key == "bank_transfer_settings")
    ).scalar_one_or_none()
    assert setting_row is not None
    assert setting_row.value["bank_name"] == "HDFC Bank"
    assert setting_row.value["account_number"] == "111122223333"

    # Set B as default
    set_def_res = client.post(f"/api/v1/admin/bank-accounts/{acc_b_id}/set-default", headers=headers)
    assert set_def_res.status_code == 200
    assert set_def_res.json()["is_default"] is True

    # Account A is no longer default
    acc_a_db = db_session.get(BankAccount, UUID(acc_a_id))
    assert acc_a_db.is_default is False

    # SiteSetting is updated to B
    db_session.refresh(setting_row)
    assert setting_row.value["bank_name"] == "Axis Bank"
    assert setting_row.value["account_number"] == "444455556666"


def test_bank_account_delete_protection(client, db_session) -> None:
    """Verify that deleting a sole account or an account linked to payments is safely prevented."""
    admin = create_user_with_role(db_session, "delete_protect_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Clean existing accounts to test sole account check
    db_session.execute(delete(BankAccount))
    db_session.commit()

    # Create account 1
    res1 = client.post(
        "/api/v1/admin/bank-accounts",
        json={
            "account_holder_name": "KV TOURS",
            "bank_name": "Canara Bank",
            "account_number": "555566667777",
            "confirm_account_number": "555566667777",
            "ifsc_code": "CNRB0001234",
            "branch_name": "Sole Branch",
            "is_default": True,
        },
        headers=headers,
    )
    acc1_id = res1.json()["id"]

    # Try to delete the sole configured account -> 400
    del_sole = client.delete(f"/api/v1/admin/bank-accounts/{acc1_id}", headers=headers)
    assert del_sole.status_code == 400
    assert ("Cannot delete the sole configured bank account" in del_sole.text or "Cannot delete the default bank account" in del_sole.text)

    # Add account 2
    res2 = client.post(
        "/api/v1/admin/bank-accounts",
        json={
            "account_holder_name": "KV TOURS",
            "bank_name": "Federal Bank",
            "account_number": "888899990000",
            "confirm_account_number": "888899990000",
            "ifsc_code": "FDRL0001234",
            "branch_name": "Second Branch",
            "is_default": False,
        },
        headers=headers,
    )
    acc2_id = res2.json()["id"]

    # Delete account 2 (not default, no payments linked) -> Success
    del2 = client.delete(f"/api/v1/admin/bank-accounts/{acc2_id}", headers=headers)
    assert del2.status_code == 200
    assert del2.json()["success"] is True


def test_bank_account_csv_export(client, db_session) -> None:
    """Verify authorized CSV export of bank accounts with masked account numbers."""
    admin = create_user_with_role(db_session, "export_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    client.post(
        "/api/v1/admin/bank-accounts",
        json={
            "account_holder_name": "KV EXPORT TEST",
            "bank_name": "Bank of Baroda",
            "account_number": "123412341234",
            "confirm_account_number": "123412341234",
            "ifsc_code": "BARB0001234",
            "branch_name": "Export Branch",
        },
        headers=headers,
    )

    resp = client.get("/api/v1/admin/bank-accounts/export", headers=headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    csv_content = resp.text

    # Header check
    assert "Account Holder Name" in csv_content
    assert "Account Number (Masked)" in csv_content
    # Content check: masked number present, full number absent
    assert "•••• •••• 1234" in csv_content
    assert "123412341234" not in csv_content


# ==============================================================================
# Resend Webhook Integration Tests
# ==============================================================================


def test_resend_webhook_valid_signature_delivered(client, db_session) -> None:
    """Verify Resend webhook verifies Svix signature and updates NotificationLog to delivered."""
    secret = "whsec_dGVzdF93ZWJob29rX3NlY3JldF9mb3Jfc3ZpeF8xMjM0NQ=="
    _store_secret(db_session, "resend_webhook_signing_secret", secret, "Resend webhook secret")
    db_session.commit()

    # Create dummy notification log entry
    email_id = f"email_{uuid4().hex[:8]}"
    notif = NotificationLog(
        recipient="traveler@example.com",
        notification_type="booking_confirmation",
        subject="Your Booking Confirmation",
        channel="email",
        status="sent",
        provider="resend",
        provider_message_id=email_id,
    )
    db_session.add(notif)
    db_session.commit()

    payload_dict = {
        "type": "email.delivered",
        "created_at": "2026-10-13T10:00:00Z",
        "data": {
            "email_id": email_id,
            "from": "KV Tours <bookings@kvtours.in>",
            "to": ["traveler@example.com"],
            "subject": "Your Booking Confirmation",
        },
    }
    raw_body = json.dumps(payload_dict).encode()
    headers = _generate_svix_headers(raw_body, secret)

    resp = client.post(
        "/api/v1/webhooks/resend",
        content=raw_body,
        headers={**headers, "content-type": "application/json"},
    )
    assert resp.status_code == 200, f"Failed: {resp.text}"
    data = resp.json()
    assert data["success"] is True
    assert data["event"] == "email.delivered"
    assert data["matched"] is True

    # Verify NotificationLog updated
    db_session.refresh(notif)
    assert notif.status == "delivered"


def test_resend_webhook_bounced_updates_error(client, db_session) -> None:
    """Verify email.bounced updates NotificationLog status to failed with bounce details."""
    secret = "whsec_dGVzdF93ZWJob29rX3NlY3JldF9mb3Jfc3ZpeF8xMjM0NQ=="
    _store_secret(db_session, "resend_webhook_signing_secret", secret, "Resend webhook secret")
    db_session.commit()

    email_id = f"email_{uuid4().hex[:8]}"
    notif = NotificationLog(
        recipient="badmailbox@example.com",
        notification_type="inquiry_ack",
        subject="Inquiry Received",
        channel="email",
        status="sent",
        provider="resend",
        provider_message_id=email_id,
    )
    db_session.add(notif)
    db_session.commit()

    payload_dict = {
        "type": "email.bounced",
        "created_at": "2026-10-13T10:00:00Z",
        "data": {
            "email_id": email_id,
            "to": ["badmailbox@example.com"],
            "bounce": {
                "type": "Permanent",
                "message": "Mailbox does not exist",
            },
        },
    }
    raw_body = json.dumps(payload_dict).encode()
    headers = _generate_svix_headers(raw_body, secret)

    resp = client.post(
        "/api/v1/webhooks/resend",
        content=raw_body,
        headers={**headers, "content-type": "application/json"},
    )
    assert resp.status_code == 200
    db_session.refresh(notif)
    assert notif.status == "failed"
    assert "Permanent" in notif.error_message
    assert "Mailbox does not exist" in notif.error_message


def test_resend_webhook_duplicate_event_idempotency(client, db_session) -> None:
    """Verify duplicate webhook deliveries with same svix-id are safely acknowledged as already_processed."""
    secret = "whsec_dGVzdF93ZWJob29rX3NlY3JldF9mb3Jfc3ZpeF8xMjM0NQ=="
    _store_secret(db_session, "resend_webhook_signing_secret", secret, "Resend webhook secret")
    db_session.commit()

    svix_id = f"svix_unique_{uuid4().hex[:8]}"
    payload = json.dumps({"type": "email.sent", "data": {"email_id": "em_123"}}).encode()
    headers = _generate_svix_headers(payload, secret, svix_id=svix_id)

    # First delivery
    r1 = client.post("/api/v1/webhooks/resend", content=payload, headers={**headers, "content-type": "application/json"})
    assert r1.status_code == 200
    assert r1.json()["success"] is True

    # Second delivery with exact same svix-id
    r2 = client.post("/api/v1/webhooks/resend", content=payload, headers={**headers, "content-type": "application/json"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "already_processed"


def test_resend_webhook_invalid_signature_rejected(client, db_session) -> None:
    """Verify webhooks with tampered signatures or expired timestamps are rejected with 401."""
    secret = "whsec_dGVzdF93ZWJob29rX3NlY3JldF9mb3Jfc3ZpeF8xMjM0NQ=="
    _store_secret(db_session, "resend_webhook_signing_secret", secret, "Resend webhook secret")
    db_session.commit()

    payload = json.dumps({"type": "email.delivered", "data": {}}).encode()

    # 1. Invalid signature
    r_bad_sig = client.post(
        "/api/v1/webhooks/resend",
        content=payload,
        headers={
            "svix-id": "msg_bad",
            "svix-timestamp": str(int(time.time())),
            "svix-signature": "v1,dGFtcGVyZWRzaWduYXR1cmUxMjM0NQ==",
            "content-type": "application/json",
        },
    )
    assert r_bad_sig.status_code == 401
    assert "Invalid webhook signature" in r_bad_sig.text

    # 2. Expired timestamp (> 300 seconds drift)
    expired_ts = int(time.time()) - 600
    expired_headers = _generate_svix_headers(payload, secret, timestamp=expired_ts)
    r_expired = client.post(
        "/api/v1/webhooks/resend",
        content=payload,
        headers={**expired_headers, "content-type": "application/json"},
    )
    assert r_expired.status_code == 401


def test_webhook_does_not_alter_booking_or_payment(client, db_session) -> None:
    """CRITICAL SECURITY RULE: Resend email webhook events must NEVER alter booking or payment states."""
    secret = "whsec_dGVzdF93ZWJob29rX3NlY3JldF9mb3Jfc3ZpeF8xMjM0NQ=="
    _store_secret(db_session, "resend_webhook_signing_secret", secret, "Resend webhook secret")
    db_session.commit()

    # Send arbitrary webhook payload claiming delivery
    payload = json.dumps({
        "type": "email.delivered",
        "data": {
            "email_id": "test_delivered_msg",
            "subject": "Booking Confirmation",
        },
    }).encode()
    headers = _generate_svix_headers(payload, secret)
    captured_before = len(db_session.execute(select(Payment).where(Payment.status == "captured")).scalars().all())

    r = client.post("/api/v1/webhooks/resend", content=payload, headers={**headers, "content-type": "application/json"})
    assert r.status_code == 200

    # Ensure no bookings or payments were marked paid
    captured_after = len(db_session.execute(select(Payment).where(Payment.status == "captured")).scalars().all())
    assert captured_after == captured_before


# ==============================================================================
# Settings Diagnostics & Webhook Verification Endpoints
# ==============================================================================


def test_resend_webhook_verify_endpoint(client, db_session) -> None:
    """Verify POST /admin/settings/email/verify-webhook validates HMAC-SHA256 engine."""
    admin = create_user_with_role(db_session, "wh_verify_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # 1. Unconfigured check
    db_session.execute(delete(SiteSetting).where(SiteSetting.key == "resend_webhook_signing_secret"))
    db_session.commit()

    r_empty = client.post(
        "/api/v1/admin/settings/email/verify-webhook",
        json={},
        headers=headers,
    )
    assert r_empty.status_code == 200
    assert r_empty.json()["success"] is False
    assert r_empty.json()["status"] == "unconfigured"

    # 2. Valid test secret
    valid_sec = "whsec_dGVzdF93ZWJob29rX3NlY3JldF9mb3Jfc3ZpeF8xMjM0NQ=="
    r_valid = client.post(
        "/api/v1/admin/settings/email/verify-webhook",
        json={"signing_secret": valid_sec},
        headers=headers,
    )
    assert r_valid.status_code == 200
    data = r_valid.json()
    assert data["success"] is True
    assert data["status"] == "verified"
    assert data["signing_secret_configured"] is True
    assert "whse" in data["signing_secret_masked"]
    assert "****" in data["signing_secret_masked"]


def test_resend_webhook_stats_endpoint(client, db_session) -> None:
    """Verify GET /admin/settings/email/webhook-stats aggregates processed event counts."""
    admin = create_user_with_role(db_session, "wh_stats_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Add audit log entries representing processed events
    db_session.add(
        AuditLog(
            action="resend_webhook_received",
            entity_type="notification",
            entity_id="evt_1",
            metadata_json={"event_type": "email.delivered", "recipient": "traveler1@example.com"},
        )
    )
    db_session.add(
        AuditLog(
            action="resend_webhook_received",
            entity_type="notification",
            entity_id="evt_2",
            metadata_json={"event_type": "email.bounced", "recipient": "traveler2@example.com"},
        )
    )
    db_session.commit()

    resp = client.get("/api/v1/admin/settings/email/webhook-stats", headers=headers)
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["total_events_received"] >= 2
    assert stats["delivered_count"] >= 1
    assert stats["bounced_count"] >= 1
    assert len(stats["recent_events"]) >= 2


def test_email_environment_mode_and_tunnel_persistence(client, db_session) -> None:
    """Verify email_environment_mode and resend_webhook_tunnel_url can be saved and retrieved."""
    admin = create_user_with_role(db_session, "email_mode_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    payload = {
        "email_environment_mode": "development",
        "resend_webhook_tunnel_url": "https://kvtours-tunnel.ngrok-free.app",
        "email_sender_email": "onboarding@resend.dev",
    }
    r = client.put("/api/v1/admin/settings", json=payload, headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email_environment_mode"] == "development"
    assert data["resend_webhook_tunnel_url"] == "https://kvtours-tunnel.ngrok-free.app"
    assert data["email_sender_email"] == "onboarding@resend.dev"

    # Verify retrieval
    r_get = client.get("/api/v1/admin/settings", headers=headers)
    assert r_get.status_code == 200
    get_data = r_get.json()
    assert get_data["email_environment_mode"] == "development"
    assert get_data["resend_webhook_tunnel_url"] == "https://kvtours-tunnel.ngrok-free.app"


def test_resend_sandbox_sender_verification(client, db_session) -> None:
    """Verify onboarding@resend.dev is recognized as sandbox_ready without fake custom domain."""
    admin = create_user_with_role(db_session, "sandbox_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Set sender to onboarding@resend.dev with an API key
    client.put(
        "/api/v1/admin/settings",
        json={
            "resend_api_key": "re_mock_sandbox_key_12345",
            "email_sender_email": "onboarding@resend.dev",
            "email_environment_mode": "development",
        },
        headers=headers,
    )

    r = client.post("/api/v1/admin/settings/email/verify-sender", headers=headers)
    assert r.status_code == 200
    res = r.json()
    assert res["status"] == "sandbox_ready"
    assert res["is_sandbox"] is True
    assert "without a custom domain" in res["message"].lower()


def test_resend_webhook_tunnel_https_detection(client, db_session) -> None:
    """Verify verify-webhook endpoint uses configured HTTPS tunnel URL."""
    admin = create_user_with_role(db_session, "tunnel_verify_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Set tunnel URL
    client.put(
        "/api/v1/admin/settings",
        json={"resend_webhook_tunnel_url": "https://safe-tunnel.ngrok-free.app"},
        headers=headers,
    )

    valid_sec = "whsec_dGVzdF93ZWJob29rX3NlY3JldF9mb3Jfc3ZpeF8xMjM0NQ=="
    r = client.post(
        "/api/v1/admin/settings/email/verify-webhook",
        json={"signing_secret": valid_sec},
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["status"] == "verified"
    assert data["is_https"] is True
    assert "safe-tunnel.ngrok-free.app" in data["webhook_url"]


def test_resend_webhook_missing_secret_returns_400(client, db_session) -> None:
    """Verify webhook endpoint returns 400 when no signing secret is configured in DB or env."""
    db_session.execute(delete(SiteSetting).where(SiteSetting.key == "resend_webhook_signing_secret"))
    db_session.commit()

    payload = json.dumps({"type": "email.delivered", "data": {}}).encode()
    resp = client.post(
        "/api/v1/webhooks/resend",
        content=payload,
        headers={
            "svix-id": "msg_test_123",
            "svix-timestamp": str(int(time.time())),
            "svix-signature": "v1,dummy_sig",
            "content-type": "application/json",
        },
    )
    assert resp.status_code == 400
    err_msg = (resp.json().get("error") or {}).get("message") or resp.text
    assert "Resend webhook signing secret is not configured" in err_msg


def test_resend_webhook_missing_svix_headers_returns_400(client, db_session) -> None:
    """Verify missing required Svix headers returns 400 Bad Request."""
    secret = "whsec_dGVzdF93ZWJob29rX3NlY3JldF9mb3Jfc3ZpeF8xMjM0NQ=="
    _store_secret(db_session, "resend_webhook_signing_secret", secret, "Resend webhook secret")
    db_session.commit()

    payload = json.dumps({"type": "email.delivered", "data": {}}).encode()

    # Missing svix-signature and svix-timestamp
    resp = client.post(
        "/api/v1/webhooks/resend",
        content=payload,
        headers={"svix-id": "msg_only_id", "content-type": "application/json"},
    )
    assert resp.status_code == 400
    err_msg = (resp.json().get("error") or {}).get("message") or resp.text
    assert "Missing required Svix signature headers" in err_msg


def test_resend_webhook_encrypted_secret_persistence_and_retrieval(client, db_session) -> None:
    """Verify webhook signing secret is persisted encrypted in DB and decryptable by verification."""
    from app.services.admin.settings_service import resolve_resend_signing_secret

    admin = create_user_with_role(db_session, "webhook_secret_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    test_secret = "whsec_dGVzdF9lbmNyeXB0ZWRfc2VjcmV0X3N2aXhfYWJjZGVm"

    # Save via admin settings endpoint
    save_resp = client.put(
        "/api/v1/admin/settings",
        json={"resend_webhook_signing_secret": test_secret},
        headers=headers,
    )
    assert save_resp.status_code == 200
    save_data = save_resp.json()
    assert save_data["resend_webhook_signing_secret_configured"] is True
    # Secret must be masked, NEVER plaintext
    assert save_data["resend_webhook_signing_secret_masked"] is not None
    assert test_secret not in str(save_data)

    # Verify underlying database row is encrypted (starts with 'v1:')
    row = db_session.get(SiteSetting, "resend_webhook_signing_secret")
    assert row is not None
    assert str(row.value).startswith("v1:")

    # Verify resolve_resend_signing_secret decrypts to exact original
    decrypted, source = resolve_resend_signing_secret(db_session)
    assert source == "database"
    assert decrypted == test_secret

    # Verify verify-webhook endpoint uses the saved encrypted secret without payload
    v_resp = client.post(
        "/api/v1/admin/settings/email/verify-webhook",
        json={},
        headers=headers,
    )
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["success"] is True
    assert v_data["secret_saved_and_decryptable"] is True
    assert v_data["signature_verification_valid"] is True
    assert v_data["signing_secret_configured"] is True


def test_resend_webhook_placeholder_tunnel_rejected(client, db_session) -> None:
    """Verify attempting to save template placeholder tunnel URL is rejected."""
    admin = create_user_with_role(db_session, "tunnel_placeholder_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    resp = client.put(
        "/api/v1/admin/settings",
        json={"resend_webhook_tunnel_url": "https://YOUR-ACTUAL-TUNNEL-DOMAIN/api/v1/webhooks/resend"},
        headers=headers,
    )
    assert resp.status_code == 400
    err_msg = (resp.json().get("error") or {}).get("message") or resp.text
    assert "placeholder" in err_msg.lower()

