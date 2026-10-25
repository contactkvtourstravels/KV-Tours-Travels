"""Auditable administrative CLI tool to inspect and enforce Super Admin exclusivity.

Enforces:
- Only athulsuresh446@gmail.com can hold super_admin.
- Any unauthorized accounts holding super_admin are demoted to admin.
- Stale sessions for demoted users are immediately revoked.
- Actions are recorded in the audit_logs table.
- Does NOT silently create the authorized account if missing.
"""

from __future__ import annotations

import json
import logging
import sys
from uuid import uuid4

from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.core.permissions import (
    AUTHORIZED_SUPER_ADMIN_EMAIL,
    AUTHORIZED_SUPER_ADMIN_EMAILS,
    ROLE_ADMIN,
    ROLE_SUPER_ADMIN,
)
from app.db.session import get_session_factory
from app.models.content import AuditLog
from app.models.user import Role, User, UserRole, UserSession

logger = logging.getLogger(__name__)


def run_super_admin_audit(db: Session) -> dict:
    """Audit all accounts holding super_admin and enforce strict exclusivity."""
    # 1. Fetch super_admin and admin roles
    super_admin_role = db.execute(
        select(Role).where(Role.name == ROLE_SUPER_ADMIN)
    ).scalar_one_or_none()
    admin_role = db.execute(
        select(Role).where(Role.name == ROLE_ADMIN)
    ).scalar_one_or_none()

    if not super_admin_role or not admin_role:
        raise RuntimeError("Required system roles ('super_admin' or 'admin') are missing from database.")

    # 2. Query all assignments of super_admin
    assignments = db.execute(
        select(UserRole, User)
        .join(User, UserRole.user_id == User.id)
        .where(UserRole.role_id == super_admin_role.id)
    ).all()

    demoted_accounts = []
    authorized_found = False

    for role_assignment, user in assignments:
        norm_email = (user.email_normalized or user.email or "").strip().lower()
        if norm_email in AUTHORIZED_SUPER_ADMIN_EMAILS:
            authorized_found = True
            logger.info("Verified authorized Super Admin account: %s (id=%s)", user.email, user.id)
        else:
            # Unauthorized holder: demote to admin
            logger.warning("Revoking unauthorized super_admin from %s (id=%s)", user.email, user.id)
            role_assignment.role_id = admin_role.id

            # Revoke all active sessions for the demoted user
            db.execute(
                text("UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = :uid"),
                {"uid": user.id},
            )

            # Record audit log
            audit = AuditLog(
                actor_user_id=None,
                action="security.super_admin_revoked_unauthorized",
                entity_type="user",
                entity_id=str(user.id),
                metadata_json={
                    "previous_role": ROLE_SUPER_ADMIN,
                    "new_role": ROLE_ADMIN,
                    "reason": f"Super Admin restricted exclusively to {AUTHORIZED_SUPER_ADMIN_EMAILS}",
                    "target_email": user.email,
                },
            )
            db.add(audit)
            demoted_accounts.append({
                "id": str(user.id),
                "email": user.email,
                "previous_role": ROLE_SUPER_ADMIN,
                "new_role": ROLE_ADMIN,
            })

    # 3. Check and provision super_admin for any existing authorized super admin accounts
    for auth_email in sorted(AUTHORIZED_SUPER_ADMIN_EMAILS):
        target_user = db.execute(
            select(User).where(User.email_normalized == auth_email)
        ).scalar_one_or_none()
        if target_user:
            target_user.is_email_verified = True
            has_super = db.execute(
                select(UserRole).where(
                    UserRole.user_id == target_user.id,
                    UserRole.role_id == super_admin_role.id,
                )
            ).scalar_one_or_none()
            if not has_super:
                db.add(UserRole(user_id=target_user.id, role_id=super_admin_role.id))
                logger.info("Provisioned super_admin role for authorized account: %s", target_user.email)
            authorized_found = True

    target_exists = authorized_found
    target_has_super = authorized_found

    db.commit()

    return {
        "authorized_email": AUTHORIZED_SUPER_ADMIN_EMAIL,
        "authorized_account_exists": target_exists,
        "authorized_account_has_super_admin": target_has_super,
        "demoted_unauthorized_accounts": demoted_accounts,
    }


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    session_factory = get_session_factory()
    with session_factory() as session:
        result = run_super_admin_audit(session)
        print("\n=== SUPER ADMIN AUDIT SUMMARY ===")
        print(f"Authorized Email: {result['authorized_email']}")
        print(f"Authorized Account Exists in DB: {result['authorized_account_exists']}")
        print(f"Authorized Account Holds Super Admin: {result['authorized_account_has_super_admin']}")
        print(f"Demoted Unauthorized Accounts: {len(result['demoted_unauthorized_accounts'])}")
        for d in result["demoted_unauthorized_accounts"]:
            print(f"  - Demoted {d['email']} (id={d['id']}) from {d['previous_role']} to {d['new_role']} and revoked all sessions")

        if not result["authorized_account_exists"]:
            print("\n[IMPORTANT ACTION REQUIRED]")
            print(f"The authorized account '{result['authorized_email']}' does not exist in the database yet.")
            print("To bootstrap this account securely, run:")
            print(f"  python -m app.cli.bootstrap_admin --email {result['authorized_email']} --first-name Super --last-name Admin --password <YourSecurePassword>")


if __name__ == "__main__":
    main()
