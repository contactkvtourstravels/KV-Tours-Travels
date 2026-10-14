"""Add rich destination content, structured package metadata, and add-on scope associations.

Revision ID: 20261010_0004
Revises: 20261008_0003
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from alembic import op

revision: str = "20261010_0004"
down_revision: str | Sequence[str] | None = "20261008_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    can_inspect = False
    dest_cols = set()
    pkg_cols = set()
    addon_cols = set()
    tables = set()

    try:
        insp = inspect(conn)
        dest_cols = {c["name"] for c in insp.get_columns("destinations")}
        pkg_cols = {c["name"] for c in insp.get_columns("packages")}
        addon_cols = {c["name"] for c in insp.get_columns("add_ons")}
        tables = set(insp.get_table_names())
        can_inspect = True
    except (SQLAlchemyError, TypeError, AttributeError):
        can_inspect = False

    # 1. Destinations columns
    new_dest_cols = [
        ("state_or_city", sa.String(120), None),
        ("category", sa.String(80), None),
        ("travel_type", sa.String(80), None),
        ("cover_image_url", sa.Text(), None),
        ("display_order", sa.Integer(), "0"),
        ("highlights_json", sa.JSON(), None),
        ("travel_guide_json", sa.JSON(), None),
        ("faqs_json", sa.JSON(), None),
        ("social_image_url", sa.Text(), None),
    ]
    for col_name, col_type, server_default in new_dest_cols:
        if not can_inspect or col_name not in dest_cols:
            op.add_column(
                "destinations",
                sa.Column(
                    col_name, col_type, nullable=True, server_default=server_default
                ),
            )

    # 2. Packages columns
    new_pkg_cols = [
        ("category", sa.String(80), None),
        ("travel_type", sa.String(80), None),
        ("difficulty_level", sa.String(50), None),
        ("departure_location", sa.String(120), None),
        ("cover_image_url", sa.Text(), None),
        ("inclusions_json", sa.JSON(), None),
        ("exclusions_json", sa.JSON(), None),
        ("child_price", sa.Numeric(precision=14, scale=2), None),
        ("infant_price", sa.Numeric(precision=14, scale=2), None),
        ("single_room_supplement", sa.Numeric(precision=14, scale=2), None),
        ("booking_cutoff_days", sa.Integer(), "3"),
        ("cancellation_policy", sa.Text(), None),
    ]
    for col_name, col_type, server_default in new_pkg_cols:
        if not can_inspect or col_name not in pkg_cols:
            op.add_column(
                "packages",
                sa.Column(
                    col_name, col_type, nullable=True, server_default=server_default
                ),
            )

    # 3. AddOns columns
    new_addon_cols = [
        ("applicability_scope", sa.String(50), "'all_packages'"),
        ("price_type", sa.String(50), "'per_booking'"),
        ("min_quantity", sa.Integer(), "1"),
        ("max_quantity", sa.Integer(), "10"),
        ("is_mandatory", sa.Boolean(), "false"),
        ("display_order", sa.Integer(), "0"),
    ]
    for col_name, col_type, server_default in new_addon_cols:
        if not can_inspect or col_name not in addon_cols:
            op.add_column(
                "add_ons",
                sa.Column(
                    col_name,
                    col_type,
                    nullable=False,
                    server_default=sa.text(server_default),
                ),
            )

    # 4. Association tables
    if not can_inspect or "add_on_packages" not in tables:
        op.create_table(
            "add_on_packages",
            sa.Column(
                "add_on_id",
                sa.Uuid(as_uuid=True),
                sa.ForeignKey("add_ons.id", ondelete="CASCADE"),
                primary_key=True,
            ),
            sa.Column(
                "package_id",
                sa.Uuid(as_uuid=True),
                sa.ForeignKey("packages.id", ondelete="CASCADE"),
                primary_key=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )

    if not can_inspect or "add_on_destinations" not in tables:
        op.create_table(
            "add_on_destinations",
            sa.Column(
                "add_on_id",
                sa.Uuid(as_uuid=True),
                sa.ForeignKey("add_ons.id", ondelete="CASCADE"),
                primary_key=True,
            ),
            sa.Column(
                "destination_id",
                sa.Uuid(as_uuid=True),
                sa.ForeignKey("destinations.id", ondelete="CASCADE"),
                primary_key=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    can_inspect = False
    tables = set()

    try:
        insp = inspect(conn)
        tables = set(insp.get_table_names())
        can_inspect = True
    except (SQLAlchemyError, TypeError, AttributeError):
        can_inspect = False

    if not can_inspect or "add_on_destinations" in tables:
        op.drop_table("add_on_destinations")
    if not can_inspect or "add_on_packages" in tables:
        op.drop_table("add_on_packages")
