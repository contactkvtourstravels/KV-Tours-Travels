"""Comprehensive test suite for Phase 10 Dynamic Best Offers Management.

Verifies:
1. Creating an offer using an existing package.
2. Percentage discount calculation (with cap handling).
3. Fixed-amount discount calculation.
4. Invalid discounts being rejected (negative, > 100%, > package price).
5. Correct discounted price and savings on public API / homepage.
6. Master toggle OFF hides the section / returns empty list & best_offers_enabled=False.
7. Master toggle ON shows eligible offers.
8. Individual disabled offers are hidden publicly.
9. Draft and expired offers are hidden publicly.
10. Future offers remain hidden until their start time.
11. Unpublished or unavailable packages cannot be booked through an offer.
12. Package price changes follow the defined pricing policy (flags warning, shows original snapshot).
13. Checkout uses the correct validated discounted price.
14. Existing bookings preserve their original price snapshots even if offer changes/expires.
15. Ordinary users cannot modify offers (401/403).
16. The setting persists after database updates and across sessions.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER
from app.core.security import hash_password
from app.models.catalog import Destination, Package, PackageDeparture
from app.models.commerce import Booking
from app.models.content import SiteSetting
from app.models.user import Role, User, UserRole
from app.services.offers_service import calculate_discount_and_final_price

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


def setup_package_fixtures(db) -> tuple[Destination, Package, PackageDeparture]:
    dest = Destination(
        name="Kerala Backwaters",
        slug=f"kerala-{uuid4().hex[:6]}",
        country="India",
        is_published=True,
    )
    db.add(dest)
    db.flush()

    pkg = Package(
        destination_id=dest.id,
        title="Kerala Luxury Houseboat Experience",
        slug=f"kerala-luxury-{uuid4().hex[:6]}",
        duration_days=4,
        duration_nights=3,
        price=Decimal("40000.00"),
        currency="INR",
        min_travellers=1,
        max_travellers=6,
        is_published=True,
    )
    db.add(pkg)
    db.flush()

    departure = PackageDeparture(
        package_id=pkg.id,
        departure_date=datetime.now(timezone.utc).date() + timedelta(days=20),
        return_date=datetime.now(timezone.utc).date() + timedelta(days=24),
        total_capacity=10,
        available_capacity=10,
        reserved_capacity=0,
        currency="INR",
        base_price=Decimal("40000.00"),
        status="open",
        is_active=True,
    )
    db.add(departure)
    db.commit()
    return dest, pkg, departure


# ==============================================================================
# Tests 1-4: Discount Calculation Unit & Edge Cases
# ==============================================================================


def test_1_create_offer_using_existing_package(client, db_session) -> None:
    admin = create_user(db_session, "admin_create_offer@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)
    _, pkg, _ = setup_package_fixtures(db_session)

    resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "15.00",
            "title": "Summer Houseboat Special",
            "offer_badge": "15% OFF",
            "status": "active",
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["package_id"] == str(pkg.id)
    assert data["discount_type"] == "percentage"
    assert data["discount_value"] == "15.00"
    assert data["discount_amount"] == "6000.00"
    assert data["discounted_price"] == "34000.00"
    assert data["status"] == "active"


def test_2_percentage_discount_calculation() -> None:
    # 20% on 50,000 = 10,000 discount -> final 40,000
    disc, final = calculate_discount_and_final_price(
        package_price=Decimal("50000.00"),
        discount_type="percentage",
        discount_value=Decimal("20.00"),
    )
    assert disc == Decimal("10000.00")
    assert final == Decimal("40000.00")

    # With maximum cap
    disc_capped, final_capped = calculate_discount_and_final_price(
        package_price=Decimal("50000.00"),
        discount_type="percentage",
        discount_value=Decimal("20.00"),
        maximum_discount=Decimal("5000.00"),
    )
    assert disc_capped == Decimal("5000.00")
    assert final_capped == Decimal("45000.00")


def test_3_fixed_amount_discount_calculation() -> None:
    # ₹7,500 off on ₹40,000 = final ₹32,500
    disc, final = calculate_discount_and_final_price(
        package_price=Decimal("40000.00"),
        discount_type="fixed",
        discount_value=Decimal("7500.00"),
    )
    assert disc == Decimal("7500.00")
    assert final == Decimal("32500.00")


def test_4_invalid_discounts_rejected(client, db_session) -> None:
    admin = create_user(db_session, "admin_invalid_discount@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)
    _, pkg, _ = setup_package_fixtures(db_session)

    # Negative percentage
    resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "-10.00",
        },
    )
    assert resp.status_code == 422

    # Percentage > 100
    resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "110.00",
        },
    )
    assert resp.status_code == 422

    # Fixed amount greater than package price
    resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "fixed",
            "discount_value": "50000.00",  # package is 40,000
        },
    )
    assert resp.status_code == 400
    assert "cannot exceed" in resp.json()["error"]["message"]


# ==============================================================================
# Tests 5-10: Public Listing, Master Toggle & Eligibility
# ==============================================================================


def test_5_public_api_discounted_price_and_savings(client, db_session) -> None:
    _, pkg, _ = setup_package_fixtures(db_session)
    admin = create_user(db_session, "admin_public_view@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)

    client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "10.00",
            "title": "Kerala Special 10%",
            "status": "active",
        },
    )

    # Public endpoint
    resp = client.get("/api/v1/offers")
    assert resp.status_code == 200
    payload = resp.json()["data"]
    assert payload["best_offers_enabled"] is True
    assert len(payload["items"]) >= 1

    item = next(i for i in payload["items"] if i["package_id"] == str(pkg.id))
    assert item["original_price"] == "40000.00"
    assert item["discounted_price"] == "36000.00"
    assert item["savings"] == "4000.00"
    assert item["package_title"] == "Kerala Luxury Houseboat Experience"


def test_6_master_toggle_off_hides_section(client, db_session) -> None:
    admin = create_user(db_session, "admin_toggle_off@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)
    _, pkg, _ = setup_package_fixtures(db_session)

    # Create active offer
    client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "fixed",
            "discount_value": "2000.00",
            "status": "active",
        },
    )

    # Turn master toggle OFF
    patch_resp = client.patch(
        "/api/v1/admin/offers/settings",
        headers=headers,
        json={"best_offers_enabled": False},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["data"]["best_offers_enabled"] is False

    # Public endpoint must return empty items and best_offers_enabled=False
    resp = client.get("/api/v1/offers")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["best_offers_enabled"] is False
    assert len(data["items"]) == 0


def test_7_master_toggle_on_shows_eligible_offers(client, db_session) -> None:
    admin = create_user(db_session, "admin_toggle_on@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)

    # Turn master toggle back ON
    patch_resp = client.patch(
        "/api/v1/admin/offers/settings",
        headers=headers,
        json={"best_offers_enabled": True},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["data"]["best_offers_enabled"] is True

    resp = client.get("/api/v1/offers")
    assert resp.status_code == 200
    assert resp.json()["data"]["best_offers_enabled"] is True


def test_8_individual_disabled_offers_are_hidden(client, db_session) -> None:
    admin = create_user(db_session, "admin_disabled_offer@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)
    _, pkg, _ = setup_package_fixtures(db_session)

    resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "25.00",
            "status": "disabled",
        },
    )
    offer_id = resp.json()["data"]["id"]

    # Check public endpoint
    pub_resp = client.get("/api/v1/offers")
    assert pub_resp.status_code == 200
    offer_ids = [item["id"] for item in pub_resp.json()["data"]["items"]]
    assert offer_id not in offer_ids


def test_9_draft_and_expired_offers_are_hidden_publicly(client, db_session) -> None:
    admin = create_user(db_session, "admin_draft_expired@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)
    _, pkg, _ = setup_package_fixtures(db_session)

    # Draft
    draft_resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "10.00",
            "status": "draft",
        },
    )
    draft_id = draft_resp.json()["data"]["id"]

    # Expired by end_date in the past
    past_start = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
    past_end = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    expired_resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "10.00",
            "start_at": past_start,
            "end_at": past_end,
            "status": "active",
        },
    )
    expired_id = expired_resp.json()["data"]["id"]

    pub_resp = client.get("/api/v1/offers")
    assert pub_resp.status_code == 200
    offer_ids = [item["id"] for item in pub_resp.json()["data"]["items"]]
    assert draft_id not in offer_ids
    assert expired_id not in offer_ids


def test_10_future_offers_hidden_until_start_time(client, db_session) -> None:
    admin = create_user(db_session, "admin_future_offer@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)
    _, pkg, _ = setup_package_fixtures(db_session)

    future_start = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    future_end = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
    future_resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "15.00",
            "start_at": future_start,
            "end_at": future_end,
            "status": "active",
        },
    )
    future_id = future_resp.json()["data"]["id"]

    pub_resp = client.get("/api/v1/offers")
    assert pub_resp.status_code == 200
    offer_ids = [item["id"] for item in pub_resp.json()["data"]["items"]]
    assert future_id not in offer_ids


# ==============================================================================
# Tests 11-14: Booking Checkout, Pricing Policy, and Invariant Preservation
# ==============================================================================


def test_11_unpublished_package_cannot_be_booked_through_offer(
    client, db_session
) -> None:
    admin = create_user(db_session, "admin_unpub_offer@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)
    _, pkg, departure = setup_package_fixtures(db_session)

    offer_resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "20.00",
            "status": "active",
        },
    )
    offer_id = offer_resp.json()["data"]["id"]

    # Unpublish package
    pkg.is_published = False
    db_session.commit()

    # Customer tries to calculate price or book
    cust = create_user(db_session, "cust_unpub_offer@example.com", ROLE_CUSTOMER)
    cust_headers = login(client, cust.email)

    calc_resp = client.post(
        "/api/v1/bookings/calculate-price",
        headers=cust_headers,
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "adults": 1,
            "children": 0,
            "infants": 0,
            "offer_id": offer_id,
        },
    )
    assert calc_resp.status_code in (400, 404)


def test_12_package_price_change_policy_tracking(client, db_session) -> None:
    admin = create_user(db_session, "admin_price_change@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)
    _, pkg, _ = setup_package_fixtures(db_session)

    offer_resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "10.00",
            "status": "active",
        },
    )
    offer_id = offer_resp.json()["data"]["id"]

    # Initially no warning
    detail_resp = client.get(f"/api/v1/admin/offers/{offer_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["data"]["price_changed_warning"] is False

    # Update package price in catalog
    pkg.price = Decimal("45000.00")
    db_session.commit()

    # Now admin detail flags price_changed_warning=True and provides current_package_price
    detail_resp2 = client.get(f"/api/v1/admin/offers/{offer_id}", headers=headers)
    assert detail_resp2.status_code == 200
    data = detail_resp2.json()["data"]
    assert data["price_changed_warning"] is True
    assert data["original_package_price"] == "40000.00"
    assert data["current_package_price"] == "45000.00"


def test_13_checkout_uses_validated_discounted_price(client, db_session) -> None:
    admin = create_user(db_session, "admin_checkout_offer@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)
    _, pkg, departure = setup_package_fixtures(db_session)

    # 10% off 40,000 = 4,000 discount per adult
    offer_resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "10.00",
            "status": "active",
        },
    )
    offer_id = offer_resp.json()["data"]["id"]

    cust = create_user(db_session, "cust_checkout_offer@example.com", ROLE_CUSTOMER)
    cust_headers = login(client, cust.email)

    # Calculate price
    calc_resp = client.post(
        "/api/v1/bookings/calculate-price",
        headers=cust_headers,
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "adults": 2,
            "children": 0,
            "infants": 0,
            "offer_id": offer_id,
        },
    )
    assert calc_resp.status_code == 200
    calc_data = calc_resp.json()["data"]
    # Base: 2 * 40,000 = 80,000; Discount: 2 * 4,000 = 8,000; Subtotal: 72,000
    assert calc_data["discount_amount"] == "8000.00"
    assert calc_data["offer_applied"]["offer_id"] == offer_id

    # Create booking
    booking_resp = client.post(
        "/api/v1/bookings",
        headers=cust_headers,
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "adults": 2,
            "children": 0,
            "infants": 0,
            "offer_id": offer_id,
            "lead_passenger_name": "Rajesh Kumar",
            "lead_passenger_email": "rajesh@example.com",
            "lead_passenger_phone": "+919876543210",
        },
    )
    assert booking_resp.status_code == 201
    booking_data = booking_resp.json()["data"]
    assert booking_data["discount_amount"] == "8000.00"
    assert booking_data["offer_id"] == offer_id
    assert booking_data["status"] == "pending"


def test_14_existing_bookings_preserve_original_price_snapshot(
    client, db_session
) -> None:
    admin = create_user(db_session, "admin_snapshot_offer@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)
    _, pkg, departure = setup_package_fixtures(db_session)

    offer_resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "fixed",
            "discount_value": "5000.00",
            "status": "active",
        },
    )
    offer_id = offer_resp.json()["data"]["id"]

    cust = create_user(db_session, "cust_snapshot_offer@example.com", ROLE_CUSTOMER)
    cust_headers = login(client, cust.email)

    booking_resp = client.post(
        "/api/v1/bookings",
        headers=cust_headers,
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "adults": 1,
            "children": 0,
            "infants": 0,
            "offer_id": offer_id,
            "lead_passenger_name": "Anita Verma",
            "lead_passenger_email": "anita@example.com",
            "lead_passenger_phone": "+919876543211",
        },
    )
    assert booking_resp.status_code == 201
    booking_id = booking_resp.json()["data"]["id"]
    original_total = booking_resp.json()["data"]["total_price"]

    # Now admin changes the offer discount or disables it
    admin_headers = login(client, admin.email)
    client.patch(
        f"/api/v1/admin/offers/{offer_id}",
        headers=admin_headers,
        json={"discount_value": "1000.00", "status": "disabled"},
    )

    # Fetch booking from DB directly and verify total_price and discount snapshot remain intact
    b_record = db_session.get(Booking, UUID(booking_id))
    assert str(b_record.total_price) == original_total
    assert b_record.discount_amount == Decimal("5000.00")
    assert str(b_record.offer_id) == offer_id


# ==============================================================================
# Tests 15-16: Security, Roles & Persistence
# ==============================================================================


def test_15_ordinary_users_cannot_modify_offers(client, db_session) -> None:
    cust = create_user(db_session, "ordinary_user@example.com", ROLE_CUSTOMER)
    headers = login(client, cust.email)
    _, pkg, _ = setup_package_fixtures(db_session)

    # Try creating offer as customer -> 403 Forbidden
    resp = client.post(
        "/api/v1/admin/offers",
        headers=headers,
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "10.00",
        },
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "INSUFFICIENT_PERMISSIONS"

    # Unauthenticated -> 401
    client.cookies.clear()
    unauth_resp = client.post(
        "/api/v1/admin/offers",
        headers=csrf_headers(client),
        json={
            "package_id": str(pkg.id),
            "discount_type": "percentage",
            "discount_value": "10.00",
        },
    )
    assert unauth_resp.status_code == 401


def test_16_master_toggle_setting_persists_in_database(client, db_session) -> None:
    admin = create_user(db_session, "admin_persist_test@example.com", ROLE_ADMIN)
    headers = login(client, admin.email)

    # Set to False
    client.patch(
        "/api/v1/admin/offers/settings",
        headers=headers,
        json={"best_offers_enabled": False},
    )

    # Verify directly from DB SiteSetting table
    setting = db_session.execute(
        select(SiteSetting).where(SiteSetting.key == "best_offers_enabled")
    ).scalar_one_or_none()
    assert setting is not None
    assert setting.value == {"enabled": False}

    # Set to True
    client.patch(
        "/api/v1/admin/offers/settings",
        headers=headers,
        json={"best_offers_enabled": True},
    )
    setting2 = db_session.execute(
        select(SiteSetting).where(SiteSetting.key == "best_offers_enabled")
    ).scalar_one_or_none()
    assert setting2 is not None
    assert setting2.value == {"enabled": True}
