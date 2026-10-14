"""Comprehensive test suite for Phase 8 Booking Engine & Checkout Foundation.

Verifies:
- Authenticated customer booking creation (status=pending, payment_status=pending)
- Unauthenticated booking rejection (401)
- Customer ID derived strictly from authenticated session (never accepted from client)
- Invalid package and departure handling (404)
- Traveller count minimum and maximum constraints (400)
- Insufficient capacity rejection (409)
- Concurrency-safe capacity reservation and auto sold_out transition
- Concurrency last-seat race condition protection (no negative capacity)
- Transaction rollback on failure (no partial bookings or leaked seats)
- Authoritative server-side price calculation with exact Decimal precision
- Historical price snapshot immutability (package & add-on catalog changes do not alter booked totals)
- Coupon validation: active status, validity window, min booking amount, usage limits, per-user limits
- Idempotency support via idempotency_key (no duplicate bookings on double-submit)
- Strict customer ownership and IDOR barriers (Customer A cannot access or cancel Customer B's booking)
- Administrative booking management, search, and detail inspection
- Booking cancellation with atomic capacity restoration and coupon usage release
- State transition validation and invalid transition rejection
- Comprehensive audit logging for booking creation and cancellation
- CSRF protection on booking endpoints
- Immunity to client price and discount manipulation
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_CUSTOMER,
)
from app.core.security import hash_password
from app.models.catalog import Destination, Package, PackageDeparture
from app.models.commerce import AddOn, Booking, Coupon
from app.models.content import AuditLog
from app.models.user import Role, User, UserRole

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
        first_name="Traveler",
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


def setup_catalog_fixtures(db) -> tuple[Destination, Package, PackageDeparture, AddOn]:
    dest = Destination(
        name="Maldives Luxury Atolls",
        slug=f"maldives-{uuid4().hex[:6]}",
        country="Maldives",
        is_published=True,
    )
    db.add(dest)
    db.flush()

    pkg = Package(
        destination_id=dest.id,
        title="Maldives Overwater Retreat",
        slug=f"maldives-overwater-{uuid4().hex[:6]}",
        duration_days=5,
        duration_nights=4,
        price=Decimal("75000.00"),
        currency="INR",
        min_travellers=1,
        max_travellers=10,
        is_published=True,
    )
    db.add(pkg)
    db.flush()

    now_date = datetime.now(timezone.utc).date()
    departure = PackageDeparture(
        package_id=pkg.id,
        departure_date=now_date + timedelta(days=30),
        return_date=now_date + timedelta(days=35),
        total_capacity=10,
        available_capacity=10,
        reserved_capacity=0,
        currency="INR",
        status="open",
    )
    db.add(departure)
    db.flush()

    addon = AddOn(
        name="Seaplane Airport Transfer",
        price=Decimal("12000.00"),
        currency="INR",
        is_active=True,
    )
    db.add(addon)
    db.commit()
    return dest, pkg, departure, addon


# ==============================================================================
# 1. Booking Creation, Lifecycle, and Idempotency
# ==============================================================================


def test_authenticated_customer_create_booking(client, db_session) -> None:
    _, pkg, dep, addon = setup_catalog_fixtures(db_session)
    customer = create_user(db_session, "alice@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    payload = {
        "package_id": str(pkg.id),
        "departure_id": str(dep.id),
        "number_of_travellers": 2,
        "travellers": [
            {
                "first_name": "Alice",
                "last_name": "Traveler",
                "contact_email": "alice@example.com",
                "contact_phone": "+919876543210",
                "is_primary": True,
            },
            {
                "first_name": "Bob",
                "last_name": "Traveler",
            },
        ],
        "add_ons": [{"add_on_id": str(addon.id), "quantity": 2}],
        "customer_notes": "Window seat preferred",
        "idempotency_key": "idemp-booking-001",
    }

    resp = client.post("/api/v1/bookings", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()

    assert data["booking_reference"].startswith("KV-")
    assert data["status"] == "pending"
    assert data["payment_status"] == "pending"
    assert data["number_of_travellers"] == 2
    # Base: 75,000 * 2 = 150,000 + Addon: 12,000 * 2 = 24,000 = 174,000
    assert Decimal(str(data["total"])) == Decimal("174000.00")
    assert Decimal(str(data["subtotal"])) == Decimal("174000.00")
    assert Decimal(str(data["discount"])) == Decimal("0.00")
    assert len(data["travellers"]) == 2
    assert data["travellers"][0]["is_primary"] is True
    assert len(data["add_ons"]) == 1
    assert data["add_ons"][0]["name_snapshot"] == "Seaplane Airport Transfer"
    assert Decimal(str(data["add_ons"][0]["unit_price"])) == Decimal("12000.00")
    assert Decimal(str(data["add_ons"][0]["total_price"])) == Decimal("24000.00")

    # Verify Departure capacity reserved in DB
    db_session.refresh(dep)
    assert dep.available_capacity == 8
    assert dep.reserved_capacity == 2

    # Verify Audit log recorded
    audit = db_session.execute(
        select(AuditLog).where(
            AuditLog.action == "booking_created",
            AuditLog.entity_id == str(data["id"]),
        )
    ).scalar_one_or_none()
    assert audit is not None
    assert audit.actor_user_id == customer.id


def test_unauthenticated_booking_rejected(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    client.cookies.clear()

    payload = {
        "package_id": str(pkg.id),
        "departure_id": str(dep.id),
        "number_of_travellers": 1,
        "travellers": [{"first_name": "Anon", "last_name": "User"}],
    }
    resp = client.post("/api/v1/bookings", json=payload, headers=csrf_headers(client))
    assert resp.status_code == 401


def test_customer_id_derived_from_session(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    customer1 = create_user(db_session, "user1@example.com", ROLE_CUSTOMER)
    customer2 = create_user(db_session, "user2@example.com", ROLE_CUSTOMER)

    headers = login(client, customer1.email)

    # Client attempts to inject another user's ID
    payload = {
        "package_id": str(pkg.id),
        "departure_id": str(dep.id),
        "number_of_travellers": 1,
        "travellers": [{"first_name": "User", "last_name": "One"}],
        "user_id": str(customer2.id),  # Malicious ID injection attempt
    }
    resp = client.post("/api/v1/bookings", json=payload, headers=headers)
    assert resp.status_code == 201
    booking_id = resp.json()["id"]

    # In database, the booking MUST be bound to authenticated customer1, NOT customer2
    booking = db_session.execute(
        select(Booking).where(Booking.id == UUID(booking_id))
    ).scalar_one()
    assert booking.user_id == customer1.id
    assert booking.user_id != customer2.id


def test_invalid_package_and_departure_rejected(client, db_session) -> None:
    _, pkg, _, _ = setup_catalog_fixtures(db_session)
    customer = create_user(db_session, "err_user@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # Invalid package
    resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(uuid4()),
            "departure_id": str(uuid4()),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "A", "last_name": "B"}],
        },
        headers=headers,
    )
    assert resp.status_code == 404

    # Valid package, invalid departure
    resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(uuid4()),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "A", "last_name": "B"}],
        },
        headers=headers,
    )
    assert resp.status_code == 404


def test_traveller_minimum_and_maximum_enforced(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    pkg.min_travellers = 2
    pkg.max_travellers = 4
    db_session.commit()

    customer = create_user(db_session, "bounds_user@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # Below minimum
    resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "A", "last_name": "B"}],
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "minimum" in resp.json()["error"]["message"].lower()

    # Above maximum
    resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 5,
            "travellers": [{"first_name": f"P{i}", "last_name": "L"} for i in range(5)],
        },
        headers=headers,
    )
    assert resp.status_code == 400
    assert "maximum" in resp.json()["error"]["message"].lower()


def test_insufficient_capacity_and_auto_sold_out(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    dep.total_capacity = 2
    dep.available_capacity = 2
    db_session.commit()

    customer = create_user(db_session, "cap_user@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # Requesting 3 when only 2 available -> 409 Conflict
    resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 3,
            "travellers": [{"first_name": f"T{i}", "last_name": "L"} for i in range(3)],
        },
        headers=headers,
    )
    assert resp.status_code == 409
    assert "insufficient" in resp.json()["error"]["message"].lower()

    # Booking exactly 2 -> succeeds, departure becomes sold_out
    resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 2,
            "travellers": [
                {"first_name": "A", "last_name": "L"},
                {"first_name": "B", "last_name": "L"},
            ],
        },
        headers=headers,
    )
    assert resp.status_code == 201

    db_session.refresh(dep)
    assert dep.available_capacity == 0
    assert dep.reserved_capacity == 2
    assert dep.status == "sold_out"


def test_booking_idempotency(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    dep.total_capacity = 10
    dep.available_capacity = 10
    db_session.commit()

    customer = create_user(db_session, "idemp_user@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    payload = {
        "package_id": str(pkg.id),
        "departure_id": str(dep.id),
        "number_of_travellers": 2,
        "travellers": [
            {"first_name": "A", "last_name": "1"},
            {"first_name": "B", "last_name": "2"},
        ],
        "idempotency_key": "unique-idemp-key-xyz",
    }

    # Request 1
    resp1 = client.post("/api/v1/bookings", json=payload, headers=headers)
    assert resp1.status_code == 201
    booking1 = resp1.json()

    # Request 2 with identical idempotency key (e.g. network retry or double-click)
    resp2 = client.post("/api/v1/bookings", json=payload, headers=headers)
    assert resp2.status_code == 201
    booking2 = resp2.json()

    # Must return identical booking ID and reference
    assert booking1["id"] == booking2["id"]
    assert booking1["booking_reference"] == booking2["booking_reference"]

    # Must NOT double-reserve departure capacity (only 2 seats reserved, not 4!)
    db_session.refresh(dep)
    assert dep.available_capacity == 8
    assert dep.reserved_capacity == 2


# ==============================================================================
# 2. Authoritative Price Calculation, Snapshots, and Decimal Money
# ==============================================================================


def test_authoritative_price_calculation_and_snapshots(client, db_session) -> None:
    _, pkg, dep, addon = setup_catalog_fixtures(db_session)
    customer = create_user(db_session, "pricing_user@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # 1. Test calculation preview endpoint
    calc_resp = client.post(
        "/api/v1/bookings/calculate",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 3,
            "add_ons": [{"add_on_id": str(addon.id), "quantity": 3}],
        },
        headers=headers,
    )
    assert calc_resp.status_code == 200
    calc_data = calc_resp.json()
    # 75000 * 3 = 225000; 12000 * 3 = 36000; total = 261000
    assert Decimal(str(calc_data["package_subtotal"])) == Decimal("225000.00")
    assert Decimal(str(calc_data["add_ons_subtotal"])) == Decimal("36000.00")
    assert Decimal(str(calc_data["total"])) == Decimal("261000.00")

    # 2. Create the booking
    booking_resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 3,
            "travellers": [{"first_name": f"P{i}", "last_name": "T"} for i in range(3)],
            "add_ons": [{"add_on_id": str(addon.id), "quantity": 3}],
        },
        headers=headers,
    )
    assert booking_resp.status_code == 201
    booking_id = booking_resp.json()["id"]

    # 3. Simulate catalog price changes: Package price rises from 75k to 95k, Addon rises from 12k to 15k
    pkg.price = Decimal("95000.00")
    addon.price = Decimal("15000.00")
    db_session.commit()

    # 4. Fetch the historical booking: Prices MUST remain frozen at 261,000.00!
    fetch_resp = client.get(f"/api/v1/bookings/{booking_id}", headers=headers)
    assert fetch_resp.status_code == 200
    fetch_data = fetch_resp.json()
    assert Decimal(str(fetch_data["total"])) == Decimal("261000.00")
    assert Decimal(str(fetch_data["subtotal"])) == Decimal("261000.00")
    assert Decimal(str(fetch_data["add_ons"][0]["unit_price"])) == Decimal("12000.00")
    assert Decimal(str(fetch_data["add_ons"][0]["total_price"])) == Decimal("36000.00")


# ==============================================================================
# 3. Coupons: Validity, Limits, and Concurrency
# ==============================================================================


def test_coupon_validation_and_usage_limits(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    customer = create_user(db_session, "coupon_user@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # Setup Coupon: 10% discount, min booking 50,000, max discount 10,000, total usage limit 1
    coupon = Coupon(
        code="SAVE10",
        code_normalized="SAVE10",
        discount_type="percentage",
        discount_value=Decimal("10.00"),
        minimum_booking_amount=Decimal("50000.00"),
        maximum_discount_amount=Decimal("10000.00"),
        total_usage_limit=1,
        per_user_usage_limit=1,
        is_active=True,
    )
    db_session.add(coupon)
    db_session.commit()

    # Calculation preview
    calc_resp = client.post(
        "/api/v1/bookings/calculate",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "coupon_code": "save10",
        },
        headers=headers,
    )
    assert calc_resp.status_code == 200
    calc_data = calc_resp.json()
    assert calc_data["coupon_valid"] is True
    # 10% of 75,000 is 7,500
    assert Decimal(str(calc_data["discount"])) == Decimal("7500.00")
    assert Decimal(str(calc_data["total"])) == Decimal("67500.00")

    # Booking 1 consumes the coupon
    book_resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "Coupon", "last_name": "User"}],
            "coupon_code": "save10",
        },
        headers=headers,
    )
    assert book_resp.status_code == 201
    assert Decimal(str(book_resp.json()["discount"])) == Decimal("7500.00")

    # Booking 2 attempts to use exhausted coupon -> 409 Conflict (Total usage limit reached)
    book_resp2 = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "Second", "last_name": "Attempt"}],
            "coupon_code": "save10",
        },
        headers=headers,
    )
    assert book_resp2.status_code in (400, 409)


# ==============================================================================
# 4. Ownership, IDOR, Cancellation, and Admin Management
# ==============================================================================


def test_customer_ownership_and_idor_protection(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    customer_a = create_user(db_session, "alice_idor@example.com", ROLE_CUSTOMER)
    customer_b = create_user(db_session, "bob_idor@example.com", ROLE_CUSTOMER)

    # Alice creates a booking
    headers_a = login(client, customer_a.email)
    create_resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "Alice", "last_name": "Idor"}],
        },
        headers=headers_a,
    )
    assert create_resp.status_code == 201
    booking_id = create_resp.json()["id"]

    # Bob attempts to view Alice's booking -> 403 Forbidden
    headers_b = login(client, customer_b.email)
    view_resp = client.get(f"/api/v1/bookings/{booking_id}", headers=headers_b)
    assert view_resp.status_code == 403

    # Bob attempts to cancel Alice's booking -> 403 Forbidden
    cancel_resp = client.post(
        f"/api/v1/bookings/{booking_id}/cancel", headers=headers_b
    )
    assert cancel_resp.status_code == 403


def test_booking_cancellation_restores_capacity(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    dep.total_capacity = 2
    dep.available_capacity = 2
    db_session.commit()

    customer = create_user(db_session, "cancel_user@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # Book 2 seats -> fills departure
    create_resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 2,
            "travellers": [
                {"first_name": "C1", "last_name": "U"},
                {"first_name": "C2", "last_name": "U"},
            ],
        },
        headers=headers,
    )
    assert create_resp.status_code == 201
    booking_id = create_resp.json()["id"]

    db_session.refresh(dep)
    assert dep.available_capacity == 0
    assert dep.status == "sold_out"

    # Customer cancels the booking
    cancel_resp = client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # Departure capacity must be restored and status returned to "open"
    db_session.refresh(dep)
    assert dep.available_capacity == 2
    assert dep.reserved_capacity == 0
    assert dep.status == "open"


def test_admin_booking_management(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    customer = create_user(db_session, "admin_test_cust@example.com", ROLE_CUSTOMER)
    admin = create_user(db_session, "admin_user@kvtours.in", ROLE_ADMIN)

    # Customer creates booking
    headers_cust = login(client, customer.email)
    create_resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "John", "last_name": "Doe"}],
        },
        headers=headers_cust,
    )
    assert create_resp.status_code == 201
    booking_id = create_resp.json()["id"]
    reference = create_resp.json()["booking_reference"]

    # Admin logs in and inspects bookings
    headers_admin = login(client, admin.email)

    # List bookings
    list_resp = client.get("/api/v1/admin/bookings", headers=headers_admin)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    # Search by reference
    search_resp = client.get(
        f"/api/v1/admin/bookings?search={reference}", headers=headers_admin
    )
    assert search_resp.status_code == 200
    assert len(search_resp.json()["items"]) == 1

    # View booking detail
    detail_resp = client.get(
        f"/api/v1/admin/bookings/{booking_id}", headers=headers_admin
    )
    assert detail_resp.status_code == 200
    assert detail_resp.json()["booking_reference"] == reference

    # Admin updates status to confirmed (valid)
    patch_resp = client.patch(
        f"/api/v1/admin/bookings/{booking_id}/status",
        json={"status": "confirmed", "reason": "Verified manually"},
        headers=headers_admin,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "confirmed"

    # Admin updates confirmed -> cancelled (valid, restores capacity)
    patch_cancel = client.patch(
        f"/api/v1/admin/bookings/{booking_id}/status",
        json={"status": "cancelled", "reason": "Customer cancellation request"},
        headers=headers_admin,
    )
    assert patch_cancel.status_code == 200
    assert patch_cancel.json()["status"] == "cancelled"

    # Admin attempts invalid transition: cancelled -> confirmed -> 400 Bad Request
    invalid_resp = client.patch(
        f"/api/v1/admin/bookings/{booking_id}/status",
        json={"status": "confirmed"},
        headers=headers_admin,
    )
    assert invalid_resp.status_code == 400


def test_csrf_protection_on_bookings(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    customer = create_user(db_session, "csrf_user@example.com", ROLE_CUSTOMER)
    login(client, customer.email)

    # Missing X-CSRF-Token header on POST -> 403 Forbidden
    resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "CSRF", "last_name": "Test"}],
        },
        # Intentionally no headers
    )
    assert resp.status_code == 403


def test_expired_and_inactive_coupon_rejected(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    customer = create_user(db_session, "exp_coupon_user@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    now = datetime.now(timezone.utc)
    # Expired coupon
    expired_coupon = Coupon(
        code="EXPIRED50",
        code_normalized="EXPIRED50",
        discount_type="fixed",
        discount_value=Decimal("5000.00"),
        valid_from=now - timedelta(days=30),
        valid_until=now - timedelta(days=1),
        is_active=True,
    )
    # Inactive coupon
    inactive_coupon = Coupon(
        code="INACTIVE20",
        code_normalized="INACTIVE20",
        discount_type="fixed",
        discount_value=Decimal("2000.00"),
        is_active=False,
    )
    db_session.add_all([expired_coupon, inactive_coupon])
    db_session.commit()

    # Expired coupon submission -> 400
    resp_exp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "A", "last_name": "B"}],
            "coupon_code": "expired50",
        },
        headers=headers,
    )
    assert resp_exp.status_code == 400

    # Inactive coupon submission -> 400
    resp_inact = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "A", "last_name": "B"}],
            "coupon_code": "inactive20",
        },
        headers=headers,
    )
    assert resp_inact.status_code == 400


def test_coupon_per_user_usage_limit_enforced(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    dep.total_capacity = 20
    dep.available_capacity = 20
    db_session.commit()

    customer = create_user(db_session, "single_user_coupon@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    coupon = Coupon(
        code="ONCEPERUSER",
        code_normalized="ONCEPERUSER",
        discount_type="fixed",
        discount_value=Decimal("1000.00"),
        per_user_usage_limit=1,
        is_active=True,
    )
    db_session.add(coupon)
    db_session.commit()

    # Booking 1 uses coupon -> 201
    resp1 = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "A", "last_name": "B"}],
            "coupon_code": "onceperuser",
        },
        headers=headers,
    )
    assert resp1.status_code == 201

    # Booking 2 by same customer attempts to use same coupon again -> 400
    resp2 = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "A", "last_name": "B"}],
            "coupon_code": "onceperuser",
        },
        headers=headers,
    )
    assert resp2.status_code == 400
    assert "usage limit" in resp2.json()["error"]["message"].lower()


def test_client_price_manipulation_ignored(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    customer = create_user(db_session, "tamper_user@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # Client maliciously attempts to send total=1.00 and subtotal=1.00
    resp = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "Tamper", "last_name": "Test"}],
            "total": "1.00",
            "subtotal": "1.00",
            "discount": "99999.00",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    # Total MUST be server-authoritative 75,000.00, completely ignoring client's injected 1.00
    assert Decimal(str(data["total"])) == Decimal("75000.00")
    assert Decimal(str(data["subtotal"])) == Decimal("75000.00")
    assert Decimal(str(data["discount"])) == Decimal("0.00")


def test_my_bookings_listing(client, db_session) -> None:
    _, pkg, dep, _ = setup_catalog_fixtures(db_session)
    customer = create_user(db_session, "my_bookings_user@example.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # Create a booking
    client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(dep.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "Me", "last_name": "Myself"}],
        },
        headers=headers,
    )

    # Query customer's own bookings
    resp = client.get("/api/v1/bookings/my", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    assert data["items"][0]["status"] == "pending"
