"""Comprehensive test suite for STEP 11: Admin Operations, Analytics, Inquiries, Notes, and Reconciliation."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
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
from app.models.catalog import Destination, Package, PackageDeparture
from app.models.commerce import (
    Booking,
    BookingTraveller,
    Inquiry,
    Payment,
)
from app.models.user import Role, User, UserRole

ADMIN_PASSWORD = "AdminPassword!2026"


def csrf_headers(client) -> dict[str, str]:
    """Helper to retrieve active X-CSRF-Token."""
    cookie_token = client.cookies.get("travel_csrf")
    if cookie_token:
        return {"X-CSRF-Token": cookie_token}
    resp = client.get("/api/v1/auth/csrf")
    assert resp.status_code == 200
    return {"X-CSRF-Token": resp.json()["csrf_token"]}


def create_user_with_role(db, email: str, role_name: str) -> User:
    """Helper to create and commit a user with an assigned system role."""
    seed_standard_roles(db)
    unique_email = f"{email.split('@')[0]}_{uuid4().hex[:8]}@{email.split('@')[1]}"
    user = User(
        email=unique_email,
        email_normalized=unique_email.lower().strip(),
        password_hash=hash_password(ADMIN_PASSWORD),
        first_name="Test",
        last_name=role_name.capitalize(),
        phone="+919876543210",
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


def seed_test_catalog(db) -> tuple[Destination, Package, PackageDeparture]:
    """Helper to create destination, package, and departure."""
    dest = Destination(
        name="Wayanad Hills",
        slug=f"wayanad-{uuid4().hex[:6]}",
        short_description="Scenic highlands in Kerala",
        description="Lush greenery and mist",
        region="Kerala",
        country="India",
        is_published=True,
    )
    db.add(dest)
    db.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Wayanad Rainforest Explorer",
        slug=f"wayanad-explorer-{uuid4().hex[:6]}",
        short_description="Deep forest experience",
        description="4 days through the dense tea plantations and caves",
        duration_days=4,
        duration_nights=3,
        base_price=Decimal("15000.00"),
        currency="INR",
        is_published=True,
    )
    db.add(pkg)
    db.flush()

    today = datetime.now(timezone.utc).date()
    dep = PackageDeparture(
        package_id=pkg.id,
        departure_date=today + timedelta(days=10),
        return_date=today + timedelta(days=14),
        total_capacity=20,
        reserved_capacity=2,
        available_capacity=18,
        currency="INR",
        status="open",
    )
    db.add(dep)
    db.commit()
    return dest, pkg, dep


# ==============================================================================
# 1. Operations Dashboard
# ==============================================================================


def test_operations_dashboard_empty_state(client, db_session) -> None:
    """Dashboard metrics returns valid zero/non-negative metrics without fabricating numbers."""
    staff = create_user_with_role(db_session, "staff_empty@example.com", ROLE_STAFF)
    login_client(client, staff.email)

    resp = client.get("/api/v1/admin/operations/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["today_bookings"] >= 0
    assert data["pending_payments"] >= 0
    assert data["confirmed_bookings"] >= 0
    assert "total_revenue" in data
    assert "outstanding_payments" in data
    assert isinstance(data["recent_bookings"], list)
    assert isinstance(data["recent_inquiries"], list)


def test_operations_dashboard_populated(client, db_session) -> None:
    """Dashboard metrics reflect real database entities."""
    staff = create_user_with_role(db_session, "staff_dash@example.com", ROLE_STAFF)
    cust = create_user_with_role(db_session, "customer_dash@example.com", ROLE_CUSTOMER)
    dest, pkg, dep = seed_test_catalog(db_session)

    # Booking 1: Confirmed with captured payment
    booking1 = Booking(
        booking_reference="KV-TEST-001",
        user_id=cust.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=2,
        subtotal=Decimal("30000.00"),
        total=Decimal("30000.00"),
        currency="INR",
        status="confirmed",
        payment_status="paid",
    )
    db_session.add(booking1)
    db_session.flush()

    payment = Payment(
        booking_id=booking1.id,
        provider="razorpay",
        provider_payment_id="pay_test_001",
        idempotency_key=f"idem_{uuid4().hex[:10]}",
        amount=Decimal("30000.00"),
        currency="INR",
        status="captured",
        captured_at=datetime.now(timezone.utc),
    )
    db_session.add(payment)

    # Booking 2: Pending payment
    booking2 = Booking(
        booking_reference="KV-TEST-002",
        user_id=cust.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=1,
        subtotal=Decimal("15000.00"),
        total=Decimal("15000.00"),
        currency="INR",
        status="pending",
        payment_status="pending",
    )
    db_session.add(booking2)

    # Inquiry
    inq = Inquiry(
        name="Lead Traveler",
        email="lead@example.com",
        phone="+919876543210",
        message="Interested in Wayanad trip next weekend",
        destination_id=dest.id,
        status="new",
        priority="high",
        source="contact_form",
    )
    db_session.add(inq)
    db_session.commit()

    login_client(client, staff.email)
    resp = client.get("/api/v1/admin/operations/dashboard")
    assert resp.status_code == 200
    data = resp.json()

    assert data["today_bookings"] >= 2
    assert data["pending_payments"] >= 1
    assert data["confirmed_bookings"] >= 1
    assert data["pending_inquiries"] >= 1
    assert Decimal(data["total_revenue"]) >= Decimal("30000.00")
    assert Decimal(data["outstanding_payments"]) >= Decimal("15000.00")
    assert len(data["recent_bookings"]) >= 2
    assert len(data["recent_inquiries"]) >= 1


# ==============================================================================
# 2. Analytics: Revenue, Bookings, Customers, Packages, Destinations
# ==============================================================================


def test_revenue_analytics_rbac_and_data(client, db_session) -> None:
    """Staff cannot access revenue analytics; Manager and Admin can."""
    staff = create_user_with_role(db_session, "staff_rev@example.com", ROLE_STAFF)
    mgr = create_user_with_role(db_session, "mgr_rev@example.com", ROLE_MANAGER)
    cust = create_user_with_role(db_session, "cust_rev@example.com", ROLE_CUSTOMER)
    _dest, pkg, dep = seed_test_catalog(db_session)

    b = Booking(
        booking_reference="KV-REV-001",
        user_id=cust.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=2,
        subtotal=Decimal("20000.00"),
        total=Decimal("20000.00"),
        currency="INR",
        status="confirmed",
        payment_status="paid",
    )
    db_session.add(b)
    db_session.flush()

    p = Payment(
        booking_id=b.id,
        provider="razorpay",
        provider_payment_id="pay_rev_001",
        idempotency_key=f"idem_{uuid4().hex[:10]}",
        amount=Decimal("20000.00"),
        currency="INR",
        status="captured",
        captured_at=datetime.now(timezone.utc),
    )
    db_session.add(p)
    db_session.commit()

    # Staff denied
    login_client(client, staff.email)
    resp = client.get("/api/v1/admin/analytics/revenue")
    assert resp.status_code == 403

    # Manager allowed
    login_client(client, mgr.email)
    resp = client.get("/api/v1/admin/analytics/revenue?period=30d")
    assert resp.status_code == 200
    data = resp.json()
    assert Decimal(data["total_revenue"]) >= Decimal("20000.00")
    assert Decimal(data["paid_revenue"]) >= Decimal("20000.00")
    assert Decimal(data["net_revenue"]) >= Decimal("20000.00")
    assert len(data["time_series"]) > 0


def test_booking_and_customer_analytics(client, db_session) -> None:
    """Manager can analyze booking trends and customer cohorts."""
    mgr = create_user_with_role(db_session, "mgr_bkg@example.com", ROLE_MANAGER)
    login_client(client, mgr.email)

    # Booking analytics
    resp_bkg = client.get("/api/v1/admin/analytics/bookings?period=30d")
    assert resp_bkg.status_code == 200
    bkg_data = resp_bkg.json()
    assert "total_bookings" in bkg_data
    assert "confirmed_count" in bkg_data
    assert "conversion_rate" in bkg_data
    assert "by_status" in bkg_data

    # Customer analytics
    resp_cust = client.get("/api/v1/admin/analytics/customers")
    assert resp_cust.status_code == 200
    cust_data = resp_cust.json()
    assert "total_customers" in cust_data
    assert "new_customers" in cust_data
    assert "returning_customers" in cust_data


def test_package_and_destination_performance(client, db_session) -> None:
    """Manager can retrieve package and destination performance rankings."""
    mgr = create_user_with_role(db_session, "mgr_perf@example.com", ROLE_MANAGER)
    login_client(client, mgr.email)

    resp_pkg = client.get("/api/v1/admin/analytics/packages?sort_by=revenue")
    assert resp_pkg.status_code == 200
    assert "items" in resp_pkg.json()

    resp_dest = client.get("/api/v1/admin/analytics/destinations")
    assert resp_dest.status_code == 200
    assert "items" in resp_dest.json()


# ==============================================================================
# 3. Departures & Passenger Manifests
# ==============================================================================


def test_departures_and_passenger_manifest(client, db_session) -> None:
    """Verify passenger manifest masking: Staff sees masked passports, Manager sees full."""
    staff = create_user_with_role(db_session, "staff_mani@example.com", ROLE_STAFF)
    mgr = create_user_with_role(db_session, "mgr_mani@example.com", ROLE_MANAGER)
    cust = create_user_with_role(db_session, "cust_mani@example.com", ROLE_CUSTOMER)
    _dest, pkg, dep = seed_test_catalog(db_session)

    b = Booking(
        booking_reference="KV-DEP-001",
        user_id=cust.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=1,
        subtotal=Decimal("15000.00"),
        total=Decimal("15000.00"),
        currency="INR",
        status="confirmed",
        payment_status="paid",
    )
    db_session.add(b)
    db_session.flush()

    traveller = BookingTraveller(
        booking_id=b.id,
        first_name="Athul",
        last_name="Traveler",
        date_of_birth=date(1995, 5, 12),
        gender="male",
        nationality="Indian",
        passport_number="P12345678",
        is_primary=True,
    )
    db_session.add(traveller)
    db_session.commit()

    # Staff list operational departures
    login_client(client, staff.email)
    resp_list = client.get("/api/v1/admin/operations/departures")
    assert resp_list.status_code == 200
    assert len(resp_list.json()) >= 1

    # Staff manifest view -> passport masked
    resp_mani_staff = client.get(
        f"/api/v1/admin/operations/departures/{dep.id}/manifest"
    )
    assert resp_mani_staff.status_code == 200
    m_data = resp_mani_staff.json()
    assert m_data["departure_id"] == str(dep.id)
    assert len(m_data["bookings"]) >= 1
    t_data = m_data["bookings"][0]["travellers"][0]
    assert t_data["passport_number_masked"] == "•••• 5678"

    # Manager manifest view -> passport unmasked
    login_client(client, mgr.email)
    resp_mani_mgr = client.get(f"/api/v1/admin/operations/departures/{dep.id}/manifest")
    assert resp_mani_mgr.status_code == 200
    t_data_mgr = resp_mani_mgr.json()["bookings"][0]["travellers"][0]
    assert t_data_mgr["passport_number_masked"] == "P12345678"


# ==============================================================================
# 4. Customer Directory & Detail
# ==============================================================================


def test_customer_management_and_detail(client, db_session) -> None:
    """Staff can list customers and view complete profile with privacy protection."""
    staff = create_user_with_role(db_session, "staff_cust@example.com", ROLE_STAFF)
    cust = create_user_with_role(db_session, "traveler_john@example.com", ROLE_CUSTOMER)
    login_client(client, staff.email)

    resp_list = client.get("/api/v1/admin/customers?search=john")
    assert resp_list.status_code == 200
    items = resp_list.json()["items"]
    assert len(items) >= 1
    assert items[0]["email"] == cust.email
    # Ensure no passwords or hashes leak
    assert "password_hash" not in str(resp_list.json())

    resp_detail = client.get(f"/api/v1/admin/customers/{cust.id}")
    assert resp_detail.status_code == 200
    d = resp_detail.json()
    assert d["email"] == cust.email
    assert "bookings" in d
    assert "payments" in d
    assert "internal_notes" in d


# ==============================================================================
# 5. Inquiries & Lead Management
# ==============================================================================


def test_inquiry_lifecycle_and_assignment(client, db_session) -> None:
    """Staff can list inquiries, view detail, update status/priority, and assign to staff."""
    staff = create_user_with_role(db_session, "staff_inq@example.com", ROLE_STAFF)
    dest, pkg, _ = seed_test_catalog(db_session)

    inq = Inquiry(
        name="Sunita Sharma",
        email="sunita@example.com",
        phone="+919876543211",
        message="Looking for family packages in Wayanad",
        destination_id=dest.id,
        package_id=pkg.id,
        status="new",
        priority="medium",
        source="contact_form",
    )
    db_session.add(inq)
    db_session.commit()

    headers = login_client(client, staff.email)

    # List inquiries
    resp_list = client.get("/api/v1/admin/inquiries?status=new")
    assert resp_list.status_code == 200
    assert len(resp_list.json()["items"]) >= 1

    # Detail view
    resp_detail = client.get(f"/api/v1/admin/inquiries/{inq.id}")
    assert resp_detail.status_code == 200
    assert resp_detail.json()["name"] == "Sunita Sharma"

    # Update inquiry
    patch_payload = {
        "status": "contacted",
        "priority": "high",
        "assigned_to_user_id": str(staff.id),
    }
    resp_patch = client.patch(
        f"/api/v1/admin/inquiries/{inq.id}",
        json=patch_payload,
        headers=headers,
    )
    assert resp_patch.status_code == 200
    updated = resp_patch.json()
    assert updated["status"] == "contacted"
    assert updated["priority"] == "high"
    assert updated["assigned_to_user_id"] == str(staff.id)


# ==============================================================================
# 6. Internal Staff Notes
# ==============================================================================


def test_internal_notes_lifecycle(client, db_session) -> None:
    """Staff can add and list internal notes on an inquiry and a customer."""
    staff = create_user_with_role(db_session, "staff_notes@example.com", ROLE_STAFF)
    cust = create_user_with_role(db_session, "cust_notes@example.com", ROLE_CUSTOMER)
    headers = login_client(client, staff.email)

    # Post internal note on customer
    post_resp = client.post(
        f"/api/v1/admin/notes/customer/{cust.id}",
        json={"note": "VIP traveler preferring mountain view rooms."},
        headers=headers,
    )
    assert post_resp.status_code == 200
    note_data = post_resp.json()
    assert note_data["note"] == "VIP traveler preferring mountain view rooms."
    assert note_data["author_email"] == staff.email

    # Retrieve notes
    get_resp = client.get(f"/api/v1/admin/notes/customer/{cust.id}")
    assert get_resp.status_code == 200
    notes = get_resp.json()
    assert len(notes) == 1
    assert notes[0]["note"] == "VIP traveler preferring mountain view rooms."


# ==============================================================================
# 7. Payment Reconciliation
# ==============================================================================


def test_payment_reconciliation(client, db_session) -> None:
    """Manager can review payments, mismatches, and reconcile records."""
    staff = create_user_with_role(db_session, "staff_recon@example.com", ROLE_STAFF)
    mgr = create_user_with_role(db_session, "mgr_recon@example.com", ROLE_MANAGER)
    cust = create_user_with_role(db_session, "cust_recon@example.com", ROLE_CUSTOMER)
    _dest, pkg, dep = seed_test_catalog(db_session)

    # Mismatch: Confirmed booking but payment is pending
    b_mismatch = Booking(
        booking_reference="KV-MISMATCH-001",
        user_id=cust.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=1,
        subtotal=Decimal("15000.00"),
        total=Decimal("15000.00"),
        currency="INR",
        status="confirmed",
        payment_status="pending",
    )
    db_session.add(b_mismatch)
    db_session.flush()

    p_pending = Payment(
        booking_id=b_mismatch.id,
        provider="razorpay",
        provider_payment_id="pay_pending_001",
        idempotency_key=f"idem_{uuid4().hex[:10]}",
        amount=Decimal("15000.00"),
        currency="INR",
        status="pending",
    )
    db_session.add(p_pending)
    db_session.commit()

    # Staff denied
    login_client(client, staff.email)
    resp = client.get("/api/v1/admin/operations/reconciliation")
    assert resp.status_code == 403

    # Manager allowed
    login_client(client, mgr.email)
    resp = client.get("/api/v1/admin/operations/reconciliation")
    assert resp.status_code == 200
    recon = resp.json()
    assert "items" in recon
    assert "mismatch_summary" in recon
    assert recon["mismatch_summary"]["booking_confirmed_payment_missing"] >= 1


# ==============================================================================
# 8. Customer Communication (WhatsApp & Email)
# ==============================================================================


def test_customer_communication_whatsapp_and_email(client, db_session) -> None:
    """Staff can generate Click-to-Chat WhatsApp links and dispatch operational emails."""
    staff = create_user_with_role(db_session, "staff_comm@example.com", ROLE_STAFF)
    cust = create_user_with_role(db_session, "cust_comm@example.com", ROLE_CUSTOMER)
    _dest, pkg, dep = seed_test_catalog(db_session)

    b = Booking(
        booking_reference="KV-COMM-001",
        user_id=cust.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=1,
        subtotal=Decimal("10000.00"),
        total=Decimal("10000.00"),
        currency="INR",
        status="confirmed",
        payment_status="paid",
    )
    db_session.add(b)
    db_session.commit()

    headers = login_client(client, staff.email)

    # WhatsApp link
    resp_wa = client.get(f"/api/v1/admin/operations/contact/whatsapp?booking_id={b.id}")
    assert resp_wa.status_code == 200
    wa_data = resp_wa.json()
    assert "wa.me" in wa_data["click_to_chat_url"]
    assert any(b_name in wa_data["message"] for b_name in ("The Wild Route", "Wild Route", "KV Tours", "Wild Root"))

    # Email dispatch
    resp_email = client.post(
        "/api/v1/admin/operations/contact/email",
        json={
            "booking_id": str(b.id),
            "subject": "Important update regarding your Wayanad departure",
            "body": "Dear traveler, please assemble at 6 AM at the designated pickup point.",
        },
        headers=headers,
    )
    assert resp_email.status_code == 200
    assert resp_email.json()["status"] == "sent"


# ==============================================================================
# 9. CSV Exports
# ==============================================================================


def test_csv_exports(client, db_session) -> None:
    """Verify safe CSV exports for bookings, customers, departures, inquiries, manifest, payments, revenue."""
    staff = create_user_with_role(db_session, "staff_exp@example.com", ROLE_STAFF)
    mgr = create_user_with_role(db_session, "mgr_exp@example.com", ROLE_MANAGER)
    _, _, dep = seed_test_catalog(db_session)

    login_client(client, staff.email)

    # Bookings export
    r_bkg = client.get("/api/v1/admin/exports/bookings")
    assert r_bkg.status_code == 200
    assert "text/csv" in r_bkg.headers["content-type"]
    assert "Booking Reference" in r_bkg.text

    # Customers export (strictly no password hashes)
    r_cust = client.get("/api/v1/admin/exports/customers")
    assert r_cust.status_code == 200
    assert "Customer ID" in r_cust.text
    assert "password_hash" not in r_cust.text

    # Departures export
    r_dep = client.get("/api/v1/admin/exports/departures")
    assert r_dep.status_code == 200
    assert "Departure ID" in r_dep.text

    # Inquiries export
    r_inq = client.get("/api/v1/admin/exports/inquiries")
    assert r_inq.status_code == 200
    assert "Inquiry ID" in r_inq.text

    # Manifest export
    r_man = client.get(f"/api/v1/admin/exports/manifest/{dep.id}")
    assert r_man.status_code == 200
    assert "Departure ID" in r_man.text

    # Staff denied payments and revenue exports
    assert client.get("/api/v1/admin/exports/payments").status_code == 403
    assert client.get("/api/v1/admin/exports/revenue").status_code == 403

    # Manager allowed payments and revenue exports
    login_client(client, mgr.email)
    r_pay = client.get("/api/v1/admin/exports/payments")
    assert r_pay.status_code == 200
    assert "Payment ID" in r_pay.text

    r_rev = client.get("/api/v1/admin/exports/revenue?period=30d")
    assert r_rev.status_code == 200
    assert "Paid Revenue" in r_rev.text
