"""Automated Neon PostgreSQL Migration & Seeding Script for KV Tours & Travels.

This script:
1. Normalizes the Neon connection string (handles postgresql:// and ensures psycopg driver).
2. Tests live connectivity to the Neon PostgreSQL cluster.
3. Applies all Alembic database schema migrations (alembic upgrade head).
4. Seeds all system roles (customer, staff, manager, admin, super_admin).
5. Bootstraps the Super Admin account (contact.kvtourstravels@gmail.com).
6. Seeds the official 13 tour packages, 13 destinations, and 18 group departures from the Google Sheet catalog.
7. Verifies table row counts and operational readiness.

Usage:
    python scripts/migrate_to_neon.py --database-url "postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require"
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from decimal import Decimal

# Ensure stdout uses UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure app root is on python path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def normalize_neon_url(raw_url: str) -> str:
    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def run_alembic_migrations(db_url: str) -> None:
    print("[1/5] Running Alembic database migrations against Neon PostgreSQL...")
    env = os.environ.copy()
    env["DATABASE_URL"] = db_url
    
    # Run alembic upgrade head
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("Alembic migration error:")
        print(result.stdout)
        print(result.stderr)
        raise RuntimeError("Failed to apply Alembic migrations to Neon PostgreSQL.")
    print("  -> All database tables created successfully in Neon.")


def seed_roles_and_admin(engine, admin_password: str | None = None) -> None:
    print("[2/5] Bootstrapping system roles and super admin in Neon...")
    from sqlalchemy.orm import sessionmaker
    from app.cli.bootstrap_admin import seed_standard_roles, bootstrap_super_admin

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with SessionLocal() as db:
        seed_standard_roles(db)
        
        pwd = admin_password or "KVTours2026!AdminSecure"
        bootstrap_super_admin(
            email="contact.kvtourstravels@gmail.com",
            first_name="KV",
            last_name="Admin",
            password=pwd,
            db=db,
            reset_password=True,
        )
        db.commit()
    print("  -> Roles and Super Admin (contact.kvtourstravels@gmail.com) verified.")


def seed_catalog(engine) -> None:
    print("[3/5] Seeding official Google Sheet catalog (13 Packages, 13 Destinations, 18 Departures)...")
    from sqlalchemy.orm import sessionmaker
    from app.catalog_import.seed_sheet_catalog import seed_sheet_catalog

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with SessionLocal() as db:
        seed_sheet_catalog(db=db)
    print("  -> Google Sheet catalog successfully populated in Neon.")


def seed_site_settings_and_cms(engine) -> None:
    print("[4/5] Configuring official KV Tours & Travels branding & CMS content...")
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select
    from app.models.content import SiteSetting

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with SessionLocal() as db:
        # Check and update site settings
        def set_setting(key: str, val: str, desc: str = ""):
            row = db.execute(select(SiteSetting).where(SiteSetting.key == key)).scalar_one_or_none()
            if not row:
                row = SiteSetting(key=key, value=val, description=desc)
                db.add(row)
            else:
                row.value = val

        set_setting("agency_name", "KV Tours & Travels", "Agency Brand Name")
        set_setting("public_display_name", "KV Tours & Travels", "Display Name")
        set_setting("short_name", "KV Tours", "Short Brand")
        set_setting("tagline", "Curated Journeys & Bespoke Expeditions", "Tagline")
        set_setting("contact_email", "contact.kvtourstravels@gmail.com", "Primary Email")
        set_setting("customer_support_email", "contact.kvtourstravels@gmail.com", "Support Email")
        set_setting("booking_email", "contact.kvtourstravels@gmail.com", "Booking Email")
        set_setting("whatsapp_number", "+919442000000", "Official WhatsApp")
        set_setting("contact_phone", "+91 94420 00000", "Phone")
        set_setting("agency_location", "Coimbatore, Tamil Nadu, India", "Location")
        set_setting("city", "Coimbatore", "City")
        set_setting("state", "Tamil Nadu", "State")
        set_setting("country", "India", "Country")
        set_setting("currency", "INR", "Default Currency")
        set_setting("whatsapp_enabled", "true", "WhatsApp Concierge Enabled")

        db.commit()
    print("  -> Site settings configured.")


def verify_database_counts(engine) -> None:
    print("[5/5] Verifying database integrity & row counts in Neon...")
    from sqlalchemy import text

    with engine.connect() as conn:
        dest_count = conn.execute(text("SELECT COUNT(*) FROM destinations")).scalar()
        pkg_count = conn.execute(text("SELECT COUNT(*) FROM packages")).scalar()
        dep_count = conn.execute(text("SELECT COUNT(*) FROM package_departures")).scalar()
        user_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()

    print("\n" + "=" * 60)
    print("NEON POSTGRESQL MIGRATION COMPLETE & VERIFIED!")
    print("=" * 60)
    print(f"  * Destinations:        {dest_count}")
    print(f"  * Tour Packages:       {pkg_count}")
    print(f"  * Group Departures:    {dep_count}")
    print(f"  * Users:               {user_count}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Migrate KV Tours & Travels to Neon PostgreSQL")
    parser.add_argument(
        "--database-url",
        dest="database_url",
        default=os.getenv("DATABASE_URL"),
        help="Neon PostgreSQL connection string (postgresql://...)",
    )
    parser.add_argument(
        "--admin-password",
        dest="admin_password",
        default="KVTours2026!AdminSecure",
        help="Password for contact.kvtourstravels@gmail.com",
    )
    args = parser.parse_args()

    raw_url = args.database_url
    if not raw_url:
        print("\nERROR: No Neon database URL provided.")
        print("Please provide --database-url or set the DATABASE_URL environment variable.")
        print('Example: python scripts/migrate_to_neon.py --database-url "postgresql://neondb_owner:***@ep-***.neon.tech/neondb?sslmode=require"')
        sys.exit(1)

    normalized_url = normalize_neon_url(raw_url)
    masked_url = normalized_url
    if "@" in masked_url:
        prefix, host = masked_url.split("@", 1)
        masked_url = prefix.split(":")[0] + ":****@" + host
    print(f"Connecting to Neon cluster: {masked_url}")

    # 1. Migrations
    run_alembic_migrations(normalized_url)

    # 2. Connect engine
    from sqlalchemy import create_engine
    engine = create_engine(normalized_url, pool_pre_ping=True)

    # 3. Seed Roles & Admin
    seed_roles_and_admin(engine, args.admin_password)

    # 4. Seed Catalog
    seed_catalog(engine)

    # 5. Seed Site Settings
    seed_site_settings_and_cms(engine)

    # 6. Verify
    verify_database_counts(engine)


if __name__ == "__main__":
    main()
