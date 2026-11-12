"""Seed official KV Tours & Travels 13 tour packages and departures from Google Sheet.

Revision ID: 20261112_0010
Revises: 20261111_0009
Create Date: 2026-11-12
"""

from collections.abc import Sequence
from sqlalchemy.orm import Session
from alembic import op
from app.catalog_import.seed_sheet_catalog import seed_sheet_catalog

revision: str = "20261112_0010"
down_revision: str | Sequence[str] | None = "20261111_0009"
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
