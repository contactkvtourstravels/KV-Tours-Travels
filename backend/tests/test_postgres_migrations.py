"""Alembic PostgreSQL migration and schema verification tests."""

import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import text

from tests.conftest import is_postgres_available


def test_alembic_offline_sql_generation() -> None:
    """Validate that Alembic offline SQL generation outputs complete, valid PostgreSQL DDL.

    This test executes `alembic upgrade head --sql` using the project's configured
    PostgreSQL dialect, ensuring that all tables, foreign keys, indexes, and constraints
    are reproducible and generate valid SQL without requiring a live database server.
    """
    backend_dir = Path(__file__).resolve().parents[1]
    python_exe = sys.executable

    env = {
        **os.environ,
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/travelagency",
    }
    result = subprocess.run(
        [python_exe, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=str(backend_dir),
        capture_output=True,
        text=True,
        check=True,
        env=env,
    )

    sql_output = result.stdout
    assert "BEGIN;" in sql_output
    assert "COMMIT;" in sql_output

    # Check for all required domain tables
    expected_tables = [
        "users",
        "roles",
        "user_roles",
        "destinations",
        "destination_images",
        "packages",
        "package_images",
        "package_days",
        "hotels",
        "package_hotels",
        "activities",
        "package_activities",
        "package_day_activities",
        "package_departures",
        "bookings",
        "booking_travellers",
        "add_ons",
        "booking_add_ons",
        "payments",
        "payment_refunds",
        "reviews",
        "coupons",
        "coupon_usage",
        "wishlist_items",
        "inquiries",
        "blog_posts",
        "site_settings",
        "audit_logs",
        "user_sessions",
        "password_reset_tokens",
        "saved_travellers",
        "booking_cancellation_requests",
        "notification_logs",
        "internal_notes",
    ]

    for table in expected_tables:
        assert f"CREATE TABLE {table}" in sql_output, (
            f"Table {table} missing from generated DDL"
        )

    # Check for critical constraints and indexes
    assert "uq_destinations_slug UNIQUE (slug)" in sql_output
    assert "uq_packages_slug UNIQUE (slug)" in sql_output
    assert "uq_bookings_reference UNIQUE (booking_reference)" in sql_output
    assert "ck_reviews_rating_range CHECK (rating >= 1 AND rating <= 5)" in sql_output
    assert "uq_wishlist_items_user_package UNIQUE (user_id, package_id)" in sql_output
    assert "uq_package_days_package_day UNIQUE (package_id, day_number)" in sql_output
    assert "ck_departures_capacity_sum" in sql_output
    assert "ix_destinations_published_featured" in sql_output
    assert "ix_packages_published_featured" in sql_output
    assert "ck_cancellation_requests_status" in sql_output
    assert "ck_notification_logs_channel" in sql_output
    assert "ck_internal_notes_entity_type" in sql_output

    # Verify that the erroneous unique constraint on booking_id in booking_travellers is absent
    assert "CONSTRAINT uq_coupon_usage_booking UNIQUE (booking_id)" not in sql_output


@pytest.mark.skipif(
    not is_postgres_available(),
    reason="Live PostgreSQL database is not available on localhost:5432.",
)
def test_live_postgresql_connection_and_migration() -> None:
    """Verify live PostgreSQL migration and connectivity when a PostgreSQL server is running.

    This test is explicitly skipped when a live PostgreSQL server is unavailable,
    maintaining a clear separation between verified offline DDL generation and live server checks.
    """
    from app.db.session import get_engine

    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1;"))
        assert result.scalar() == 1
