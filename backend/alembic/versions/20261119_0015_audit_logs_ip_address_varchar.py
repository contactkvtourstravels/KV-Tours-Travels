"""Alter audit_logs ip_address to VARCHAR(45)

Revision ID: 20261119_0015
Revises: 20261118_0014
Create Date: 2026-11-19 07:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "20261119_0015"
down_revision: str | None = "20261118_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == "postgresql":
        # Safely convert audit_logs.ip_address from INET to VARCHAR(45)
        op.execute(
            sa.text(
                "ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE VARCHAR(45) USING ip_address::text;"
            )
        )


def downgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == "postgresql":
        op.execute(
            sa.text(
                "ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE inet USING ip_address::inet;"
            )
        )
