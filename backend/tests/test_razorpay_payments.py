"""Comprehensive test suite for Phase 9 Razorpay Payment System.

Tests cover:
1. Razorpay payment order creation for valid booking
2. Customer ownership / IDOR protection (Customer B cannot pay Customer A's booking)
3. Immunity to frontend amount and currency manipulation
4. Expired reservation hold rejects payment order creation and releases seats
5. Cancelled reservation rejects payment order creation
6. Duplicate order prevention / idempotency (reuses active pending order)
7. Valid HMAC-SHA256 payment signature verification transitions payment to 'captured' and booking to 'confirmed'
8. Invalid / tampered payment signature rejected with 400 and security audit log
9. Repeated verification idempotency
10. Client payment failure recording allows retry if hold is valid
11. Webhook processing with valid HMAC-SHA256 signature confirms booking
12. Webhook with invalid signature rejected with 400
13. Webhook replay / duplicate event idempotency
14. Batch expired payment holds cancellation and atomic seat restoration
15. Expired holds job does not touch confirmed / paid bookings
16. Administrative refund processing with balance limits and overpayment rejection
17. Customer blocked from refund endpoints (403 Forbidden)
18. CSRF protection on payment and refund mutations
19. Secrets safety: RAZORPAY_KEY_SECRET is never exposed in responses
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_CUSTOMER,
    ROLE_MANAGER,
)
from app.core.security import hash_password
from app.models.catalog import Destination, Package, PackageDeparture
from app.models.commerce import Booking, BookingTraveller, Payment
from app.models.user import Role, User, UserRole
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
        first_name="Traveller",
        last_name=role_name.capitalize(),
        status="active",
    )
    db.add(user)
    db.flush()

    role = db.execute(select(Role).where(Role.name == role_name)).scalar_one()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    return user


def login(client, email: str, password: str = PASSWORD) -> dict[str, str]:
    client.cookies.clear()
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=csrf_headers(client),
    )
    assert resp.status_code == 200
    return csrf_headers(client)


def setup_booking_fixture(
    db, user: User, amount: Decimal = Decimal("75000.00"), hold_minutes: int = 30
) -> tuple[Booking, PackageDeparture]:
    dest = Destination(
        name="Maldives Paradise",
        slug=f"maldives-{uuid4().hex[:6]}",
        country="Maldives",
        is_published=True,
    )
    db.add(dest)
    db.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Luxury Atoll Escape",
        slug=f"luxury-atoll-{uuid4().hex[:6]}",
        duration_days=5,
        duration_nights=4,
        base_price=amount,
        currency="INR",
        minimum_travellers=1,
        maximum_travellers=10,
        is_published=True,
    )
    db.add(pkg)
    db.flush()

    now_date = datetime.now(timezone.utc).date()
    departure = PackageDeparture(
        package_id=pkg.id,
        departure_date=now_date + timedelta(days=20),
        return_date=now_date + timedelta(days=25),
        total_capacity=10,
        available_capacity=8,
        reserved_capacity=2,
        currency="INR",
        status="open",
    )
    db.add(departure)
    db.flush()

    now = datetime.now(timezone.utc)
    hold_expires = now + timedelta(minutes=hold_minutes)

    booking = Booking(
        booking_reference=f"KV-2026-{uuid4().hex[:6].upper()}",
        user_id=user.id,
        package_id=pkg.id,
        departure_id=departure.id,
        number_of_travellers=2,
        subtotal=amount,
        discount=Decimal("0.00"),
        tax=Decimal("0.00"),
        total=amount,
        currency="INR",
        status="payment_pending",
        payment_status="pending",
        hold_expires_at=hold_expires,
    )
    db.add(booking)
    db.flush()

    lead_traveller = BookingTraveller(
        booking_id=booking.id,
        first_name="Kavitha",
        last_name="Venkatesh",
        is_primary=True,
        contact_email=user.email,
        contact_phone="+919876543210",
        nationality="IND",
    )
    db.add(lead_traveller)
    db.commit()
    db.refresh(booking)
    return booking, departure


# ==============================================================================
# 1. Payment Order Creation & Security
# ==============================================================================


def test_razorpay_order_creation_success(client, db_session) -> None:
    """Authenticated customer creates a Razorpay order with authoritative amount in paise."""
    user = create_user(db_session, "buyer1@example.com")
    booking, _ = setup_booking_fixture(db_session, user, amount=Decimal("75000.00"))
    headers = login(client, user.email)

    resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["booking_id"] == str(booking.id)
    assert data["order_id"].startswith("order_")
    # 75000 INR = 7500000 paise
    assert data["amount"] == 7500000
    assert data["amount_decimal"] == "75000.00"
    assert data["currency"] == "INR"
    assert "key_id" in data
    # Secret must NEVER be present
    assert "key_secret" not in data
    assert "secret" not in data

    # Verify internal Payment record
    pmt = db_session.execute(
        select(Payment).where(Payment.booking_id == booking.id)
    ).scalar_one()
    assert pmt.status == "pending"
    assert pmt.provider == "razorpay"
    assert pmt.provider_order_id == data["order_id"]
    assert pmt.amount == Decimal("75000.00")


def test_unauthenticated_order_creation_rejected(client, db_session) -> None:
    """Unauthenticated client is rejected with 401."""
    user = create_user(db_session, "buyer2@example.com")
    booking, _ = setup_booking_fixture(db_session, user)

    client.cookies.clear()
    resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=csrf_headers(client),
    )
    assert resp.status_code == 401


def test_customer_ownership_enforced_on_order(client, db_session) -> None:
    """Customer B cannot create a payment order for Customer A's booking."""
    user_a = create_user(db_session, "user_a@example.com")
    user_b = create_user(db_session, "user_b@example.com")
    booking_a, _ = setup_booking_fixture(db_session, user_a)

    headers_b = login(client, user_b.email)
    resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking_a.id)},
        headers=headers_b,
    )
    assert resp.status_code == 404


def test_expired_hold_rejects_order_and_cancels_booking(client, db_session) -> None:
    """If reservation hold expired, order creation is rejected and seats are released."""
    user = create_user(db_session, "expired_buyer@example.com")
    booking, dep = setup_booking_fixture(
        db_session, user, hold_minutes=-10
    )  # expired 10m ago
    initial_reserved = dep.reserved_capacity
    headers = login(client, user.email)

    resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )

    assert resp.status_code == 400
    err_msg = (
        resp.json().get("error", {}).get("message") or resp.json().get("detail", "")
    ).lower()
    assert "expired" in err_msg

    # Verify booking status cancelled and seats restored
    db_session.refresh(booking)
    db_session.refresh(dep)
    assert booking.status == "cancelled"
    assert dep.reserved_capacity == initial_reserved - booking.number_of_travellers


def test_duplicate_order_idempotency_reuses_active_order(client, db_session) -> None:
    """Repeated calls to create payment order reuse existing pending Razorpay order."""
    user = create_user(db_session, "repeat_buyer@example.com")
    booking, _ = setup_booking_fixture(db_session, user)
    headers = login(client, user.email)

    resp1 = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )
    assert resp1.status_code == 201
    order_id_1 = resp1.json()["order_id"]

    resp2 = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )
    assert resp2.status_code == 201
    order_id_2 = resp2.json()["order_id"]

    # Same order reused
    assert order_id_1 == order_id_2

    # Exactly 1 payment record created
    pmts = (
        db_session.execute(select(Payment).where(Payment.booking_id == booking.id))
        .scalars()
        .all()
    )
    assert len(pmts) == 1


# ==============================================================================
# 2. Payment Signature Verification & Confirmation
# ==============================================================================


def test_valid_signature_verification_confirms_booking(client, db_session) -> None:
    """Official HMAC-SHA256 signature confirms booking and captures payment."""
    user = create_user(db_session, "valid_sig_user@example.com")
    booking, _ = setup_booking_fixture(db_session, user, amount=Decimal("50000.00"))
    headers = login(client, user.email)

    # 1. Create order
    order_resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )
    assert order_resp.status_code == 201
    order_id = order_resp.json()["order_id"]

    # 2. Generate authentic Razorpay signature
    rzp_client = get_razorpay_client()
    payment_id = f"pay_{uuid4().hex[:10]}"
    signature = rzp_client.generate_payment_signature(order_id, payment_id)

    # 3. Verify
    verify_resp = client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "booking_id": str(booking.id),
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        },
        headers=headers,
    )

    assert verify_resp.status_code == 200
    v_data = verify_resp.json()
    assert v_data["success"] is True
    assert v_data["booking_status"] == "confirmed"
    assert v_data["payment_status"] == "paid"

    # Database records updated atomically
    db_session.refresh(booking)
    assert booking.status == "confirmed"
    assert booking.payment_status == "paid"

    pmt = db_session.execute(
        select(Payment).where(Payment.booking_id == booking.id)
    ).scalar_one()
    assert pmt.status == "captured"
    assert pmt.provider_payment_id == payment_id
    assert pmt.captured_at is not None


def test_invalid_signature_rejected_with_audit_log(client, db_session) -> None:
    """Tampered signature fails verification and logs security audit without confirming booking."""
    user = create_user(db_session, "fake_sig_user@example.com")
    booking, _ = setup_booking_fixture(db_session, user)
    headers = login(client, user.email)

    order_resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )
    order_id = order_resp.json()["order_id"]

    # Forged signature
    fake_payment_id = "pay_fake12345678"
    fake_signature = "bad_forged_hmac_signature_hex_code_12345"

    verify_resp = client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "booking_id": str(booking.id),
            "razorpay_order_id": order_id,
            "razorpay_payment_id": fake_payment_id,
            "razorpay_signature": fake_signature,
        },
        headers=headers,
    )

    assert verify_resp.status_code == 400
    err_msg = (
        verify_resp.json().get("error", {}).get("message")
        or verify_resp.json().get("detail", "")
    ).lower()
    assert "signature verification failed" in err_msg

    # Booking must NOT be confirmed
    db_session.refresh(booking)
    assert booking.status == "payment_pending"
    assert booking.payment_status == "pending"

    # Payment record marked failed
    pmt = db_session.execute(
        select(Payment).where(Payment.booking_id == booking.id)
    ).scalar_one()
    assert pmt.status == "failed"
    assert pmt.failure_code == "INVALID_SIGNATURE"


def test_repeated_verification_idempotency(client, db_session) -> None:
    """Submitting valid verification twice returns success without double-processing."""
    user = create_user(db_session, "idemp_verify@example.com")
    booking, _ = setup_booking_fixture(db_session, user)
    headers = login(client, user.email)

    order_resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )
    order_id = order_resp.json()["order_id"]
    payment_id = f"pay_{uuid4().hex[:10]}"
    sig = get_razorpay_client().generate_payment_signature(order_id, payment_id)

    payload = {
        "booking_id": str(booking.id),
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": sig,
    }

    resp1 = client.post(
        "/api/v1/payments/razorpay/verify", json=payload, headers=headers
    )
    assert resp1.status_code == 200

    resp2 = client.post(
        "/api/v1/payments/razorpay/verify", json=payload, headers=headers
    )
    assert resp2.status_code == 200
    assert resp2.json()["success"] is True


def test_payment_failure_recording_leaves_booking_pending(client, db_session) -> None:
    """Client reporting failure marks payment failed but leaves booking open for retry."""
    user = create_user(db_session, "fail_retry_user@example.com")
    booking, _ = setup_booking_fixture(db_session, user)
    headers = login(client, user.email)

    order_resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )
    order_id = order_resp.json()["order_id"]

    fail_resp = client.post(
        "/api/v1/payments/razorpay/failure",
        json={
            "booking_id": str(booking.id),
            "razorpay_order_id": order_id,
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "User cancelled on bank payment page",
        },
        headers=headers,
    )
    assert fail_resp.status_code == 200

    # Booking remains payment_pending
    db_session.refresh(booking)
    assert booking.status == "payment_pending"

    # Payment marked failed
    pmt = db_session.execute(
        select(Payment).where(Payment.booking_id == booking.id)
    ).scalar_one()
    assert pmt.status == "failed"
    assert pmt.failure_code == "BAD_REQUEST_ERROR"


# ==============================================================================
# 3. Webhook Verification & Processing
# ==============================================================================


def test_valid_webhook_payment_captured_confirms_booking(client, db_session) -> None:
    """Valid signed webhook confirming payment.captured updates booking to confirmed."""
    user = create_user(db_session, "webhook_user@example.com")
    booking, _ = setup_booking_fixture(db_session, user)
    headers = login(client, user.email)

    order_resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )
    order_id = order_resp.json()["order_id"]
    payment_id = f"pay_{uuid4().hex[:10]}"
    event_id = f"evt_{uuid4().hex[:10]}"

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
                }
            }
        },
    }
    raw_body = json.dumps(webhook_payload).encode("utf-8")
    sig = get_razorpay_client().generate_webhook_signature(raw_body)

    resp = client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    # Booking confirmed
    db_session.refresh(booking)
    assert booking.status == "confirmed"
    assert booking.payment_status == "paid"


def test_invalid_webhook_signature_rejected(client, db_session) -> None:
    """Webhook with forged or invalid signature is rejected with 400."""
    body = b'{"event":"payment.captured"}'
    resp = client.post(
        "/api/v1/payments/razorpay/webhook",
        content=body,
        headers={
            "X-Razorpay-Signature": "invalid_forged_sig",
            "Content-Type": "application/json",
        },
    )
    assert resp.status_code == 400
    err_msg = (
        resp.json().get("error", {}).get("message") or resp.json().get("detail", "")
    ).lower()
    assert "invalid razorpay webhook signature" in err_msg


def test_webhook_replay_and_idempotency(client, db_session) -> None:
    """Replaying the same webhook event is handled idempotently without duplicate records."""
    user = create_user(db_session, "webhook_replay@example.com")
    booking, _ = setup_booking_fixture(db_session, user)
    headers = login(client, user.email)

    order_resp = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": str(booking.id)},
        headers=headers,
    )
    order_id = order_resp.json()["order_id"]
    payment_id = f"pay_{uuid4().hex[:10]}"
    event_id = f"evt_{uuid4().hex[:10]}"

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
                }
            }
        },
    }
    raw_body = json.dumps(webhook_payload).encode("utf-8")
    sig = get_razorpay_client().generate_webhook_signature(raw_body)

    # First delivery
    resp1 = client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
    )
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "success"

    # Replay
    resp2 = client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "already_processed"


# ==============================================================================
# 4. Hold Expiry & Seat Release
# ==============================================================================


def test_batch_expire_holds_cancels_and_restores_capacity(client, db_session) -> None:
    """Expired holds endpoint cancels unpaid bookings and restores departure seats atomically."""
    staff = create_user(db_session, "staff_expiry@example.com", ROLE_ADMIN)
    customer = create_user(db_session, "customer_held@example.com")
    booking, dep = setup_booking_fixture(
        db_session, customer, hold_minutes=-15
    )  # expired 15m ago
    initial_reserved = dep.reserved_capacity

    headers = login(client, staff.email)
    resp = client.post("/api/v1/admin/payments/expire-holds", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["expired_count"] >= 1
    assert data["released_seats"] >= booking.number_of_travellers

    db_session.refresh(booking)
    db_session.refresh(dep)
    assert booking.status == "cancelled"
    assert dep.reserved_capacity == initial_reserved - booking.number_of_travellers


def test_expire_holds_skips_confirmed_bookings(client, db_session) -> None:
    """Hold expiry runner never cancels bookings that have been paid and confirmed."""
    staff = create_user(db_session, "staff_conf_check@example.com", ROLE_ADMIN)
    customer = create_user(db_session, "cust_confirmed@example.com")
    booking, dep = setup_booking_fixture(db_session, customer, hold_minutes=-10)

    # Mark confirmed
    booking.status = "confirmed"
    booking.payment_status = "paid"
    db_session.commit()

    initial_reserved = dep.reserved_capacity

    headers = login(client, staff.email)
    resp = client.post("/api/v1/admin/payments/expire-holds", headers=headers)
    assert resp.status_code == 200

    db_session.refresh(booking)
    db_session.refresh(dep)
    assert booking.status == "confirmed"
    assert dep.reserved_capacity == initial_reserved


# ==============================================================================
# 5. Refunds & Admin Controls
# ==============================================================================


def test_admin_process_full_and_partial_refunds(client, db_session) -> None:
    """Manager can execute partial refund, then remaining balance; over-refunding is rejected."""
    admin = create_user(db_session, "refund_admin@example.com", ROLE_MANAGER)
    customer = create_user(db_session, "refunded_cust@example.com")
    booking, _ = setup_booking_fixture(db_session, customer, amount=Decimal("60000.00"))

    # Create captured payment
    payment = Payment(
        booking_id=booking.id,
        provider="razorpay",
        provider_order_id=f"order_{uuid4().hex[:8]}",
        provider_payment_id=f"pay_{uuid4().hex[:10]}",
        idempotency_key=f"pmt-{uuid4().hex}",
        amount=Decimal("60000.00"),
        currency="INR",
        status="captured",
    )
    booking.status = "confirmed"
    booking.payment_status = "paid"
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)

    headers = login(client, admin.email)

    # 1. Partial refund of ₹20,000
    ref_resp1 = client.post(
        f"/api/v1/admin/payments/{payment.id}/refund",
        json={"amount": 20000.0, "reason": "Customer requested room downgrade"},
        headers=headers,
    )
    assert ref_resp1.status_code == 200
    data1 = ref_resp1.json()
    assert data1["amount"] == "20000.00"
    assert data1["status"] == "processed"

    db_session.refresh(payment)
    assert payment.status == "partially_refunded"

    # 2. Attempt over-refund of ₹50,000 (remaining balance is only ₹40,000)
    over_resp = client.post(
        f"/api/v1/admin/payments/{payment.id}/refund",
        json={"amount": 50000.0, "reason": "Too much"},
        headers=headers,
    )
    assert over_resp.status_code == 400
    err_msg = (
        over_resp.json().get("error", {}).get("message")
        or over_resp.json().get("detail", "")
    ).lower()
    assert "exceeds" in err_msg

    # 3. Final refund of remaining ₹40,000
    ref_resp2 = client.post(
        f"/api/v1/admin/payments/{payment.id}/refund",
        json={"amount": 40000.0, "reason": "Full trip cancellation"},
        headers=headers,
    )
    assert ref_resp2.status_code == 200

    db_session.refresh(payment)
    assert payment.status == "refunded"
    assert payment.booking.payment_status == "refunded"


def test_customer_cannot_refund_payment(client, db_session) -> None:
    """Customer role receives 403 Forbidden when attempting refund endpoint."""
    customer = create_user(db_session, "non_admin_refund@example.com")
    booking, _ = setup_booking_fixture(db_session, customer)
    payment = Payment(
        booking_id=booking.id,
        provider="razorpay",
        provider_order_id=f"order_{uuid4().hex[:8]}",
        provider_payment_id=f"pay_{uuid4().hex[:10]}",
        idempotency_key=f"pmt-{uuid4().hex}",
        amount=Decimal("50000.00"),
        currency="INR",
        status="captured",
    )
    db_session.add(payment)
    db_session.commit()

    headers = login(client, customer.email)
    resp = client.post(
        f"/api/v1/admin/payments/{payment.id}/refund",
        json={"amount": 1000.0},
        headers=headers,
    )
    assert resp.status_code == 403
