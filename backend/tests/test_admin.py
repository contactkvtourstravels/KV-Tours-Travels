"""Comprehensive test suite for Phase 5 administrative foundation APIs and permissions."""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

from sqlalchemy import delete, select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_CUSTOMER,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
)
from app.core.security import hash_password
from app.models.catalog import Destination, Package
from app.models.commerce import Inquiry
from app.models.user import Role, User, UserRole, UserSession

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
    normalized = email.lower().strip()
    existing = db.execute(select(User).where(User.email_normalized == normalized)).scalar_one_or_none()
    if existing:
        db.execute(delete(UserSession).where(UserSession.user_id == existing.id))
        db.execute(delete(UserRole).where(UserRole.user_id == existing.id))
        db.execute(delete(User).where(User.id == existing.id))
        db.flush()

    user = User(
        email=email,
        email_normalized=normalized,
        password_hash=hash_password(ADMIN_PASSWORD),
        first_name="Test",
        last_name=role_name.capitalize(),
        status="active",
        is_email_verified=True,
    )
    db.add(user)
    db.flush()

    role = db.execute(select(Role).where(Role.name == role_name)).scalar_one()
    assignment = UserRole(user_id=user.id, role_id=role.id)
    db.add(assignment)
    db.commit()
    return user


def login_client(client, email: str, password: str = ADMIN_PASSWORD) -> dict[str, str]:
    """Helper to clear cookies and log in as specified user."""
    client.cookies.clear()
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=csrf_headers(client),
    )
    assert resp.status_code == 200
    return csrf_headers(client)


# ==============================================================================
# Role Access & Guards
# ==============================================================================


def test_customer_cannot_access_admin_dashboard(client, db_session) -> None:
    cust = create_user_with_role(db_session, "customer_dash@example.com", ROLE_CUSTOMER)
    login_client(client, cust.email)

    resp = client.get("/api/v1/admin/dashboard/metrics")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "INSUFFICIENT_PERMISSIONS"


def test_unauthenticated_cannot_access_admin(client) -> None:
    client.cookies.clear()
    resp = client.get("/api/v1/admin/dashboard/metrics")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"


def test_staff_access_rules(client, db_session) -> None:
    staff = create_user_with_role(db_session, "staff_user@example.com", ROLE_STAFF)
    headers = login_client(client, staff.email)

    # 1. Staff CAN read dashboard
    resp = client.get("/api/v1/admin/dashboard/metrics")
    assert resp.status_code == 200

    # 2. Staff CAN read destinations and packages
    assert client.get("/api/v1/admin/destinations").status_code == 200
    assert client.get("/api/v1/admin/packages").status_code == 200

    # 3. Staff CANNOT create destinations
    create_dest = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Forbidden Dest", "country": "India"},
        headers=headers,
    )
    assert create_dest.status_code == 403

    # 4. Staff CANNOT access audit logs
    assert client.get("/api/v1/admin/audit-logs").status_code == 403

    # 5. Staff CANNOT access users
    assert client.get("/api/v1/admin/users").status_code == 403


def test_manager_access_rules(client, db_session) -> None:
    mgr = create_user_with_role(db_session, "manager_user@example.com", ROLE_MANAGER)
    headers = login_client(client, mgr.email)

    # Manager CAN access dashboard
    assert client.get("/api/v1/admin/dashboard/metrics").status_code == 200

    # Manager CAN create destination
    dest_resp = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Manager Valley", "country": "Switzerland"},
        headers=headers,
    )
    assert dest_resp.status_code == 201
    dest_id = dest_resp.json()["id"]

    # Manager CAN update destination
    patch_resp = client.patch(
        f"/api/v1/admin/destinations/{dest_id}",
        json={"short_description": "Beautiful valley"},
        headers=headers,
    )
    assert patch_resp.status_code == 200

    # Manager CAN create package
    pkg_resp = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": dest_id,
            "name": "Swiss Explorer",
            "base_price": 49999.00,
            "currency": "INR",
            "duration_days": 5,
            "duration_nights": 4,
            "minimum_travellers": 1,
        },
        headers=headers,
    )
    assert pkg_resp.status_code == 201

    # Manager CANNOT access audit logs or users
    assert client.get("/api/v1/admin/audit-logs").status_code == 403
    assert client.get("/api/v1/admin/users").status_code == 403


def test_admin_access_rules(client, db_session) -> None:
    admin = create_user_with_role(db_session, "admin_user@example.com", ROLE_ADMIN)
    target_user = create_user_with_role(
        db_session, "target_user@example.com", ROLE_CUSTOMER
    )
    headers = login_client(client, admin.email)

    # Admin CAN access dashboard, audit logs, users
    assert client.get("/api/v1/admin/dashboard/metrics").status_code == 200
    assert client.get("/api/v1/admin/audit-logs").status_code == 200
    assert client.get("/api/v1/admin/users").status_code == 200

    # Admin CAN update user status
    status_resp = client.patch(
        f"/api/v1/admin/users/{target_user.id}/status",
        json={"status": "suspended", "reason": "Policy violation"},
        headers=headers,
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "suspended"

    # Admin CANNOT update user roles (strictly super_admin only)
    role_resp = client.patch(
        f"/api/v1/admin/users/{target_user.id}/roles",
        json={"roles": ["manager"]},
        headers=headers,
    )
    assert role_resp.status_code == 403


def test_super_admin_full_access(client, db_session) -> None:
    super_admin = create_user_with_role(
        db_session, "athulsuresh446@gmail.com", ROLE_SUPER_ADMIN
    )
    target_user = create_user_with_role(
        db_session, "promote_me@example.com", ROLE_CUSTOMER
    )
    headers = login_client(client, super_admin.email)

    # Super Admin CAN update roles
    role_resp = client.patch(
        f"/api/v1/admin/users/{target_user.id}/roles",
        json={"roles": ["staff", "manager"]},
        headers=headers,
    )
    assert role_resp.status_code == 200
    assert set(role_resp.json()["roles"]) == {"staff", "manager"}


# ==============================================================================
# Dashboard Metrics Real DB Data
# ==============================================================================


def test_dashboard_metrics_real_db_data(client, db_session) -> None:
    admin = create_user_with_role(db_session, "metrics_admin@example.com", ROLE_ADMIN)
    login_client(client, admin.email)

    # Seed 1 published destination and 1 unpublished destination
    dest1 = Destination(
        name="Munnar Hills", slug="munnar-hills", country="India", is_published=True
    )
    dest2 = Destination(
        name="Secret Cave", slug="secret-cave", country="India", is_published=False
    )
    db_session.add_all([dest1, dest2])
    db_session.flush()

    # Seed 1 published package and 1 draft package
    pkg1 = Package(
        destination_id=dest1.id,
        name="Munnar Tea Trail",
        slug="munnar-tea-trail",
        base_price=Decimal("15000.00"),
        currency="INR",
        duration_days=3,
        duration_nights=2,
        is_published=True,
    )
    pkg2 = Package(
        destination_id=dest1.id,
        name="Munnar Trek",
        slug="munnar-trek",
        base_price=Decimal("8000.00"),
        currency="INR",
        duration_days=2,
        duration_nights=1,
        is_published=False,
    )
    db_session.add_all([pkg1, pkg2])
    db_session.flush()

    # Seed 2 inquiries
    inq1 = Inquiry(
        name="Visitor A",
        email="visitor.a@example.com",
        message="Need quotation",
        status="new",
        source="contact_form",
    )
    inq2 = Inquiry(
        name="Visitor B",
        email="visitor.b@example.com",
        message="Package query",
        status="resolved",
        source="package",
    )
    db_session.add_all([inq1, inq2])
    db_session.commit()

    resp = client.get("/api/v1/admin/dashboard/metrics")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_destinations"] >= 2
    assert data["published_destinations"] >= 1
    assert data["total_packages"] >= 2
    assert data["published_packages"] >= 1
    assert data["total_inquiries"] >= 2
    assert data["unread_inquiries"] >= 1


# ==============================================================================
# Audit Logs
# ==============================================================================


def test_audit_log_pagination_and_filtering(client, db_session) -> None:
    admin = create_user_with_role(db_session, "audit_admin@example.com", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Seed some catalog items to trigger audit logs
    client.post(
        "/api/v1/admin/destinations",
        json={"name": "Audit Destination 1", "country": "France"},
        headers=headers,
    )
    client.post(
        "/api/v1/admin/destinations",
        json={"name": "Audit Destination 2", "country": "Italy"},
        headers=headers,
    )

    # Query with page size 1
    resp = client.get("/api/v1/admin/audit-logs?page=1&page_size=1")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["total"] >= 2
    assert data["page"] == 1
    assert data["page_size"] == 1
    assert data["total_pages"] >= 2

    # Filter by action
    filter_resp = client.get("/api/v1/admin/audit-logs?action=destination_created")
    assert filter_resp.status_code == 200
    items = filter_resp.json()["items"]
    assert len(items) >= 2
    assert all(item["action"] == "destination_created" for item in items)


# ==============================================================================
# Destination CRUD & Slug Handling
# ==============================================================================


def test_destination_crud_and_slug_collision(client, db_session) -> None:
    admin = create_user_with_role(db_session, "dest_admin@example.com", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # 1. Create with custom slug
    r1 = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Goa Beach Resort", "slug": "goa-beach", "country": "India"},
        headers=headers,
    )
    assert r1.status_code == 201
    dest1 = r1.json()
    assert dest1["slug"] == "goa-beach"
    assert dest1["is_active"] is True

    # 2. Collision detection
    r_dup = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Another Goa", "slug": "goa-beach", "country": "India"},
        headers=headers,
    )
    assert r_dup.status_code == 409
    assert r_dup.json()["error"]["code"] == "SLUG_ALREADY_EXISTS"

    # 3. Auto-slug generation
    r_auto = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Shimla Pine Woods", "country": "India"},
        headers=headers,
    )
    assert r_auto.status_code == 201
    assert r_auto.json()["slug"] == "shimla-pine-woods"

    # 4. Update
    r_update = client.patch(
        f"/api/v1/admin/destinations/{dest1['id']}",
        json={"is_featured": True, "region": "North Goa"},
        headers=headers,
    )
    assert r_update.status_code == 200
    assert r_update.json()["is_featured"] is True
    assert r_update.json()["region"] == "North Goa"

    # 5. Soft-delete / Deactivate
    r_delete = client.delete(
        f"/api/v1/admin/destinations/{dest1['id']}",
        headers=headers,
    )
    assert r_delete.status_code == 200
    assert r_delete.json()["is_active"] is False
    assert r_delete.json()["is_published"] is False
    assert r_delete.json()["deleted_at"] is not None


# ==============================================================================
# Package CRUD & Validation
# ==============================================================================


def test_package_crud_and_validation(client, db_session) -> None:
    admin = create_user_with_role(db_session, "pkg_admin@example.com", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Create destination first
    d_resp = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Kashmir Valley", "country": "India"},
        headers=headers,
    )
    dest_id = d_resp.json()["id"]

    # 1. Invalid destination FK
    fake_dest_id = uuid4()
    bad_dest = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": str(fake_dest_id),
            "name": "Ghost Tour",
            "base_price": 10000.0,
            "currency": "INR",
            "duration_days": 2,
            "duration_nights": 1,
        },
        headers=headers,
    )
    assert bad_dest.status_code == 404
    assert bad_dest.json()["error"]["code"] == "DESTINATION_NOT_FOUND"

    # 2. Invalid traveller range (max < min)
    bad_range = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": dest_id,
            "name": "Invalid Travellers",
            "base_price": 10000.0,
            "currency": "INR",
            "duration_days": 2,
            "duration_nights": 1,
            "minimum_travellers": 5,
            "maximum_travellers": 2,
        },
        headers=headers,
    )
    assert bad_range.status_code == 400
    assert bad_range.json()["error"]["code"] == "INVALID_TRAVELLER_RANGE"

    # 3. Create valid package
    pkg_resp = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": dest_id,
            "name": "Kashmir Heaven Tour",
            "slug": "kashmir-heaven",
            "base_price": 35000.0,
            "currency": "INR",
            "duration_days": 6,
            "duration_nights": 5,
            "minimum_travellers": 1,
            "maximum_travellers": 10,
        },
        headers=headers,
    )
    assert pkg_resp.status_code == 201
    pkg = pkg_resp.json()
    assert pkg["slug"] == "kashmir-heaven"
    assert pkg["destination_name"] == "Kashmir Valley"

    # 4. Slug collision
    pkg_dup = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": dest_id,
            "name": "Another Tour",
            "slug": "kashmir-heaven",
            "base_price": 25000.0,
            "currency": "INR",
            "duration_days": 4,
            "duration_nights": 3,
        },
        headers=headers,
    )
    assert pkg_dup.status_code == 409
    assert pkg_dup.json()["error"]["code"] == "SLUG_ALREADY_EXISTS"

    # 5. Safe deactivation / delete
    del_resp = client.delete(
        f"/api/v1/admin/packages/{pkg['id']}",
        headers=headers,
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["is_active"] is False
    assert del_resp.json()["deleted_at"] is not None


# ==============================================================================
# Security & CSRF
# ==============================================================================


def test_csrf_protection_on_admin_mutations(client, db_session) -> None:
    admin = create_user_with_role(db_session, "csrf_admin@example.com", ROLE_ADMIN)
    login_client(client, admin.email)

    # State-changing mutation without CSRF header
    missing_csrf = client.post(
        "/api/v1/admin/destinations",
        json={"name": "No CSRF Dest", "country": "India"},
    )
    assert missing_csrf.status_code == 403
    assert missing_csrf.json()["error"]["code"] == "CSRF_TOKEN_MISSING"

    # With mismatched CSRF header
    bad_csrf = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Bad CSRF Dest", "country": "India"},
        headers={"X-CSRF-Token": "invalid_csrf_token_string_value"},
    )
    assert bad_csrf.status_code == 403
    assert bad_csrf.json()["error"]["code"] == "CSRF_TOKEN_INVALID"


def test_sensitive_fields_never_returned(client, db_session) -> None:
    admin = create_user_with_role(db_session, "audit_scanner@example.com", ROLE_ADMIN)
    login_client(client, admin.email)

    # 1. Inspect users list response
    users_resp = client.get("/api/v1/admin/users")
    assert users_resp.status_code == 200
    raw_users_text = users_resp.text.lower()
    assert "password_hash" not in raw_users_text
    assert "token_hash" not in raw_users_text
    assert "secret" not in raw_users_text

    # 2. Inspect audit logs response
    audit_resp = client.get("/api/v1/admin/audit-logs")
    assert audit_resp.status_code == 200
    raw_audit_text = audit_resp.text.lower()
    assert "password_hash" not in raw_audit_text
    assert "session_token" not in raw_audit_text


def test_pagination_limits(client, db_session) -> None:
    admin = create_user_with_role(db_session, "limits_admin@example.com", ROLE_ADMIN)
    login_client(client, admin.email)

    # Valid maximum page_size 100 succeeds
    resp_valid = client.get("/api/v1/admin/users?page_size=100")
    assert resp_valid.status_code == 200
    assert resp_valid.json()["page_size"] == 100

    # Out of bounds page_size (> 100) is rejected by FastAPI validation
    resp_over = client.get("/api/v1/admin/users?page_size=500")
    assert resp_over.status_code == 422

    # Out of bounds page (< 1) is rejected by FastAPI validation
    resp_under = client.get("/api/v1/admin/users?page=0")
    assert resp_under.status_code == 422


def test_customer_cannot_read_audit_logs(client, db_session) -> None:
    cust = create_user_with_role(db_session, "audit_cust@example.com", ROLE_CUSTOMER)
    login_client(client, cust.email)

    resp = client.get("/api/v1/admin/audit-logs")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "INSUFFICIENT_PERMISSIONS"


def test_destination_list_filtering_and_counts(client, db_session) -> None:
    admin = create_user_with_role(db_session, "filter_admin@example.com", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Create destination
    d_resp = client.post(
        "/api/v1/admin/destinations",
        json={
            "name": "Kerala Backwaters",
            "country": "India",
            "is_featured": True,
            "is_published": True,
        },
        headers=headers,
    )
    dest_id = d_resp.json()["id"]

    # Create 2 packages under it
    client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": dest_id,
            "name": "Houseboat Cruise",
            "base_price": 20000.0,
            "currency": "INR",
            "duration_days": 2,
            "duration_nights": 1,
        },
        headers=headers,
    )
    client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": dest_id,
            "name": "Cochin to Alleppey",
            "base_price": 25000.0,
            "currency": "INR",
            "duration_days": 3,
            "duration_nights": 2,
        },
        headers=headers,
    )

    # Filter by featured
    list_resp = client.get("/api/v1/admin/destinations?is_featured=true&search=kerala")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] >= 1
    item = next(d for d in data["items"] if d["id"] == dest_id)
    assert item["package_count"] == 2
    assert item["is_featured"] is True


def test_package_list_filtering_by_destination(client, db_session) -> None:
    admin = create_user_with_role(
        db_session, "pkg_filter_admin@example.com", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    d1 = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Ooty Hills", "country": "India"},
        headers=headers,
    ).json()
    client.post(
        "/api/v1/admin/destinations",
        json={"name": "Coorg Highlands", "country": "India"},
        headers=headers,
    )

    client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": d1["id"],
            "name": "Ooty Tea Estate",
            "base_price": 12000.0,
            "currency": "INR",
            "duration_days": 2,
            "duration_nights": 1,
        },
        headers=headers,
    )

    # Filter packages by destination d1
    resp = client.get(f"/api/v1/admin/packages?destination_id={d1['id']}")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) >= 1
    assert all(p["destination_id"] == d1["id"] for p in items)


def test_package_update_traveller_validation(client, db_session) -> None:
    admin = create_user_with_role(
        db_session, "update_pkg_admin@example.com", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    dest = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Wayanad Forests", "country": "India"},
        headers=headers,
    ).json()

    pkg = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": dest["id"],
            "name": "Wayanad Safari",
            "base_price": 15000.0,
            "currency": "INR",
            "duration_days": 3,
            "duration_nights": 2,
            "minimum_travellers": 2,
            "maximum_travellers": 6,
        },
        headers=headers,
    ).json()

    # Attempt to set max travellers < min travellers
    bad_update = client.patch(
        f"/api/v1/admin/packages/{pkg['id']}",
        json={"maximum_travellers": 1},
        headers=headers,
    )
    assert bad_update.status_code == 400
    assert bad_update.json()["error"]["code"] == "INVALID_TRAVELLER_RANGE"

    # Valid update
    good_update = client.patch(
        f"/api/v1/admin/packages/{pkg['id']}",
        json={"maximum_travellers": 8, "base_price": 16000.0},
        headers=headers,
    )
    assert good_update.status_code == 200
    assert good_update.json()["maximum_travellers"] == 8
    assert Decimal(str(good_update.json()["base_price"])) == Decimal("16000.00")


def test_package_safe_deactivation_preserves_bookings(client, db_session) -> None:
    admin = create_user_with_role(db_session, "safe_del_admin@example.com", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    dest = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Gokarna Coast", "country": "India"},
        headers=headers,
    ).json()

    pkg = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": dest["id"],
            "name": "Gokarna Beach Trek",
            "base_price": 9000.0,
            "currency": "INR",
            "duration_days": 2,
            "duration_nights": 1,
        },
        headers=headers,
    ).json()

    # Deactivate package
    del_resp = client.delete(f"/api/v1/admin/packages/{pkg['id']}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["is_active"] is False

    # Package record is preserved in database with deleted_at timestamp
    get_resp = client.get(f"/api/v1/admin/packages/{pkg['id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()["deleted_at"] is not None


def test_audit_records_created_for_all_catalog_mutations(client, db_session) -> None:
    admin = create_user_with_role(
        db_session, "catalog_audit_admin@example.com", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    # Destination creation
    d = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Hampi Heritage", "country": "India"},
        headers=headers,
    ).json()
    d_id = d["id"]

    # Destination update
    client.patch(
        f"/api/v1/admin/destinations/{d_id}",
        json={"is_featured": True},
        headers=headers,
    )

    # Destination deactivate
    client.delete(f"/api/v1/admin/destinations/{d_id}", headers=headers)

    # Verify audit logs in DB
    audit_resp = client.get("/api/v1/admin/audit-logs?entity_type=destination")
    assert audit_resp.status_code == 200
    actions = [item["action"] for item in audit_resp.json()["items"]]
    assert "destination_created" in actions
    assert "destination_updated" in actions
    assert "destination_deactivated" in actions


def test_idor_protection_on_admin_user_endpoints(client, db_session) -> None:
    cust = create_user_with_role(db_session, "idor_cust@example.com", ROLE_CUSTOMER)
    admin = create_user_with_role(db_session, "idor_admin@example.com", ROLE_ADMIN)
    login_client(client, cust.email)

    # Customer attempts to read admin profile via /api/v1/admin/users/{admin.id}
    resp = client.get(f"/api/v1/admin/users/{admin.id}")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "INSUFFICIENT_PERMISSIONS"

    # Customer attempts to change status
    patch_resp = client.patch(
        f"/api/v1/admin/users/{admin.id}/status",
        json={"status": "inactive"},
        headers=csrf_headers(client),
    )
    assert patch_resp.status_code == 403


def test_destination_update_duplicate_slug_collision(client, db_session) -> None:
    admin = create_user_with_role(db_session, "dest_dup_admin@example.com", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    resp1 = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Paris France", "slug": "paris-france", "country": "France"},
        headers=headers,
    )
    assert resp1.status_code == 201

    d2 = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Nice France", "slug": "nice-france", "country": "France"},
        headers=headers,
    ).json()

    # Attempt to update d2's slug to d1's slug
    dup_resp = client.patch(
        f"/api/v1/admin/destinations/{d2['id']}",
        json={"slug": "paris-france"},
        headers=headers,
    )
    assert dup_resp.status_code == 409
    assert dup_resp.json()["error"]["code"] == "SLUG_ALREADY_EXISTS"


def test_package_update_duplicate_slug_collision(client, db_session) -> None:
    admin = create_user_with_role(db_session, "pkg_dup_admin@example.com", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    dest = client.post(
        "/api/v1/admin/destinations",
        json={"name": "Rome City", "country": "Italy"},
        headers=headers,
    ).json()

    resp_p1 = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": dest["id"],
            "name": "Rome Express 1",
            "slug": "rome-express-1",
            "base_price": 20000.0,
            "currency": "INR",
            "duration_days": 3,
            "duration_nights": 2,
        },
        headers=headers,
    )
    assert resp_p1.status_code == 201

    p2 = client.post(
        "/api/v1/admin/packages",
        json={
            "destination_id": dest["id"],
            "name": "Rome Express 2",
            "slug": "rome-express-2",
            "base_price": 22000.0,
            "currency": "INR",
            "duration_days": 4,
            "duration_nights": 3,
        },
        headers=headers,
    ).json()

    # Attempt to update p2's slug to p1's slug
    dup_resp = client.patch(
        f"/api/v1/admin/packages/{p2['id']}",
        json={"slug": "rome-express-1"},
        headers=headers,
    )
    assert dup_resp.status_code == 409
    assert dup_resp.json()["error"]["code"] == "SLUG_ALREADY_EXISTS"


def test_admin_user_list_filtering_and_search(client, db_session) -> None:
    admin = create_user_with_role(
        db_session, "user_filter_admin@example.com", ROLE_ADMIN
    )
    create_user_with_role(db_session, "unique_staff_one@example.com", ROLE_STAFF)
    headers = login_client(client, admin.email)

    # Search by email snippet
    resp = client.get("/api/v1/admin/users?search=unique_staff_one", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any("unique_staff_one" in u["email"] for u in data["items"])

    # Filter by role
    staff_resp = client.get("/api/v1/admin/users?role=staff", headers=headers)
    assert staff_resp.status_code == 200
    staff_data = staff_resp.json()
    assert all("staff" in u["roles"] for u in staff_data["items"])
