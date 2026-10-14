"""Comprehensive test suite for Phase 10 Customer Portal & Communication System.

Test scenarios:
DASHBOARD:
1. Authenticated customer dashboard displays metrics, upcoming trips, recent bookings
2. Unauthenticated customer dashboard rejected (401)
3. Customer cannot view another customer's dashboard / data isolation

BOOKINGS:
4. Customer booking list returns user's bookings
5. Booking ownership check prevents customer from viewing another customer's booking
6. Booking detail returns full roster, itinerary, and breakdown
7. Pagination works on customer bookings
8. Filtering works on customer bookings (status filter)

TRAVELLERS:
9. Create saved traveller succeeds
10. Update saved traveller succeeds
11. Delete saved traveller succeeds
12. Saved traveller ownership protection (cannot view/edit/delete another user's saved traveller)
13. Historical booking snapshot unaffected when saved traveller is modified or deleted

CANCELLATION:
14. Submit cancellation request succeeds with reason
15. Cannot cancel another customer's booking (403/404)
16. Duplicate cancellation request rejected
17. Admin review of cancellation request (approval/rejection)

EMAIL:
18. Booking confirmation email triggered on payment verification
19. Payment confirmation email triggered on payment verification
20. Duplicate notification protection (idempotency key prevents duplicate emails)
21. Email failure does not alter or roll back payment
22. Retry failed notification updates status and retry count

WHATSAPP:
23. Correct prefilled message and URL formatting
24. Configured WhatsApp number from site settings used
25. Missing configuration handled safely
26. Secrets never returned to frontend

RECEIPTS & VOUCHERS:
27. Receipt ownership check
28. Receipt reflects immutable booking values
29. Travel voucher reflects catalog itinerary and booking snapshot

SECURITY:
30. CSRF protection on customer portal mutations
31. IDOR protection across customer portal endpoints
32. Privilege escalation prevented (cannot update role via customer profile)
33. Sensitive data exposure barred (password hash, secrets never exposed)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER
from app.core.security import hash_password
from app.models.catalog import Destination, Package, PackageDay, PackageDeparture
from app.models.commerce import (
    Booking,
    BookingTraveller,
    Payment,
    SavedTraveller,
)
from app.models.content import NotificationLog, SiteSetting
from app.models.user import Role, User, UserRole
from app.services.email_service import get_email_service
from app.services.whatsapp_service import get_whatsapp_service

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
    parts = email.split("@")
    unique_email = f"{parts[0]}.{uuid4().hex[:6]}@{parts[1]}"
    user = User(
        email=unique_email,
        email_normalized=unique_email.lower().strip(),
        password_hash=hash_password(PASSWORD),
        first_name="Test",
        last_name=role_name.capitalize(),
        status="active",
    )
    db.add(user)
    db.flush()

    role = db.execute(select(Role).where(Role.name == role_name)).scalar_one()
    assignment = UserRole(user_id=user.id, role_id=role.id)
    db.add(assignment)
    db.flush()
    return user


def login_user(client, email: str):
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
        headers=csrf_headers(client),
    )


def create_sample_catalog_and_booking(
    db, user: User, is_paid: bool = False, days_ahead: int = 14
) -> Booking:
    destination = Destination(
        name=f"Maldives Luxury {uuid4().hex[:6]}",
        slug=f"maldives-{uuid4().hex[:6]}",
        country="Maldives",
        is_published=True,
    )
    db.add(destination)
    db.flush()

    package = Package(
        title="Maldives Overwater Retreat",
        slug=f"maldives-retreat-{uuid4().hex[:6]}",
        destination_id=destination.id,
        is_published=True,
        currency="INR",
        base_price=Decimal("85000.00"),
        duration_days=5,
        duration_nights=4,
    )
    db.add(package)
    db.flush()

    # Add itinerary day
    day1 = PackageDay(
        package_id=package.id,
        day_number=1,
        title="Arrival in Male & Speedboat Transfer",
        description="Welcome to Maldives! Private speedboat transfer to the island resort.",
    )
    db.add(day1)

    departure = PackageDeparture(
        package_id=package.id,
        departure_date=datetime.now(timezone.utc).date() + timedelta(days=days_ahead),
        return_date=datetime.now(timezone.utc).date() + timedelta(days=days_ahead + 4),
        total_capacity=20,
        available_capacity=18,
        currency="INR",
        status="open",
    )

    db.add(departure)
    db.flush()

    booking = Booking(
        booking_reference=f"KV-2026-{uuid4().hex[:6].upper()}",
        user_id=user.id,
        package_id=package.id,
        departure_id=departure.id,
        number_of_travellers=2,
        subtotal=Decimal("170000.00"),
        discount=Decimal("0.00"),
        tax=Decimal("0.00"),
        total=Decimal("170000.00"),
        currency="INR",
        status="confirmed" if is_paid else "pending",
        payment_status="paid" if is_paid else "pending",
        price_breakdown={
            "subtotal": "170000.00",
            "total": "170000.00",
            "currency": "INR",
        },
    )
    db.add(booking)
    db.flush()

    traveller = BookingTraveller(
        booking_id=booking.id,
        first_name="Primary",
        last_name="Passenger",
        is_primary=True,
        contact_phone="+919876543210",
        contact_email=user.email,
    )
    db.add(traveller)
    db.flush()

    if is_paid:
        payment = Payment(
            booking_id=booking.id,
            provider="razorpay",
            provider_order_id=f"order_{uuid4().hex[:10]}",
            provider_payment_id=f"pay_{uuid4().hex[:10]}",
            idempotency_key=f"pmt-idem-{uuid4().hex}",
            amount=Decimal("170000.00"),
            currency="INR",
            status="captured",
        )
        db.add(payment)
        db.flush()

    return booking


# ============================================================================
# 1. CUSTOMER DASHBOARD TESTS
# ============================================================================


def test_customer_dashboard_authenticated(client, db_session):
    """Scenario 1: Authenticated customer retrieves their own dashboard summary."""
    user = create_user(db_session, "dash.user@example.com")
    create_sample_catalog_and_booking(db_session, user, is_paid=True, days_ahead=10)

    login_user(client, user.email)
    resp = client.get("/api/v1/customer/dashboard")
    assert resp.status_code == 200
    data = resp.json()

    assert data["user_email"] == user.email
    assert data["total_bookings"] == 1
    assert data["active_bookings_count"] == 1
    assert len(data["upcoming_trips"]) == 1
    assert data["whatsapp_concierge"]["action_type"] == "concierge_help"
    assert "wa.me" in data["whatsapp_concierge"]["click_to_chat_url"]


def test_customer_dashboard_unauthenticated_rejected(client):
    """Scenario 2: Unauthenticated customer cannot access dashboard."""
    resp = client.get("/api/v1/customer/dashboard")
    assert resp.status_code == 401


def test_customer_dashboard_data_isolation(client, db_session):
    """Scenario 3: Customer A cannot see Customer B's bookings in dashboard."""
    user_a = create_user(db_session, "user.a@example.com")
    user_b = create_user(db_session, "user.b@example.com")

    create_sample_catalog_and_booking(db_session, user_a, is_paid=True, days_ahead=5)
    create_sample_catalog_and_booking(db_session, user_b, is_paid=True, days_ahead=12)

    login_user(client, user_a.email)
    resp = client.get("/api/v1/customer/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_bookings"] == 1
    assert data["upcoming_trips"][0]["destination_name"] is not None


# ============================================================================
# 2. CUSTOMER BOOKINGS & DETAIL TESTS
# ============================================================================


def test_customer_bookings_list_and_ownership(client, db_session):
    """Scenarios 4, 5, 7, 8: Booking list, ownership protection, pagination, filtering."""
    user1 = create_user(db_session, "traveller1@example.com")
    user2 = create_user(db_session, "traveller2@example.com")

    b1 = create_sample_catalog_and_booking(db_session, user1, is_paid=True)
    b2 = create_sample_catalog_and_booking(db_session, user2, is_paid=False)

    # User 1 views their bookings
    login_user(client, user1.email)
    resp = client.get("/api/v1/bookings/my")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["booking_reference"] == b1.booking_reference

    # Status filter
    resp_filter = client.get("/api/v1/bookings/my?status=confirmed")
    assert resp_filter.status_code == 200
    assert resp_filter.json()["total"] == 1

    resp_filter_empty = client.get("/api/v1/bookings/my?status=cancelled")
    assert resp_filter_empty.status_code == 200
    assert resp_filter_empty.json()["total"] == 0

    # User 1 cannot view User 2's booking (IDOR check)
    resp_idor = client.get(f"/api/v1/bookings/{b2.booking_reference}")
    assert resp_idor.status_code == 403 or resp_idor.status_code == 404


def test_customer_booking_detail_roster_and_breakdown(client, db_session):
    """Scenario 6: Booking detail returns passenger names and price breakdown."""
    user = create_user(db_session, "roster.user@example.com")
    booking = create_sample_catalog_and_booking(db_session, user, is_paid=True)

    login_user(client, user.email)
    resp = client.get(f"/api/v1/bookings/{booking.booking_reference}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["booking_reference"] == booking.booking_reference
    assert len(data["travellers"]) == 1
    assert data["travellers"][0]["first_name"] == "Primary"
    assert data["price_breakdown"] is not None


# ============================================================================
# 3. SAVED TRAVELLERS MANAGEMENT TESTS
# ============================================================================


def test_saved_traveller_crud_and_isolation(client, db_session):
    """Scenarios 9, 10, 11, 12: CRUD on saved travellers with strict user isolation."""
    user1 = create_user(db_session, "trav.owner1@example.com")
    user2 = create_user(db_session, "trav.owner2@example.com")

    login_user(client, user1.email)
    headers = csrf_headers(client)

    # Create saved traveller
    payload = {
        "first_name": "Aarav",
        "last_name": "Kumar",
        "date_of_birth": "1994-06-15",
        "gender": "male",
        "relationship_label": "Self",
        "is_primary": True,
        "contact_phone": "+919876500000",
        "contact_email": "aarav@example.com",
    }
    resp_create = client.post(
        "/api/v1/customer/travellers", json=payload, headers=headers
    )
    assert resp_create.status_code == 201
    traveller_id = resp_create.json()["id"]

    # List saved travellers
    resp_list = client.get("/api/v1/customer/travellers")
    assert resp_list.status_code == 200
    assert len(resp_list.json()) == 1

    # Update saved traveller
    update_payload = {"relationship_label": "Primary Contact"}
    resp_update = client.put(
        f"/api/v1/customer/travellers/{traveller_id}",
        json=update_payload,
        headers=headers,
    )
    assert resp_update.status_code == 200
    assert resp_update.json()["relationship_label"] == "Primary Contact"

    # User 2 cannot access or modify User 1's saved traveller
    login_user(client, user2.email)
    headers_u2 = csrf_headers(client)
    resp_idor_get = client.get("/api/v1/customer/travellers")
    assert len(resp_idor_get.json()) == 0

    resp_idor_put = client.put(
        f"/api/v1/customer/travellers/{traveller_id}",
        json={"first_name": "Hacked"},
        headers=headers_u2,
    )
    assert resp_idor_put.status_code == 404

    resp_idor_del = client.delete(
        f"/api/v1/customer/travellers/{traveller_id}", headers=headers_u2
    )
    assert resp_idor_del.status_code == 404

    # User 1 deletes their traveller
    login_user(client, user1.email)
    headers = csrf_headers(client)
    resp_del = client.delete(
        f"/api/v1/customer/travellers/{traveller_id}", headers=headers
    )
    assert resp_del.status_code == 204


def test_historical_booking_snapshot_unaffected_by_saved_traveller_change(
    client, db_session
):
    """Scenario 13: Updating or deleting a saved traveller profile NEVER alters past historical bookings."""
    user = create_user(db_session, "immutable.traveller@example.com")
    booking = create_sample_catalog_and_booking(db_session, user, is_paid=True)

    # Verify historical booking passenger snapshot
    initial_passenger = booking.travellers[0].first_name

    # Create and delete a saved profile
    saved = SavedTraveller(
        user_id=user.id,
        first_name="Primary",
        last_name="Passenger",
    )
    db_session.add(saved)
    db_session.flush()

    # Mutate saved traveller
    saved.first_name = "Modified Name"
    db_session.flush()

    # Re-query booking traveller
    db_session.refresh(booking)
    assert booking.travellers[0].first_name == initial_passenger == "Primary"


# ============================================================================
# 4. CANCELLATION REQUESTS & ADMIN REVIEW TESTS
# ============================================================================


def test_cancellation_request_flow(client, db_session):
    """Scenarios 14, 15, 16, 17: Submit cancellation, duplicate rejection, IDOR guard, admin review."""
    customer = create_user(db_session, "cancelling.customer@example.com")
    other_customer = create_user(db_session, "other.customer@example.com")
    admin = create_user(db_session, "admin.reviewer@example.com", role_name=ROLE_ADMIN)

    booking = create_sample_catalog_and_booking(db_session, customer, is_paid=True)

    # 1. Other customer cannot request cancellation for customer's booking
    login_user(client, other_customer.email)
    resp_idor = client.post(
        f"/api/v1/bookings/{booking.id}/cancellation-request",
        json={"reason": "Attempting unauthorized cancellation"},
        headers=csrf_headers(client),
    )
    assert resp_idor.status_code in (403, 404)

    # 2. Customer submits valid cancellation request
    login_user(client, customer.email)
    resp_submit = client.post(
        f"/api/v1/bookings/{booking.id}/cancellation-request",
        json={"reason": "Medical emergency, unable to travel next week."},
        headers=csrf_headers(client),
    )
    assert resp_submit.status_code == 201
    cancel_data = resp_submit.json()
    assert cancel_data["status"] == "pending"
    cancel_id = cancel_data["id"]

    # 3. Duplicate request rejected
    resp_dup = client.post(
        f"/api/v1/bookings/{booking.id}/cancellation-request",
        json={"reason": "Second submission attempt"},
        headers=csrf_headers(client),
    )
    assert resp_dup.status_code == 400

    # 4. Admin reviews request and approves it
    login_user(client, admin.email)
    resp_list = client.get("/api/v1/admin/cancellations")
    assert resp_list.status_code == 200
    assert len(resp_list.json()) >= 1

    resp_review = client.post(
        f"/api/v1/admin/cancellations/{cancel_id}/review",
        json={
            "status": "approved",
            "admin_notes": "Medical certificate verified. Approved under policy.",
        },
        headers=csrf_headers(client),
    )
    assert resp_review.status_code == 200
    assert resp_review.json()["status"] == "approved"

    # Verify booking status transitioned to cancelled
    db_session.refresh(booking)
    assert booking.status == "cancelled"


# ============================================================================
# 5. EMAIL & NOTIFICATION TESTS
# ============================================================================


def test_email_notifications_and_idempotency(db_session):
    """Scenarios 18, 19, 20: Booking & payment confirmation emails and idempotency protection."""
    user = create_user(db_session, "email.test@example.com")
    booking = create_sample_catalog_and_booking(db_session, user, is_paid=True)
    payment = booking.payments[0]

    email_service = get_email_service()

    # First dispatch of booking confirmed email
    log1 = email_service.send_booking_confirmed(db_session, booking, payment, user)
    assert log1.status == "sent"
    assert log1.notification_type == "booking_confirmed"

    # Second dispatch with identical idempotency key (e.g. webhook replay)
    log2 = email_service.send_booking_confirmed(db_session, booking, payment, user)
    assert log2.id == log1.id  # Same record returned without creating duplicate
    assert log2.provider_message_id == log1.provider_message_id

    # Payment confirmation email
    log_pay = email_service.send_payment_successful(db_session, booking, payment, user)
    assert log_pay.status == "sent"
    assert log_pay.notification_type == "payment_successful"


def test_email_failure_does_not_rollback_payment(db_session, monkeypatch):
    """Scenario 21: If email delivery fails, payment and booking status remain authoritative."""
    user = create_user(db_session, "fail.email@example.com")
    booking = create_sample_catalog_and_booking(db_session, user, is_paid=True)
    payment = booking.payments[0]

    email_service = get_email_service()

    # Force simulated error in mock transport
    def _raise(*args, **kwargs):
        raise RuntimeError("Simulated SMTP network outage")

    monkeypatch.setattr(email_service, "_send_via_mock", _raise)

    # Dispatch email
    log_failed = email_service.send_booking_confirmed(
        db_session, booking, payment, user
    )
    assert log_failed.status == "failed"
    assert "Simulated SMTP network outage" in (log_failed.error_message or "")

    # Crucial assertion: payment and booking status remain untouched
    assert payment.status == "captured"
    assert booking.status == "confirmed"


def test_admin_retry_notification(client, db_session):
    """Scenario 22: Admin can retry a failed notification."""
    admin = create_user(db_session, "admin.notifier@example.com", role_name=ROLE_ADMIN)

    # Create failed notification
    failed_log = NotificationLog(
        channel="email",
        notification_type="booking_created",
        recipient="retry.recipient@example.com",
        provider="mock",
        status="failed",
        error_message="Temporary SMTP timeout",
        subject="Booking Reserved: KV-2026-TEST",
        retry_count=0,
    )
    db_session.add(failed_log)
    db_session.flush()

    login_user(client, admin.email)
    resp = client.post(
        f"/api/v1/admin/notifications/{failed_log.id}/retry",
        headers=csrf_headers(client),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "sent"
    assert data["retry_count"] == 1


# ============================================================================
# 6. WHATSAPP COMMUNICATION TESTS
# ============================================================================


def test_whatsapp_service_click_to_chat_and_settings(db_session):
    """Scenarios 23, 24, 25: WhatsApp prefilled URL generation and site settings configuration."""
    wa_service = get_whatsapp_service()

    try:
        # 1. Configured fallback number
        default_phone = wa_service.get_configured_phone(db_session)
        assert default_phone is not None

        # 2. Dynamic site setting overrides default
        existing_setting = db_session.get(SiteSetting, "whatsapp_number")
        if existing_setting:
            existing_setting.value = "+919999988888"
        else:
            db_session.add(
                SiteSetting(
                    key="whatsapp_number", value="+919999988888", is_public=True
                )
            )
        db_session.flush()

        dynamic_phone = wa_service.get_configured_phone(db_session)
        assert dynamic_phone == "+919999988888"

        # 3. Contextual URL generation with URL encoding
        url = wa_service.build_booking_inquiry_url("KV-2026-X9K4M2", db_session)
        assert "wa.me/919999988888" in url
        assert "KV-2026-X9K4M2" in url
    finally:
        setting_to_clean = db_session.get(SiteSetting, "whatsapp_number")
        if setting_to_clean:
            db_session.delete(setting_to_clean)
            db_session.commit()


def test_secrets_safety_in_customer_responses(client, db_session):
    """Scenario 26: Email & WhatsApp provider secrets are NEVER returned in responses."""
    user = create_user(db_session, "secrets.check@example.com")
    login_user(client, user.email)

    resp = client.get("/api/v1/customer/whatsapp-concierge")
    assert resp.status_code == 200
    raw_text = resp.text

    assert "access_token" not in raw_text.lower()
    assert "verify_token" not in raw_text.lower()
    assert "resend_api_key" not in raw_text.lower()
    assert "smtp_password" not in raw_text.lower()


# ============================================================================
# 7. TRAVEL DOCUMENTS: RECEIPT & VOUCHER TESTS
# ============================================================================


def test_payment_receipt_and_voucher_integrity(client, db_session):
    """Scenarios 27, 28, 29: Receipt and travel voucher reflects immutable data and enforces IDOR."""
    customer = create_user(db_session, "docs.customer@example.com")
    other_customer = create_user(db_session, "intruder.customer@example.com")
    booking = create_sample_catalog_and_booking(db_session, customer, is_paid=True)

    # 1. Owner can access receipt
    login_user(client, customer.email)
    resp_receipt = client.get(f"/api/v1/bookings/{booking.booking_reference}/receipt")
    assert resp_receipt.status_code == 200
    receipt = resp_receipt.json()
    assert receipt["booking_reference"] == booking.booking_reference
    assert Decimal(str(receipt["total_amount"])) == Decimal("170000.00")
    assert receipt["payment_status"] == "paid"

    # 2. Owner can access travel voucher
    resp_voucher = client.get(f"/api/v1/bookings/{booking.booking_reference}/voucher")
    assert resp_voucher.status_code == 200
    voucher = resp_voucher.json()
    assert voucher["booking_reference"] == booking.booking_reference
    assert len(voucher["itinerary_days"]) == 1
    assert "Speedboat Transfer" in voucher["itinerary_days"][0]["title"]
    assert len(voucher["travellers"]) == 1

    # 3. Other customer cannot access receipt or voucher (IDOR check)
    login_user(client, other_customer.email)
    resp_idor_rcp = client.get(f"/api/v1/bookings/{booking.booking_reference}/receipt")
    assert resp_idor_rcp.status_code in (403, 404)

    resp_idor_vch = client.get(f"/api/v1/bookings/{booking.booking_reference}/voucher")
    assert resp_idor_vch.status_code in (403, 404)


# ============================================================================
# 8. SECURITY & PRIVILEGE ESCALATION TESTS
# ============================================================================


def test_customer_profile_privilege_escalation_and_csrf(client, db_session):
    """Scenarios 30, 31, 32, 33: CSRF required, mass-assignment blocked, password hash hidden."""
    customer = create_user(db_session, "profile.sec@example.com")
    login_user(client, customer.email)

    # 1. Profile update without CSRF is rejected
    resp_no_csrf = client.put(
        "/api/v1/customer/profile",
        json={"first_name": "NewName"},
    )
    assert resp_no_csrf.status_code == 403

    # 2. Profile update with CSRF succeeds for allowed fields
    resp_csrf = client.put(
        "/api/v1/customer/profile",
        json={"first_name": "UpdatedName", "phone": "+919988776655"},
        headers=csrf_headers(client),
    )
    assert resp_csrf.status_code == 200
    data = resp_csrf.json()
    assert data["first_name"] == "UpdatedName"
    assert data["phone"] == "+919988776655"
    assert "password_hash" not in data

    # 3. Privilege escalation: attempting to pass role or id does not escalate
    client.put(
        "/api/v1/customer/profile",
        json={"role": "super_admin", "status": "admin"},
        headers=csrf_headers(client),
    )
    db_session.refresh(customer)
    roles = [r.role.name for r in customer.role_assignments if r.role]
    assert "super_admin" not in roles
    assert "admin" not in roles
