"""Shared utilities and helpers for administration services."""

from __future__ import annotations

import re
import unicodedata
from typing import TypeVar
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas.admin import PaginatedResponse

T = TypeVar("T")


def slugify(text: str, max_length: int = 200) -> str:
    """Convert arbitrary text into a URL-safe, clean slug.

    Normalizes unicode, converts to lowercase, strips non-alphanumeric characters,
    and collapses runs of hyphens.
    """
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text.lower())
    slug = re.sub(r"[-\s]+", "-", text).strip("-")
    if not slug:
        slug = "item"
    return slug[:max_length].rstrip("-")


def generate_unique_slug(
    db: Session,
    model: type,
    name: str,
    target_id: UUID | None = None,
    max_length: int = 200,
) -> str:
    """Generate a unique slug for a model by appending increment counters if collisions occur."""
    base_slug = slugify(name, max_length=max_length - 6)
    slug = base_slug
    counter = 1

    while True:
        query = select(model.id).where(model.slug == slug)
        if target_id is not None:
            query = query.where(model.id != target_id)
        existing = db.execute(query).scalar_one_or_none()
        if existing is None:
            return slug
        counter += 1
        slug = f"{base_slug}-{counter}"[:max_length]


def paginate(
    items: list[T],
    total: int,
    page: int,
    page_size: int,
) -> PaginatedResponse[T]:
    """Build a standardized PaginatedResponse."""
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
