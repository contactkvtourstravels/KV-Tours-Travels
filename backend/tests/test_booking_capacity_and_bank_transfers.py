"""Comprehensive test suite for Booking Capacity (up to 100 travellers),
₹5,00,000 Daily Payment Limits, Split Payments, and Bank Transfer Verification.

Covers:
1. Selecting up to 100 travellers and accurate pricing scaling
2. Rejecting invalid traveller counts (0, 101, negative)
3. Departure seat availability and oversell protection
4. Admin prevention of reducing departure capacity below confirmed bookings
5. ₹5,00,000 payment threshold enforcement for single online transactions
6. Split / deposit online payments and outstanding balance ledger tracking
7. Direct Bank Transfer submission and duplicate UTR rejection (409 Conflict)
8. Staff manual verification and rejection of bank transfers
9. Unauthorized access protection on bank settings and verification
10. Bank settings validation (IFSC, confirmation matching) and sensitive account masking
11. Booking cancellation and inventory restoration
"""

from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER
from app.core.security import hash_password
from app.models.catalog import Destination, Package, PackageDeparture
from app.models.content import SiteSetting
from app.models.user import Role, User, UserRole
from app.services.razorpay_client import get_razorpay_client

PASSWORD = "TestSecurePassword123!"


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


def get_error_message(resp) -> str:
    data = resp.json()
    if isinstance(data, dict):
        if "error" in data and isinstance(data["error"], dict):
            return str(data["error"].get("message", "")).lower()
        if "detail" in data:
            return str(data["detail"]).lower()
    return str(data).lower()


def setup_package_and_departure(
    db,
    base_price: Decimal = Decimal("50000.00"),
    total_capacity: int = 100,
    max_travellers: int = 100,
) -> tuple[Package, PackageDeparture]:
    dest = Destination(
        name="Ooty Hill Station",
        slug=f"ooty-hills-{uuid4().hex[:6]}",
        country="India",
        is_published=True,
    )
    db.add(dest)
    db.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Nilgiri Mountain Grand Tour",
        slug=f"nilgiri-tour-{uuid4().hex[:6]}",
        duration_days=4,
        duration_nights=3,
        base_price=base_price,
        currency="INR",
        minimum_travellers=1,
        maximum_travellers=max_travellers,
        is_published=True,
    )
    db.add(pkg)
    db.flush()

    now_date = datetime.now(timezone.utc).date()
    departure = PackageDeparture(
        package_id=pkg.id,
        departure_date=now_date + timedelta(days=30),
        return_date=now_date + timedelta(days=34),
        total_capacity=total_capacity,
        available_capacity=total_capacity,
        reserved_capacity=0,
        currency="INR",
        status="open",
    )
    db.add(departure)
    db.commit()
    return pkg, departure


# =========================================================================
# 1. 100 Travellers Booking Capacity & Validation
# =========================================================================


def test_booking_capacity_up_to_100_travellers(client, db_session):
    customer = create_user(db_session, "group_leader@test.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    pkg, departure = setup_package_and_departure(
        db_session, base_price=Decimal("10000.00"), total_capacity=100, max_travellers=100
    )

    # 1. Book for 1 traveller
    res1 = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "Solo", "last_name": "Traveller"}],
        },
        headers=headers,
    )
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["number_of_travellers"] == 1
    assert Decimal(str(data1["total"])) == Decimal("10000.00")

    # 2. Book for 50 travellers on a fresh 100-seat departure
    pkg_large, dep_large = setup_package_and_departure(
        db_session, base_price=Decimal("5000.00"), total_capacity=100, max_travellers=100
    )
    travellers_50 = [{"first_name": "Traveller", "last_name": f"Num{i+1}"} for i in range(50)]
    res50 = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg_large.id),
            "departure_id": str(dep_large.id),
            "number_of_travellers": 50,
            "travellers": travellers_50,
        },
        headers=headers,
    )
    assert res50.status_code == 201
    data50 = res50.json()
    assert data50["number_of_travellers"] == 50
    assert Decimal(str(data50["total"])) == Decimal("250000.00")

    # 3. Book full 100 travellers
    pkg_100, dep_100 = setup_package_and_departure(
        db_session, base_price=Decimal("2000.00"), total_capacity=100, max_travellers=100
    )
    travellers_100 = [{"first_name": "Traveller", "last_name": f"Num{i+1}"} for i in range(100)]
    res100 = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg_100.id),
            "departure_id": str(dep_100.id),
            "number_of_travellers": 100,
            "travellers": travellers_100,
        },
        headers=headers,
    )
    assert res100.status_code == 201
    data100 = res100.json()
    assert data100["number_of_travellers"] == 100
    assert Decimal(str(data100["total"])) == Decimal("200000.00")


def test_booking_rejects_invalid_traveller_quantities(client, db_session):
    customer = create_user(db_session, "invalid_quantities@test.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    pkg, departure = setup_package_and_departure(db_session, total_capacity=100, max_travellers=100)

    # 0 travellers
    r0 = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 0,
            "travellers": [],
        },
        headers=headers,
    )
    assert r0.status_code == 422

    # 101 travellers (exceeds 100 bound)
    r101 = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 101,
            "travellers": [{"first_name": "Test", "last_name": "User"}],
        },
        headers=headers,
    )
    assert r101.status_code == 422

    # Negative travellers
    r_neg = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": -5,
            "travellers": [],
        },
        headers=headers,
    )
    assert r_neg.status_code == 422


def test_departure_capacity_oversell_protection(client, db_session):
    customer = create_user(db_session, "capacity_check@test.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # Departure with only 10 seats
    pkg, departure = setup_package_and_departure(
        db_session, base_price=Decimal("15000.00"), total_capacity=10, max_travellers=100
    )

    # Attempt to book 11 seats -> Rejected
    r_oversell = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 11,
            "travellers": [{"first_name": "T", "last_name": f"Num{i+1}"} for i in range(11)],
        },
        headers=headers,
    )
    assert r_oversell.status_code in (400, 409)
    assert "seats available" in get_error_message(r_oversell)

    # Book 8 seats -> Success
    r_valid = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 8,
            "travellers": [{"first_name": "T", "last_name": f"Num{i+1}"} for i in range(8)],
        },
        headers=headers,
    )
    assert r_valid.status_code == 201

    # Now departure has only 2 seats remaining. Attempting to book 3 seats fails
    r_subsequent = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 3,
            "travellers": [{"first_name": "T", "last_name": f"Num{i+1}"} for i in range(3)],
        },
        headers=headers,
    )
    assert r_subsequent.status_code in (400, 409)
    assert "seats available" in get_error_message(r_subsequent)


def test_admin_cannot_reduce_capacity_below_confirmed_bookings(client, db_session):
    admin = create_user(db_session, "admin_cap@test.com", ROLE_ADMIN)
    customer = create_user(db_session, "cust_cap@test.com", ROLE_CUSTOMER)

    pkg, departure = setup_package_and_departure(
        db_session, total_capacity=40, max_travellers=100
    )

    # Customer books 25 seats
    cust_headers = login(client, customer.email)
    b_res = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 25,
            "travellers": [{"first_name": "T", "last_name": f"Num{i+1}"} for i in range(25)],
        },
        headers=cust_headers,
    )
    assert b_res.status_code == 201

    # Login as Admin
    admin_headers = login(client, admin.email)

    # Admin attempts to reduce total_capacity to 20 (less than 25 reserved/booked)
    r_fail = client.put(
        f"/api/v1/admin/departures/{departure.id}",
        json={"total_capacity": 20},
        headers=admin_headers,
    )
    assert r_fail.status_code == 400
    err_cap = get_error_message(r_fail)
    assert "capacity" in err_cap
    assert "reserved or booked" in err_cap

    # Admin increases capacity to 60 -> Success
    r_success = client.put(
        f"/api/v1/admin/departures/{departure.id}",
        json={"total_capacity": 60},
        headers=admin_headers,
    )
    assert r_success.status_code == 200
    data = r_success.json()
    assert data["total_capacity"] == 60
    assert data["available_capacity"] == 35  # 60 - 25


# =========================================================================
# 2. ₹5,00,000 Payment Limits, Split / Deposit Orders & Ledger
# =========================================================================


def test_high_value_payment_threshold_enforcement(client, db_session):
    customer = create_user(db_session, "high_value_payer@test.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # Booking total: 10 travellers * ₹60,000 = ₹6,00,000 (> ₹5,00,000 threshold)
    pkg, departure = setup_package_and_departure(
        db_session, base_price=Decimal("60000.00"), total_capacity=50, max_travellers=100
    )
    b_res = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 10,
            "travellers": [{"first_name": "VIP", "last_name": f"Num{i+1}"} for i in range(10)],
        },
        headers=headers,
    )
    assert b_res.status_code == 201
    booking_id = b_res.json()["id"]

    # 1. Attempt full payment online (₹6,00,000) -> Rejected with explanation
    r_full = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": booking_id, "payment_type": "full"},
        headers=headers,
    )
    assert r_full.status_code == 400
    err_full = get_error_message(r_full)
    assert "exceeds the maximum" in err_full
    assert "500,000" in err_full or "5,00,000" in err_full

    # 2. Deposit payment order (25% = ₹1,50,000) -> Succeeds!
    r_deposit = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": booking_id, "payment_type": "deposit"},
        headers=headers,
    )
    assert r_deposit.status_code in (200, 201)
    dep_order = r_deposit.json()
    assert dep_order["amount"] == 15000000  # in paise
    assert dep_order["order_id"].startswith("order_")


def test_split_payment_and_outstanding_balance_reconciliation(client, db_session):
    customer = create_user(db_session, "split_payer@test.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    # Booking total: ₹2,00,000
    pkg, departure = setup_package_and_departure(
        db_session, base_price=Decimal("100000.00"), total_capacity=20, max_travellers=20
    )
    b_res = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 2,
            "travellers": [
                {"first_name": "Alice", "last_name": "User"},
                {"first_name": "Bob", "last_name": "User"},
            ],
        },
        headers=headers,
    )
    assert b_res.status_code == 201
    booking = b_res.json()
    booking_id = booking["id"]

    # Step 1: Create deposit order for 25% (₹50,000)
    dep_order_res = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": booking_id, "payment_type": "deposit"},
        headers=headers,
    )
    assert dep_order_res.status_code in (200, 201)
    dep_order_id = dep_order_res.json()["order_id"]
    assert dep_order_res.json()["amount"] == 5000000  # 50,000 INR in paise

    # Verify deposit payment
    rz_client = get_razorpay_client()
    fake_payment_id = f"pay_dep_{uuid4().hex[:10]}"
    sig_payload = f"{dep_order_id}|{fake_payment_id}"
    signature = hmac.new(
        rz_client.key_secret.encode("utf-8"),
        sig_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    v1_res = client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "booking_id": booking_id,
            "razorpay_order_id": dep_order_id,
            "razorpay_payment_id": fake_payment_id,
            "razorpay_signature": signature,
        },
        headers=headers,
    )
    assert v1_res.status_code == 200

    # Inspect booking detail: should be partially_paid
    b_detail = client.get(f"/api/v1/bookings/{booking_id}", headers=headers).json()
    assert b_detail["payment_status"] == "partially_paid"
    assert Decimal(str(b_detail["total_paid"])) == Decimal("50000.00")
    assert Decimal(str(b_detail["outstanding_balance"])) == Decimal("150000.00")
    assert b_detail["is_fully_paid"] is False

    # Step 2: Pay remaining balance (₹1,50,000)
    bal_order_res = client.post(
        "/api/v1/payments/razorpay/order",
        json={"booking_id": booking_id, "payment_type": "balance"},
        headers=headers,
    )
    assert bal_order_res.status_code in (200, 201)
    bal_order_id = bal_order_res.json()["order_id"]
    assert bal_order_res.json()["amount"] == 15000000  # 150,000 INR in paise

    fake_bal_payment_id = f"pay_bal_{uuid4().hex[:10]}"
    bal_sig_payload = f"{bal_order_id}|{fake_bal_payment_id}"
    bal_signature = hmac.new(
        rz_client.key_secret.encode("utf-8"),
        bal_sig_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    v2_res = client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "booking_id": booking_id,
            "razorpay_order_id": bal_order_id,
            "razorpay_payment_id": fake_bal_payment_id,
            "razorpay_signature": bal_signature,
        },
        headers=headers,
    )
    assert v2_res.status_code == 200

    # Inspect booking detail: should now be fully paid
    b_detail_final = client.get(f"/api/v1/bookings/{booking_id}", headers=headers).json()
    assert b_detail_final["payment_status"] == "paid"
    assert Decimal(str(b_detail_final["total_paid"])) == Decimal("200000.00")
    assert Decimal(str(b_detail_final["outstanding_balance"])) == Decimal("0.00")
    assert b_detail_final["is_fully_paid"] is True


# =========================================================================
# 3. Bank Transfer Submission, Verification, Rejection & Security
# =========================================================================


def enable_bank_transfers_in_db(db_session, enabled: bool = True) -> None:
    """Helper to configure bank transfer availability in SiteSetting for tests."""
    setting = db_session.execute(
        select(SiteSetting).where(SiteSetting.key == "bank_transfer_settings")
    ).scalar_one_or_none()
    if not setting:
        setting = SiteSetting(
            key="bank_transfer_settings",
            value={"bank_transfer_enabled": enabled, "branch_payment_enabled": enabled},
        )
        db_session.add(setting)
    else:
        new_val = dict(setting.value or {})
        new_val["bank_transfer_enabled"] = enabled
        new_val["branch_payment_enabled"] = enabled
        setting.value = new_val
    db_session.commit()


def test_bank_transfer_submission_and_duplicate_prevention(client, db_session):
    customer = create_user(db_session, "bank_transfer_cust@test.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    pkg, departure = setup_package_and_departure(
        db_session, base_price=Decimal("75000.00"), total_capacity=10, max_travellers=10
    )
    b_res = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "Bank", "last_name": "User"}],
        },
        headers=headers,
    )
    booking_id = b_res.json()["id"]

    # 1. When bank transfers are disabled by administrator -> 400 Bad Request
    enable_bank_transfers_in_db(db_session, enabled=False)
    disabled_utr = f"UTR{uuid4().hex[:12].upper()}"
    dis_res = client.post(
        "/api/v1/payments/bank-transfer",
        json={
            "booking_id": booking_id,
            "transfer_reference": disabled_utr,
            "amount": 75000.00,
        },
        headers=headers,
    )
    assert dis_res.status_code == 400
    assert "direct bank transfers are currently disabled" in get_error_message(dis_res).lower()

    # 2. When bank transfers are enabled by administrator -> 201 Created
    enable_bank_transfers_in_db(db_session, enabled=True)
    utr = f"UTR{uuid4().hex[:12].upper()}"
    sub_res = client.post(
        "/api/v1/payments/bank-transfer",
        json={
            "booking_id": booking_id,
            "transfer_reference": utr,
            "amount": 75000.00,
            "notes": "Transferred from SBI net banking",
        },
        headers=headers,
    )
    assert sub_res.status_code in (200, 201)
    sub_data = sub_res.json()
    assert sub_data["success"] is True
    assert sub_data["status"] == "pending"
    assert sub_data["transfer_reference"] == utr

    # Customer submits duplicate reference -> 409 Conflict
    dup_res = client.post(
        "/api/v1/payments/bank-transfer",
        json={
            "booking_id": booking_id,
            "transfer_reference": utr,
            "amount": 75000.00,
        },
        headers=headers,
    )
    assert dup_res.status_code == 409
    assert "already been submitted" in get_error_message(dup_res)


def test_bank_transfer_staff_verification_and_rejection(client, db_session):
    admin = create_user(db_session, "admin_verifier@test.com", ROLE_ADMIN)
    customer = create_user(db_session, "customer_payer@test.com", ROLE_CUSTOMER)

    # Enable bank transfers for verification test
    enable_bank_transfers_in_db(db_session, enabled=True)

    pkg, departure = setup_package_and_departure(
        db_session, base_price=Decimal("50000.00"), total_capacity=10, max_travellers=10
    )

    cust_headers = login(client, customer.email)
    b_res = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "Test", "last_name": "Traveller"}],
        },
        headers=cust_headers,
    )
    booking_id = b_res.json()["id"]

    # Submit bank transfer
    utr1 = f"UTR{uuid4().hex[:12].upper()}"
    sub_res = client.post(
        "/api/v1/payments/bank-transfer",
        json={
            "booking_id": booking_id,
            "transfer_reference": utr1,
            "amount": 50000.00,
        },
        headers=cust_headers,
    )
    assert sub_res.status_code in (200, 201)
    payment_id = sub_res.json()["payment_id"]

    # Customer cannot verify own bank transfer (403)
    unauth_res = client.post(
        f"/api/v1/admin/payments/{payment_id}/verify-bank-transfer",
        json={"verified_amount": 50000.00},
        headers=cust_headers,
    )
    assert unauth_res.status_code == 403

    # Admin verifies bank transfer
    admin_headers = login(client, admin.email)
    verify_res = client.post(
        f"/api/v1/admin/payments/{payment_id}/verify-bank-transfer",
        json={
            "verified_amount": 50000.00,
            "notes": "Verified against HDFC Bank statement #40291",
        },
        headers=admin_headers,
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["status"] == "captured"

    # Check booking status is now paid and confirmed
    cust_headers = login(client, customer.email)
    b_final = client.get(f"/api/v1/bookings/{booking_id}", headers=cust_headers).json()
    assert b_final["payment_status"] == "paid"
    assert b_final["status"] == "confirmed"

    # Test rejection workflow on a second booking
    b2_res = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 1,
            "travellers": [{"first_name": "Second", "last_name": "Traveller"}],
        },
        headers=cust_headers,
    )
    b2_id = b2_res.json()["id"]

    utr2 = f"UTR{uuid4().hex[:12].upper()}"
    sub2 = client.post(
        "/api/v1/payments/bank-transfer",
        json={"booking_id": b2_id, "transfer_reference": utr2, "amount": 50000.00},
        headers=cust_headers,
    )
    assert sub2.status_code in (200, 201)
    p2_id = sub2.json()["payment_id"]

    # Admin logs back in to reject transfer
    admin_headers = login(client, admin.email)
    reject_res = client.post(
        f"/api/v1/admin/payments/{p2_id}/reject-bank-transfer",
        json={"reason": "Invalid UTR reference not reflected on bank statement."},
        headers=admin_headers,
    )
    assert reject_res.status_code == 200
    r_data = reject_res.json()
    assert r_data["status"] == "failed"


def test_bank_settings_validation_and_masking(client, db_session):
    admin = create_user(db_session, "bank_settings_admin@test.com", ROLE_ADMIN)
    admin_headers = login(client, admin.email)

    # 1. Reject invalid IFSC code format
    r_ifsc = client.put(
        "/api/v1/admin/payments/bank-settings",
        json={"ifsc_code": "INVALID123"},
        headers=admin_headers,
    )
    assert r_ifsc.status_code == 400
    assert "ifsc" in get_error_message(r_ifsc)

    # 2. Reject mismatched account confirmation
    r_mismatch = client.put(
        "/api/v1/admin/payments/bank-settings",
        json={
            "account_number": "123456789012",
            "confirm_account_number": "999999999999",
        },
        headers=admin_headers,
    )
    assert r_mismatch.status_code == 400
    assert "match" in get_error_message(r_mismatch)

    # 3. Valid update succeeds
    r_valid = client.put(
        "/api/v1/admin/payments/bank-settings",
        json={
            "bank_transfer_enabled": True,
            "branch_payment_enabled": True,
            "account_holder_name": "KV TOURS AND TRAVELS PRIVATE LIMITED",
            "bank_name": "HDFC Bank",
            "account_number": "50200012345678",
            "confirm_account_number": "50200012345678",
            "ifsc_code": "HDFC0001234",
            "branch_name": "Cross Cut Road, Coimbatore",
            "account_type": "current",
            "upi_id": "kvtours@okhdfcbank",
            "package_availability": "all_packages",
        },
        headers=admin_headers,
    )
    assert r_valid.status_code == 200
    saved = r_valid.json()
    assert saved["bank_transfer_enabled"] is True
    # Account number must be masked in admin response
    assert saved["account_number_masked"] == "•••• •••• 5678"
    assert "50200012345678" not in str(saved["account_number_masked"])

    # 4. Public endpoint exposes only masked details when no booking context
    pub_res = client.get("/api/v1/payments/bank-details")
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["bank_transfer_enabled"] is True
    assert "50200012345678" not in str(pub_data["account_number"])


def test_booking_cancellation_restores_inventory(client, db_session):
    customer = create_user(db_session, "cancel_inventory@test.com", ROLE_CUSTOMER)
    headers = login(client, customer.email)

    pkg, departure = setup_package_and_departure(
        db_session, total_capacity=20, max_travellers=20
    )
    initial_available = departure.available_capacity

    # Book 6 seats
    b_res = client.post(
        "/api/v1/bookings",
        json={
            "package_id": str(pkg.id),
            "departure_id": str(departure.id),
            "number_of_travellers": 6,
            "travellers": [{"first_name": "T", "last_name": f"Num{i+1}"} for i in range(6)],
        },
        headers=headers,
    )
    assert b_res.status_code == 201
    booking_id = b_res.json()["id"]

    # Verify inventory was held
    db_session.expire_all()
    dep_mid = db_session.get(PackageDeparture, departure.id)
    assert dep_mid.available_capacity == initial_available - 6

    # Cancel booking
    cancel_res = client.post(
        f"/api/v1/bookings/{booking_id}/cancel",
        json={"reason": "Plans changed"},
        headers=headers,
    )
    assert cancel_res.status_code == 200

    # Verify inventory was restored
    db_session.expire_all()
    dep_after = db_session.get(PackageDeparture, departure.id)
    assert dep_after.available_capacity == initial_available
