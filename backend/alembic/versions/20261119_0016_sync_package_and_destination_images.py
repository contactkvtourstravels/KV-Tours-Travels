"""Synchronize package and destination gallery images with cover photos

Revision ID: 20261119_0016
Revises: 20261119_0015
Create Date: 2026-11-19 10:15:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence
from uuid import uuid4
from sqlalchemy import MetaData, Table, delete, insert, select, update
from alembic import op

revision: str = "20261119_0016"
down_revision: str | None = "20261119_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    meta = MetaData()

    destinations = Table("destinations", meta, autoload_with=conn)
    destination_images = Table("destination_images", meta, autoload_with=conn)
    packages = Table("packages", meta, autoload_with=conn)
    package_images = Table("package_images", meta, autoload_with=conn)

    is_sqlite = conn.dialect.name == "sqlite"
    gen_id = lambda: str(uuid4()) if is_sqlite else uuid4()

    # 1. Purge known stale honey jar stock photo from package_images
    conn.execute(
        delete(package_images).where(
            package_images.c.image_url.like("%photo-1589301760014%")
        )
    )

    # 2. Ensure Kazakhstan packages have the official OG cover photo
    conn.execute(
        update(packages)
        .where(packages.c.slug.in_(["kazakhstan-winter-edition", "kazakhstan-winter", "kazakhstan"]))
        .values(cover_image_url="/images/packages/kazakhstan.jpg")
    )
    conn.execute(
        update(destinations)
        .where(destinations.c.slug.in_(["almaty-kazakhstan", "kazakhstan"]))
        .values(cover_image_url="/images/destinations/kazakhstan.jpg")
    )

    # 3. Synchronize package_images with packages.cover_image_url
    all_packages = conn.execute(
        select(packages.c.id, packages.c.name, packages.c.cover_image_url).where(
            packages.c.cover_image_url.is_not(None)
        )
    ).fetchall()

    for pkg_id, pkg_name, cover_url in all_packages:
        if not cover_url:
            continue

        featured_img = conn.execute(
            select(package_images.c.id).where(
                package_images.c.package_id == pkg_id,
                package_images.c.is_featured.is_(True),
            )
        ).first()

        if featured_img:
            conn.execute(
                update(package_images)
                .where(package_images.c.id == featured_img[0])
                .values(image_url=cover_url)
            )
        else:
            existing = conn.execute(
                select(package_images.c.id).where(
                    package_images.c.package_id == pkg_id,
                    package_images.c.image_url == cover_url,
                )
            ).first()

            if existing:
                conn.execute(
                    update(package_images)
                    .where(package_images.c.id == existing[0])
                    .values(is_featured=True)
                )
            else:
                conn.execute(
                    insert(package_images).values(
                        id=gen_id(),
                        package_id=pkg_id,
                        image_url=cover_url,
                        alt_text=f"{pkg_name} tour package",
                        is_featured=True,
                        sort_order=1,
                    )
                )

    # 4. Synchronize destination_images with destinations.cover_image_url
    all_destinations = conn.execute(
        select(destinations.c.id, destinations.c.name, destinations.c.cover_image_url).where(
            destinations.c.cover_image_url.is_not(None)
        )
    ).fetchall()

    for dest_id, dest_name, cover_url in all_destinations:
        if not cover_url:
            continue

        featured_img = conn.execute(
            select(destination_images.c.id).where(
                destination_images.c.destination_id == dest_id,
                destination_images.c.is_featured.is_(True),
            )
        ).first()

        if featured_img:
            conn.execute(
                update(destination_images)
                .where(destination_images.c.id == featured_img[0])
                .values(image_url=cover_url)
            )
        else:
            existing = conn.execute(
                select(destination_images.c.id).where(
                    destination_images.c.destination_id == dest_id,
                    destination_images.c.image_url == cover_url,
                )
            ).first()

            if existing:
                conn.execute(
                    update(destination_images)
                    .where(destination_images.c.id == existing[0])
                    .values(is_featured=True)
                )
            else:
                conn.execute(
                    insert(destination_images).values(
                        id=gen_id(),
                        destination_id=dest_id,
                        image_url=cover_url,
                        alt_text=f"{dest_name} scenic landscape",
                        is_featured=True,
                        sort_order=1,
                    )
                )


def downgrade() -> None:
    pass
