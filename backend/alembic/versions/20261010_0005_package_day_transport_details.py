"""Add optional structured transport details to package itinerary days.

Revision ID: 20261010_0005
Revises: 20261010_0004
Create Date: 2026-10-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from alembic import op

revision: str = "20261010_0005"
down_revision: str | Sequence[str] | None = "20261010_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    can_inspect = False
    day_cols = set()

    try:
        insp = inspect(conn)
        day_cols = {c["name"] for c in insp.get_columns("package_days")}
        can_inspect = True
    except (SQLAlchemyError, TypeError, AttributeError):
        can_inspect = False

    new_day_cols = [
        ("transport_type", sa.String(50)),
        ("transport_details", sa.String(500)),
        ("transport_time", sa.String(100)),
        ("transport_price", sa.Numeric(precision=14, scale=2)),
    ]
    for col_name, col_type in new_day_cols:
        if not can_inspect or col_name not in day_cols:
            op.add_column(
                "package_days",
                sa.Column(col_name, col_type, nullable=True),
            )


def downgrade() -> None:
    for col_name in [
        "transport_price",
        "transport_time",
        "transport_details",
        "transport_type",
    ]:
        op.drop_column("package_days", col_name)
