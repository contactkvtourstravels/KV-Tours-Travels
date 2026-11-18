"""Clean up dummy placeholder numbers and regional strings in site_settings and page_content.

Revision ID: 20261118_0013
Revises: 20261117_0012
Create Date: 2026-11-18
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from sqlalchemy import MetaData, Table, select, text
from alembic import op

revision: str = "20261118_0013"
down_revision: str | Sequence[str] | None = "20261117_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    meta = MetaData()
    site_settings = Table("site_settings", meta, autoload_with=conn)

    # 1. Update individual dummy contact rows in site_settings
    # Retrieve all rows and clean in Python to remain dialect-agnostic across Postgres & SQLite
    rows = conn.execute(
        select(site_settings.c.key, site_settings.c.value).where(
            site_settings.c.key.in_([
                'contact_phone', 'whatsapp_number', 'support_whatsapp',
                'agency_location', 'office_address', 'city', 'state'
            ])
        )
    ).fetchall()

    for row_key, row_val in rows:
        val_str = str(row_val or "")
        new_val = None
        if row_key in ("contact_phone", "whatsapp_number", "support_whatsapp"):
            if "94420" in val_str or "00000" in val_str:
                new_val = ""
        elif row_key == "agency_location":
            if "Headquarters" in val_str or not val_str.strip():
                new_val = "Coimbatore, Tamil Nadu, India"
        elif row_key == "office_address":
            if "Headquarters" in val_str or not val_str.strip():
                new_val = "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012"
        elif row_key == "city":
            if "Palakkad" in val_str or not val_str.strip():
                new_val = "Coimbatore"
        elif row_key == "state":
            if "Kerala" in val_str or not val_str.strip():
                new_val = "Tamil Nadu"

        if new_val is not None:
            conn.execute(
                site_settings.update()
                .where(site_settings.c.key == row_key)
                .values(value=new_val)
            )

    # 2. Inspect and cleanse JSON in page_content_contact
    contact_row = conn.execute(
        select(site_settings.c.value).where(site_settings.c.key == 'page_content_contact')
    ).fetchone()

    if contact_row and contact_row[0]:
        val = contact_row[0]
        if isinstance(val, str):
            try:
                val = json.loads(val)
            except Exception:
                val = None
        if isinstance(val, dict):
            cards = val.get("cards", {})
            if isinstance(cards, dict):
                phone = str(cards.get("primary_phone") or "")
                if "94420" in phone or "00000" in phone:
                    cards["primary_phone"] = ""
                heading = str(cards.get("office_card_heading") or "")
                if "Kerala" in heading or heading.strip() in ("", ","):
                    cards["office_card_heading"] = "Coimbatore Head Office"
                addr = str(cards.get("office_address") or "")
                if "Headquarters" in addr or not addr.strip():
                    cards["office_address"] = "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012"
                val["cards"] = cards

            hero = val.get("hero", {})
            if isinstance(hero, dict):
                eyebrow = str(hero.get("eyebrow") or "")
                if "Kerala" in eyebrow or eyebrow.strip() in ("Concierge Desk", "Concierge"):
                    hero["eyebrow"] = "Coimbatore Concierge Desk"
                val["hero"] = hero

            conn.execute(
                site_settings.update()
                .where(site_settings.c.key == 'page_content_contact')
                .values(value=val)
            )

    # 3. Inspect and cleanse JSON in page_content_about
    about_row = conn.execute(
        select(site_settings.c.value).where(site_settings.c.key == 'page_content_about')
    ).fetchone()

    if about_row and about_row[0]:
        val = about_row[0]
        if isinstance(val, str):
            try:
                val = json.loads(val)
            except Exception:
                val = None
        if isinstance(val, dict):
            story = val.get("story", {})
            if isinstance(story, dict):
                title = str(story.get("title") or "")
                if "Rooted in ," in title or "Rooted in Palakkad" in title:
                    story["title"] = "Rooted in Coimbatore, Inspired by the World"
                desc = str(story.get("office_card_description") or "")
                if "Headquarters" in desc:
                    story["office_card_description"] = desc.replace(
                        "Headquarters, India",
                        "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012",
                    )
                val["story"] = story

            hero = val.get("hero", {})
            if isinstance(hero, dict):
                eyebrow = str(hero.get("eyebrow") or "")
                if eyebrow.startswith(" Born") or "Palakkad" in eyebrow:
                    hero["eyebrow"] = "Coimbatore Born • Worldwide Curated"
                val["hero"] = hero

            conn.execute(
                site_settings.update()
                .where(site_settings.c.key == 'page_content_about')
                .values(value=val)
            )


def downgrade() -> None:
    pass
