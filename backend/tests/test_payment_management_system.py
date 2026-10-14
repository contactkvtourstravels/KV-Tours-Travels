"""Automated tests for the Payment Management System and Global Switch Enforcement.

Tests cover:
1. Global payment switch persistence and customer maintenance message
2. Direct API rejection (HTTP 403) when online payments are disabled
3. Webhook processing continues safely even while online payments are disabled
4. Admin Payment Control Center endpoints (overview, settings, transactions, webhooks, diagnostics)
5. Live mode activation requires explicit confirmation
6. Public inquiries remain fully functional while online payments are disabled
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER
from app.core.security import hash_password
from app.models.catalog import Destination, Package, PackageDeparture
from app.models.commerce import Booking, BookingTraveller, Payment
from app.models.user import Role, User, UserRole
from app.services.catalog_service import get_public_settings
from app.services.payment_service import PaymentService
from app.services.razorpay_client import get_razorpay_client

PASSWORD = "SecurePassword!2026"


def csrf_headers(client) -> dict[str, str]:
    cookie_token = client.cookies.get("travel_csrf")
    if cookie_token:
        return {"X-CSRF-Token": cookie_token}
    resp = client.get("/api/v1/auth/csrf")
    assert resp.status_code == 200
    return {"X-CSRF-Token": resp.json()["csrf_token"]}


def create_user(db, email: str, role_name: str = ROLE_CUSTOMER) -> User:
    seed_standard_roles(db)
    user = User(
        email=email,
        email_normalized=email.lower().strip(),
        password_hash=hash_password(PASSWORD),
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


def login(client, email: str, password: str = PASSWORD) -> dict[str, str]:
    client.cookies.clear()
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=csrf_headers(client),
    )
    assert resp.status_code == 200, resp.text
    return csrf_headers(client)


def setup_booking(
    db, user: User, amount: Decimal = Decimal("50000.00")
) -> tuple[Booking, PackageDeparture]:
    dest = Destination(
        name=f"Coimbatore Hub {uuid4().hex[:6]}",
        slug=f"coimbatore-{uuid4().hex[:6]}",
        country="India",
        is_published=True,
    )
    db.add(dest)
    db.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Nilgiri Mountain Explorer",
        slug=f"nilgiri-{uuid4().hex[:6]}",
        duration_days=3,
        duration_nights=2,
        base_price=amount,
        currency="INR",
        minimum_travellers=1,
        maximum_travellers=10,
        is_published=True,
    )
    db.add(pkg)
    db.flush()

    now_date = datetime.now(timezone.utc).date()
    dep = PackageDeparture(
        package_id=pkg.id,
        departure_date=now_date + timedelta(days=20),
        return_date=now_date + timedelta(days=23),
        total_capacity=10,
        available_capacity=8,
        reserved_capacity=2,
        currency="INR",
        status="open",
    )
    db.add(dep)
    db.flush()

    booking = Booking(
        booking_reference=f"KV-{uuid4().hex[:8].upper()}",
        user_id=user.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=2,
        subtotal=amount,
        discount=Decimal("0.00"),
        tax=Decimal("0.00"),
        total=amount,
        currency="INR",
        status="payment_pending",
        payment_status="pending",
        hold_expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    )
    db.add(booking)
    db.flush()

    traveller = BookingTraveller(
        booking_id=booking.id,
        first_name="Athul",
        last_name="Traveler",
        is_primary=True,
        contact_email=user.email,
        contact_phone="+919842212345",
        nationality="IND",
    )
    db.add(traveller)
    db.commit()
    db.refresh(booking)
    return booking, dep


def test_global_payment_switch_persistence_and_maintenance_message(db_session):
    """Verify master switch persistence and public settings reflection."""
    custom_msg = "Online checkout is paused for scheduled system maintenance. Please call our concierge."
    PaymentService.set_online_payments_enabled(
        db=db_session,
        enabled=False,
        maintenance_message=custom_msg,
    )

    assert PaymentService.is_online_payments_enabled(db_session) is False
    assert PaymentService.get_maintenance_message(db_session) == custom_msg

    pub_settings = get_public_settings(db_session)
    assert pub_settings.online_payments_enabled is False
    assert pub_settings.online_payments_maintenance_message == custom_msg

    # Turn back on
    PaymentService.set_online_payments_enabled(db=db_session, enabled=True)
    assert PaymentService.is_online_payments_enabled(db_session) is True


def test_disabled_payments_rejects_new_order_with_403(client, db_session):
    """When online payments are OFF, order creation is rejected with HTTP 403."""
    user = create_user(db_session, f"cust_{uuid4().hex[:6]}@example.com", ROLE_CUSTOMER)
    booking, _ = setup_booking(db_session, user)

    # Disable online payments
    notice = "Online checkout is temporarily paused for maintenance."
    PaymentService.set_online_payments_enabled(
        db=db_session, enabled=False, maintenance_message=notice
    )

    headers = login(client, user.email)

    resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )
    assert resp.status_code == 403
    assert notice in resp.text

    # Re-enable online payments
    PaymentService.set_online_payments_enabled(db=db_session, enabled=True)


def test_disabled_payments_still_processes_legitimate_webhooks(client, db_session):
    """Even when online payments are disabled, valid webhooks for active orders are processed."""
    user = create_user(db_session, f"cust_{uuid4().hex[:6]}@example.com", ROLE_CUSTOMER)
    booking, _ = setup_booking(db_session, user)
    headers = login(client, user.email)

    # 1. Order is created while online payments are enabled
    order_resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    # 2. Now disable online payments globally
    PaymentService.set_online_payments_enabled(db=db_session, enabled=False)

    # 3. Webhook arrives for the previously initiated order
    rzp = get_razorpay_client()
    payment_id = f"pay_{uuid4().hex[:14]}"
    event_id = f"evt_{uuid4().hex[:14]}"
    webhook_payload = {
        "event": "payment.captured",
        "event_id": event_id,
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order_id,
                    "amount": int(booking.total * 100),
                    "currency": "INR",
                    "status": "captured",
                    "method": "upi",
                }
            }
        },
    }

    raw_body = json.dumps(webhook_payload).encode("utf-8")
    signature = rzp.generate_webhook_signature(raw_body)
    resp = client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={
            "X-Razorpay-Signature": signature,
            "Content-Type": "application/json",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    db_session.refresh(booking)
    payment = db_session.execute(
        select(Payment).where(Payment.provider_order_id == order_id)
    ).scalar_one()
    assert payment.status == "captured"
    assert booking.status == "confirmed"
    assert booking.payment_status == "paid"

    # Reset
    PaymentService.set_online_payments_enabled(db=db_session, enabled=True)


def test_admin_payments_control_center_endpoints(client, db_session):
    """Verify Admin Payment Control Center endpoints (overview, settings, transactions, webhooks)."""
    admin = create_user(db_session, f"admin_{uuid4().hex[:6]}@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)

    # 1. Overview
    resp = client.get("/api/v1/admin/payments/overview")
    assert resp.status_code == 200
    ov = resp.json()
    assert "total_volume" in ov
    assert "captured_count" in ov
    assert "online_payments_enabled" in ov

    # 2. Settings
    resp = client.get("/api/v1/admin/payments/settings")
    assert resp.status_code == 200
    settings_data = resp.json()
    assert "gateways" in settings_data
    assert "razorpay_key_id_masked" in settings_data
    assert "live_readiness_checklist" in settings_data

    # 3. Update Settings (Toggle Master Switch)
    resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "online_payments_enabled": False,
            "maintenance_message": "Upgrading payment gateway.",
        },
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["online_payments_enabled"] is False

    # 4. Transactions List
    resp = client.get("/api/v1/admin/payments/transactions")
    assert resp.status_code == 200
    assert "items" in resp.json()

    # 5. Diagnostic Probe
    resp = client.post(
        "/api/v1/admin/payments/razorpay/diagnostic",
        headers=headers,
    )
    assert resp.status_code == 200
    diag = resp.json()
    assert "success" in diag
    assert "diagnostic_message" in diag

    # 6. Webhooks List
    resp = client.get("/api/v1/admin/payments/webhooks")
    assert resp.status_code == 200
    assert "items" in resp.json()

    # Re-enable payments
    PaymentService.set_online_payments_enabled(db=db_session, enabled=True)


def test_live_mode_requires_explicit_confirmation(client, db_session):
    """Switching to Live Mode without confirm_live_mode is rejected."""
    admin = create_user(db_session, f"admin_{uuid4().hex[:6]}@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)

    resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "razorpay_environment": "live",
            "confirm_live_mode": False,
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "explicit confirmation" in resp.text.lower()


def test_public_inquiry_works_while_payments_disabled(client, db_session):
    """Customer inquiries work seamlessly when online payments are disabled."""
    dest = Destination(
        name="Wayanad Wilds",
        slug=f"wayanad-{uuid4().hex[:6]}",
        country="India",
        is_published=True,
    )
    db_session.add(dest)
    db_session.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Wayanad Coffee Trails",
        slug=f"wayanad-coffee-{uuid4().hex[:6]}",
        duration_days=3,
        duration_nights=2,
        base_price=Decimal("15000.00"),
        currency="INR",
        minimum_travellers=1,
        maximum_travellers=10,
        is_published=True,
    )
    db_session.add(pkg)
    db_session.commit()

    # Turn OFF payments
    PaymentService.set_online_payments_enabled(db=db_session, enabled=False)

    resp = client.post(
        "/api/v1/inquiries",
        json={
            "package_id": str(pkg.id),
            "name": "Inquiry Customer",
            "email": "inquiry@example.com",
            "phone": "+919842212345",
            "message": "Interested in booking this package next month.",
        },
    )
    assert resp.status_code == 201
    assert "id" in resp.json()
    assert resp.json()["status"] == "new"

    # Re-enable payments
    PaymentService.set_online_payments_enabled(db=db_session, enabled=True)


def test_admin_can_update_razorpay_api_credentials(client, db_session):
    """Admin can configure custom Razorpay API Key ID, Secret, and Webhook Secret via admin panel."""
    admin = create_user(db_session, f"admin_{uuid4().hex[:6]}@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)

    # 1. Update with valid custom test credentials
    custom_key_id = "rzp_test_99CustomKey1234"
    resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "razorpay_key_id": custom_key_id,
            "razorpay_key_secret": "mySuperSecretKey99!",
            "razorpay_webhook_secret": "myWebhookSecret99!",
            "razorpay_environment": "test",
        },
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_custom_credentials"] is True
    assert custom_key_id[:8] in data["razorpay_key_id_masked"]
    assert data["key_secret_configured"] is True
    assert data["webhook_secret_configured"] is True

    # 2. Gateway diagnostic probes with updated credentials (unregistered key fails authentication safely)
    diag_resp = client.post(
        "/api/v1/admin/payments/razorpay/diagnostic",
        headers=headers,
    )
    assert diag_resp.status_code == 200
    diag_data = diag_resp.json()
    assert diag_data["success"] is False
    assert "Authentication failed" in diag_data["diagnostic_message"]
    assert custom_key_id[:8] in diag_data["key_id_masked"]

    # 3. Setting a placeholder test key succeeds locally in simulation mode
    resp_ph = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "razorpay_key_id": "rzp_test_placeholder_custom",
            "razorpay_key_secret": "custom_secret_key_123",
        },
        headers=headers,
    )
    assert resp_ph.status_code == 200
    diag_resp_ph = client.post(
        "/api/v1/admin/payments/razorpay/diagnostic",
        headers=headers,
    )
    assert diag_resp_ph.status_code == 200
    assert diag_resp_ph.json()["success"] is True

    # 3. Invalid key prefix is rejected with 400
    invalid_resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "razorpay_key_id": "invalid_prefix_key",
        },
        headers=headers,
    )
    assert invalid_resp.status_code == 400
    assert "rzp_test_" in invalid_resp.text or "rzp_live_" in invalid_resp.text

    # 4. Reset credentials to environment defaults
    reset_resp = client.patch(
        "/api/v1/admin/payments/settings",
        json={
            "reset_credentials_to_env": True,
        },
        headers=headers,
    )
    assert reset_resp.status_code == 200
    reset_data = reset_resp.json()
    assert reset_data["has_custom_credentials"] is False
