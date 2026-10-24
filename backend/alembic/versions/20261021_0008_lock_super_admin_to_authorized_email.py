"""Lock super_admin role exclusively to athulsuresh446@gmail.com and add email verification.

Revision ID: 20261021_0008
Revises: 20261013_0007
Create Date: 2026-10-21
"""

from collections.abc import Sequence
import json
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy import inspect, select, text
from sqlalchemy.exc import SQLAlchemyError

from alembic import op

revision: str = "20261021_0008"
down_revision: str | Sequence[str] | None = "20261013_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

AUTHORIZED_SUPER_ADMIN_EMAIL = "athulsuresh446@gmail.com"


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add is_email_verified column to users if not present
    can_inspect = True
    cols = []
    try:
        insp = inspect(conn)
        cols = [col["name"] for col in insp.get_columns("users")]
    except Exception:
        can_inspect = False

    if not can_inspect or "is_email_verified" not in cols:
        op.add_column(
            "users",
            sa.Column(
                "is_email_verified",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if not can_inspect:
        return

    # 2. Fetch role IDs for super_admin and admin
    roles = conn.execute(text("SELECT id, name FROM roles")).fetchall()
    role_map = {row[1]: str(row[0]) for row in roles}
    super_admin_role_id = role_map.get("super_admin")
    admin_role_id = role_map.get("admin")

    if not super_admin_role_id or not admin_role_id:
        return

    # 3. Find any accounts holding super_admin whose email is NOT the authorized email
    unauthorized_supers = conn.execute(
        text(
            """
            SELECT u.id, u.email, u.email_normalized, ur.id as assignment_id
            FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            WHERE (
                cast(ur.role_id as text) = :super_id
                OR replace(cast(ur.role_id as text), '-', '') = replace(:super_id, '-', '')
            )
            AND lower(trim(u.email_normalized)) != :auth_email
            """
        ),
        {"super_id": super_admin_role_id, "auth_email": AUTHORIZED_SUPER_ADMIN_EMAIL},
    ).fetchall()

    for row in unauthorized_supers:
        user_id = row[0]
        user_email = row[1]
        assignment_id = row[3]

        # Demote role from super_admin to standard admin
        conn.execute(
            text(
                """
                UPDATE user_roles
                SET role_id = (SELECT id FROM roles WHERE name = 'admin')
                WHERE id = :assignment_id
                """
            ),
            {"assignment_id": assignment_id},
        )

        # Invalidate all active sessions for the demoted user (PostgreSQL boolean compatibility)
        conn.execute(
            text(
                """
                UPDATE user_sessions
                SET is_revoked = TRUE
                WHERE user_id = :uid
                """
            ),
            {"uid": user_id},
        )

        # Record security audit log
        audit_id = str(uuid4())
        meta = json.dumps(
            {
                "previous_role": "super_admin",
                "new_role": "admin",
                "reason": f"Super Admin role locked exclusively to {AUTHORIZED_SUPER_ADMIN_EMAIL}",
                "target_email": user_email,
            }
        )
        conn.execute(
            text(
                """
                INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
                VALUES (:aid, NULL, 'security.super_admin_revoked_unauthorized', 'user', :uid, :meta, CURRENT_TIMESTAMP)
                """
            ),
            {"aid": audit_id, "uid": str(user_id), "meta": meta},
        )


def downgrade() -> None:
    conn = op.get_bind()
    can_inspect = True
    cols = []
    try:
        insp = inspect(conn)
        cols = [col["name"] for col in insp.get_columns("users")]
    except Exception:
        can_inspect = False

    if can_inspect and "is_email_verified" in cols:
        op.drop_column("users", "is_email_verified")
