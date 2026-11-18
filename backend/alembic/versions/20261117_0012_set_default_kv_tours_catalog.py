"""Set database catalog and settings to official KV Tours & Travels defaults.

Revision ID: 20261117_0012
Revises: 20261113_0011
Create Date: 2026-11-17
"""

from collections.abc import Sequence
from sqlalchemy.orm import Session
from alembic import op
from app.catalog_import.seed_sheet_catalog import seed_sheet_catalog

revision: str = "20261117_0012"
down_revision: str | Sequence[str] | None = "20261113_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    try:
        seed_sheet_catalog(db=session)
    finally:
        session.close()


def downgrade() -> None:
    pass

