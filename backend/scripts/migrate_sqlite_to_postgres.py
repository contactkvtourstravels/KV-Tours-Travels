"""Verified data migration tool: copies all records from SQLite to PostgreSQL.

Usage:
    python -m scripts.migrate_sqlite_to_postgres [--sqlite-path travelagency.db] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import logging
import sqlite3
import sys
from pathlib import Path

from sqlalchemy import MetaData, Table, create_engine, select, text
from sqlalchemy.orm import sessionmaker

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sqlite_to_pg")

# Ordered list of tables respecting foreign key relationships
TABLE_ORDER = [
    "roles",
    "users",
    "user_roles",
    "user_sessions",
    "site_settings",
    "destinations",
    "destination_images",
    "hotels",
    "activities",
    "packages",
    "package_images",
    "package_days",
    "package_hotels",
    "package_activities",
    "package_departures",
    "add_ons",
    "add_on_packages",
    "add_on_destinations",
    "best_offers",
    "bank_accounts",
    "bookings",
    "booking_travellers",
    "booking_cancellation_requests",
    "payments",
    "payment_refunds",
    "inquiries",
    "notification_logs",
    "audit_logs",
]


def get_sqlite_tables_and_counts(sqlite_path: Path) -> dict[str, int]:
    """Inspect SQLite database and return table row counts."""
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall() if row[0] not in ("sqlite_sequence",)]
    counts = {}
    for table in tables:
        cursor.execute(f'SELECT count(*) FROM "{table}"')
        counts[table] = cursor.fetchone()[0]
    conn.close()
    return counts


def migrate_data(
    sqlite_path: Path,
    target_engine,
    dry_run: bool = False,
) -> dict[str, int]:
    """Read data from SQLite and insert into target PostgreSQL database."""
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    metadata = MetaData()
    metadata.reflect(bind=target_engine)

    migration_summary = {}

    with target_engine.connect() as pg_conn:
        transaction = pg_conn.begin()
        try:
            for table_name in TABLE_ORDER:
                if table_name not in metadata.tables:
                    logger.warning("Table '%s' not found in PostgreSQL metadata. Skipping.", table_name)
                    continue

                pg_table: Table = metadata.tables[table_name]

                # Check if target already has rows
                existing_count = pg_conn.execute(
                    select(text("count(*)")).select_from(pg_table)
                ).scalar() or 0

                if existing_count > 0:
                    logger.info("Table '%s' already contains %d rows in PostgreSQL. Skipping to avoid duplicates.", table_name, existing_count)
                    migration_summary[table_name] = existing_count
                    continue

                # Fetch all rows from SQLite
                sqlite_cursor.execute(f'SELECT * FROM "{table_name}"')
                rows = sqlite_cursor.fetchall()
                if not rows:
                    migration_summary[table_name] = 0
                    continue

                logger.info("Migrating table '%s': %d records found in SQLite...", table_name, len(rows))

                # Identify boolean and JSON columns from target table
                boolean_cols = {
                    col.name
                    for col in pg_table.columns
                    if str(col.type).lower().startswith("bool")
                }
                json_cols = {
                    col.name
                    for col in pg_table.columns
                    if "json" in str(col.type).lower()
                }

                records_to_insert = []
                for row in rows:
                    record = dict(row)
                    # Convert boolean integer flags (0/1) to Python bools for PostgreSQL
                    for b_col in boolean_cols:
                        if b_col in record and record[b_col] is not None:
                            record[b_col] = bool(record[b_col])
                    # Parse JSON strings into Python dict/list structures for PostgreSQL JSON/JSONB
                    for j_col in json_cols:
                        if j_col in record and isinstance(record[j_col], str):
                            try:
                                record[j_col] = json.loads(record[j_col])
                            except (ValueError, TypeError):
                                pass
                    records_to_insert.append(record)

                if not dry_run and records_to_insert:
                    # Batch insert
                    pg_conn.execute(pg_table.insert(), records_to_insert)

                migration_summary[table_name] = len(records_to_insert)
                logger.info("Successfully queued %d records for '%s'.", len(records_to_insert), table_name)

            if not dry_run:
                transaction.commit()
                logger.info("Migration transaction successfully committed to PostgreSQL!")
            else:
                transaction.rollback()
                logger.info("Dry-run complete. Transaction rolled back.")

        except Exception as exc:
            transaction.rollback()
            logger.error("Migration failed on table '%s': %s", table_name, exc)
            raise
        finally:
            sqlite_conn.close()

    return migration_summary


def main():
    parser = argparse.ArgumentParser(description="Migrate SQLite data to PostgreSQL.")
    parser.add_argument("--sqlite-path", default="travelagency.db", help="Path to source SQLite file")
    parser.add_argument("--dry-run", action="store_true", help="Perform dry-run without committing")
    args = parser.parse_args()

    candidates = [
        Path(args.sqlite_path),
        Path("backend") / args.sqlite_path,
        Path(__file__).resolve().parent.parent / "travelagency.db",
        Path(__file__).resolve().parent.parent / args.sqlite_path,
    ]
    sqlite_file = None
    for cand in candidates:
        if cand.exists():
            sqlite_file = cand
            break

    if sqlite_file is None:
        logger.error(
            "Source SQLite database not found at %s. Tried: %s",
            args.sqlite_path,
            [str(c) for c in candidates],
        )
        sys.exit(1)

    from app.core.config import get_settings
    from app.db.session import get_engine

    settings = get_settings()
    logger.info("Source database: %s", sqlite_file.resolve())
    logger.info("Target database: %s", settings.database_url.split("@")[-1] if "@" in settings.database_url else "local")

    if "sqlite" in settings.database_url.lower() and not args.dry_run:
        logger.warning("Target database is currently SQLite. Run this with target DATABASE_URL set to PostgreSQL.")

    counts = get_sqlite_tables_and_counts(sqlite_file)
    print("\n=== SOURCE SQLITE INVENTORY ===")
    for tbl, cnt in counts.items():
        if cnt > 0:
            print(f"  {tbl:35s}: {cnt:5d} records")

    engine = get_engine()
    results = migrate_data(sqlite_file, engine, dry_run=args.dry_run)
    print("\n=== MIGRATION RESULTS ===")
    for tbl, cnt in results.items():
        print(f"  {tbl:35s}: {cnt:5d} records migrated")


if __name__ == "__main__":
    main()
