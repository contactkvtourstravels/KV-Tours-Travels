"""Transfer Super Admin ownership to contact.kvtourstravels@gmail.com and update branding to KV Tours & Travels.

Revision ID: 20261111_0009
Revises: 20261021_0008
Create Date: 2026-11-11
"""

from collections.abc import Sequence
import json
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy import inspect, text

from alembic import op

revision: str = "20261111_0009"
down_revision: str | Sequence[str] | None = "20261021_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_SUPER_ADMIN_EMAIL = "contact.kvtourstravels@gmail.com"


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Fetch role IDs for super_admin and admin
    roles = conn.execute(text("SELECT id, name FROM roles")).fetchall()
    role_map = {row[1]: str(row[0]) for row in roles}
    super_admin_role_id = role_map.get("super_admin")
    admin_role_id = role_map.get("admin")

    if not super_admin_role_id:
        return

    # 2. Check if new super admin user exists
    target_user = conn.execute(
        text("SELECT id FROM users WHERE lower(trim(email_normalized)) = :email"),
        {"email": NEW_SUPER_ADMIN_EMAIL},
    ).fetchone()

    target_user_id = None
    if not target_user:
        new_id = uuid4().hex
        target_user_id = new_id
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, email_normalized, password_hash, first_name, last_name,
                    phone, status, is_deleted, is_email_verified, created_at, updated_at
                ) VALUES (
                    :id, :email, :email_normalized, NULL, 'KV', 'Super Admin',
                    NULL, 'active', 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": new_id,
                "email": NEW_SUPER_ADMIN_EMAIL,
                "email_normalized": NEW_SUPER_ADMIN_EMAIL,
            },
        )
    else:
        target_user_id = str(target_user[0]).replace("-", "")
        conn.execute(
            text(
                """
                UPDATE users
                SET is_email_verified = 1, status = 'active', is_deleted = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = :uid OR replace(cast(id as text), '-', '') = :uid
                """
            ),
            {"uid": target_user_id},
        )

    # 3. Ensure super_admin assignment exists for new super admin
    has_super = conn.execute(
        text(
            """
            SELECT id FROM user_roles
            WHERE (user_id = :uid OR replace(cast(user_id as text), '-', '') = :uid)
              AND (role_id = :rid OR replace(cast(role_id as text), '-', '') = replace(:rid, '-', ''))
            """
        ),
        {"uid": target_user_id, "rid": super_admin_role_id},
    ).fetchone()

    if not has_super:
        assign_id = uuid4().hex
        conn.execute(
            text(
                """
                INSERT INTO user_roles (id, user_id, role_id, created_at, updated_at)
                VALUES (:id, :uid, :rid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            ),
            {"id": assign_id, "uid": target_user_id, "rid": super_admin_role_id},
        )

    # 4. Demote/revoke super_admin from any other account
    unauthorized = conn.execute(
        text(
            """
            SELECT u.id, u.email, ur.id as assignment_id
            FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            WHERE (
                cast(ur.role_id as text) = :super_id
                OR replace(cast(ur.role_id as text), '-', '') = replace(:super_id, '-', '')
            )
            AND lower(trim(u.email_normalized)) != :auth_email
            """
        ),
        {"super_id": super_admin_role_id, "auth_email": NEW_SUPER_ADMIN_EMAIL},
    ).fetchall()

    for row in unauthorized:
        old_uid = str(row[0]).replace("-", "")
        old_email = row[1]
        old_assignment_id = row[2]

        # Demote to admin or remove role
        if admin_role_id:
            conn.execute(
                text(
                    """
                    UPDATE user_roles
                    SET role_id = :admin_id, updated_at = CURRENT_TIMESTAMP
                    WHERE id = :assignment_id
                    """
                ),
                {"admin_id": admin_role_id, "assignment_id": old_assignment_id},
            )
        else:
            conn.execute(
                text("DELETE FROM user_roles WHERE id = :assignment_id"),
                {"assignment_id": old_assignment_id},
            )

        # Invalidate sessions
        conn.execute(
            text(
                """
                UPDATE user_sessions
                SET is_revoked = 1
                WHERE user_id = :uid OR replace(cast(user_id as text), '-', '') = :uid
                """
            ),
            {"uid": old_uid},
        )

        # Record audit log
        audit_id = uuid4().hex
        meta = json.dumps(
            {
                "previous_role": "super_admin",
                "new_role": "admin" if admin_role_id else "none",
                "reason": f"Authorized transfer of Super Admin ownership to {NEW_SUPER_ADMIN_EMAIL}",
                "target_email": old_email,
            }
        )
        conn.execute(
            text(
                """
                INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at)
                VALUES (:aid, NULL, 'security.super_admin_transferred', 'user', :uid, :meta, CURRENT_TIMESTAMP)
                """
            ),
            {"aid": audit_id, "uid": old_uid, "meta": meta},
        )

    # 5. Update site_settings branding defaults
    site_settings_updates = {
        "agency_name": '"KV Tours & Travels"',
        "public_display_name": '"KV Tours & Travels"',
        "short_name": '"KV Tours"',
        "legal_business_name": '"KV Tours & Travels"',
        "tagline": '"Luxury & Adventure Journeys"',
        "contact_email": f'"{NEW_SUPER_ADMIN_EMAIL}"',
        "admin_notification_email": f'"{NEW_SUPER_ADMIN_EMAIL}"',
        "booking_email": f'"{NEW_SUPER_ADMIN_EMAIL}"',
        "customer_support_email": f'"{NEW_SUPER_ADMIN_EMAIL}"',
        "reply_to_email": f'"{NEW_SUPER_ADMIN_EMAIL}"',
        "email_sender_name": '"KV Tours & Travels"',
        "email_sender_email": f'"{NEW_SUPER_ADMIN_EMAIL}"',
        "email_subject_booking_confirmation": '"Your Booking Confirmation — KV Tours & Travels"',
        "email_subject_payment_receipt": '"Payment Receipt — KV Tours & Travels"',
        "email_subject_inquiry_ack": '"Inquiry Received — KV Tours & Travels"',
        "email_subject_trip_reminder": '"Your Upcoming Journey with KV Tours & Travels"',
        "whatsapp_prefilled_message": '"Hi KV Tours & Travels, I am interested in planning a trip."',
        "whatsapp_package_message": '"Hi KV Tours & Travels, I am interested in this package."',
        "whatsapp_destination_message": '"Hi KV Tours & Travels, I would like to know more about this destination."',
        "whatsapp_custom_trip_message": '"Hi KV Tours & Travels, I would like to plan a custom holiday."',
        "whatsapp_booking_support_message": '"Hi KV Tours & Travels, I need assistance with my booking."',
        "pdf_header_title": '"KV TOURS & TRAVELS"',
        "pdf_badge_label": '"Official Travel Voucher & Receipt"',
        "pdf_footer_declaration": '"KV Tours & Travels Operations • Official Travel Voucher\\nComputer-generated authoritative travel document • Valid without physical signature"',
    }

    for key, val in site_settings_updates.items():
        exists = conn.execute(
            text("SELECT key FROM site_settings WHERE key = :k"),
            {"k": key},
        ).fetchone()
        if exists:
            conn.execute(
                text("UPDATE site_settings SET value = :v WHERE key = :k"),
                {"v": val, "k": key},
            )
        else:
            conn.execute(
                text("INSERT INTO site_settings (key, value, is_public) VALUES (:k, :v, 1)"),
                {"k": key, "v": val},
            )

    # 6. Update bank transfer account holder name
    conn.execute(
        text("UPDATE bank_accounts SET account_holder_name = 'KV TOURS & TRAVELS' WHERE account_holder_name LIKE '%WILD ROUTE%'")
    )


def downgrade() -> None:
    pass

