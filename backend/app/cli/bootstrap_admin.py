"""Secure CLI utility to bootstrap the initial super administrator.

Usage:
    python -m app.cli.bootstrap_admin --email admin@travelagency.com --first-name Super --last-name Admin
"""

import argparse
import getpass
import sys

from sqlalchemy import select

from app.core.permissions import (
    ALL_ROLES,
    AUTHORIZED_SUPER_ADMIN_EMAIL,
    AUTHORIZED_SUPER_ADMIN_EMAILS,
    ROLE_SUPER_ADMIN,
    has_role,
)
from app.core.security import (
    hash_password,
    normalize_email,
    validate_password_strength,
)
from app.db.session import get_session_factory
from app.models.content import AuditLog
from app.models.user import Role, User, UserRole


def seed_standard_roles(db) -> None:
    """Ensure all core role definitions exist in the database."""
    role_descriptions = {
        "customer": "Standard public customer account",
        "staff": "Operational staff access",
        "manager": "Agency manager access",
        "admin": "Administrative system access",
        "super_admin": "Unrestricted root administrative access",
    }
    for role_name in ALL_ROLES:
        existing = db.execute(
            select(Role).where(Role.name == role_name)
        ).scalar_one_or_none()
        if not existing:
            role = Role(name=role_name, description=role_descriptions.get(role_name))
            db.add(role)
    db.flush()


def bootstrap_super_admin(
    email: str,
    first_name: str,
    last_name: str,
    password: str,
    db=None,
    reset_password: bool = False,
) -> None:
    """Safely create or promote a user to the super_admin role."""
    normalized_email = normalize_email(email)
    validate_password_strength(password)

    if db is not None:
        _perform_bootstrap(
            db, email, normalized_email, first_name, last_name, password, reset_password
        )
    else:
        session_factory = get_session_factory()
        with session_factory() as session:
            _perform_bootstrap(
                session,
                email,
                normalized_email,
                first_name,
                last_name,
                password,
                reset_password,
            )


def _perform_bootstrap(
    db,
    email: str,
    normalized_email: str,
    first_name: str,
    last_name: str,
    password: str,
    reset_password: bool = False,
) -> None:
    if normalized_email not in AUTHORIZED_SUPER_ADMIN_EMAILS:
        raise ValueError(
            f"Security policy violation: Only the designated authorized Super Admin accounts "
            f"({AUTHORIZED_SUPER_ADMIN_EMAILS}) are permitted to hold the super_admin role. "
            f"Attempted email: '{email}'."
        )

    # Seed standard roles first
    seed_standard_roles(db)

    super_admin_role = db.execute(
        select(Role).where(Role.name == ROLE_SUPER_ADMIN)
    ).scalar_one()

    # Check if user already exists
    user = db.execute(
        select(User).where(User.email_normalized == normalized_email)
    ).scalar_one_or_none()

    if user:
        user.is_email_verified = True
        is_already_super = has_role(user, ROLE_SUPER_ADMIN)
        if not is_already_super:
            # Assign super_admin role
            assignment = UserRole(user_id=user.id, role_id=super_admin_role.id)
            db.add(assignment)
            audit = AuditLog(
                actor_user_id=user.id,
                action="admin.promoted_super_admin",
                entity_type="user",
                entity_id=str(user.id),
            )
            db.add(audit)

        if reset_password:
            user.password_hash = hash_password(password)
            audit = AuditLog(
                actor_user_id=user.id,
                action="admin.password_reset_cli",
                entity_type="user",
                entity_id=str(user.id),
            )
            db.add(audit)
            db.commit()
            print(
                f"Successfully updated password for super administrator '{normalized_email}'."
            )
            return

        db.commit()
        if is_already_super:
            print(
                f"User '{normalized_email}' is already a super administrator. (Use --reset-password to update password)"
            )
        else:
            print(
                f"Successfully promoted existing user '{normalized_email}' to super_admin."
            )
        return

    # Create new super admin
    hashed_pwd = hash_password(password)
    new_admin = User(
        email=email.strip(),
        email_normalized=normalized_email,
        password_hash=hashed_pwd,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        status="active",
        is_deleted=False,
        is_email_verified=True,
    )
    db.add(new_admin)
    db.flush()

    assignment = UserRole(user_id=new_admin.id, role_id=super_admin_role.id)
    db.add(assignment)

    audit = AuditLog(
        actor_user_id=new_admin.id,
        action="admin.bootstrapped_super_admin",
        entity_type="user",
        entity_id=str(new_admin.id),
    )
    db.add(audit)
    db.commit()
    print(f"Successfully created super administrator: {normalized_email}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bootstrap the initial super administrator safely."
    )
    parser.add_argument("--email", help="Super admin email address")
    parser.add_argument("--first-name", default="Super", help="First name")
    parser.add_argument("--last-name", default="Admin", help="Last name")
    parser.add_argument("--password", help="Account password (prompted if omitted)")
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Update password if user already exists",
    )

    args = parser.parse_args()

    email = args.email
    if not email:
        email = input("Enter super admin email: ").strip()

    first_name = args.first_name
    last_name = args.last_name
    password = args.password
    reset_password_flag = args.reset_password

    if not password:
        password = getpass.getpass(
            "Enter secure password (min 8 chars, mixed case, number, symbol): "
        )
        confirm_password = getpass.getpass("Confirm password: ")
        if password != confirm_password:
            print("Error: Passwords do not match.", file=sys.stderr)
            sys.exit(1)

    try:
        bootstrap_super_admin(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
            reset_password=reset_password_flag,
        )
    except Exception as exc:  # noqa: BLE001 — top-level CLI error handler
        print(f"Bootstrap failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
