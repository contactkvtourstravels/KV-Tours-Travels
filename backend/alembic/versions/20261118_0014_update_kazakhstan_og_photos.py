"""Update Kazakhstan cover photo to official OG photo

Revision ID: 20261118_0014
Revises: 20261118_0013
Create Date: 2026-11-18 21:50:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence
from sqlalchemy import MetaData, Table, select
from alembic import op

revision: str = "20261118_0014"
down_revision: str | None = "20261118_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    meta = MetaData()

    destinations = Table("destinations", meta, autoload_with=conn)
    packages = Table("packages", meta, autoload_with=conn)

    # 1. Update destination cover_image_url for Kazakhstan
    conn.execute(
        destinations.update()
        .where(destinations.c.slug.in_(["almaty-kazakhstan", "kazakhstan"]))
        .values(cover_image_url="/images/destinations/kazakhstan.jpg")
    )

    # 2. Update package cover_image_url for Kazakhstan Winter Edition
    conn.execute(
        packages.update()
        .where(packages.c.slug.in_(["kazakhstan-winter-edition", "kazakhstan-winter"]))
        .values(cover_image_url="/images/packages/kazakhstan.jpg")
    )


def downgrade() -> None:
    pass
