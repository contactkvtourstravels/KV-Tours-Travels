"""Comprehensive test suite for authentication, authorization, sessions, and recovery."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import delete, select

from app.cli.bootstrap_admin import bootstrap_super_admin, seed_standard_roles
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
)
from app.core.security import hash_password, hash_token
from app.models.user import PasswordResetToken, Role, User, UserRole, UserSession
from app.services.auth_service import get_dev_reset_token

VALID_PASSWORD = "StrongP@ssw0rd!2026"
VALID_EMAIL = "traveller@example.com"


def csrf_header(client) -> dict[str, str]:
    """Helper to return current X-CSRF-Token header matching client's cookie jar."""
    cookie_token = client.cookies.get("travel_csrf")
    if cookie_token:
        return {"X-CSRF-Token": cookie_token}
    resp = client.get("/api/v1/auth/csrf")
    assert resp.status_code == 200
    token = resp.json()["csrf_token"]
    return {"X-CSRF-Token": token}


# 1. Successful registration
def test_successful_registration(client, db_session) -> None:
    payload = {
        "email": "Jane.Doe@Example.COM ",
        "password": VALID_PASSWORD,
        "first_name": "Jane",
        "last_name": "Doe",
        "phone": "+919876543210",
    }
    response = client.post(
        "/api/v1/auth/register",
        json=payload,
        headers=csrf_header(client),
    )

    assert response.status_code == 201
    data = response.json()
    assert "user" in data
    user = data["user"]
    assert user["email"] == "Jane.Doe@Example.COM"
    assert user["first_name"] == "Jane"
    assert user["last_name"] == "Doe"
    assert user["status"] == "active"
    assert user["roles"] == ["customer"]

    # Security check: Password hash and secrets must NEVER be present
    assert "password" not in user
    assert "password_hash" not in user
    assert "password_hash" not in str(response.json())

    # Cookie checks
    set_cookie = response.headers.get("set-cookie", "")
    assert "travel_session=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "Path=/" in set_cookie


# 2. Duplicate email registration
def test_duplicate_email_registration(client) -> None:
    payload = {
        "email": "duplicate@example.com",
        "password": VALID_PASSWORD,
        "first_name": "First",
        "last_name": "User",
    }
    r1 = client.post(
        "/api/v1/auth/register",
        json=payload,
        headers=csrf_header(client),
    )
    assert r1.status_code == 201

    # Attempt registration with mixed-case variant of identical email
    payload2 = {
        "email": " DUPLICATE@example.com ",
        "password": VALID_PASSWORD,
        "first_name": "Second",
        "last_name": "User",
    }
    r2 = client.post(
        "/api/v1/auth/register",
        json=payload2,
        headers=csrf_header(client),
    )
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"


# 3. Invalid email format
@pytest.mark.parametrize(
    "invalid_email",
    [
        "not-an-email",
        "@missing-local.com",
        "missing-at-domain.com",
        "spaces in email@domain.com",
    ],
)
def test_invalid_email_registration(client, invalid_email: str) -> None:
    payload = {
        "email": invalid_email,
        "password": VALID_PASSWORD,
        "first_name": "Test",
        "last_name": "User",
    }
    response = client.post(
        "/api/v1/auth/register",
        json=payload,
        headers=csrf_header(client),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] in ("INVALID_EMAIL", "VALIDATION_ERROR")


# 4. Weak password validation
@pytest.mark.parametrize(
    "weak_password",
    [
        "short1!",  # too short (<8)
        "nocapitaldigit123!",  # no uppercase
        "NOLOWERCASE123!",  # no lowercase
        "NoDigitsHere!",  # no number
        "NoSpecialChar123",  # no symbol
    ],
)
def test_weak_password_registration(client, weak_password: str) -> None:
    payload = {
        "email": "pwdtest@example.com",
        "password": weak_password,
        "first_name": "Test",
        "last_name": "User",
    }
    response = client.post(
        "/api/v1/auth/register",
        json=payload,
        headers=csrf_header(client),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] in ("WEAK_PASSWORD", "VALIDATION_ERROR")


# 5. Successful login
def test_successful_login(client) -> None:
    # Register first
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
            "first_name": "Test",
            "last_name": "Customer",
        },
        headers=csrf_header(client),
    )
    assert reg.status_code == 201

    # Login with normalized email variation
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": " TRAVELLER@example.com ", "password": VALID_PASSWORD},
        headers=csrf_header(client),
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert data["message"] == "Login successful."
    assert data["user"]["email"] == VALID_EMAIL
    assert "password_hash" not in data["user"]

    set_cookie = login_resp.headers.get("set-cookie", "")
    assert "travel_session=" in set_cookie
    assert "HttpOnly" in set_cookie


# 6. Wrong password login
def test_wrong_password_login(client) -> None:
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "wrongpwd@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Test",
            "last_name": "User",
        },
        headers=csrf_header(client),
    )

    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpwd@example.com", "password": "WrongPassword123!"},
        headers=csrf_header(client),
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert resp.json()["error"]["message"] == "Invalid email or password."


# 7. Disabled / suspended / soft-deleted user login
def test_inactive_and_deleted_user_login(client, db_session) -> None:
    # 1. Suspended user
    pwd_hash = hash_password(VALID_PASSWORD)
    user_suspended = User(
        email="suspended@example.com",
        email_normalized="suspended@example.com",
        password_hash=pwd_hash,
        first_name="Suspended",
        last_name="User",
        status="suspended",
    )
    db_session.add(user_suspended)
    db_session.commit()

    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "suspended@example.com", "password": VALID_PASSWORD},
        headers=csrf_header(client),
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "ACCOUNT_INACTIVE"

    # 2. Soft-deleted user
    user_deleted = User(
        email="deleted@example.com",
        email_normalized="deleted@example.com",
        password_hash=pwd_hash,
        first_name="Deleted",
        last_name="User",
        status="active",
        is_deleted=True,
    )
    db_session.add(user_deleted)
    db_session.commit()

    resp2 = client.post(
        "/api/v1/auth/login",
        json={"email": "deleted@example.com", "password": VALID_PASSWORD},
        headers=csrf_header(client),
    )
    assert resp2.status_code == 401
    assert resp2.json()["error"]["code"] == "INVALID_CREDENTIALS"


# 8. GET /me without authentication
def test_get_me_unauthenticated(client) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


# 9. GET /me with authentication
def test_get_me_authenticated(client) -> None:
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "getme@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Me",
            "last_name": "Tester",
        },
        headers=csrf_header(client),
    )
    assert reg_resp.status_code == 201

    # The client automatically retains cookies in session
    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    user_data = me_resp.json()
    assert user_data["email"] == "getme@example.com"
    assert user_data["first_name"] == "Me"
    assert user_data["roles"] == ["customer"]
    assert "password_hash" not in user_data


# 10. Logout and 11. Access after logout
def test_logout_and_access_after_logout(client) -> None:
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "logout@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Logout",
            "last_name": "User",
        },
        headers=csrf_header(client),
    )
    assert reg_resp.status_code == 201

    # Verify authenticated
    assert client.get("/api/v1/auth/me").status_code == 200

    # Perform logout
    logout_resp = client.post(
        "/api/v1/auth/logout",
        headers=csrf_header(client),
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["message"] == "Successfully logged out."

    # Verify session cookie was deleted/expired
    assert client.cookies.get("travel_session") is None

    # Subsequent access must fail
    me_after = client.get("/api/v1/auth/me")
    assert me_after.status_code == 401


# 12. Customer role assignment
def test_customer_role_assignment(client) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "rolecheck@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Role",
            "last_name": "Check",
        },
        headers=csrf_header(client),
    )
    assert resp.status_code == 201
    assert resp.json()["user"]["roles"] == ["customer"]


# 13. Role authorization & Hierarchy
def test_role_authorization_and_hierarchy(client, db_session) -> None:
    seed_standard_roles(db_session)

    # 1. Customer cannot access staff or admin routes
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "normal@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Normal",
            "last_name": "Customer",
        },
        headers=csrf_header(client),
    )
    admin_check = client.get("/api/v1/auth/verify-role-admin")
    assert admin_check.status_code == 403
    assert admin_check.json()["error"]["code"] == "INSUFFICIENT_PERMISSIONS"

    staff_check = client.get("/api/v1/auth/verify-role-staff")
    assert staff_check.status_code == 403

    # 2. Staff user can access staff route but NOT admin route
    staff_user = User(
        email="staff@example.com",
        email_normalized="staff@example.com",
        password_hash=hash_password(VALID_PASSWORD),
        first_name="Staff",
        last_name="Member",
        status="active",
    )
    db_session.add(staff_user)
    db_session.flush()

    staff_role = db_session.execute(
        select(Role).where(Role.name == ROLE_STAFF)
    ).scalar_one()
    db_session.add(UserRole(user_id=staff_user.id, role_id=staff_role.id))
    db_session.commit()

    # Log in as staff
    client.cookies.clear()
    login_staff = client.post(
        "/api/v1/auth/login",
        json={"email": "staff@example.com", "password": VALID_PASSWORD},
        headers=csrf_header(client),
    )
    assert login_staff.status_code == 200
    assert client.get("/api/v1/auth/verify-role-staff").status_code == 200
    assert client.get("/api/v1/auth/verify-role-admin").status_code == 403

    # 3. Super Admin has unrestricted access to staff and admin routes
    existing = db_session.execute(select(User).where(User.email_normalized == "contact.kvtourstravels@gmail.com")).scalar_one_or_none()
    if existing:
        db_session.execute(delete(UserSession).where(UserSession.user_id == existing.id))
        db_session.execute(delete(UserRole).where(UserRole.user_id == existing.id))
        db_session.execute(delete(User).where(User.id == existing.id))
        db_session.commit()

    super_user = User(
        email="contact.kvtourstravels@gmail.com",
        email_normalized="contact.kvtourstravels@gmail.com",
        password_hash=hash_password(VALID_PASSWORD),
        first_name="Root",
        last_name="Admin",
        status="active",
        is_email_verified=True,
    )
    db_session.add(super_user)
    db_session.flush()

    super_role = db_session.execute(
        select(Role).where(Role.name == ROLE_SUPER_ADMIN)
    ).scalar_one()
    db_session.add(UserRole(user_id=super_user.id, role_id=super_role.id))
    db_session.commit()

    client.cookies.clear()
    client.post(
        "/api/v1/auth/login",
        json={"email": "contact.kvtourstravels@gmail.com", "password": VALID_PASSWORD},
        headers=csrf_header(client),
    )
    assert client.get("/api/v1/auth/verify-role-admin").status_code == 200
    assert client.get("/api/v1/auth/verify-role-staff").status_code == 200

    # Clean up after test
    db_session.execute(delete(UserSession).where(UserSession.user_id == super_user.id))
    db_session.execute(delete(UserRole).where(UserRole.user_id == super_user.id))
    db_session.execute(delete(User).where(User.id == super_user.id))
    db_session.commit()


# 14. Customer ownership enforcement
def test_customer_data_ownership(client, db_session) -> None:
    seed_standard_roles(db_session)

    # Register user A
    resp_a = client.post(
        "/api/v1/auth/register",
        json={
            "email": "user.a@example.com",
            "password": VALID_PASSWORD,
            "first_name": "User",
            "last_name": "A",
        },
        headers=csrf_header(client),
    )
    user_a_id = resp_a.json()["user"]["id"]

    # Register user B
    client.cookies.clear()
    resp_b = client.post(
        "/api/v1/auth/register",
        json={
            "email": "user.b@example.com",
            "password": VALID_PASSWORD,
            "first_name": "User",
            "last_name": "B",
        },
        headers=csrf_header(client),
    )
    user_b_id = resp_b.json()["user"]["id"]

    # User B can access user B's resource
    assert client.get(f"/api/v1/auth/verify-ownership/{user_b_id}").status_code == 200

    # User B CANNOT access user A's resource
    denied = client.get(f"/api/v1/auth/verify-ownership/{user_a_id}")
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "FORBIDDEN_OWNERSHIP"


# 15. Privilege escalation attempt
def test_privilege_escalation_attempt(client) -> None:
    # Attempting to send 'role' or 'is_admin' or 'roles' must be rejected
    payload = {
        "email": "hacker@example.com",
        "password": VALID_PASSWORD,
        "first_name": "Evil",
        "last_name": "Attacker",
        "role": "admin",
        "is_admin": True,
    }
    resp = client.post(
        "/api/v1/auth/register",
        json=payload,
        headers=csrf_header(client),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


# 16. Forgot password (generic responses)
def test_forgot_password_generic_response(client) -> None:
    # Register real user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "forgot@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Forgot",
            "last_name": "User",
        },
        headers=csrf_header(client),
    )

    # Request for existing email
    r1 = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "forgot@example.com"},
        headers=csrf_header(client),
    )
    assert r1.status_code == 200
    msg1 = r1.json()["message"]

    # Request for non-existent email
    r2 = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent_unknown@example.com"},
        headers=csrf_header(client),
    )
    assert r2.status_code == 200
    msg2 = r2.json()["message"]

    # Both responses must be identical to prevent user enumeration
    assert msg1 == msg2


# 17. Invalid reset token
def test_invalid_reset_token(client) -> None:
    resp = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": "completely_fake_invalid_token",
            "new_password": "NewValidPassword123!",
        },
        headers=csrf_header(client),
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_RESET_TOKEN"


# 18. Expired reset token
def test_expired_reset_token(client, db_session) -> None:
    user = User(
        email="expired@example.com",
        email_normalized="expired@example.com",
        password_hash=hash_password(VALID_PASSWORD),
        first_name="Expired",
        last_name="TokenUser",
        status="active",
    )
    db_session.add(user)
    db_session.flush()

    raw_token = "expired_raw_token_xyz"
    token_rec = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        is_used=False,
    )
    db_session.add(token_rec)
    db_session.commit()

    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "NewValidPassword123!"},
        headers=csrf_header(client),
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_RESET_TOKEN"


# 19. Successful password reset & 20. Token cannot be reused & Session Invalidation
def test_successful_password_reset_and_no_reuse(client, db_session) -> None:
    # Register user
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "resetme@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Reset",
            "last_name": "Target",
        },
        headers=csrf_header(client),
    )
    assert reg.status_code == 201

    # Request reset
    client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "resetme@example.com"},
        headers=csrf_header(client),
    )

    token = get_dev_reset_token("resetme@example.com")
    assert token is not None

    new_password = "BrandNewPassword123!"
    # Perform reset
    reset_resp = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": new_password},
        headers=csrf_header(client),
    )
    assert reset_resp.status_code == 200
    assert "successfully reset" in reset_resp.json()["message"].lower()

    # 20. Token cannot be reused
    reuse_resp = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "AnotherNewPassword123!"},
        headers=csrf_header(client),
    )
    assert reuse_resp.status_code == 400
    assert reuse_resp.json()["error"]["code"] == "INVALID_RESET_TOKEN"

    # User can now login with new password
    client.cookies.clear()
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "resetme@example.com", "password": new_password},
        headers=csrf_header(client),
    )
    assert login_resp.status_code == 200

    # Old password no longer works
    client.cookies.clear()
    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": "resetme@example.com", "password": VALID_PASSWORD},
        headers=csrf_header(client),
    )
    assert old_login.status_code == 401


# 21. CSRF Protection enforcement
def test_csrf_protection_on_state_mutations(client) -> None:
    # 1. Register with valid session and csrf
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "csrf.test@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Csrf",
            "last_name": "Tester",
        },
        headers=csrf_header(client),
    )
    assert reg_resp.status_code == 201

    # Client now holds active session cookie
    # Attempt logout WITHOUT X-CSRF-Token header
    fail_resp = client.post("/api/v1/auth/logout")
    assert fail_resp.status_code == 403
    assert fail_resp.json()["error"]["code"] == "CSRF_TOKEN_MISSING"

    # Attempt logout with TAMPERED X-CSRF-Token header
    tamper_resp = client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": "tampered_fake_token_value"},
    )
    assert tamper_resp.status_code == 403
    assert tamper_resp.json()["error"]["code"] == "CSRF_TOKEN_INVALID"

    # Valid logout with correct CSRF token
    ok_resp = client.post(
        "/api/v1/auth/logout",
        headers=csrf_header(client),
    )
    assert ok_resp.status_code == 200


# 22. Super Admin bootstrap CLI verification
def test_bootstrap_super_admin_cli(db_session) -> None:
    admin_email = "contact.kvtourstravels@gmail.com"
    existing = db_session.execute(select(User).where(User.email_normalized == admin_email)).scalar_one_or_none()
    if existing:
        db_session.execute(delete(UserSession).where(UserSession.user_id == existing.id))
        db_session.execute(delete(UserRole).where(UserRole.user_id == existing.id))
        db_session.execute(delete(User).where(User.id == existing.id))
        db_session.commit()

    bootstrap_super_admin(
        email=admin_email,
        first_name="Primary",
        last_name="SuperAdmin",
        password=VALID_PASSWORD,
        db=db_session,
    )

    user = db_session.execute(
        select(User).where(User.email_normalized == admin_email)
    ).scalar_one_or_none()

    assert user is not None
    assert user.status == "active"
    role_names = [a.role.name for a in user.role_assignments if a.role]
    assert ROLE_SUPER_ADMIN in role_names
