"""Comprehensive verification tests for Super Admin authorization lock.

Validates that:
1. Only athulsuresh446@gmail.com can hold or exercise the super_admin role.
2. Any other user with super_admin assignment in DB is blocked by the authorization layer.
3. Imposters cannot access Super Admin-only endpoints.
4. The Super Admin cannot assign super_admin to unauthorized emails.
5. Role changes immediately revoke stale sessions.
6. Public registration and social login never auto-promote to super_admin.
7. Unverified email blocks super_admin privileges.
8. Bootstrap CLI rejects unauthorized emails.
"""

from uuid import uuid4
import pytest
from sqlalchemy import delete, select

from app.cli.bootstrap_admin import bootstrap_super_admin, seed_standard_roles
from app.core.permissions import (
    AUTHORIZED_SUPER_ADMIN_EMAIL,
    ROLE_ADMIN,
    ROLE_CUSTOMER,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
    get_user_roles,
    has_any_role,
    has_role,
    is_authorized_super_admin,
)
from app.core.security import hash_password
from app.models.content import AuditLog
from app.models.user import Role, User, UserRole, UserSession
from app.services.firebase_auth_service import register_mock_social_token, clear_mock_social_tokens

PASSWORD = "SuperP@ssw0rd!2026"


def csrf_headers(client) -> dict[str, str]:
    cookie = client.cookies.get("travel_csrf")
    if cookie:
        return {"X-CSRF-Token": cookie}
    resp = client.get("/api/v1/auth/csrf")
    assert resp.status_code == 200
    return {"X-CSRF-Token": resp.json()["csrf_token"]}


def login_client(client, email: str, password: str = PASSWORD) -> dict[str, str]:
    client.cookies.clear()
    headers = csrf_headers(client)
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=headers,
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return csrf_headers(client)


def _clean_test_users(db) -> None:
    test_emails = [
        AUTHORIZED_SUPER_ADMIN_EMAIL,
        "imposter@malicious.com",
        "imposter2@malicious.com",
        "target@example.com",
        "target2@example.com",
        "otherstaff@example.com",
        "demoteme@example.com",
        "hacker@attempt.com",
    ]
    user_ids = db.execute(
        select(User.id).where(User.email_normalized.in_(test_emails))
    ).scalars().all()
    if user_ids:
        db.execute(delete(UserSession).where(UserSession.user_id.in_(user_ids)))
        db.execute(delete(UserRole).where(UserRole.user_id.in_(user_ids)))
        db.execute(delete(AuditLog).where(AuditLog.actor_user_id.in_(user_ids)))
        db.execute(delete(User).where(User.id.in_(user_ids)))
        db.commit()


def create_user_with_role(
    db,
    email: str,
    role_name: str,
    is_email_verified: bool = True,
    status: str = "active",
) -> User:
    seed_standard_roles(db)
    normalized = email.strip().lower()
    existing = db.execute(select(User).where(User.email_normalized == normalized)).scalar_one_or_none()
    if existing:
        db.execute(delete(UserSession).where(UserSession.user_id == existing.id))
        db.execute(delete(UserRole).where(UserRole.user_id == existing.id))
        db.execute(delete(AuditLog).where(AuditLog.actor_user_id == existing.id))
        db.execute(delete(User).where(User.id == existing.id))
        db.commit()

    user = User(
        email=email.strip(),
        email_normalized=normalized,
        password_hash=hash_password(PASSWORD),
        first_name="Test",
        last_name="User",
        status=status,
        is_deleted=False,
        is_email_verified=is_email_verified,
    )
    db.add(user)
    db.flush()

    role = db.execute(select(Role).where(Role.name == role_name)).scalar_one()
    assignment = UserRole(user_id=user.id, role_id=role.id)
    db.add(assignment)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(autouse=True)
def cleanup_tokens(db_session):
    clear_mock_social_tokens()
    _clean_test_users(db_session)
    yield
    clear_mock_social_tokens()
    _clean_test_users(db_session)


# 1. Exclusive authorization check
def test_super_admin_exclusive_to_authorized_email(db_session):
    seed_standard_roles(db_session)

    # Legitimate authorized account
    auth_user = create_user_with_role(
        db_session, AUTHORIZED_SUPER_ADMIN_EMAIL, ROLE_SUPER_ADMIN, is_email_verified=True
    )
    assert is_authorized_super_admin(auth_user) is True
    assert has_role(auth_user, ROLE_SUPER_ADMIN) is True
    assert ROLE_SUPER_ADMIN in get_user_roles(auth_user)

    # Imposter account assigned super_admin in DB
    imposter = create_user_with_role(
        db_session, "imposter@malicious.com", ROLE_SUPER_ADMIN, is_email_verified=True
    )
    assert is_authorized_super_admin(imposter) is False
    assert has_role(imposter, ROLE_SUPER_ADMIN) is False
    assert ROLE_SUPER_ADMIN not in get_user_roles(imposter)
    assert has_any_role(imposter, [ROLE_SUPER_ADMIN]) is False


# 2. Imposter cannot access super admin endpoints
def test_imposter_cannot_access_super_admin_endpoints(client, db_session):
    imposter = create_user_with_role(
        db_session, "imposter2@malicious.com", ROLE_SUPER_ADMIN, is_email_verified=True
    )
    target = create_user_with_role(db_session, "target@example.com", ROLE_CUSTOMER)

    headers = login_client(client, imposter.email)

    # Try to modify roles (restricted to SuperAdminOnlyUser)
    resp = client.patch(
        f"/api/v1/admin/users/{target.id}/roles",
        json={"roles": ["staff"]},
        headers=headers,
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "INSUFFICIENT_PERMISSIONS"


# 3. Authorized Super Admin can access super admin endpoints
def test_authorized_super_admin_can_access_super_admin_endpoints(client, db_session):
    super_admin = create_user_with_role(
        db_session, AUTHORIZED_SUPER_ADMIN_EMAIL, ROLE_SUPER_ADMIN, is_email_verified=True
    )
    target = create_user_with_role(db_session, "target2@example.com", ROLE_CUSTOMER)

    headers = login_client(client, super_admin.email)

    resp = client.patch(
        f"/api/v1/admin/users/{target.id}/roles",
        json={"roles": ["staff", "manager"]},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert set(data["roles"]) == {"staff", "manager"}


# 4. Super Admin cannot assign super_admin to unauthorized email
def test_cannot_assign_super_admin_to_unauthorized_email(client, db_session):
    super_admin = create_user_with_role(
        db_session, AUTHORIZED_SUPER_ADMIN_EMAIL, ROLE_SUPER_ADMIN, is_email_verified=True
    )
    target = create_user_with_role(db_session, "otherstaff@example.com", ROLE_STAFF)

    headers = login_client(client, super_admin.email)

    # Attempt to elevate unauthorized email to super_admin
    resp = client.patch(
        f"/api/v1/admin/users/{target.id}/roles",
        json={"roles": ["super_admin"]},
        headers=headers,
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "SUPER_ADMIN_EXCLUSIVE"


# 5. Role changes revoke stale sessions
def test_role_change_revokes_sessions(client, db_session):
    super_admin = create_user_with_role(
        db_session, AUTHORIZED_SUPER_ADMIN_EMAIL, ROLE_SUPER_ADMIN, is_email_verified=True
    )
    target = create_user_with_role(db_session, "demoteme@example.com", ROLE_ADMIN)

    # Target logs in and gets an active session
    target_headers = login_client(client, target.email)
    verify_resp = client.get("/api/v1/auth/me")
    assert verify_resp.status_code == 200

    # Super Admin modifies target's roles
    admin_headers = login_client(client, super_admin.email)
    resp = client.patch(
        f"/api/v1/admin/users/{target.id}/roles",
        json={"roles": ["customer"]},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    # Target's active session must be revoked in DB
    revoked_sessions = db_session.execute(
        select(UserSession).where(UserSession.user_id == target.id, UserSession.is_revoked.is_(True))
    ).scalars().all()
    assert len(revoked_sessions) > 0


# 6. Bootstrap CLI rejects unauthorized email
def test_bootstrap_cli_rejects_unauthorized_email(db_session):
    with pytest.raises(ValueError, match="Security policy violation"):
        bootstrap_super_admin(
            email="hacker@attempt.com",
            first_name="Bad",
            last_name="Actor",
            password=PASSWORD,
            db=db_session,
        )

    # Legitimate email succeeds
    bootstrap_super_admin(
        email=AUTHORIZED_SUPER_ADMIN_EMAIL,
        first_name="Athul",
        last_name="Suresh",
        password=PASSWORD,
        db=db_session,
    )
    user = db_session.execute(
        select(User).where(User.email_normalized == AUTHORIZED_SUPER_ADMIN_EMAIL)
    ).scalar_one()
    assert user.is_email_verified is True
    assert has_role(user, ROLE_SUPER_ADMIN) is True


# 7. Public registration cannot grant super_admin
def test_public_registration_never_grants_super_admin(client, db_session):
    seed_standard_roles(db_session)
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": AUTHORIZED_SUPER_ADMIN_EMAIL,
            "password": PASSWORD,
            "first_name": "Athul",
            "last_name": "Suresh",
        },
        headers=csrf_headers(client),
    )
    assert resp.status_code == 201
    user = resp.json()["user"]
    # Strictly customer role only!
    assert user["roles"] == [ROLE_CUSTOMER]
    assert ROLE_SUPER_ADMIN not in user["roles"]


# 8. Social login cannot auto-promote to super_admin
def test_social_login_never_auto_promotes_to_super_admin(client, db_session):
    seed_standard_roles(db_session)
    mock_token = "google-super-admin-email-token"
    register_mock_social_token(
        mock_token,
        {
            "uid": "google_sub_athul",
            "email": AUTHORIZED_SUPER_ADMIN_EMAIL,
            "email_verified": True,
            "name": "Athul Suresh",
            "provider": "google.com",
        },
    )

    resp = client.post(
        "/api/v1/auth/social-login",
        json={"id_token": mock_token, "provider": "google.com"},
        headers=csrf_headers(client),
    )
    assert resp.status_code == 200
    user = resp.json()["user"]
    # For new social registrations, strictly customer!
    assert user["roles"] == [ROLE_CUSTOMER]
    assert ROLE_SUPER_ADMIN not in user["roles"]


# 9. Unverified email blocks super_admin privileges
def test_unverified_email_blocks_super_admin(db_session):
    user = create_user_with_role(
        db_session,
        AUTHORIZED_SUPER_ADMIN_EMAIL,
        ROLE_SUPER_ADMIN,
        is_email_verified=False,
    )
    assert is_authorized_super_admin(user) is False
    assert has_role(user, ROLE_SUPER_ADMIN) is False
    assert ROLE_SUPER_ADMIN not in get_user_roles(user)
