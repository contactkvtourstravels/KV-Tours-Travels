"""Add bank accounts management table for finance and wire transfers.

Revision ID: 20261013_0007
Revises: 20261011_0006
Create Date: 2026-10-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from alembic import op

revision: str = "20261013_0007"
down_revision: str | Sequence[str] | None = "20261011_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    can_inspect = False
    tables = set()

    try:
        insp = inspect(conn)
        tables = set(insp.get_table_names())
        can_inspect = True
    except (SQLAlchemyError, TypeError, AttributeError):
        can_inspect = False

    if not can_inspect or "bank_accounts" not in tables:
        op.create_table(
            "bank_accounts",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("account_holder_name", sa.String(120), nullable=False),
            sa.Column("bank_name", sa.String(100), nullable=False),
            sa.Column("account_number", sa.String(50), nullable=False),
            sa.Column("ifsc_code", sa.String(20), nullable=False),
            sa.Column("branch_name", sa.String(100), nullable=False),
            sa.Column("account_type", sa.String(30), nullable=False, server_default="Current"),
            sa.Column("upi_id", sa.String(100), nullable=True),
            sa.Column("swift_code", sa.String(20), nullable=True),
            sa.Column("bank_address", sa.String(255), nullable=True),
            sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
            sa.Column("status", sa.String(20), nullable=False, server_default="active"),
            sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("transfer_instructions", sa.Text(), nullable=True),
            sa.Column("branch_cash_instructions", sa.Text(), nullable=True),
            sa.Column("effective_date", sa.Date(), nullable=True),
            sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
            sa.Column("updated_by_user_id", sa.Uuid(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        )
        op.create_index("ix_bank_accounts_status", "bank_accounts", ["status"])
        op.create_index("ix_bank_accounts_is_default", "bank_accounts", ["is_default"])


def downgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    tables = set(insp.get_table_names())
    if "bank_accounts" in tables:
        op.drop_table("bank_accounts")
