"""Ensure contact.kvtourstravels@gmail.com has super_admin role and verified status.

Revision ID: 20261113_0011
Revises: 20261112_0010
Create Date: 2026-11-13
"""

from collections.abc import Sequence
from uuid import uuid4
from sqlalchemy import text
from alembic import op
from app.core.security import hash_password

revision: str = "20261113_0011"
down_revision: str | Sequence[str] | None = "20261112_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SUPER_ADMIN_EMAIL = "contact.kvtourstravels@gmail.com"
DEFAULT_PASSWORD_HASH = hash_password("KVTours2026!AdminSecure")


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Fetch or create super_admin and admin roles
    roles = conn.execute(text("SELECT id, name FROM roles")).fetchall()
    role_map = {row[1]: row[0] for row in roles}

    for role_name, desc in [
        ("super_admin", "Super Administrator"),
        ("admin", "Administrator"),
        ("manager", "Operations Manager"),
        ("staff", "Support Staff"),
        ("customer", "Customer"),
    ]:
        if role_name not in role_map:
            rid = uuid4()
            conn.execute(
                text(
                    "INSERT INTO roles (id, name, description, created_at, updated_at) "
                    "VALUES (:id, :name, :desc, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                ),
                {"id": rid, "name": role_name, "desc": desc},
            )
            role_map[role_name] = rid

    super_admin_role_id = role_map.get("super_admin")
    admin_role_id = role_map.get("admin")

    # 2. Check user
    user = conn.execute(
        text("SELECT id, password_hash FROM users WHERE lower(trim(email_normalized)) = :email"),
        {"email": SUPER_ADMIN_EMAIL},
    ).fetchone()

    target_user_id = None
    if not user:
        new_id = uuid4()
        target_user_id = new_id
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, email_normalized, password_hash, first_name, last_name,
                    phone, status, is_deleted, is_email_verified, created_at, updated_at
                ) VALUES (
                    :id, :email, :email_normalized, :pwd, 'KV', 'Super Admin',
                    NULL, 'active', :is_deleted, :is_email_verified, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": new_id,
                "email": SUPER_ADMIN_EMAIL,
                "email_normalized": SUPER_ADMIN_EMAIL,
                "pwd": DEFAULT_PASSWORD_HASH,
                "is_deleted": False,
                "is_email_verified": True,
            },
        )
    else:
        target_user_id = user[0]
        # Update user status, verified, and password if missing
        conn.execute(
            text(
                """
                UPDATE users
                SET is_email_verified = :is_verified, status = 'active', is_deleted = :is_deleted,
                    password_hash = COALESCE(password_hash, :pwd),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :uid
                """
            ),
            {
                "uid": target_user_id,
                "pwd": DEFAULT_PASSWORD_HASH,
                "is_verified": True,
                "is_deleted": False,
            },
        )

    # 3. Ensure role assignments for super_admin and admin
    for rid in (super_admin_role_id, admin_role_id):
        if not rid or not target_user_id:
            continue
        exists = conn.execute(
            text(
                """
                SELECT id FROM user_roles
                WHERE user_id = :uid AND role_id = :rid
                """
            ),
            {"uid": target_user_id, "rid": rid},
        ).fetchone()

        if not exists:
            conn.execute(
                text(
                    """
                    INSERT INTO user_roles (id, user_id, role_id, created_at)
                    VALUES (:id, :uid, :rid, CURRENT_TIMESTAMP)
                    """
                ),
                {"id": uuid4(), "uid": target_user_id, "rid": rid},
            )


def downgrade() -> None:
    pass
