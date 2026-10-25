"""Create the initial travel-agency domain schema.

Revision ID: 20261004_0001
Revises:
Create Date: 2026-10-04
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261004_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


INITIAL_TABLE_NAMES = [
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
    "best_offers",
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
]


def upgrade() -> None:
    """Create the initial schema from the versioned metadata snapshot."""
    import app.models  # noqa: F401 — register all models with this revision's metadata
    from app.db.base import Base

    bind = op.get_bind()
    tables = [Base.metadata.tables[name] for name in INITIAL_TABLE_NAMES]
    Base.metadata.create_all(bind=bind, tables=tables, checkfirst=False)


def downgrade() -> None:
    """Drop the initial domain schema in dependency order."""
    import app.models  # noqa: F401 — register all models with this revision's metadata
    from app.db.base import Base

    bind = op.get_bind()
    tables = [Base.metadata.tables[name] for name in reversed(INITIAL_TABLE_NAMES)]
    Base.metadata.drop_all(bind=bind, tables=tables, checkfirst=False)
