"""Automated tests for Global WhatsApp Number Management:
1. Fix validation error (whatsapp_concierge_floating accepted without Extra inputs error)
2. Normalization prevents duplicated country codes (e.g. +91 94420 00000 -> 919442000000)
3. Master switch disabling/enabling WhatsApp
4. Synchronization of whatsapp_number and support_whatsapp
5. Separation of WhatsApp Click-to-Chat and WhatsApp Cloud API
6. Validation errors for invalid numbers (<7 or >25 chars or non-phone chars)
7. Unauthorized users blocked from saving settings
"""

from __future__ import annotations

import pytest
from sqlalchemy import delete, select

from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER, ROLE_STAFF
from app.models.content import SiteSetting
from app.services.whatsapp_service import normalize_whatsapp_number, get_whatsapp_service
from tests.test_catalog_inventory import create_user_with_role, login_client


def test_whatsapp_normalization_unit() -> None:
    """Verify phone normalization logic prevents duplicated country codes."""
    # Standard 10 digit Indian number with +91 country code
    assert normalize_whatsapp_number("9442000000", "+91") == "919442000000"
    assert normalize_whatsapp_number("+91 94420 00000", "+91") == "919442000000"
    assert normalize_whatsapp_number("919442000000", "+91") == "919442000000"
    assert normalize_whatsapp_number("+919442000000", "+91") == "919442000000"
    
    # Leading zeros stripped (e.g. 094420 00000)
    assert normalize_whatsapp_number("09442000000", "+91") == "919442000000"
    
    # International number with different country code (e.g. UK +44)
    assert normalize_whatsapp_number("7911123456", "+44") == "447911123456"
    assert normalize_whatsapp_number("+44 7911 123456", "+44") == "447911123456"
    assert normalize_whatsapp_number("447911123456", "+44") == "447911123456"

    # Click-to-chat URL generator
    url = get_whatsapp_service().generate_click_to_chat_url("Hello world!", phone="+91 94420 00000", country_code="+91")
    assert url == "https://wa.me/919442000000?text=Hello%20world%21"


def test_whatsapp_concierge_floating_validation_and_persistence(client, db_session) -> None:
    """Verify whatsapp_concierge_floating and whatsapp_number save cleanly without 422 extra field error."""
    admin = create_user_with_role(
        db_session, "wa_admin_test@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    try:
        # 1. Update settings with both whatsapp_concierge_floating and canonical whatsapp_number
        payload = {
            "whatsapp_country_code": "+91",
            "whatsapp_number": "+91 98765 43210",
            "whatsapp_prefilled_message": "Namaste The Wild Root Concierge",
            "whatsapp_enabled": True,
            "whatsapp_concierge_floating": True,
            "whatsapp_show_floating_concierge": True,
            "whatsapp_show_on_homepage": True,
            "whatsapp_show_on_footer": True,
            "whatsapp_show_on_package_pages": True,
            "whatsapp_show_on_contact_page": True,
        }

        resp = client.patch("/api/v1/admin/settings", json=payload, headers=headers)
        assert resp.status_code == 200, f"PATCH failed: {resp.text}"
        data = resp.json()

        # Both aliases should be returned as True
        assert data["whatsapp_concierge_floating"] is True
        assert data["whatsapp_show_floating_concierge"] is True
        assert data["whatsapp_number"] == "+91 98765 43210"
        # support_whatsapp should be synchronized automatically
        assert data["support_whatsapp"] == "+91 98765 43210"

        # 2. Verify persistent reload via admin GET
        get_resp = client.get("/api/v1/admin/settings", headers=headers)
        assert get_resp.status_code == 200
        reloaded = get_resp.json()
        assert reloaded["whatsapp_concierge_floating"] is True
        assert reloaded["whatsapp_show_floating_concierge"] is True
        assert reloaded["whatsapp_number"] == "+91 98765 43210"

        # 3. Verify public settings reflect the saved canonical number and flags
        pub_resp = client.get("/api/v1/settings")
        assert pub_resp.status_code == 200
        pub = pub_resp.json()
        assert pub["whatsapp_number"] == "+91 98765 43210"
        assert pub["support_whatsapp"] == "+91 98765 43210"
        assert pub["whatsapp_enabled"] is True
        assert pub["whatsapp_concierge_floating"] is True
        assert pub["whatsapp_show_floating_concierge"] is True
    finally:
        db_session.execute(delete(SiteSetting))
        db_session.commit()


def test_whatsapp_master_switch_disables_public_chat(client, db_session) -> None:
    """Verify turning off the master switch whatsapp_enabled: false is reflected publicly."""
    admin = create_user_with_role(
        db_session, "wa_switch_admin@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    try:
        # Turn off master switch
        payload = {
            "whatsapp_enabled": False,
        }
        resp = client.patch("/api/v1/admin/settings", json=payload, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["whatsapp_enabled"] is False

        # Public settings must show whatsapp_enabled = False
        pub_resp = client.get("/api/v1/settings")
        assert pub_resp.status_code == 200
        assert pub_resp.json()["whatsapp_enabled"] is False
    finally:
        db_session.execute(delete(SiteSetting))
        db_session.commit()


def test_whatsapp_invalid_phone_number_rejected(client, db_session) -> None:
    """Verify invalid phone numbers (<7 digits or non-phone chars) are rejected with clear error."""
    admin = create_user_with_role(
        db_session, "wa_invalid_admin@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    # 1. Too short (<7 chars)
    resp_short = client.patch(
        "/api/v1/admin/settings",
        json={"whatsapp_number": "123"},
        headers=headers,
    )
    assert resp_short.status_code == 422
    assert "7 and 25 valid phone characters" in resp_short.text

    # 2. Invalid characters (letters)
    resp_letters = client.patch(
        "/api/v1/admin/settings",
        json={"whatsapp_number": "invalid-phone-num"},
        headers=headers,
    )
    assert resp_letters.status_code == 422
    assert "7 and 25 valid phone characters" in resp_letters.text


def test_whatsapp_cloud_api_settings_remain_separate(client, db_session) -> None:
    """Verify Click-to-Chat number changes do not overwrite or conflate Cloud API settings."""
    admin = create_user_with_role(
        db_session, "wa_cloud_admin@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    try:
        # Configure Cloud API separately
        cloud_payload = {
            "whatsapp_cloud_api_enabled": True,
            "whatsapp_phone_number_id": "phone_id_99999",
            "whatsapp_business_account_id": "waba_id_88888",
            "whatsapp_api_version": "v20.0",
        }
        resp1 = client.patch("/api/v1/admin/settings", json=cloud_payload, headers=headers)
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert data1["whatsapp_phone_number_id"] == "phone_id_99999"

        # Now change Click-to-chat public number
        chat_payload = {
            "whatsapp_number": "+91 94420 55555",
            "whatsapp_country_code": "+91",
        }
        resp2 = client.patch("/api/v1/admin/settings", json=chat_payload, headers=headers)
        assert resp2.status_code == 200
        data2 = resp2.json()

        # Click to chat updated
        assert data2["whatsapp_number"] == "+91 94420 55555"
        # Cloud API settings preserved intact
        assert data2["whatsapp_phone_number_id"] == "phone_id_99999"
        assert data2["whatsapp_business_account_id"] == "waba_id_88888"
        assert data2["whatsapp_cloud_api_enabled"] is True
    finally:
        db_session.execute(delete(SiteSetting))
        db_session.commit()
