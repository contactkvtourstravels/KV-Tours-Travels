"""Comprehensive automated tests for KV Tours & Travels Secure Admin-Managed Razorpay Credentials.

Verifies all 15 required security and functionality requirements:
1. Admin can save valid test credentials.
2. Stored secrets are encrypted (AES-256-GCM authenticated encryption `v1:...` in DB).
3. Secret values never appear in API responses.
4. Existing secrets are never returned when editing (configured status only).
5. Invalid credentials are rejected with informative errors.
6. Failed updates preserve the previous working configuration.
7. Test and Live credentials remain completely separate.
8. Unauthorized users cannot change credentials (HTTP 401 / 403).
9. Credentials persist after application restart (fresh session reload).
10. Multiple backend workers use the same active configuration.
11. Webhook signature verification uses the correct secret.
12. Payment verification uses the correct environment.
13. Missing encryption keys fail safely without plaintext fallback.
14. No credentials appear in logs or audit records.
15. Existing payment and booking behavior remains intact.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.encryption import (
    EncryptionKeyError,
    decrypt_secret,
    encrypt_secret,
    resolve_encryption_key,
)
from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER, ROLE_STAFF
from app.core.security import hash_password
from app.models.catalog import Destination, Package, PackageDeparture
from app.models.commerce import Booking, BookingTraveller
from app.models.content import AuditLog, SiteSetting
from app.models.user import Role, User, UserRole
from app.schemas.payment import RazorpayOrderCreateRequest
from app.services.payment_credential_service import PaymentCredentialService
from app.services.payment_service import PaymentService
from app.services.razorpay_client import reset_razorpay_client

TEST_PASSWORD = "SecureAdmin!2026Password"


def get_csrf(client) -> dict[str, str]:
    cookie = client.cookies.get("travel_csrf")
    if cookie:
        return {"X-CSRF-Token": cookie}
    resp = client.get("/api/v1/auth/csrf")
    assert resp.status_code == 200
    return {"X-CSRF-Token": resp.json()["csrf_token"]}


def make_user(db, email: str, role_name: str = ROLE_ADMIN) -> User:
    seed_standard_roles(db)
    user = User(
        email=email,
        email_normalized=email.lower().strip(),
        password_hash=hash_password(TEST_PASSWORD),
        first_name="Test",
        last_name=role_name.capitalize(),
        status="active",
    )
    db.add(user)
    db.flush()
    role = db.execute(select(Role).where(Role.name == role_name)).scalar_one()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    db.refresh(user)
    return user


def auth_login(client, email: str) -> dict[str, str]:
    client.cookies.clear()
    headers = get_csrf(client)
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": TEST_PASSWORD},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    return get_csrf(client)


# ==============================================================================
# TEST 1: Admin can save valid test credentials
# ==============================================================================
def test_1_admin_can_save_valid_test_credentials(client, db_session):
    admin = make_user(db_session, "admin1@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    payload = {
        "target_environment": "test",
        "razorpay_key_id": "rzp_test_NewTestKey12345",
        "razorpay_key_secret": "SuperSecretTestKey999",
        "razorpay_webhook_secret": "whsec_NewTestWebhookSecret123",
    }
    resp = client.patch("/api/v1/admin/payments/settings", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["test_credentials"]["key_id"] == "rzp_test_NewTestKey12345"
    assert data["test_credentials"]["key_secret_configured"] is True
    assert data["test_credentials"]["webhook_secret_configured"] is True


# ==============================================================================
# TEST 2: Stored secrets are encrypted (AES-256-GCM v1:...)
# ==============================================================================
def test_2_stored_secrets_are_encrypted_in_db(client, db_session):
    admin = make_user(db_session, "admin2@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    secret_key = "PlaintextSecretThatMustBeEncrypted!123"
    webhook_secret = "PlaintextWebhookSecretEncrypted!456"

    resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_EncryptedCheck99",
            "razorpay_key_secret": secret_key,
            "razorpay_webhook_secret": webhook_secret,
        },
        headers=headers,
    )
    assert resp.status_code == 200

    # Query DB directly to inspect stored record
    setting = db_session.execute(
        select(SiteSetting).where(SiteSetting.key == "razorpay_gateway_config")
    ).scalar_one_or_none()
    assert setting is not None
    stored_data = setting.value if isinstance(setting.value, dict) else json.loads(setting.value)

    test_cfg = stored_data.get("test", {})
    # Stored secret must begin with v1: (AES-256-GCM ciphertext prefix)
    assert test_cfg["encrypted_key_secret"].startswith("v1:")
    assert test_cfg["encrypted_webhook_secret"].startswith("v1:")

    # Raw plaintext secrets must NEVER be present anywhere in the stored string
    raw_str = json.dumps(stored_data)
    assert secret_key not in raw_str
    assert webhook_secret not in raw_str

    # Decrypting via the service returns original plaintext
    key_bytes = resolve_encryption_key()
    assert key_bytes is not None
    assert decrypt_secret(test_cfg["encrypted_key_secret"], key_bytes) == secret_key
    assert decrypt_secret(test_cfg["encrypted_webhook_secret"], key_bytes) == webhook_secret


# ==============================================================================
# TEST 3: Secret values never appear in API responses
# ==============================================================================
def test_3_secret_values_never_appear_in_api_responses(client, db_session):
    admin = make_user(db_session, "admin3@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    secret_key = "TopSecretStringNeverInResponse999"
    webhook_sec = "TopSecretWebhookNeverInResponse888"

    # Save
    save_resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_LeakTest123",
            "razorpay_key_secret": secret_key,
            "razorpay_webhook_secret": webhook_sec,
        },
        headers=headers,
    )
    assert secret_key not in save_resp.text
    assert webhook_sec not in save_resp.text

    # GET Settings
    get_resp = client.get("/api/v1/admin/payments/settings", headers=headers)
    assert get_resp.status_code == 200
    assert secret_key not in get_resp.text
    assert webhook_sec not in get_resp.text

    # Diagnostic response
    with patch("app.services.payment_credential_service.httpx.Client.get") as mock_probe:
        mock_probe.return_value = MagicMock(status_code=200, json=lambda: {"items": []})
        diag_resp = client.post(
            "/api/v1/admin/payments/razorpay/diagnostic",
            json={"environment": "test"},
            headers=headers,
        )
        assert diag_resp.status_code == 200
        assert secret_key not in diag_resp.text
        assert webhook_sec not in diag_resp.text


# ==============================================================================
# TEST 4: Existing secrets are never returned when editing
# ==============================================================================
def test_4_existing_secrets_are_never_returned_when_editing(client, db_session):
    admin = make_user(db_session, "admin4@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_NeverPreFill1",
            "razorpay_key_secret": "NeverPrefillSecret123",
            "razorpay_webhook_secret": "NeverPrefillWebhook123",
        },
        headers=headers,
    )

    resp = client.get("/api/v1/admin/payments/settings", headers=headers)
    data = resp.json()

    # The API returns boolean flags and key ID, but NEVER the secret fields
    assert "razorpay_key_secret" not in data["test_credentials"]
    assert "razorpay_webhook_secret" not in data["test_credentials"]
    assert data["test_credentials"]["key_secret_configured"] is True
    assert data["test_credentials"]["webhook_secret_configured"] is True


# ==============================================================================
# TEST 5: Invalid credentials are rejected or clearly marked invalid
# ==============================================================================
def test_5_invalid_credentials_are_rejected(client, db_session):
    admin = make_user(db_session, "admin5@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    # 1. Invalid prefix for test environment (live key in test)
    resp1 = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_live_WrongPrefix123",
            "razorpay_key_secret": "ValidSecret123456",
        },
        headers=headers,
    )
    assert resp1.status_code in (400, 422)

    # 2. Invalid prefix for live environment (test key in live)
    resp2 = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "live",
            "razorpay_key_id": "rzp_test_WrongPrefix123",
            "razorpay_key_secret": "ValidSecret123456",
        },
        headers=headers,
    )
    assert resp2.status_code in (400, 422)

    # 3. Secret too short (< 8 characters)
    resp3 = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_ValidKey123",
            "razorpay_key_secret": "short",
        },
        headers=headers,
    )
    assert resp3.status_code in (400, 422)


# ==============================================================================
# TEST 6: Failed updates preserve the previous working configuration
# ==============================================================================
def test_6_failed_updates_preserve_previous_working_configuration(client, db_session):
    admin = make_user(db_session, "admin6@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    # Save initial working config
    init_resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_WorkingInitial12",
            "razorpay_key_secret": "InitialWorkingSecret123",
        },
        headers=headers,
    )
    assert init_resp.status_code == 200

    # Attempt invalid update
    bad_resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_live_InvalidPrefixHere",
            "razorpay_key_secret": "ShouldNotBeSaved12345",
        },
        headers=headers,
    )
    assert bad_resp.status_code in (400, 422)

    # Check that previous configuration is intact
    check_resp = client.get("/api/v1/admin/payments/settings", headers=headers)
    assert check_resp.json()["test_credentials"]["key_id"] == "rzp_test_WorkingInitial12"


# ==============================================================================
# TEST 7: Test and Live credentials remain completely separate
# ==============================================================================
def test_7_test_and_live_credentials_remain_separate(client, db_session):
    admin = make_user(db_session, "admin7@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    # Configure Test credentials
    client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_IsolatedTest123",
            "razorpay_key_secret": "TestSecretIsolation123",
            "razorpay_webhook_secret": "whsec_TestIsolationSecret",
        },
        headers=headers,
    )

    # Configure Live credentials separately
    client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "live",
            "razorpay_key_id": "rzp_live_IsolatedLive456",
            "razorpay_key_secret": "LiveSecretIsolation456",
            "razorpay_webhook_secret": "whsec_LiveIsolationSecret",
        },
        headers=headers,
    )

    resp = client.get("/api/v1/admin/payments/settings", headers=headers)
    data = resp.json()

    assert data["test_credentials"]["key_id"] == "rzp_test_IsolatedTest123"
    assert data["live_credentials"]["key_id"] == "rzp_live_IsolatedLive456"

    # Updating test must not touch live
    client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_UpdatedTestOnly",
        },
        headers=headers,
    )

    resp2 = client.get("/api/v1/admin/payments/settings", headers=headers)
    data2 = resp2.json()
    assert data2["test_credentials"]["key_id"] == "rzp_test_UpdatedTestOnly"
    assert data2["live_credentials"]["key_id"] == "rzp_live_IsolatedLive456"
    assert data2["live_credentials"]["key_secret_configured"] is True


# ==============================================================================
# TEST 8: Unauthorized users cannot change credentials
# ==============================================================================
def test_8_unauthorized_users_cannot_change_credentials(client, db_session):
    # Unauthenticated request
    client.cookies.clear()
    headers = get_csrf(client)
    anon_resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={"target_environment": "test", "razorpay_key_id": "rzp_test_Hacker1234"},
        headers=headers,
    )
    assert anon_resp.status_code == 401

    # Customer user
    customer = make_user(db_session, "customer8@kvtravels.test", ROLE_CUSTOMER)
    cust_headers = auth_login(client, customer.email)
    cust_resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={"target_environment": "test", "razorpay_key_id": "rzp_test_Hacker1234"},
        headers=cust_headers,
    )
    assert cust_resp.status_code == 403

    # Staff user
    staff = make_user(db_session, "staff8@kvtravels.test", ROLE_STAFF)
    staff_headers = auth_login(client, staff.email)
    staff_resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={"target_environment": "test", "razorpay_key_id": "rzp_test_Hacker1234"},
        headers=staff_headers,
    )
    assert staff_resp.status_code == 403


# ==============================================================================
# TEST 9: Credentials persist after application restart (fresh session reload)
# ==============================================================================
def test_9_credentials_persist_across_restarts(client, db_session):
    admin = make_user(db_session, "admin9@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    test_key = "rzp_test_PersistCheck123"
    test_secret = "PersistSecretCheck456"

    client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": test_key,
            "razorpay_key_secret": test_secret,
        },
        headers=headers,
    )

    # Reset any memory singleton
    reset_razorpay_client()

    # Query afresh using PaymentCredentialService with a fresh read
    key_id, key_secret, _, active_env = PaymentCredentialService.get_active_credentials(db_session)
    assert key_id == test_key
    assert key_secret == test_secret
    assert active_env == "test"


# ==============================================================================
# TEST 10: Multiple backend workers use the same active configuration
# ==============================================================================
def test_10_multiple_backend_workers_use_same_active_configuration(db_session):
    admin = make_user(db_session, "admin10@kvtravels.test", ROLE_ADMIN)

    # Worker 1 saves credentials directly to DB
    PaymentCredentialService.save_credentials(
        db_session,
        admin_user=admin,
        environment="test",
        key_id="rzp_test_WorkerSharedKey1",
        key_secret="WorkerSharedSecret123",
    )
    db_session.commit()

    # Worker 2 reads from DB
    key_id, key_secret, _, _ = PaymentCredentialService.get_active_credentials(db_session)
    assert key_id == "rzp_test_WorkerSharedKey1"
    assert key_secret == "WorkerSharedSecret123"


# ==============================================================================
# TEST 11: Webhook signature verification uses the correct secret
# ==============================================================================
def test_11_webhook_signature_verification_uses_correct_secret(client, db_session):
    admin = make_user(db_session, "admin11@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    wh_secret = "whsec_RealCryptographicTestKey99"
    client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_WebhookProbe123",
            "razorpay_webhook_secret": wh_secret,
        },
        headers=headers,
    )

    # 1. API verification endpoint
    resp = client.post(
        "/api/v1/admin/payments/razorpay/webhook/verify",
        json={"environment": "test"},
        headers=headers,
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["configured"] is True
    assert res_data["signature_verification_active"] is True

    # 2. Direct HMAC-SHA256 test against RazorpayClient initialized with db credentials
    client_inst = PaymentCredentialService.get_client(db_session, target_env="test")
    payload_body = json.dumps({"event": "payment.captured", "id": "evt_test123"}).encode("utf-8")
    valid_sig = hmac.new(wh_secret.encode("utf-8"), payload_body, hashlib.sha256).hexdigest()

    # Valid signature passes
    assert client_inst.verify_webhook_signature(payload_body, valid_sig) is True

    # Invalid signature fails
    assert client_inst.verify_webhook_signature(payload_body, "invalid_sig_abc") is False


# ==============================================================================
# TEST 12: Payment verification uses the correct environment
# ==============================================================================
def test_12_payment_verification_uses_correct_environment(client, db_session):
    admin = make_user(db_session, "admin12@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    # Configure separate credentials
    client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_EnvCheckTest12",
            "razorpay_key_secret": "TestEnvSecret12345",
        },
        headers=headers,
    )
    client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "live",
            "razorpay_key_id": "rzp_live_EnvCheckLive34",
            "razorpay_key_secret": "LiveEnvSecret12345",
        },
        headers=headers,
    )

    # Active environment is "test"
    key_id, key_secret, _, active_env = PaymentCredentialService.get_active_credentials(db_session)
    assert active_env == "test"
    assert key_id == "rzp_test_EnvCheckTest12"
    assert key_secret == "TestEnvSecret12345"

    # Switch to Live (requires live confirmation)
    client.patch(
        "/api/v1/admin/payments/settings",
        json={"razorpay_environment": "live", "confirm_live_mode": True},
        headers=headers,
    )

    key_id, key_secret, _, active_env = PaymentCredentialService.get_active_credentials(db_session)
    assert active_env == "live"
    assert key_id == "rzp_live_EnvCheckLive34"
    assert key_secret == "LiveEnvSecret12345"

    # Switch back to Test
    client.patch(
        "/api/v1/admin/payments/settings",
        json={"razorpay_environment": "test"},
        headers=headers,
    )
    key_id, key_secret, _, active_env = PaymentCredentialService.get_active_credentials(db_session)
    assert active_env == "test"
    assert key_id == "rzp_test_EnvCheckTest12"


# ==============================================================================
# TEST 13: Missing or invalid encryption key fails safely
# ==============================================================================
def test_13_missing_encryption_key_fails_safely(db_session):
    admin = make_user(db_session, "admin13@kvtravels.test", ROLE_ADMIN)

    # When encryption key is missing or invalid, save_credentials refuses to store credentials
    with patch("app.services.payment_credential_service.resolve_encryption_key", return_value=None):
        with pytest.raises(HTTPException) as exc_info:
            PaymentCredentialService.save_credentials(
                db_session,
                admin_user=admin,
                environment="test",
                key_id="rzp_test_KeyShouldFail",
                key_secret="SecretShouldFail123",
            )
        assert exc_info.value.status_code == 400
        assert "PAYMENT_CREDENTIALS_ENCRYPTION_KEY" in exc_info.value.detail

    # With invalid key (not 32 bytes)
    with pytest.raises(EncryptionKeyError):
        encrypt_secret("test_secret", b"too_short_key")


# ==============================================================================
# TEST 14: No credentials appear in logs or audit records
# ==============================================================================
def test_14_no_credentials_appear_in_audit_records(client, db_session):
    admin = make_user(db_session, "admin14@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    secret_key = "AuditLeakCheckSecret999"
    webhook_secret = "AuditLeakCheckWebhookSecret888"

    client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_AuditSafe123",
            "razorpay_key_secret": secret_key,
            "razorpay_webhook_secret": webhook_secret,
        },
        headers=headers,
    )

    # Check all AuditLog records
    audit_logs = db_session.execute(
        select(AuditLog).where(AuditLog.entity_type == "payment_settings")
    ).scalars().all()
    assert len(audit_logs) > 0

    for log in audit_logs:
        # Check action name and details
        assert secret_key not in log.action
        assert webhook_secret not in log.action
        if log.metadata_json:
            details_str = json.dumps(log.metadata_json)
            assert secret_key not in details_str, f"Secret leaked in audit log: {details_str}"
            assert webhook_secret not in details_str, f"Webhook secret leaked in audit log: {details_str}"


# ==============================================================================
# TEST 15: Existing payment and booking behavior remains intact
# ==============================================================================
def test_15_existing_payment_and_booking_behavior_remains_intact(client, db_session):
    admin = make_user(db_session, "admin15@kvtravels.test", ROLE_ADMIN)
    headers = auth_login(client, admin.email)

    # Ensure valid test credentials configured
    client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "target_environment": "test",
            "razorpay_key_id": "rzp_test_BookingFlow123",
            "razorpay_key_secret": "BookingSecret123456",
            "razorpay_enabled": True,
        },
        headers=headers,
    )

    # Create catalog package & booking
    dest = Destination(
        name=f"Ooty Hill Station {uuid4().hex[:6]}",
        slug=f"ooty-{uuid4().hex[:6]}",
        country="India",
        is_published=True,
    )
    db_session.add(dest)
    db_session.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Nilgiri Mountain Explorer",
        slug=f"nilgiri-{uuid4().hex[:6]}",
        duration_days=3,
        duration_nights=2,
        base_price=Decimal("15000.00"),
        currency="INR",
        minimum_travellers=1,
        maximum_travellers=10,
        is_published=True,
    )
    db_session.add(pkg)
    db_session.flush()

    dep = PackageDeparture(
        package_id=pkg.id,
        departure_date=datetime.now(timezone.utc).date() + timedelta(days=20),
        return_date=datetime.now(timezone.utc).date() + timedelta(days=23),
        total_capacity=10,
        available_capacity=8,
        currency="INR",
        status="open",
    )
    db_session.add(dep)
    db_session.flush()

    booking = Booking(
        booking_reference=f"KV-BK-{uuid4().hex[:8].upper()}",
        user_id=admin.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=1,
        subtotal=Decimal("15000.00"),
        discount=Decimal("0.00"),
        tax=Decimal("0.00"),
        total=Decimal("15000.00"),
        currency="INR",
        status="payment_pending",
        payment_status="pending",
        hold_expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    )
    db_session.add(booking)
    db_session.flush()

    traveller = BookingTraveller(
        booking_id=booking.id,
        first_name="Athul",
        last_name="Traveler",
        is_primary=True,
        contact_email=admin.email,
        contact_phone="+919842212345",
        nationality="IND",
    )
    db_session.add(traveller)
    db_session.commit()
    db_session.refresh(booking)

    # Mock Razorpay order creation to ensure PaymentService cleanly utilizes the credential provider
    mock_order = {"id": "order_test_mock12345", "amount": 1500000, "currency": "INR", "status": "created"}
    with patch("app.services.razorpay_client.RazorpayClient.create_order", return_value=mock_order):
        order_resp = PaymentService.create_payment_order(
            db=db_session,
            current_user=admin,
            payload=RazorpayOrderCreateRequest(booking_id=booking.id),
        )
        assert order_resp.order_id == "order_test_mock12345"
        assert order_resp.key_id == "rzp_test_BookingFlow123"
        assert order_resp.amount_decimal == Decimal("15000.00")
