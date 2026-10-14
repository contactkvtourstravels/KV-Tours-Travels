"""Tests for Website Content Management (About Page & Contact Page).

Verifies:
- Public endpoints return published content
- Admin endpoints load draft, published, and agency context
- Saving draft updates draft state without exposing it to public visitors
- Publishing promotes draft to published version immediately
- Discarding draft restores draft from currently published version
- Contact page Google Maps embed extraction and field persistence
- Non-admin authorization enforcement (403 Forbidden)
"""

from __future__ import annotations

import pytest
from sqlalchemy import delete

from app.core.permissions import ROLE_ADMIN, ROLE_STAFF
from app.models.content import SiteSetting
from tests.test_catalog_inventory import create_user_with_role, login_client


def test_about_page_draft_and_publish_lifecycle(client, db_session) -> None:
    """Verify that editing About page draft does not affect public until published."""
    admin = create_user_with_role(db_session, "about_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    try:
        # 1. Fetch initial public About content
        public_res = client.get("/api/v1/content/pages/about")
        assert public_res.status_code == 200
        initial_public = public_res.json()
        assert initial_public["slug"] == "about"
        assert "content" in initial_public
        initial_story = initial_public["content"]["story"]["paragraphs"][0]

        # 2. Admin loads page envelope
        admin_res = client.get("/api/v1/admin/content/pages/about", headers=headers)
        assert admin_res.status_code == 200
        envelope = admin_res.json()
        draft = envelope["draft"]

        # Modify draft
        draft["hero"]["heading"] = "About ABC Holidays"
        draft["story"]["paragraphs"] = [
            "ABC Holidays was established to provide an extraordinary journey for every traveler.",
            "From the Maldives to Kazakhstan, our private advisors craft unscripted moments.",
        ]
        draft["stats"]["items"] = [
            {"id": "stat_1", "label": "Global Expeditions", "value": "15,000+", "icon": "Globe"}
        ]

        # 3. Save draft without publishing
        save_draft_res = client.put(
            "/api/v1/admin/content/pages/about",
            json={"draft": draft, "publish_immediately": False},
            headers=headers,
        )
        assert save_draft_res.status_code == 200
        saved_env = save_draft_res.json()
        assert saved_env["has_unpublished_changes"] is True
        assert saved_env["draft"]["hero"]["heading"] == "About ABC Holidays"
        assert saved_env["published"]["hero"]["heading"] != "About ABC Holidays"

        # 4. Confirm public page STILL displays original content (draft is isolated)
        public_check = client.get("/api/v1/content/pages/about")
        assert public_check.status_code == 200
        assert public_check.json()["content"]["hero"]["heading"] != "About ABC Holidays"
        assert public_check.json()["content"]["story"]["paragraphs"][0] == initial_story

        # 5. Publish changes
        publish_res = client.post(
            "/api/v1/admin/content/pages/about/publish",
            headers=headers,
        )
        assert publish_res.status_code == 200
        published_env = publish_res.json()
        assert published_env["has_unpublished_changes"] is False
        assert published_env["published"]["hero"]["heading"] == "About ABC Holidays"

        # 6. Confirm public page now displays updated content
        public_updated = client.get("/api/v1/content/pages/about")
        assert public_updated.status_code == 200
        assert public_updated.json()["content"]["hero"]["heading"] == "About ABC Holidays"
        assert (
            public_updated.json()["content"]["story"]["paragraphs"][0]
            == "ABC Holidays was established to provide an extraordinary journey for every traveler."
        )

        # 7. Test discard draft: make a draft change and discard it
        draft["hero"]["heading"] = "Unpublished Draft Test"
        client.put(
            "/api/v1/admin/content/pages/about",
            json={"draft": draft, "publish_immediately": False},
            headers=headers,
        )
        discard_res = client.post(
            "/api/v1/admin/content/pages/about/discard",
            headers=headers,
        )
        assert discard_res.status_code == 200
        discarded_env = discard_res.json()
        assert discarded_env["draft"]["hero"]["heading"] == "About ABC Holidays"
        assert discarded_env["has_unpublished_changes"] is False
    finally:
        db_session.execute(delete(SiteSetting).where(SiteSetting.key == "page_content_about"))
        db_session.commit()


def test_contact_page_management_and_map_extraction(client, db_session) -> None:
    """Verify Contact page editing, iframe auto-cleaning, and public resolution."""
    admin = create_user_with_role(db_session, "contact_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    try:
        # Load admin envelope
        admin_res = client.get("/api/v1/admin/content/pages/contact", headers=headers)
        assert admin_res.status_code == 200
        draft = admin_res.json()["draft"]

        # Modify Contact details and paste an iframe snippet into map
        draft["hero"]["heading"] = "Connect With ABC Holidays"
        draft["cards"]["office_card_heading"] = "Kochi Experience Center"
        draft["cards"]["office_address"] = "45 Ocean Boulevard, Marine Drive, Kochi 682001"
        draft["form"]["topics"] = ["Bespoke Cruise Inquiry", "Corporate Flight Concierge"]
        draft["map"]["embed_url"] = (
            '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345!2d76.27!3d9.97" '
            'width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
        )

        # Save and immediately publish
        update_res = client.put(
            "/api/v1/admin/content/pages/contact",
            json={"draft": draft, "publish_immediately": True},
            headers=headers,
        )
        assert update_res.status_code == 200
        res_data = update_res.json()
        assert res_data["published"]["hero"]["heading"] == "Connect With ABC Holidays"
        # Verify clean URL extracted from iframe
        assert (
            res_data["published"]["map"]["embed_url"]
            == "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345!2d76.27!3d9.97"
        )

        # Public page reflects published details
        pub_res = client.get("/api/v1/content/pages/contact")
        assert pub_res.status_code == 200
        pub_content = pub_res.json()["content"]
        assert pub_content["hero"]["heading"] == "Connect With ABC Holidays"
        assert pub_content["cards"]["office_card_heading"] == "Kochi Experience Center"
        assert pub_content["form"]["topics"] == ["Bespoke Cruise Inquiry", "Corporate Flight Concierge"]
        assert pub_content["map"]["embed_url"] == "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345!2d76.27!3d9.97"
    finally:
        db_session.execute(delete(SiteSetting).where(SiteSetting.key == "page_content_contact"))
        db_session.commit()


def test_non_admin_cannot_modify_page_content(client, db_session) -> None:
    """Ensure staff and anonymous users cannot update or publish page content."""
    staff = create_user_with_role(db_session, "content_staff@kvtours.in", ROLE_STAFF)
    headers = login_client(client, staff.email)

    # Staff forbidden
    put_res = client.put(
        "/api/v1/admin/content/pages/about",
        json={"draft": {"hero": {"heading": "Hacked"}}},
        headers=headers,
    )
    assert put_res.status_code == 403

    publish_res = client.post(
        "/api/v1/admin/content/pages/about/publish",
        headers=headers,
    )
    assert publish_res.status_code == 403

    # Anonymous forbidden
    anon_res = client.put(
        "/api/v1/admin/content/pages/about",
        json={"draft": {"hero": {"heading": "Hacked"}}},
    )
    assert anon_res.status_code in (401, 403)
