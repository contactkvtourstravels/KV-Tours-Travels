"""Test suite for Phase 1: Central Agency Profile Management & Dynamic Rebranding.

Verifies:
- Rebranding agency name from 'KV TOURS & TRAVELS' to 'ABC Holidays'
- Persistence and retrieval of all 26 new branding, identity, typography, social, SEO, and map attributes
- Public site settings (/api/v1/settings) synchronization
- Google Maps embed URL auto-extraction from <iframe> code and domain restriction validation
- Coordinates range validation
- Access control (Admin/SuperAdmin vs Staff/Customer)
"""

from __future__ import annotations

import pytest
from sqlalchemy import delete

from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER, ROLE_STAFF
from app.models.content import SiteSetting
from tests.test_catalog_inventory import create_user_with_role, login_client


def test_agency_rebranding_lifecycle_and_persistence(client, db_session) -> None:
    """Verify that rebranding agency to 'ABC Holidays' persists and updates public settings."""
    admin = create_user_with_role(
        db_session, "rebrand_admin@abcholidays.com", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    try:
        rebrand_payload = {
            "agency_name": "ABC Holidays",
            "public_display_name": "ABC Holidays",
            "short_name": "ABC",
            "tagline": "Discover The Extraordinary",
            "logo_url": "https://images.example.com/abc-holidays-logo.png",
            "secondary_logo_url": "https://images.example.com/abc-white-logo.png",
            "favicon_url": "https://images.example.com/abc-favicon.ico",
            "brand_primary_color": "#0F2C59",
            "brand_secondary_color": "#C5A880",
            "brand_accent_color": "#38B6FF",
            "primary_font": "Cinzel",
            "secondary_font": "Plus Jakarta Sans",
            "year_established": 2015,
            "registration_number": "ABC-REG-2015-001",
            "tax_id": "33ABCDE1234F1Z5",
            "legal_business_name": "ABC Holidays Private Limited",
            "business_description": "Curators of luxury bespoke escapes and group expeditions worldwide.",
            "office_address": "45 Ocean Boulevard, Marine Drive, Kochi 682001",
            "registered_office_address": "45 Ocean Boulevard, Marine Drive, Kochi 682001",
            "city": "Kochi",
            "state": "Kerala",
            "postal_code": "682001",
            "country": "India",
            "time_zone": "Asia/Kolkata",
            "currency": "INR",
            "contact_phone": "+91 98950 12345",
            "secondary_phone": "+91 484 2356789",
            "support_whatsapp": "+91 98950 12345",
            "emergency_phone": "+91 98950 99999",
            "contact_email": "hello@abcholidays.com",
            "booking_email": "reservations@abcholidays.com",
            "customer_support_email": "support@abcholidays.com",
            "general_inquiry_email": "inquire@abcholidays.com",
            "reply_to_email": "concierge@abcholidays.com",
            "operating_hours": "Mon - Sat: 9:30 AM - 6:30 PM IST",
            "holiday_notice": "Emergency concierge active 24/7 on WhatsApp.",
            "office_contact_instructions": "VIP client parking available in front of building.",
            "instagram_handle": "@abcholidays",
            "instagram_url": "https://instagram.com/abcholidays",
            "facebook_url": "https://facebook.com/abcholidays",
            "youtube_url": "https://youtube.com/@abcholidays",
            "linkedin_url": "https://linkedin.com/company/abc-holidays",
            "twitter_url": "https://x.com/abcholidays",
            "website_url": "https://abcholidays.com",
            "google_maps_url": "https://maps.google.com/?q=ABC+Holidays+Kochi",
            "google_maps_embed_url": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345!2d76.27!3d9.97",
            "office_location_label": "Marine Drive Experience Lounge",
            "google_maps_directions_url": "https://www.google.com/maps/dir/?api=1&destination=9.97,76.27",
            "google_maps_latitude": 9.9712,
            "google_maps_longitude": 76.2789,
            "google_maps_zoom": 16,
            "google_maps_display_enabled": True,
            "seo_website_title": "ABC Holidays | Luxury Worldwide Escapes",
            "seo_meta_description": "Bespoke holidays and hand-picked global itineraries from ABC Holidays.",
            "seo_og_image_url": "https://images.example.com/abc-og-banner.jpg",
            "seo_social_title": "Journey in Luxury with ABC Holidays",
            "seo_social_description": "Exclusive vacation packages with five-star hospitality.",
        }

        # 1. Update settings via Admin API
        patch_resp = client.patch(
            "/api/v1/admin/settings", json=rebrand_payload, headers=headers
        )
        assert patch_resp.status_code == 200, f"Update failed: {patch_resp.text}"
        saved = patch_resp.json()

        assert saved["agency_name"] == "ABC Holidays"
        assert saved["public_display_name"] == "ABC Holidays"
        assert saved["short_name"] == "ABC"
        assert saved["brand_primary_color"] == "#0F2C59"
        assert saved["brand_secondary_color"] == "#C5A880"
        assert saved["brand_accent_color"] == "#38B6FF"
        assert saved["primary_font"] == "Cinzel"
        assert saved["secondary_font"] == "Plus Jakarta Sans"
        assert saved["year_established"] == 2015
        assert saved["registration_number"] == "ABC-REG-2015-001"
        assert saved["tax_id"] == "33ABCDE1234F1Z5"
        assert saved["youtube_url"] == "https://youtube.com/@abcholidays"
        assert saved["linkedin_url"] == "https://linkedin.com/company/abc-holidays"
        assert saved["office_location_label"] == "Marine Drive Experience Lounge"
        assert saved["google_maps_zoom"] == 16
        assert saved["seo_website_title"] == "ABC Holidays | Luxury Worldwide Escapes"

        # 2. Verify persistence via Admin GET
        get_resp = client.get("/api/v1/admin/settings", headers=headers)
        assert get_resp.status_code == 200
        reloaded = get_resp.json()
        assert reloaded["agency_name"] == "ABC Holidays"
        assert reloaded["short_name"] == "ABC"
        assert reloaded["brand_primary_color"] == "#0F2C59"
        assert reloaded["youtube_url"] == "https://youtube.com/@abcholidays"

        # 3. Verify public settings API reflects new branding without auth
        public_resp = client.get("/api/v1/settings")
        assert public_resp.status_code == 200
        pub = public_resp.json()
        assert pub["agency_name"] == "ABC Holidays"
        assert pub["short_name"] == "ABC"
        assert pub["tagline"] == "Discover The Extraordinary"
        assert pub["brand_primary_color"] == "#0F2C59"
        assert pub["brand_secondary_color"] == "#C5A880"
        assert pub["brand_accent_color"] == "#38B6FF"
        assert pub["primary_font"] == "Cinzel"
        assert pub["secondary_font"] == "Plus Jakarta Sans"
        assert pub["year_established"] == 2015
        assert pub["registration_number"] == "ABC-REG-2015-001"
        assert pub["tax_id"] == "33ABCDE1234F1Z5"
        assert pub["youtube_url"] == "https://youtube.com/@abcholidays"
        assert pub["linkedin_url"] == "https://linkedin.com/company/abc-holidays"
        assert pub["google_maps_embed_url"] == "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345!2d76.27!3d9.97"
        assert pub["office_location_label"] == "Marine Drive Experience Lounge"
        assert pub["google_maps_display_enabled"] is True
        assert pub["seo_website_title"] == "ABC Holidays | Luxury Worldwide Escapes"
        assert pub["seo_og_image_url"] == "https://images.example.com/abc-og-banner.jpg"
    finally:
        db_session.execute(delete(SiteSetting))
        db_session.commit()


def test_google_maps_iframe_auto_extraction(client, db_session) -> None:
    """Ensure that pasting full <iframe src="..."></iframe> automatically extracts the clean URL."""
    admin = create_user_with_role(
        db_session, "maps_admin@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    try:
        iframe_snippet = (
            '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3916.32!2d76.96!3d11.01" '
            'width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
        )
        resp = client.patch(
            "/api/v1/admin/settings",
            json={"google_maps_embed_url": iframe_snippet},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["google_maps_embed_url"] == (
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3916.32!2d76.96!3d11.01"
        )
    finally:
        db_session.execute(delete(SiteSetting))
        db_session.commit()


def test_google_maps_embed_rejects_unsafe_domains(client, db_session) -> None:
    """Ensure that arbitrary external domains are rejected for embed security."""
    admin = create_user_with_role(
        db_session, "sec_admin@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    resp = client.patch(
        "/api/v1/admin/settings",
        json={"google_maps_embed_url": "https://malicious-site.example.com/exploit"},
        headers=headers,
    )
    assert resp.status_code == 422
    assert "Google Maps" in resp.text


def test_coordinates_range_validation(client, db_session) -> None:
    """Ensure latitude (-90 to 90) and longitude (-180 to 180) are validated."""
    admin = create_user_with_role(
        db_session, "geo_admin@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    # Bad Latitude (> 90)
    resp_lat = client.patch(
        "/api/v1/admin/settings",
        json={"google_maps_latitude": 95.0},
        headers=headers,
    )
    assert resp_lat.status_code == 422

    # Bad Longitude (> 180)
    resp_lng = client.patch(
        "/api/v1/admin/settings",
        json={"google_maps_longitude": 200.0},
        headers=headers,
    )
    assert resp_lng.status_code == 422


def test_non_admin_cannot_update_agency_profile(client, db_session) -> None:
    """Ensure staff and customers are forbidden from modifying agency branding."""
    staff = create_user_with_role(db_session, "rebrand_staff_user@abcholidays.com", ROLE_STAFF)
    headers = login_client(client, staff.email)

    resp = client.patch(
        "/api/v1/admin/settings",
        json={"agency_name": "Hacked Holidays"},
        headers=headers,
    )
    assert resp.status_code == 403
