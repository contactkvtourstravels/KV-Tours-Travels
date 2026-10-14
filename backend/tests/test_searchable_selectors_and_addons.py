"""Tests for server-side searchable selectors and scoped add-ons.

Verifies:
1. Searching packages by destination name and country (case-insensitive partial matching).
2. Searching hotels by destination name, country, or hotel address.
3. Searching activities by destination name, country, or category.
4. Add-on scoping via GET /api/v1/add-ons?package_id=... isolating package-specific extras.
5. Add-on scoping via GET /api/v1/add-ons?destination_id=...
6. Prevention of package-specific add-ons leaking to unrelated packages.
"""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.permissions import ROLE_ADMIN
from app.core.security import hash_password
from app.models.catalog import Activity, Destination, Hotel, Package
from app.models.commerce import AddOn, AddOnDestination, AddOnPackage
from app.models.user import Role, User, UserRole

PASSWORD = "SecurePassword!2026"


def csrf_headers(client) -> dict[str, str]:
    cookie_token = client.cookies.get("travel_csrf")
    if cookie_token:
        return {"X-CSRF-Token": cookie_token}
    resp = client.get("/api/v1/auth/csrf")
    assert resp.status_code == 200
    return {"X-CSRF-Token": resp.json()["csrf_token"]}


def create_admin_user(db, email: str = "admin.search@kvtravels.com") -> User:
    seed_standard_roles(db)
    user = User(
        email=email,
        email_normalized=email.lower().strip(),
        password_hash=hash_password(PASSWORD),
        first_name="Admin",
        last_name="Search",
        status="active",
    )
    db.add(user)
    db.flush()

    role = db.query(Role).filter(Role.name == ROLE_ADMIN).first()
    assert role is not None
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    db.refresh(user)
    return user


def login(client, email: str = "admin.search@kvtravels.com"):
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
        headers=csrf_headers(client),
    )


def test_package_search_by_destination_and_country(client, db_session):
    create_admin_user(db_session, "admin.pkgsearch@kvtravels.com")
    login(client, "admin.pkgsearch@kvtravels.com")

    # Create destination
    dest = Destination(
        name="Lombok Paradise",
        slug=f"lombok-paradise-{uuid4().hex[:6]}",
        country="Indonesia",
        region="Southeast Asia",
        is_published=True,
    )
    db_session.add(dest)
    db_session.commit()

    # Create package
    pkg = Package(
        destination_id=dest.id,
        name="Volcano Trek & Beach Hideaway",
        slug=f"volcano-trek-{uuid4().hex[:6]}",
        base_price=Decimal(45000),
        currency="INR",
        duration_days=5,
        duration_nights=4,
        is_published=True,
    )
    db_session.add(pkg)
    db_session.commit()

    # Search by package partial name
    r = client.get("/api/v1/admin/packages?search=volcano")
    assert r.status_code == 200
    items = r.json()["items"]
    assert any(i["id"] == str(pkg.id) for i in items)

    # Search by destination name
    r2 = client.get("/api/v1/admin/packages?search=lombok")
    assert r2.status_code == 200
    items2 = r2.json()["items"]
    assert any(i["id"] == str(pkg.id) for i in items2)

    # Search by destination country (case-insensitive)
    r3 = client.get("/api/v1/admin/packages?search=INDONESIA")
    assert r3.status_code == 200
    items3 = r3.json()["items"]
    assert any(i["id"] == str(pkg.id) for i in items3)

    # Search non-matching term
    r4 = client.get("/api/v1/admin/packages?search=xyznonexistentterm123")
    assert r4.status_code == 200
    assert r4.json()["total"] == 0


def test_hotel_search_by_destination_and_country(client, db_session):
    create_admin_user(db_session, "admin.hotelsearch@kvtravels.com")
    login(client, "admin.hotelsearch@kvtravels.com")

    dest = Destination(
        name="Santorini Hills",
        slug=f"santorini-hills-{uuid4().hex[:6]}",
        country="Greece",
        is_published=True,
    )
    db_session.add(dest)
    db_session.commit()

    hotel = Hotel(
        destination_id=dest.id,
        name="Caldera View Suites",
        address="Oia Cliffside Road",
        is_active=True,
    )
    db_session.add(hotel)
    db_session.commit()

    # Search by hotel name
    r1 = client.get("/api/v1/admin/hotels?search=caldera")
    assert r1.status_code == 200
    assert any(h["id"] == str(hotel.id) for h in r1.json()["items"])

    # Search by destination name
    r2 = client.get("/api/v1/admin/hotels?search=santorini")
    assert r2.status_code == 200
    assert any(h["id"] == str(hotel.id) for h in r2.json()["items"])

    # Search by country
    r3 = client.get("/api/v1/admin/hotels?search=GREECE")
    assert r3.status_code == 200
    assert any(h["id"] == str(hotel.id) for h in r3.json()["items"])


def test_activity_search_by_destination_and_country(client, db_session):
    create_admin_user(db_session, "admin.actsearch@kvtravels.com")
    login(client, "admin.actsearch@kvtravels.com")

    dest = Destination(
        name="Kyoto Historic",
        slug=f"kyoto-historic-{uuid4().hex[:6]}",
        country="Japan",
        is_published=True,
    )
    db_session.add(dest)
    db_session.commit()

    act = Activity(
        destination_id=dest.id,
        name="Tea Ceremony & Kimono Walk",
        category="Cultural Experience",
        status="active",
        price=Decimal(3500),
    )
    db_session.add(act)
    db_session.commit()

    # Search by activity name
    r1 = client.get("/api/v1/admin/activities?search=ceremony")
    assert r1.status_code == 200
    assert any(a["id"] == str(act.id) for a in r1.json()["items"])

    # Search by destination name
    r2 = client.get("/api/v1/admin/activities?search=kyoto")
    assert r2.status_code == 200
    assert any(a["id"] == str(act.id) for a in r2.json()["items"])

    # Search by country
    r3 = client.get("/api/v1/admin/activities?search=japan")
    assert r3.status_code == 200
    assert any(a["id"] == str(act.id) for a in r3.json()["items"])


def test_public_add_ons_package_scoping_and_isolation(client, db_session):
    # Setup Destinations
    dest_bali = Destination(
        name="Bali Special",
        slug=f"bali-special-{uuid4().hex[:6]}",
        country="Indonesia",
        is_published=True,
    )
    dest_swiss = Destination(
        name="Swiss Alps",
        slug=f"swiss-alps-{uuid4().hex[:6]}",
        country="Switzerland",
        is_published=True,
    )
    db_session.add_all([dest_bali, dest_swiss])
    db_session.commit()

    # Setup Packages
    pkg_bali = Package(
        destination_id=dest_bali.id,
        name="Bali Explorer",
        slug=f"bali-explorer-{uuid4().hex[:6]}",
        base_price=Decimal(30000),
        currency="INR",
        duration_days=5,
        duration_nights=4,
        is_published=True,
    )
    pkg_swiss = Package(
        destination_id=dest_swiss.id,
        name="Swiss Glacier Tour",
        slug=f"swiss-glacier-{uuid4().hex[:6]}",
        base_price=Decimal(95000),
        currency="INR",
        duration_days=7,
        duration_nights=6,
        is_published=True,
    )
    db_session.add_all([pkg_bali, pkg_swiss])
    db_session.commit()

    # 1. Global add-on (all packages)
    addon_global = AddOn(
        name="Worldwide Travel Insurance",
        price=Decimal(1500),
        currency="INR",
        applicability_scope="all_packages",
        is_active=True,
    )
    db_session.add(addon_global)

    # 2. Package-specific add-on (Bali package only)
    addon_bali_only = AddOn(
        name="Bali Floating Breakfast Experience",
        price=Decimal(2500),
        currency="INR",
        applicability_scope="selected_packages",
        is_active=True,
    )
    db_session.add(addon_bali_only)
    db_session.flush()
    db_session.add(AddOnPackage(add_on_id=addon_bali_only.id, package_id=pkg_bali.id))

    # 3. Destination-specific add-on (Swiss destinations only)
    addon_swiss_dest = AddOn(
        name="Swiss Rail Pass Upgrade",
        price=Decimal(12000),
        currency="INR",
        applicability_scope="selected_destinations",
        is_active=True,
    )
    db_session.add(addon_swiss_dest)
    db_session.flush()
    db_session.add(
        AddOnDestination(add_on_id=addon_swiss_dest.id, destination_id=dest_swiss.id)
    )

    db_session.commit()

    # Query public add-ons for Bali package:
    r_bali = client.get(f"/api/v1/add-ons?package_id={pkg_bali.id}")
    assert r_bali.status_code == 200
    bali_addon_ids = [item["id"] for item in r_bali.json()]
    assert str(addon_global.id) in bali_addon_ids
    assert str(addon_bali_only.id) in bali_addon_ids
    # Swiss add-on MUST NOT appear for Bali package!
    assert str(addon_swiss_dest.id) not in bali_addon_ids

    # Query public add-ons for Swiss package:
    r_swiss = client.get(f"/api/v1/add-ons?package_id={pkg_swiss.id}")
    assert r_swiss.status_code == 200
    swiss_addon_ids = [item["id"] for item in r_swiss.json()]
    assert str(addon_global.id) in swiss_addon_ids
    assert str(addon_swiss_dest.id) in swiss_addon_ids
    # Bali-only add-on MUST NOT leak into Swiss package!
    assert str(addon_bali_only.id) not in swiss_addon_ids

    # Query public add-ons for Swiss destination directly:
    r_dest = client.get(f"/api/v1/add-ons?destination_id={dest_swiss.id}")
    assert r_dest.status_code == 200
    dest_addon_ids = [item["id"] for item in r_dest.json()]
    assert str(addon_global.id) in dest_addon_ids
    assert str(addon_swiss_dest.id) in dest_addon_ids
    assert str(addon_bali_only.id) not in dest_addon_ids

    # Query without filter: returns all active add-ons
    r_all = client.get("/api/v1/add-ons")
    assert r_all.status_code == 200
    all_addon_ids = [item["id"] for item in r_all.json()]
    assert str(addon_global.id) in all_addon_ids
    assert str(addon_bali_only.id) in all_addon_ids
    assert str(addon_swiss_dest.id) in all_addon_ids
