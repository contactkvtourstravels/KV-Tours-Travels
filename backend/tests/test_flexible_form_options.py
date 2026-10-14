"""Tests for Flexible Admin Form Fields, Custom Creatable Categories, and None Value Handling."""

from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy import select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER
from app.core.security import hash_password
from app.models.catalog import Destination, Package
from app.models.user import Role, User, UserRole

ADMIN_PASSWORD = "AdminPassword!2026"


def csrf_headers(client) -> dict[str, str]:
    """Helper to retrieve or maintain active X-CSRF-Token."""
    cookie_token = client.cookies.get("travel_csrf")
    if cookie_token:
        return {"X-CSRF-Token": cookie_token}
    resp = client.get("/api/v1/auth/csrf")
    assert resp.status_code == 200
    return {"X-CSRF-Token": resp.json()["csrf_token"]}


def create_user_with_role(db, email: str, role_name: str) -> User:
    """Helper to persist a user with an assigned system role."""
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
    """Helper to log in as specified user."""
    client.cookies.clear()
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=csrf_headers(client),
    )
    assert resp.status_code == 200
    return csrf_headers(client)


# ==============================================================================
# Options Categories API Tests
# ==============================================================================


def test_get_options_categories_requires_staff(client, db_session) -> None:
    cust = create_user_with_role(db_session, "cust_opt@example.com", ROLE_CUSTOMER)
    login_client(client, cust.email)

    resp = client.get("/api/v1/admin/options/categories")
    assert resp.status_code == 403


def test_get_options_categories_returns_defaults(client, db_session) -> None:
    admin = create_user_with_role(db_session, "admin_opt_get@example.com", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    resp = client.get("/api/v1/admin/options/categories", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "destination_categories" in data
    assert "package_categories" in data
    assert "package_travel_types" in data
    assert "package_difficulty_levels" in data
    assert "activity_categories" in data

    # Check some standard presets exist
    assert "Beach & Coastal" in data["destination_categories"]
    assert "Family Vacation" in data["package_categories"]
    assert "Easy / Relaxed" in data["package_difficulty_levels"]


def test_post_options_categories_creates_and_deduplicates(client, db_session) -> None:
    admin = create_user_with_role(db_session, "admin_opt_post@example.com", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # 1. Register a new custom category
    payload = {
        "field": "destination_categories",
        "value": "Island Escape",
    }
    resp = client.post(
        "/api/v1/admin/options/categories", json=payload, headers=headers
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert "Island Escape" in res_data["destination_categories"]

    # 2. Try registering same category with different case and extra whitespace
    payload_dup = {
        "field": "destination_categories",
        "value": "  island   escape  ",
    }
    resp2 = client.post(
        "/api/v1/admin/options/categories", json=payload_dup, headers=headers
    )
    assert resp2.status_code == 200
    # Must NOT have duplicate entries for island escape
    matching = [
        c
        for c in resp2.json()["destination_categories"]
        if c.lower() == "island escape"
    ]
    assert len(matching) == 1

    # 3. Validation: Empty value rejected
    resp_empty = client.post(
        "/api/v1/admin/options/categories",
        json={"field": "destination_categories", "value": "   "},
        headers=headers,
    )
    assert resp_empty.status_code == 422

    # 4. Validation: Value exceeding 80 characters rejected
    resp_long = client.post(
        "/api/v1/admin/options/categories",
        json={"field": "destination_categories", "value": "A" * 81},
        headers=headers,
    )
    assert resp_long.status_code == 422

    # 5. Validation: Unknown field rejected
    resp_bad_field = client.post(
        "/api/v1/admin/options/categories",
        json={"field": "unknown_categories", "value": "Something"},
        headers=headers,
    )
    assert resp_bad_field.status_code == 422


# ==============================================================================
# None / Null Value and Custom Category Saving in Destination
# ==============================================================================


def test_destination_custom_category_and_none_clearing(client, db_session) -> None:
    admin = create_user_with_role(db_session, "admin_dest_none@example.com", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Create destination with custom category "Wildlife Safari" and travel_type "Luxury Expedition"
    payload = {
        "name": "Kabini River Forest",
        "slug": f"kabini-{uuid4().hex[:6]}",
        "country": "India",
        "state_or_city": "Karnataka",
        "category": "Wildlife Safari",
        "travel_type": "Luxury Expedition",
        "description": "Premium wildlife safari along the Kabini riverbank.",
    }
    resp = client.post("/api/v1/admin/destinations", json=payload, headers=headers)
    assert resp.status_code == 201
    created = resp.json()
    dest_id = created["id"]
    assert created["category"] == "Wildlife Safari"
    assert created["travel_type"] == "Luxury Expedition"

    # Verify category is now dynamically returned in options
    opt_resp = client.get("/api/v1/admin/options/categories", headers=headers)
    assert "Wildlife Safari" in opt_resp.json()["destination_categories"]

    # Now edit destination and set category to None / "None" string
    # Our schema validator must convert "None" or "not applicable" to SQL NULL
    update_payload = {
        "name": "Kabini River Forest Updated",
        "category": "None",
        "travel_type": "not applicable",
    }
    update_resp = client.put(
        f"/api/v1/admin/destinations/{dest_id}",
        json=update_payload,
        headers=headers,
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    # Stored as None/null, NOT literal string "None"
    assert updated["category"] is None
    assert updated["travel_type"] is None

    # Check direct in DB
    db_dest = db_session.execute(
        select(Destination).where(Destination.id == UUID(dest_id))
    ).scalar_one()
    assert db_dest.category is None
    assert db_dest.travel_type is None


# ==============================================================================
# Package Custom Category and Relationship Validation
# ==============================================================================


def test_package_custom_options_and_relationship_validation(client, db_session) -> None:
    admin = create_user_with_role(
        db_session, "admin_pkg_custom@example.com", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    # First, create a valid destination
    dest = Destination(
        name="Munnar Tea Hills",
        slug=f"munnar-{uuid4().hex[:6]}",
        country="India",
        state_or_city="Kerala",
        category="Hill Station",
    )
    db_session.add(dest)
    db_session.commit()

    # 1. Reject invalid destination relationship ID
    invalid_dest_id = str(uuid4())
    bad_pkg_payload = {
        "name": "Munnar Misty Trails",
        "slug": f"munnar-trails-{uuid4().hex[:6]}",
        "destination_id": invalid_dest_id,
        "base_price": 12500,
        "duration_days": 3,
        "duration_nights": 2,
    }
    resp_bad = client.post(
        "/api/v1/admin/packages", json=bad_pkg_payload, headers=headers
    )
    assert resp_bad.status_code == 404 or resp_bad.status_code == 400

    # 2. Create package with custom category, custom travel type, and custom difficulty
    pkg_payload = {
        "name": "Munnar Misty Trails",
        "slug": f"munnar-trails-{uuid4().hex[:6]}",
        "destination_id": str(dest.id),
        "category": "Highland Tea Expedition",
        "travel_type": "Curated 4x4 Trail",
        "difficulty_level": "Challenging / Active",
        "base_price": 12500,
        "duration_days": 3,
        "duration_nights": 2,
    }
    resp_ok = client.post("/api/v1/admin/packages", json=pkg_payload, headers=headers)
    assert resp_ok.status_code == 201
    created_pkg = resp_ok.json()
    assert created_pkg["category"] == "Highland Tea Expedition"
    assert created_pkg["travel_type"] == "Curated 4x4 Trail"
    assert created_pkg["difficulty_level"] == "Challenging / Active"

    # 3. Update package: clearing optional category and difficulty using "None" and empty string
    pkg_id = created_pkg["id"]
    patch_payload = {
        "category": "",
        "difficulty_level": "none",
    }
    resp_patch = client.put(
        f"/api/v1/admin/packages/{pkg_id}", json=patch_payload, headers=headers
    )
    assert resp_patch.status_code == 200
    patched = resp_patch.json()
    assert patched["category"] is None
    assert patched["difficulty_level"] is None

    # Check direct in DB
    db_pkg = db_session.execute(
        select(Package).where(Package.id == UUID(pkg_id))
    ).scalar_one()
    assert db_pkg.category is None
    assert db_pkg.difficulty_level is None


# ==============================================================================
# Activity Custom Category & Relationship Validation
# ==============================================================================


def test_activity_custom_category_and_relationship(client, db_session) -> None:
    admin = create_user_with_role(
        db_session, "admin_act_custom@example.com", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    dest = Destination(
        name="Andaman Islands",
        slug=f"andaman-{uuid4().hex[:6]}",
        country="India",
        category="Beach & Coastal",
    )
    db_session.add(dest)
    db_session.commit()

    # 1. Reject invalid destination relationship ID
    resp_invalid = client.post(
        "/api/v1/admin/activities",
        json={
            "destination_id": str(uuid4()),
            "name": "Coral Reef Scuba Dive",
        },
        headers=headers,
    )
    assert resp_invalid.status_code in (400, 404)

    # 2. Create activity with custom category
    resp_act = client.post(
        "/api/v1/admin/activities",
        json={
            "destination_id": str(dest.id),
            "name": "Coral Reef Scuba Dive",
            "category": "Deep Sea Marine Exploration",
            "price": 4500,
        },
        headers=headers,
    )
    assert resp_act.status_code == 201
    act_data = resp_act.json()
    assert act_data["category"] == "Deep Sea Marine Exploration"

    # 3. Check that options endpoint includes this activity category
    opt_resp = client.get("/api/v1/admin/options/categories", headers=headers)
    assert "Deep Sea Marine Exploration" in opt_resp.json()["activity_categories"]

    # 4. Clear category to None
    act_id = act_data["id"]
    resp_act_update = client.put(
        f"/api/v1/admin/activities/{act_id}",
        json={"category": "null"},
        headers=headers,
    )
    assert resp_act_update.status_code == 200
    assert resp_act_update.json()["category"] is None
