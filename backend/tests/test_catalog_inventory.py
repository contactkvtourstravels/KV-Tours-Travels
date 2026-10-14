"""Comprehensive tests for Phase 6 Catalog & Inventory System.

Verifies:
- Destination management & destination images (Cloudinary architecture)
- Package management & package images (hero exclusivity)
- Itinerary day management & duplicate day number prevention (409)
- Hotel catalog & package-hotel associations
- Activity catalog, package activities & day-specific activities
- Group departures, capacity constraints, negative capacity prevention, and cancellation
- Add-on services & Decimal pricing validation
- Public read-only catalog API isolation (filtering published, active, non-deleted items)
- RBAC, customer blocks, staff limits, and CSRF protection
- Audit logging verification on mutations
"""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.permissions import (
    ROLE_CUSTOMER,
    ROLE_MANAGER,
    ROLE_STAFF,
)
from app.core.security import hash_password
from app.models.catalog import Destination, Package
from app.models.content import AuditLog
from app.models.user import Role, User, UserRole

ADMIN_PASSWORD = "AdminPassword!2026"


def csrf_headers(client) -> dict[str, str]:
    cookie_token = client.cookies.get("travel_csrf")
    if cookie_token:
        return {"X-CSRF-Token": cookie_token}
    resp = client.get("/api/v1/auth/csrf")
    assert resp.status_code == 200
    return {"X-CSRF-Token": resp.json()["csrf_token"]}


def create_user_with_role(db, email: str, role_name: str) -> User:
    seed_standard_roles(db)
    user = User(
        email=email,
        email_normalized=email.lower().strip(),
        password_hash=hash_password(ADMIN_PASSWORD),
        first_name="Test",
        last_name=role_name.capitalize(),
        status="active",
    )
    db.add(user)
    db.flush()

    role = db.execute(select(Role).where(Role.name == role_name)).scalar_one()
    assignment = UserRole(user_id=user.id, role_id=role.id)
    db.add(assignment)
    db.commit()
    return user


def login_client(client, email: str, password: str = ADMIN_PASSWORD) -> dict[str, str]:
    client.cookies.clear()
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=csrf_headers(client),
    )
    assert resp.status_code == 200
    return csrf_headers(client)


# ==============================================================================
# 1. Destination & Images
# ==============================================================================


def test_destination_crud_and_images(client, db_session) -> None:
    mgr = create_user_with_role(db_session, "dest_mgr@kvtours.in", ROLE_MANAGER)
    headers = login_client(client, mgr.email)

    # Create Destination
    dest_resp = client.post(
        "/api/v1/admin/destinations",
        json={
            "name": "Maldives Islands",
            "slug": "maldives-islands",
            "country": "Maldives",
            "region": "South Asia",
            "short_description": "Tropical paradise of atolls and luxury overwater villas.",
            "description": "Full description of KV Tours Maldives luxury escapes.",
            "is_published": True,
            "is_featured": True,
            "seo_title": "Luxury Maldives Tours | KV Tours Coimbatore",
            "seo_description": "Book exclusive Maldives tour packages from Coimbatore with KV Tours.",
        },
        headers=headers,
    )
    assert dest_resp.status_code == 201
    dest_id = dest_resp.json()["id"]

    # Duplicate slug rejected with 409
    dup_resp = client.post(
        "/api/v1/admin/destinations",
        json={
            "name": "Duplicate Maldives",
            "slug": "maldives-islands",
            "country": "Maldives",
        },
        headers=headers,
    )
    assert dup_resp.status_code == 409
    assert dup_resp.json()["error"]["code"] in ("DUPLICATE_SLUG", "SLUG_ALREADY_EXISTS")

    # Add Destination Image
    img_resp = client.post(
        f"/api/v1/admin/destinations/{dest_id}/images",
        json={
            "image_url": "https://res.cloudinary.com/demo/image/upload/maldives_aerial.jpg",
            "cloudinary_public_id": "catalog/destinations/maldives_aerial",
            "alt_text": "Aerial view of turquoise Maldives atolls",
            "sort_order": 1,
            "is_featured": True,
        },
        headers=headers,
    )
    assert img_resp.status_code == 201
    img_data = img_resp.json()
    assert img_data["is_featured"] is True
    img_id = img_data["id"]

    # Add second image
    img2_resp = client.post(
        f"/api/v1/admin/destinations/{dest_id}/images",
        json={
            "image_url": "https://res.cloudinary.com/demo/image/upload/maldives_sunset.jpg",
            "alt_text": "Sunset overwater villa",
            "sort_order": 2,
            "is_featured": False,
        },
        headers=headers,
    )
    assert img2_resp.status_code == 201

    # List destination images
    list_img_resp = client.get(f"/api/v1/admin/destinations/{dest_id}/images")
    assert list_img_resp.status_code == 200
    assert len(list_img_resp.json()) == 2

    # Update destination image
    patch_img = client.patch(
        f"/api/v1/admin/destinations/{dest_id}/images/{img_id}",
        json={"sort_order": 5, "alt_text": "Updated Alt Text"},
        headers=headers,
    )
    assert patch_img.status_code == 200
    assert patch_img.json()["sort_order"] == 5

    # Delete destination image
    del_img = client.delete(
        f"/api/v1/admin/destinations/{dest_id}/images/{img_id}",
        headers=headers,
    )
    assert del_img.status_code == 204

    # Verify only 1 image remains
    assert len(client.get(f"/api/v1/admin/destinations/{dest_id}/images").json()) == 1


# ==============================================================================
# 2. Package Management & Validation
# ==============================================================================


def test_package_crud_and_validation(client, db_session) -> None:
    mgr = create_user_with_role(db_session, "pkg_mgr@kvtours.in", ROLE_MANAGER)
    headers = login_client(client, mgr.email)

    # Setup destination
    dest = Destination(
        name="Lakshadweep Islands",
        slug="lakshadweep-islands",
        country="India",
        region="UT",
        is_published=True,
    )
    db_session.add(dest)
    db_session.commit()

    # Create Package with valid data
    pkg_resp = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": str(dest.id),
            "name": "5-Day Coral Paradise Lakshadweep",
            "slug": "lakshadweep-5-days",
            "short_description": "Pristine white sand beaches and lagoon exploration.",
            "description": "Full travel itinerary across Agatti and Bangaram islands.",
            "base_price": 38500.00,
            "currency": "INR",
            "duration_days": 5,
            "duration_nights": 4,
            "minimum_travellers": 2,
            "maximum_travellers": 16,
            "is_published": True,
            "is_featured": True,
            "seo_title": "Lakshadweep 5 Days Package | KV Tours Coimbatore",
            "seo_description": "Exclusive Lakshadweep tour package starting from Coimbatore.",
        },
        headers=headers,
    )
    assert pkg_resp.status_code == 201
    pkg_id = pkg_resp.json()["id"]
    assert Decimal(str(pkg_resp.json()["base_price"])) == Decimal("38500.00")

    # Reject non-existent destination
    fake_dest_resp = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": str(uuid4()),
            "name": "Invalid Destination Tour",
            "base_price": 10000,
            "duration_days": 3,
            "duration_nights": 2,
        },
        headers=headers,
    )
    assert fake_dest_resp.status_code == 404
    assert fake_dest_resp.json()["error"]["code"] == "DESTINATION_NOT_FOUND"

    # Reject duplicate package slug
    dup_pkg_resp = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": str(dest.id),
            "name": "Duplicate Lakshadweep Tour",
            "slug": "lakshadweep-5-days",
            "base_price": 20000,
            "duration_days": 4,
            "duration_nights": 3,
        },
        headers=headers,
    )
    assert dup_pkg_resp.status_code == 409
    assert dup_pkg_resp.json()["error"]["code"] in (
        "DUPLICATE_SLUG",
        "SLUG_ALREADY_EXISTS",
    )

    # Reject negative price
    neg_price_resp = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": str(dest.id),
            "name": "Negative Price Tour",
            "base_price": -500,
            "duration_days": 2,
            "duration_nights": 1,
        },
        headers=headers,
    )
    assert neg_price_resp.status_code in (400, 422)

    # Soft-delete package
    del_resp = client.delete(f"/api/v1/admin/packages/{pkg_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["is_active"] is False


# ==============================================================================
# 3. Package Images & Hero Exclusivity
# ==============================================================================


def test_package_images_and_hero_flag(client, db_session) -> None:
    mgr = create_user_with_role(db_session, "pkg_img_mgr@kvtours.in", ROLE_MANAGER)
    headers = login_client(client, mgr.email)

    dest = Destination(
        name="Kazakhstan", slug="kazakhstan", country="Kazakhstan", is_published=True
    )
    db_session.add(dest)
    db_session.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Almaty Mountain Adventure",
        slug="almaty-mountain-adventure",
        base_price=Decimal("54000.00"),
        currency="INR",
        duration_days=6,
        duration_nights=5,
        is_published=True,
    )
    db_session.add(pkg)
    db_session.commit()

    # Add Image 1 with hero flag
    img1 = client.post(
        f"/api/v1/admin/packages/{pkg.id}/images",
        json={
            "image_url": "https://res.cloudinary.com/demo/image/upload/shymbulak_resort.jpg",
            "alt_text": "Shymbulak Mountain Resort snowy peaks",
            "sort_order": 1,
            "is_featured": True,
        },
        headers=headers,
    )
    assert img1.status_code == 201
    assert img1.json()["is_featured"] is True
    img1_id = img1.json()["id"]

    # Add Image 2 with hero flag -> should unset Image 1's hero flag
    img2 = client.post(
        f"/api/v1/admin/packages/{pkg.id}/images",
        json={
            "image_url": "https://res.cloudinary.com/demo/image/upload/big_almaty_lake.jpg",
            "alt_text": "Big Almaty Lake turquoise water",
            "sort_order": 2,
            "is_featured": True,
        },
        headers=headers,
    )
    assert img2.status_code == 201
    assert img2.json()["is_featured"] is True

    # Check images list: only Image 2 is featured
    images_list = client.get(f"/api/v1/admin/packages/{pkg.id}/images").json()
    assert len(images_list) == 2
    for item in images_list:
        if item["id"] == img1_id:
            assert item["is_featured"] is False
        else:
            assert item["is_featured"] is True

    # Delete image
    del_res = client.delete(
        f"/api/v1/admin/packages/{pkg.id}/images/{img1_id}", headers=headers
    )
    assert del_res.status_code == 204


# ==============================================================================
# 4. Itinerary & Unique Day Numbers
# ==============================================================================


def test_itinerary_and_day_number_uniqueness(client, db_session) -> None:
    mgr = create_user_with_role(db_session, "itin_mgr@kvtours.in", ROLE_MANAGER)
    headers = login_client(client, mgr.email)

    dest = Destination(
        name="Manali", slug="manali-tours", country="India", is_published=True
    )
    db_session.add(dest)
    db_session.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Manali Solang Valley Escape",
        slug="manali-solang-escape",
        base_price=Decimal("18500.00"),
        currency="INR",
        duration_days=4,
        duration_nights=3,
        is_published=True,
    )
    db_session.add(pkg)
    db_session.commit()

    # Create Day 1
    day1_resp = client.post(
        f"/api/v1/admin/packages/{pkg.id}/itinerary",
        json={
            "day_number": 1,
            "title": "Arrival in Manali & Old Manali Walk",
            "description": "Check in to luxury resort, visit Hadimba Temple and cafes.",
            "accommodation": "Solang Valley Luxury Resort",
            "meals": "Dinner",
            "transportation": "Private SUV",
        },
        headers=headers,
    )
    assert day1_resp.status_code == 201
    day1_id = day1_resp.json()["id"]

    # Create Day 2
    day2_resp = client.post(
        f"/api/v1/admin/packages/{pkg.id}/itinerary",
        json={
            "day_number": 2,
            "title": "Solang Valley & Rohtang Pass Excursion",
            "description": "Snow activities, paragliding, and high-altitude photography.",
            "accommodation": "Solang Valley Luxury Resort",
            "meals": "Breakfast, Dinner",
            "transportation": "Private 4x4",
        },
        headers=headers,
    )
    assert day2_resp.status_code == 201

    # Attempt to create duplicate Day 1 -> rejected with 409
    dup_day_resp = client.post(
        f"/api/v1/admin/packages/{pkg.id}/itinerary",
        json={"day_number": 1, "title": "Collision Day 1"},
        headers=headers,
    )
    assert dup_day_resp.status_code == 409
    assert dup_day_resp.json()["error"]["code"] == "DUPLICATE_DAY_NUMBER"

    # Update Day 1 details
    patch_day1 = client.patch(
        f"/api/v1/admin/packages/{pkg.id}/itinerary/{day1_id}",
        json={"title": "Arrival in Manali & Evening Nature Walk"},
        headers=headers,
    )
    assert patch_day1.status_code == 200
    assert patch_day1.json()["title"] == "Arrival in Manali & Evening Nature Walk"

    # List itinerary ordered by day_number
    itinerary = client.get(f"/api/v1/admin/packages/{pkg.id}/itinerary").json()
    assert len(itinerary) == 2
    assert itinerary[0]["day_number"] == 1
    assert itinerary[1]["day_number"] == 2


# ==============================================================================
# 5. Hotels & Package Associations
# ==============================================================================


def test_hotel_crud_and_package_associations(client, db_session) -> None:
    mgr = create_user_with_role(db_session, "hotel_mgr@kvtours.in", ROLE_MANAGER)
    headers = login_client(client, mgr.email)

    dest = Destination(name="Dubai", slug="dubai-uae", country="UAE", is_published=True)
    db_session.add(dest)
    db_session.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Dubai Luxury Skyline & Desert",
        slug="dubai-luxury-skyline",
        base_price=Decimal("68000.00"),
        currency="INR",
        duration_days=5,
        duration_nights=4,
        is_published=True,
    )
    db_session.add(pkg)
    db_session.commit()

    # Create Hotel
    hotel_resp = client.post(
        "/api/v1/admin/hotels",
        json={
            "destination_id": str(dest.id),
            "name": "Atlantis The Royal",
            "description": "Ultra-luxury experiential resort on Palm Jumeirah.",
            "address": "Palm Jumeirah, Dubai, UAE",
            "star_rating": 5,
            "website_url": "https://atlantis.com/the-royal",
            "contact_phone": "+971 4 426 0000",
            "contact_email": "reservations@atlantis.com",
            "is_active": True,
        },
        headers=headers,
    )
    assert hotel_resp.status_code == 201
    hotel_id = hotel_resp.json()["id"]

    # Star rating validation (1 to 5)
    invalid_star_resp = client.post(
        "/api/v1/admin/hotels",
        json={
            "destination_id": str(dest.id),
            "name": "Invalid Rating Hotel",
            "star_rating": 7,
        },
        headers=headers,
    )
    assert invalid_star_resp.status_code in (400, 422)

    # Associate Hotel with Package
    link_resp = client.post(
        f"/api/v1/admin/packages/{pkg.id}/hotels",
        json={"hotel_id": str(hotel_id)},
        headers=headers,
    )
    assert link_resp.status_code == 201
    assert link_resp.json()["hotel_name"] == "Atlantis The Royal"

    # List package hotels
    pkg_hotels = client.get(f"/api/v1/admin/packages/{pkg.id}/hotels").json()
    assert len(pkg_hotels) == 1
    assert pkg_hotels[0]["hotel_id"] == str(hotel_id)

    # Unlink hotel from package
    unlink_resp = client.delete(
        f"/api/v1/admin/packages/{pkg.id}/hotels/{hotel_id}",
        headers=headers,
    )
    assert unlink_resp.status_code == 204
    assert len(client.get(f"/api/v1/admin/packages/{pkg.id}/hotels").json()) == 0


# ==============================================================================
# 6. Activities & Day Associations
# ==============================================================================


def test_activity_crud_and_day_linking(client, db_session) -> None:
    mgr = create_user_with_role(db_session, "act_mgr@kvtours.in", ROLE_MANAGER)
    headers = login_client(client, mgr.email)

    dest = Destination(
        name="Bali", slug="bali-indonesia", country="Indonesia", is_published=True
    )
    db_session.add(dest)
    db_session.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Bali Island & Temple Escape",
        slug="bali-temple-escape",
        base_price=Decimal("42000.00"),
        currency="INR",
        duration_days=5,
        duration_nights=4,
        is_published=True,
    )
    db_session.add(pkg)
    db_session.flush()

    # Create Activity
    act_resp = client.post(
        "/api/v1/admin/activities",
        json={
            "destination_id": str(dest.id),
            "name": "Nusa Penida Manta Ray Snorkeling",
            "description": "Speedboat excursion to Manta Point with professional divemasters.",
            "duration_minutes": 240,
            "category": "Water Sports",
            "price": 3500.00,
            "currency": "INR",
            "status": "active",
        },
        headers=headers,
    )
    assert act_resp.status_code == 201
    act_id = act_resp.json()["id"]

    # Link Activity to Package
    link_pkg_act = client.post(
        f"/api/v1/admin/packages/{pkg.id}/activities",
        json={"activity_id": str(act_id)},
        headers=headers,
    )
    assert link_pkg_act.status_code == 201

    # Create Day and link Activity to Day
    day_resp = client.post(
        f"/api/v1/admin/packages/{pkg.id}/itinerary",
        json={"day_number": 2, "title": "Nusa Penida Marine Day"},
        headers=headers,
    )
    day_id = day_resp.json()["id"]

    add_day_act = client.post(
        f"/api/v1/admin/packages/{pkg.id}/itinerary/{day_id}/activities",
        json={"activity_id": str(act_id), "sort_order": 1},
        headers=headers,
    )
    assert add_day_act.status_code == 201
    day_activities = add_day_act.json()["activities"]
    assert len(day_activities) == 1
    assert day_activities[0]["activity_name"] == "Nusa Penida Manta Ray Snorkeling"

    # Attempting to link the same activity again to the same day returns 409
    dup_link = client.post(
        f"/api/v1/admin/packages/{pkg.id}/itinerary/{day_id}/activities",
        json={"activity_id": str(act_id), "sort_order": 2},
        headers=headers,
    )
    assert dup_link.status_code == 409
    assert dup_link.json()["error"]["code"] == "ACTIVITY_ALREADY_LINKED"

    # Remove activity from day
    rem_act = client.delete(
        f"/api/v1/admin/packages/{pkg.id}/itinerary/{day_id}/activities/{act_id}",
        headers=headers,
    )
    assert rem_act.status_code == 200
    assert len(rem_act.json()["activities"]) == 0


# ==============================================================================
# 7. Group Departures & Capacity Constraints
# ==============================================================================


def test_departures_capacity_and_locking(client, db_session) -> None:
    mgr = create_user_with_role(db_session, "dep_mgr@kvtours.in", ROLE_MANAGER)
    headers = login_client(client, mgr.email)

    dest = Destination(
        name="Vietnam", slug="vietnam-tours", country="Vietnam", is_published=True
    )
    db_session.add(dest)
    db_session.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Vietnam Hanoi & Halong Bay Cruise",
        slug="vietnam-hanoi-halong",
        base_price=Decimal("46000.00"),
        currency="INR",
        duration_days=6,
        duration_nights=5,
        is_published=True,
    )
    db_session.add(pkg)
    db_session.commit()

    # Create Group Departure
    dep_resp = client.post(
        f"/api/v1/admin/packages/{pkg.id}/departures",
        json={
            "departure_date": "2026-11-15",
            "return_date": "2026-11-20",
            "total_capacity": 20,
            "special_price": 44000.00,
            "currency": "INR",
            "status": "open",
        },
        headers=headers,
    )
    assert dep_resp.status_code == 201
    dep_data = dep_resp.json()
    assert dep_data["total_capacity"] == 20
    assert dep_data["available_capacity"] == 20
    assert dep_data["reserved_capacity"] == 0
    dep_id = dep_data["id"]

    # Reject return date before departure date
    inv_date_resp = client.post(
        f"/api/v1/admin/packages/{pkg.id}/departures",
        json={
            "departure_date": "2026-12-10",
            "return_date": "2026-12-05",  # earlier!
            "total_capacity": 15,
        },
        headers=headers,
    )
    assert inv_date_resp.status_code == 400
    assert inv_date_resp.json()["error"]["code"] in (
        "INVALID_DATE_RANGE",
        "INVALID_RETURN_DATE",
    )

    # Simulate booking 15 seats -> update reserved_capacity
    update_cap = client.patch(
        f"/api/v1/admin/departures/{dep_id}",
        json={"reserved_capacity": 15},
        headers=headers,
    )
    assert update_cap.status_code == 200
    assert update_cap.json()["available_capacity"] == 5

    # Capacity constraint: Cannot reduce total_capacity below reserved_capacity
    conflict_resp = client.patch(
        f"/api/v1/admin/departures/{dep_id}",
        json={"total_capacity": 10},  # less than 15 reserved!
        headers=headers,
    )
    assert conflict_resp.status_code == 400
    assert conflict_resp.json()["error"]["code"] in (
        "CAPACITY_CONFLICT",
        "CAPACITY_BELOW_RESERVED",
    )

    # Auto sold-out when available seats reach 0
    fill_cap = client.patch(
        f"/api/v1/admin/departures/{dep_id}",
        json={"reserved_capacity": 20},
        headers=headers,
    )
    assert fill_cap.status_code == 200
    assert fill_cap.json()["available_capacity"] == 0
    assert fill_cap.json()["status"] == "sold_out"

    # Cancel departure
    cancel_resp = client.delete(f"/api/v1/admin/departures/{dep_id}", headers=headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"


# ==============================================================================
# 8. Add-On Services & Exact Pricing
# ==============================================================================


def test_add_on_services_crud(client, db_session) -> None:
    mgr = create_user_with_role(db_session, "addon_mgr@kvtours.in", ROLE_MANAGER)
    headers = login_client(client, mgr.email)

    # Create Add-On
    addon_resp = client.post(
        "/api/v1/admin/add-ons",
        json={
            "name": "VIP Speedboat Airport Transfer",
            "description": "Private chartered speedboat transfer from Velana International Airport.",
            "price": 6500.00,
            "currency": "INR",
            "is_active": True,
        },
        headers=headers,
    )
    assert addon_resp.status_code == 201
    addon_id = addon_resp.json()["id"]

    # Reject negative price
    neg_resp = client.post(
        "/api/v1/admin/add-ons",
        json={"name": "Invalid Price Addon", "price": -100},
        headers=headers,
    )
    assert neg_resp.status_code in (400, 422)

    # Update Add-On price
    patch_resp = client.patch(
        f"/api/v1/admin/add-ons/{addon_id}",
        json={"price": 7000.00},
        headers=headers,
    )
    assert patch_resp.status_code == 200
    assert Decimal(str(patch_resp.json()["price"])) == Decimal("7000.00")

    # Deactivate Add-On
    del_resp = client.delete(f"/api/v1/admin/add-ons/{addon_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["is_active"] is False


# ==============================================================================
# 9. Public API Isolation
# ==============================================================================


def test_public_catalog_isolation(client, db_session) -> None:
    client.cookies.clear()  # No admin authentication

    # Seed published and unpublished destinations
    dest_pub = Destination(
        name="Sri Lanka",
        slug="sri-lanka",
        country="Sri Lanka",
        is_published=True,
    )
    dest_draft = Destination(
        name="Secret Island",
        slug="secret-island",
        country="Unknown",
        is_published=False,  # DRAFT!
    )
    db_session.add_all([dest_pub, dest_draft])
    db_session.flush()

    # Seed published and unpublished packages
    pkg_pub = Package(
        destination_id=dest_pub.id,
        name="Sri Lanka Ramayana Trail",
        slug="sri-lanka-ramayana",
        base_price=Decimal("32000.00"),
        currency="INR",
        duration_days=5,
        duration_nights=4,
        is_published=True,
    )
    pkg_draft = Package(
        destination_id=dest_pub.id,
        name="Unpublished Hidden Sri Lanka",
        slug="unpublished-sri-lanka",
        base_price=Decimal("15000.00"),
        currency="INR",
        duration_days=3,
        duration_nights=2,
        is_published=False,  # DRAFT!
    )
    db_session.add_all([pkg_pub, pkg_draft])
    db_session.commit()

    # 1. Public Destinations: Only published destinations returned
    public_dests = client.get("/api/v1/destinations").json()
    dest_slugs = [d["slug"] for d in public_dests]
    assert "sri-lanka" in dest_slugs
    assert "secret-island" not in dest_slugs

    # 2. Accessing unpublished destination slug returns 404
    assert client.get("/api/v1/destinations/secret-island").status_code == 404

    # 3. Public Packages: Only published packages returned
    public_pkgs = client.get("/api/v1/packages").json()
    pkg_slugs = [p["slug"] for p in public_pkgs]
    assert "sri-lanka-ramayana" in pkg_slugs
    assert "unpublished-sri-lanka" not in pkg_slugs

    # 4. Accessing unpublished package slug returns 404
    assert client.get("/api/v1/packages/unpublished-sri-lanka").status_code == 404

    # 5. Public Package Details: verifies clean presentation without internal admin keys
    pub_detail = client.get("/api/v1/packages/sri-lanka-ramayana")
    assert pub_detail.status_code == 200
    detail_data = pub_detail.json()
    assert detail_data["name"] == "Sri Lanka Ramayana Trail"
    assert "deleted_at" not in detail_data
    assert "created_by" not in detail_data

    # 6. Public Itinerary & Departures endpoints
    assert (
        client.get("/api/v1/packages/sri-lanka-ramayana/itinerary").status_code == 200
    )
    assert (
        client.get("/api/v1/packages/sri-lanka-ramayana/departures").status_code == 200
    )


# ==============================================================================
# 10. RBAC, CSRF & Security Guards
# ==============================================================================


def test_customer_and_staff_security_guards(client, db_session) -> None:
    cust = create_user_with_role(
        db_session, "customer_catalog@kvtours.in", ROLE_CUSTOMER
    )
    login_client(client, cust.email)

    # Customer blocked from all catalog admin endpoints
    assert client.get("/api/v1/admin/destinations").status_code == 403
    assert client.get("/api/v1/admin/packages").status_code == 403
    assert client.get("/api/v1/admin/hotels").status_code == 403
    assert client.get("/api/v1/admin/activities").status_code == 403
    assert client.get("/api/v1/admin/departures").status_code == 403
    assert client.get("/api/v1/admin/add-ons").status_code == 403

    # Staff permissions: Staff can VIEW, but cannot MUTATE (create/update/delete)
    staff = create_user_with_role(db_session, "staff_catalog@kvtours.in", ROLE_STAFF)
    headers = login_client(client, staff.email)

    assert client.get("/api/v1/admin/hotels").status_code == 200
    assert client.get("/api/v1/admin/activities").status_code == 200
    assert client.get("/api/v1/admin/departures").status_code == 200

    # Staff blocked from POST
    post_hotel = client.post(
        "/api/v1/admin/hotels",
        json={"name": "Forbidden Hotel", "destination_id": str(uuid4())},
        headers=headers,
    )
    assert post_hotel.status_code == 403

    # Missing CSRF blocked
    mgr = create_user_with_role(db_session, "csrf_mgr@kvtours.in", ROLE_MANAGER)
    login_client(client, mgr.email)
    csrf_blocked = client.post(
        "/api/v1/admin/destinations",
        json={"name": "No CSRF Dest", "country": "India"},
        # Omit CSRF Header!
    )
    assert csrf_blocked.status_code == 403
    assert csrf_blocked.json()["error"]["code"] in (
        "CSRF_VERIFICATION_FAILED",
        "CSRF_TOKEN_MISSING",
    )


# ==============================================================================
# 11. Audit Logging on Mutations
# ==============================================================================


def test_audit_logging_on_mutations(client, db_session) -> None:
    mgr = create_user_with_role(
        db_session, "audit_catalog_mgr@kvtours.in", ROLE_MANAGER
    )
    headers = login_client(client, mgr.email)

    # Mutation 1: Create Destination
    dest_resp = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Audit Test Destination", "country": "India"},
        headers=headers,
    )
    assert dest_resp.status_code == 201

    # Check Audit Log in DB
    log = db_session.execute(
        select(AuditLog).where(
            AuditLog.action == "destination_created",
            AuditLog.actor_user_id == mgr.id,
        )
    ).scalar_one_or_none()
    assert log is not None
    assert log.entity_type == "destination"
