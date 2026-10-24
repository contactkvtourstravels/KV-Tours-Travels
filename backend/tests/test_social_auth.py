"""Unit tests for Google and Apple social sign-in flows."""

import pytest
from sqlalchemy import delete, select

from app.cli.bootstrap_admin import bootstrap_super_admin, seed_standard_roles
from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER
from app.models.user import Role, User, UserRole, UserSession
from app.services.firebase_auth_service import register_mock_social_token, clear_mock_social_tokens


def csrf_header(client) -> dict[str, str]:
    """Helper to return current X-CSRF-Token header matching client's cookie jar."""
    cookie_token = client.cookies.get("travel_csrf")
    if cookie_token:
        return {"X-CSRF-Token": cookie_token}
    resp = client.get("/api/v1/auth/csrf")
    assert resp.status_code == 200
    token = resp.json()["csrf_token"]
    return {"X-CSRF-Token": token}


@pytest.fixture(autouse=True)
def clean_mock_tokens():
    clear_mock_social_tokens()
    yield
    clear_mock_social_tokens()


def test_google_social_login_new_user(client, db_session):
    """Test successful Google sign-in for a brand new user."""
    seed_standard_roles(db_session)

    mock_token = "google-valid-token-12345"
    register_mock_social_token(
        mock_token,
        {
            "uid": "google_sub_1001",
            "email": "priya.sharma@example.com",
            "email_verified": True,
            "name": "Priya Sharma",
            "provider": "google.com",
        },
    )

    payload = {
        "id_token": mock_token,
        "provider": "google.com",
    }

    response = client.post(
        "/api/v1/auth/social-login",
        json=payload,
        headers=csrf_header(client),
    )

    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    user = data["user"]
    assert user["email"] == "priya.sharma@example.com"
    assert user["first_name"] == "Priya"
    assert user["last_name"] == "Sharma"
    assert user["status"] == "active"
    assert user["roles"] == [ROLE_CUSTOMER]

    # Verify session cookie is set
    set_cookie = response.headers.get("set-cookie", "")
    assert "travel_session=" in set_cookie
    assert "HttpOnly" in set_cookie

    # Verify in DB
    db_user = db_session.execute(
        select(User).where(User.email_normalized == "priya.sharma@example.com")
    ).scalar_one()
    assert db_user.password_hash is None
    assert db_user.status == "active"


def test_apple_social_login_with_client_names_and_private_relay(client, db_session):
    """Test Apple sign-in handling private relay email and client-supplied first/last name."""
    seed_standard_roles(db_session)

    apple_token = "apple-valid-token-67890"
    register_mock_social_token(
        apple_token,
        {
            "uid": "apple_sub_9999",
            "email": "user83921@privaterelay.appleid.com",
            "email_verified": True,
            "name": None,  # Apple does not include name in subsequent ID tokens
            "provider": "apple.com",
        },
    )

    payload = {
        "id_token": apple_token,
        "provider": "apple.com",
        "first_name": "Arjun",
        "last_name": "Varma",
    }

    response = client.post(
        "/api/v1/auth/social-login",
        json=payload,
        headers=csrf_header(client),
    )

    assert response.status_code == 200
    data = response.json()
    user = data["user"]
    assert user["email"] == "user83921@privaterelay.appleid.com"
    assert user["first_name"] == "Arjun"
    assert user["last_name"] == "Varma"
    assert user["roles"] == [ROLE_CUSTOMER]


def test_social_login_links_existing_email_account(client, db_session):
    """Test that social login links to an existing user without duplicating accounts."""
    seed_standard_roles(db_session)

    # 1. Create user with normal password registration
    reg_payload = {
        "email": "rohit@example.com",
        "password": "ExistingUserP@ss1",
        "first_name": "Rohit",
        "last_name": "Kumar",
    }
    reg_resp = client.post(
        "/api/v1/auth/register",
        json=reg_payload,
        headers=csrf_header(client),
    )
    assert reg_resp.status_code == 201
    existing_user_id = reg_resp.json()["user"]["id"]

    # 2. Log in with Google using the same email
    mock_token = "google-existing-user-token"
    register_mock_social_token(
        mock_token,
        {
            "uid": "google_sub_2002",
            "email": "rohit@example.com",
            "email_verified": True,
            "name": "Rohit Kumar",
            "provider": "google.com",
        },
    )

    response = client.post(
        "/api/v1/auth/social-login",
        json={"id_token": mock_token, "provider": "google.com"},
        headers=csrf_header(client),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["id"] == existing_user_id
    assert data["user"]["email"] == "rohit@example.com"
    assert data["user"]["first_name"] == "Rohit"


def test_social_login_preserves_admin_role_for_existing_admin(client, db_session):
    """Test that an existing admin linking via social keeps their admin privileges."""
    seed_standard_roles(db_session)
    existing = db_session.execute(select(User).where(User.email_normalized == "athulsuresh446@gmail.com")).scalar_one_or_none()
    if existing:
        db_session.execute(delete(UserSession).where(UserSession.user_id == existing.id))
        db_session.execute(delete(UserRole).where(UserRole.user_id == existing.id))
        db_session.execute(delete(User).where(User.id == existing.id))
        db_session.commit()

    bootstrap_super_admin(
        email="athulsuresh446@gmail.com",
        first_name="Admin",
        last_name="Director",
        password="AdminP@ssw0rd!2026",
        db=db_session,
    )

    mock_token = "google-admin-token"
    register_mock_social_token(
        mock_token,
        {
            "uid": "google_admin_uid",
            "email": "athulsuresh446@gmail.com",
            "email_verified": True,
            "name": "Admin Director",
            "provider": "google.com",
        },
    )

    response = client.post(
        "/api/v1/auth/social-login",
        json={"id_token": mock_token, "provider": "google.com"},
        headers=csrf_header(client),
    )

    assert response.status_code == 200
    user = response.json()["user"]
    assert "super_admin" in user["roles"] or "admin" in user["roles"]


def test_social_login_rejects_inactive_user(client, db_session):
    """Test that an inactive or disabled account is rejected with 403."""
    seed_standard_roles(db_session)

    # Create inactive user directly in DB
    inactive_user = User(
        email="blocked@example.com",
        email_normalized="blocked@example.com",
        first_name="Blocked",
        last_name="User",
        status="inactive",
        is_deleted=False,
    )
    db_session.add(inactive_user)
    db_session.commit()

    mock_token = "blocked-token"
    register_mock_social_token(
        mock_token,
        {
            "uid": "blocked_uid",
            "email": "blocked@example.com",
            "email_verified": True,
            "name": "Blocked User",
            "provider": "google.com",
        },
    )

    response = client.post(
        "/api/v1/auth/social-login",
        json={"id_token": mock_token, "provider": "google.com"},
        headers=csrf_header(client),
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ACCOUNT_INACTIVE"


def test_social_login_requires_csrf(client):
    """Test that CSRF protection is enforced on social-login when csrf cookie is present."""
    # Obtain CSRF cookie first
    csrf_resp = client.get("/api/v1/auth/csrf")
    assert csrf_resp.status_code == 200

    # Omit X-CSRF-Token header
    response = client.post(
        "/api/v1/auth/social-login",
        json={"id_token": "some-token", "provider": "google.com"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_TOKEN_MISSING"


def test_social_login_invalid_token_rejected(client):
    """Test that a bad/malformed token is rejected with 401."""
    response = client.post(
        "/api/v1/auth/social-login",
        json={"id_token": "malformed.invalid.token.payload", "provider": "google.com"},
        headers=csrf_header(client),
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_TOKEN"
