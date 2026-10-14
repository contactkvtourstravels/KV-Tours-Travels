"""Add saved travellers, cancellation requests, and notification logs.

Revision ID: 20261008_0002
Revises: 20261004_0001
Create Date: 2026-10-08
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261008_0002"
down_revision: str | Sequence[str] | None = "20261004_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STEP10_TABLE_NAMES = [
    "saved_travellers",
    "booking_cancellation_requests",
    "notification_logs",
]


def upgrade() -> None:
    """Create customer portal and communication models."""
    import app.models  # noqa: F401 — register all models with this revision's metadata
    from app.db.base import Base

    bind = op.get_bind()
    tables = [Base.metadata.tables[name] for name in STEP10_TABLE_NAMES]
    Base.metadata.create_all(bind=bind, tables=tables, checkfirst=False)


def downgrade() -> None:
    """Drop customer portal and communication models."""
    import app.models  # noqa: F401 — register all models with this revision's metadata
    from app.db.base import Base

    bind = op.get_bind()
    tables = [Base.metadata.tables[name] for name in reversed(STEP10_TABLE_NAMES)]
    Base.metadata.drop_all(bind=bind, tables=tables, checkfirst=False)
