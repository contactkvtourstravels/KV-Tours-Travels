"""Add internal notes table and staff operation tracking.

Revision ID: 20261008_0003
Revises: 20261008_0002
Create Date: 2026-10-08
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261008_0003"
down_revision: str | Sequence[str] | None = "20261008_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STEP11_TABLE_NAMES = [
    "internal_notes",
]


def upgrade() -> None:
    """Create staff internal notes and administrative operations models."""
    import app.models  # noqa: F401 — register all models with this revision's metadata
    from app.db.base import Base

    bind = op.get_bind()
    tables = [Base.metadata.tables[name] for name in STEP11_TABLE_NAMES]
    Base.metadata.create_all(bind=bind, tables=tables, checkfirst=False)


def downgrade() -> None:
    """Drop staff internal notes and administrative operations models."""
    import app.models  # noqa: F401 — register all models with this revision's metadata
    from app.db.base import Base

    bind = op.get_bind()
    tables = [Base.metadata.tables[name] for name in reversed(STEP11_TABLE_NAMES)]
    Base.metadata.drop_all(bind=bind, tables=tables, checkfirst=False)
