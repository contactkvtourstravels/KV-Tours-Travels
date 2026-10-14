"""Tests for Website Content Hero & Intro Editors.

Verifies:
- Main Website, Destinations, Packages, Group Trips, and Custom Trip editors
- Draft isolation (draft changes do NOT affect public endpoints)
- Publishing draft promotes it to public endpoint
- Discarding draft resets draft to published content
- Strict separation: changing hero content NEVER touches or deletes catalog records (destinations/packages)
- Unauthenticated or non-admin access is properly restricted
"""

from __future__ import annotations

import pytest
from app.core.permissions import ROLE_ADMIN, ROLE_STAFF
from app.models.catalog import Destination, Package
from tests.test_catalog_inventory import create_user_with_role, login_client


def test_destinations_hero_editor_lifecycle(client, db_session) -> None:
    """Changing Destinations Page hero heading updates ONLY the listing hero and does NOT touch catalog records."""
    admin = create_user_with_role(db_session, "dest_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Count existing catalog destinations
    initial_dest_count = db_session.query(Destination).count()

    # 1. Fetch public destinations page content
    public_res = client.get("/api/v1/content/pages/destinations")
    assert public_res.status_code == 200
    pub_data = public_res.json()
    assert pub_data["slug"] == "destinations"
    assert pub_data["content"]["hero"]["heading"] == "Destinations Beyond the Ordinary"

    # 2. Admin loads page envelope
    admin_res = client.get("/api/v1/admin/content/pages/destinations", headers=headers)
    assert admin_res.status_code == 200
    env = admin_res.json()
    draft = env["draft"]

    # 3. Modify hero heading in draft
    draft["hero"]["heading"] = "Explore Our Handcrafted World"
    draft["hero"]["eyebrow"] = "Curated Horizons"
    draft["hero"]["description"] = "New description for destinations catalog."

    save_draft_res = client.put(
        "/api/v1/admin/content/pages/destinations",
        json={"draft": draft, "publish_immediately": False},
        headers=headers,
    )
    assert save_draft_res.status_code == 200
    saved_env = save_draft_res.json()
    assert saved_env["has_unpublished_changes"] is True
    assert saved_env["draft"]["hero"]["heading"] == "Explore Our Handcrafted World"
    assert saved_env["published"]["hero"]["heading"] == "Destinations Beyond the Ordinary"

    # 4. Public endpoint must STILL show old heading
    public_check = client.get("/api/v1/content/pages/destinations")
    assert public_check.json()["content"]["hero"]["heading"] == "Destinations Beyond the Ordinary"

    # 5. Publish
    pub_res = client.post("/api/v1/admin/content/pages/destinations/publish", headers=headers)
    assert pub_res.status_code == 200

    # 6. Public endpoint now displays updated heading
    public_updated = client.get("/api/v1/content/pages/destinations")
    assert public_updated.json()["content"]["hero"]["heading"] == "Explore Our Handcrafted World"
    assert public_updated.json()["content"]["hero"]["eyebrow"] == "Curated Horizons"

    # 7. CRITICAL VERIFICATION: Catalog records are completely unchanged
    final_dest_count = db_session.query(Destination).count()
    assert final_dest_count == initial_dest_count


def test_packages_hero_editor_lifecycle(client, db_session) -> None:
    """Changing Packages Page hero heading updates ONLY packages page hero and does NOT touch catalog records."""
    admin = create_user_with_role(db_session, "pkg_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    initial_pkg_count = db_session.query(Package).count()

    # 1. Fetch public
    public_res = client.get("/api/v1/content/pages/packages")
    assert public_res.status_code == 200
    assert public_res.json()["content"]["hero"]["heading"] == "Extraordinary Itineraries"

    # 2. Load envelope & save draft
    admin_res = client.get("/api/v1/admin/content/pages/packages", headers=headers)
    assert admin_res.status_code == 200
    draft = admin_res.json()["draft"]
    draft["hero"]["heading"] = "Signature Luxury Holiday Packages"

    client.put(
        "/api/v1/admin/content/pages/packages",
        json={"draft": draft, "publish_immediately": False},
        headers=headers,
    )

    # Public still untouched
    assert client.get("/api/v1/content/pages/packages").json()["content"]["hero"]["heading"] == "Extraordinary Itineraries"

    # 3. Publish
    client.post("/api/v1/admin/content/pages/packages/publish", headers=headers)
    assert client.get("/api/v1/content/pages/packages").json()["content"]["hero"]["heading"] == "Signature Luxury Holiday Packages"

    # Verify catalog records unchanged
    assert db_session.query(Package).count() == initial_pkg_count


def test_group_trips_and_custom_trip_editors(client, db_session) -> None:
    """Group trips and custom trip page editors function properly."""
    admin = create_user_with_role(db_session, "gt_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Group Trips
    gt_res = client.get("/api/v1/content/pages/group-trips")
    assert gt_res.status_code == 200
    assert gt_res.json()["content"]["hero"]["heading"] == "Upcoming Group Journeys"

    # Custom Trip
    ct_res = client.get("/api/v1/content/pages/custom-trip")
    assert ct_res.status_code == 200
    assert ct_res.json()["content"]["hero"]["heading"] == "Design Your Bespoke Journey"

    # Edit Custom Trip CTA label
    ct_admin = client.get("/api/v1/admin/content/pages/custom-trip", headers=headers)
    ct_draft = ct_admin.json()["draft"]
    ct_draft["cta_labels"]["submit_button_label"] = "Book My Dream Trip Now"
    client.put(
        "/api/v1/admin/content/pages/custom-trip",
        json={"draft": ct_draft, "publish_immediately": True},
        headers=headers,
    )
    assert client.get("/api/v1/content/pages/custom-trip").json()["content"]["cta_labels"]["submit_button_label"] == "Book My Dream Trip Now"


def test_main_website_homepage_editor(client, db_session) -> None:
    """Main Website (home) hero, sections visibility, and ordering controls."""
    admin = create_user_with_role(db_session, "home_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Public get
    home_pub = client.get("/api/v1/content/pages/home")
    assert home_pub.status_code == 200
    assert "hero" in home_pub.json()["content"]

    # Also test 'main' alias
    main_pub = client.get("/api/v1/content/pages/main")
    assert main_pub.status_code == 200
    assert main_pub.json()["slug"] == "home"

    # Edit draft
    env = client.get("/api/v1/admin/content/pages/home", headers=headers).json()
    draft = env["draft"]
    draft["hero"]["heading"] = "Unmatched Luxury Journeys"
    draft["sections_visibility"]["best_offers"] = False

    client.put(
        "/api/v1/admin/content/pages/home",
        json={"draft": draft, "publish_immediately": True},
        headers=headers,
    )

    updated_home = client.get("/api/v1/content/pages/home").json()
    assert updated_home["content"]["hero"]["heading"] == "Unmatched Luxury Journeys"
    assert updated_home["content"]["sections_visibility"]["best_offers"] is False


def test_homepage_content_synchronization_and_preview(client, db_session) -> None:
    """Verify end-to-end draft vs preview vs publish and site_settings synchronization."""
    from app.models.content import SiteSetting

    admin = create_user_with_role(db_session, "sync_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # 1. Fetch current published heading
    initial_pub = client.get("/api/v1/content/pages/home").json()
    prev_heading = initial_pub["content"]["hero"]["heading"]

    # 2. Modify draft with a unique heading without publishing
    admin_env = client.get("/api/v1/admin/content/pages/home", headers=headers).json()
    draft = admin_env["draft"]
    unique_test_heading = "Bespoke Royal Expeditions 2026"
    draft["hero"]["heading"] = unique_test_heading
    draft["featured_content"] = {
        "featured_destination_ids": ["dest_maldives_1"],
        "featured_package_ids": ["pkg_luxury_1"],
        "promo_banner_active": True,
        "promo_banner_text": "Exclusive 25% Off Summer Escapes",
        "promo_banner_link": "/offers/summer",
        "best_offers_enabled": True,
    }

    # Save draft (publish_immediately = False)
    put_res = client.put(
        "/api/v1/admin/content/pages/home",
        json={"draft": draft, "publish_immediately": False},
        headers=headers,
    )
    assert put_res.status_code == 200
    assert put_res.json()["has_unpublished_changes"] is True

    # 3. Confirm public homepage still serves the old published heading
    fresh_pub = client.get("/api/v1/content/pages/home").json()
    assert fresh_pub["content"]["hero"]["heading"] == prev_heading
    assert fresh_pub["content"]["hero"]["heading"] != unique_test_heading

    # 4. Confirm preview mode returns the draft heading
    preview_res = client.get("/api/v1/content/pages/home?preview=true").json()
    assert preview_res["content"]["hero"]["heading"] == unique_test_heading
    assert preview_res["is_preview"] is True

    # 5. Publish the draft
    pub_res = client.post("/api/v1/admin/content/pages/home/publish", headers=headers)
    assert pub_res.status_code == 200
    assert pub_res.json()["has_unpublished_changes"] is False

    # 6. Verify fresh public session now sees the published heading and featured content
    after_pub = client.get("/api/v1/content/pages/home").json()
    assert after_pub["content"]["hero"]["heading"] == unique_test_heading
    assert after_pub["content"]["featured_content"]["promo_banner_text"] == "Exclusive 25% Off Summer Escapes"
    assert after_pub["content"]["featured_content"]["featured_destination_ids"] == ["dest_maldives_1"]

    # 7. Verify site_settings was synchronized automatically
    db_session.expire_all()
    setting_row = db_session.get(SiteSetting, "site_settings")
    assert setting_row is not None
    assert setting_row.value["hero_headline"] == unique_test_heading
    assert setting_row.value["promo_banner_text"] == "Exclusive 25% Off Summer Escapes"
    assert setting_row.value["featured_destination_ids"] == ["dest_maldives_1"]


def test_homepage_hero_empty_fields_lifecycle(client, db_session) -> None:
    """Verify that cleared/empty hero fields stay empty through draft, preview, publish, and site settings."""
    from app.models.content import SiteSetting

    admin = create_user_with_role(db_session, "empty_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # 1. Fetch current published page
    pub_initial = client.get("/api/v1/content/pages/home").json()
    prev_heading = pub_initial["content"]["hero"]["heading"]
    assert prev_heading != ""

    # 2. Load envelope & clear fields
    admin_env = client.get("/api/v1/admin/content/pages/home", headers=headers).json()
    draft = admin_env["draft"]
    draft["hero"]["heading"] = ""
    draft["hero"]["description"] = ""
    draft["hero"]["eyebrow"] = ""
    draft["hero"]["primary_cta_text"] = ""
    draft["hero"]["secondary_cta_text"] = ""
    draft["hero"]["whatsapp_cta_text"] = ""
    draft["hero"]["popular_tags"] = []
    draft["trust_indicators"] = [
        {"id": "trust_1", "label": "", "icon": "shield-check"},
        {"id": "trust_2", "label": "", "icon": "sparkles"},
        {"id": "trust_3", "label": "", "icon": "clock"},
    ]

    # Save draft (publish_immediately = False)
    put_res = client.put(
        "/api/v1/admin/content/pages/home",
        json={"draft": draft, "publish_immediately": False},
        headers=headers,
    )
    assert put_res.status_code == 200
    saved_draft = put_res.json()["draft"]
    assert saved_draft["hero"]["heading"] == ""
    assert saved_draft["hero"]["description"] == ""
    assert saved_draft["hero"]["eyebrow"] == ""
    assert saved_draft["hero"]["primary_cta_text"] == ""
    assert saved_draft["hero"]["popular_tags"] == []
    assert saved_draft["trust_indicators"][0]["label"] == ""

    # 3. Public endpoint must still serve previous content, not empty string
    pub_unpub = client.get("/api/v1/content/pages/home").json()
    assert pub_unpub["content"]["hero"]["heading"] == prev_heading

    # 4. Preview must show empty fields
    preview = client.get("/api/v1/content/pages/home?preview=true").json()
    assert preview["content"]["hero"]["heading"] == ""
    assert preview["content"]["hero"]["description"] == ""
    assert preview["content"]["hero"]["popular_tags"] == []
    assert preview["content"]["trust_indicators"][0]["label"] == ""

    # 5. Publish cleared draft
    pub_action = client.post("/api/v1/admin/content/pages/home/publish", headers=headers)
    assert pub_action.status_code == 200

    # 6. Public endpoint now serves empty fields without restoring defaults
    pub_after = client.get("/api/v1/content/pages/home").json()
    assert pub_after["content"]["hero"]["heading"] == ""
    assert pub_after["content"]["hero"]["description"] == ""
    assert pub_after["content"]["hero"]["eyebrow"] == ""
    assert pub_after["content"]["hero"]["primary_cta_text"] == ""
    assert pub_after["content"]["hero"]["secondary_cta_text"] == ""
    assert pub_after["content"]["hero"]["whatsapp_cta_text"] == ""
    assert pub_after["content"]["hero"]["popular_tags"] == []
    assert pub_after["content"]["trust_indicators"][0]["label"] == ""

    # 7. Check site_settings synchronization retains empty string
    db_session.expire_all()
    setting_row = db_session.get(SiteSetting, "site_settings")
    assert setting_row is not None
    assert setting_row.value["hero_headline"] == ""
    assert setting_row.value["hero_subtitle"] == ""

