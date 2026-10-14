"""Add best offers management and booking offer association.

Revision ID: 20261011_0006
Revises: 20261010_0005
Create Date: 2026-10-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from alembic import op

revision: str = "20261011_0006"
down_revision: str | Sequence[str] | None = "20261010_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    can_inspect = False
    tables = set()
    booking_cols = set()

    try:
        insp = inspect(conn)
        tables = set(insp.get_table_names())
        booking_cols = {c["name"] for c in insp.get_columns("bookings")}
        can_inspect = True
    except (SQLAlchemyError, TypeError, AttributeError):
        can_inspect = False

    if not can_inspect or "best_offers" not in tables:
        op.create_table(
            "best_offers",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("package_id", sa.Uuid(), nullable=False),
            sa.Column("title", sa.String(180), nullable=False),
            sa.Column("short_description", sa.String(500), nullable=True),
            sa.Column("discount_type", sa.String(24), nullable=False),
            sa.Column("discount_value", sa.Numeric(14, 2), nullable=False),
            sa.Column("original_price_snapshot", sa.Numeric(14, 2), nullable=True),
            sa.Column("minimum_booking_amount", sa.Numeric(14, 2), nullable=True),
            sa.Column("maximum_discount_amount", sa.Numeric(14, 2), nullable=True),
            sa.Column("offer_label", sa.String(100), nullable=True),
            sa.Column("badge_text", sa.String(60), nullable=True),
            sa.Column(
                "is_featured",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("status", sa.String(24), nullable=False, server_default="active"),
            sa.Column("start_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "display_order", sa.Integer(), nullable=False, server_default="0"
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.ForeignKeyConstraint(
                ["package_id"], ["packages.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.CheckConstraint(
                "discount_type IN ('percentage', 'fixed_amount', 'fixed')",
                name="ck_best_offers_discount_type",
            ),
            sa.CheckConstraint(
                "discount_value > 0",
                name="ck_best_offers_discount_value_positive",
            ),
            sa.CheckConstraint(
                "discount_type <> 'percentage' OR discount_value <= 100",
                name="ck_best_offers_percentage_max_100",
            ),
            sa.CheckConstraint(
                "minimum_booking_amount IS NULL OR minimum_booking_amount >= 0",
                name="ck_best_offers_min_booking_nonnegative",
            ),
            sa.CheckConstraint(
                "maximum_discount_amount IS NULL OR maximum_discount_amount >= 0",
                name="ck_best_offers_max_discount_nonnegative",
            ),
            sa.CheckConstraint(
                "end_at IS NULL OR start_at IS NULL OR end_at >= start_at",
                name="ck_best_offers_valid_window",
            ),
            sa.CheckConstraint(
                "status IN ('draft', 'published', 'active', 'disabled', 'archived')",
                name="ck_best_offers_status",
            ),
        )
        op.create_index(
            "ix_best_offers_package_status", "best_offers", ["package_id", "status"]
        )
        op.create_index(
            "ix_best_offers_validity", "best_offers", ["status", "start_at", "end_at"]
        )
        op.create_index(
            "ix_best_offers_display_order",
            "best_offers",
            ["display_order", "created_at"],
        )

    if not can_inspect or "offer_id" not in booking_cols:
        op.add_column(
            "bookings",
            sa.Column("offer_id", sa.Uuid(), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("bookings", "offer_id")
    op.drop_index("ix_best_offers_display_order", table_name="best_offers")
    op.drop_index("ix_best_offers_validity", table_name="best_offers")
    op.drop_index("ix_best_offers_package_status", table_name="best_offers")
    op.drop_table("best_offers")
