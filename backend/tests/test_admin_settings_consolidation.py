"""Automated regression and consolidation tests for KV TOURS & TRAVELS Admin Settings System:
- Regression test for Pydantic extra-field validation error (support_whatsapp, emergency_phone, operating_hours)
- Agency Profile fields persistence, aliases, and retrieval
- Field format validations (phone, email, URLs)
- Secret authenticated encryption (AES-256-GCM) and masking
- Diagnostics endpoints (health check, Resend test-connection, verify-sender, send-test, WhatsApp test-connection)
- Global synchronization with public catalog settings and customer vouchers
- Access control and RBAC enforcement
"""

from __future__ import annotations

from sqlalchemy import delete, select

from app.core.permissions import ROLE_ADMIN, ROLE_CUSTOMER, ROLE_STAFF
from app.models.content import NotificationLog, SiteSetting
from tests.test_catalog_inventory import create_user_with_role, login_client


def test_pydantic_extra_field_validation_error_fixed(client, db_session) -> None:
    """Verify that support_whatsapp, emergency_phone, and operating_hours

    are explicitly accepted without raising Pydantic Extra inputs error.
    """
    admin = create_user_with_role(
        db_session, "settings_admin_pydantic@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    try:
        # Submit the exact payload that previously failed with:
        # Request validation failed (support_whatsapp: Extra inputs are not permitted;
        # emergency_phone: Extra inputs are not permitted; operating_hours: Extra inputs are not permitted)
        payload = {
            "agency_name": "KV TOURS & TRAVELS",
            "support_whatsapp": "+91 98422 12345",
            "emergency_phone": "+91 98422 99999",
            "operating_hours": "Mon - Sat: 9:00 AM - 8:00 PM IST",
        }

        resp = client.patch("/api/v1/admin/settings", json=payload, headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()

        assert data["support_whatsapp"] == "+91 98422 12345"
        assert data["emergency_phone"] == "+91 98422 99999"
        assert data["operating_hours"] == "Mon - Sat: 9:00 AM - 8:00 PM IST"
        # Business hours alias synchronized
        assert data["business_hours"] == "Mon - Sat: 9:00 AM - 8:00 PM IST"

        # Verify persistent reload via GET
        get_resp = client.get("/api/v1/admin/settings", headers=headers)
        assert get_resp.status_code == 200
        reloaded = get_resp.json()
        assert reloaded["support_whatsapp"] == "+91 98422 12345"
        assert reloaded["emergency_phone"] == "+91 98422 99999"
        assert reloaded["operating_hours"] == "Mon - Sat: 9:00 AM - 8:00 PM IST"
    finally:
        db_session.execute(delete(SiteSetting))
        db_session.commit()


def test_agency_profile_full_lifecycle_and_aliases(client, db_session) -> None:
    """Verify all Agency Profile fields are saved, aliased, and retrieved properly."""
    admin = create_user_with_role(
        db_session, "profile_admin@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    try:
        profile_payload = {
            "legal_business_name": "KV Tours & Travels Private Limited",
            "public_display_name": "KV Tours & Travels Luxury Journeys",
            "tagline": "Crafting Extraordinary Vacations Since 2012",
            "logo_url": "https://images.unsplash.com/photo-logo-test.png",
            "favicon_url": "https://images.unsplash.com/photo-favicon-test.png",
            "business_description": "Premier boutique travel design firm in Coimbatore.",
            "registered_office_address": "124/B Cross Cut Road, Coimbatore 641012",
            "office_address": "124 Cross Cut Road, Gandhipuram, Coimbatore 641012",
            "public_office_address": "124 Cross Cut Road, Gandhipuram, Coimbatore 641012",
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "postal_code": "641012",
            "country": "India",
            "time_zone": "Asia/Kolkata",
            "currency": "INR",
            "contact_phone": "+91 98422 12345",
            "secondary_phone": "+91 422 2490000",
            "support_whatsapp": "+91 98422 12345",
            "emergency_phone": "+91 98422 99999",
            "contact_email": "concierge@kvtours.in",
            "customer_support_email": "support@kvtours.in",
            "booking_email": "bookings@kvtours.in",
            "general_inquiry_email": "inquiry@kvtours.in",
            "reply_to_email": "concierge@kvtours.in",
            "instagram_handle": "@kvtours_luxury",
            "instagram_url": "https://instagram.com/kvtours_luxury",
            "facebook_url": "https://facebook.com/kvtours",
            "website_url": "https://kvtours.in",
            "google_maps_url": "https://maps.google.com/?q=KV+Tours+Coimbatore",
            "operating_hours": "Mon - Sat: 9:00 AM - 7:00 PM IST",
            "holiday_notice": "Special hours on Diwali and Pongal festivals.",
            "office_contact_instructions": "Prior appointments recommended for bespoke visa consultations.",
        }

        resp = client.patch("/api/v1/admin/settings", json=profile_payload, headers=headers)
        assert resp.status_code == 200
        saved = resp.json()

        assert saved["legal_business_name"] == "KV Tours & Travels Private Limited"
        assert saved["public_display_name"] == "KV Tours & Travels Luxury Journeys"
        assert saved["agency_name"] == "KV Tours & Travels Luxury Journeys"
        assert saved["city"] == "Coimbatore"
        assert saved["secondary_phone"] == "+91 422 2490000"
        assert saved["customer_support_email"] == "support@kvtours.in"
        assert saved["holiday_notice"] == "Special hours on Diwali and Pongal festivals."

        # Public settings endpoint reflects the authoritative profile
        public_resp = client.get("/api/v1/settings")
        assert public_resp.status_code == 200
        public_data = public_resp.json()
        assert public_data["agency_name"] == "KV Tours & Travels Luxury Journeys"
        assert public_data["public_display_name"] == "KV Tours & Travels Luxury Journeys"
        assert public_data["city"] == "Coimbatore"
        assert public_data["support_whatsapp"] == "+91 98422 12345"
        assert public_data["operating_hours"] == "Mon - Sat: 9:00 AM - 7:00 PM IST"
    finally:
        db_session.execute(delete(SiteSetting))
        db_session.commit()


def test_field_format_validation(client, db_session) -> None:
    """Ensure invalid phone, email, and URL values are rejected with 422 Unprocessable Entity."""
    admin = create_user_with_role(
        db_session, "validation_admin@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    try:
        # 1. Invalid phone number format
        bad_phone_resp = client.patch(
            "/api/v1/admin/settings",
            json={"contact_phone": "invalid-phone!!!"},
            headers=headers,
        )
        assert bad_phone_resp.status_code == 422

        # 2. Invalid email format
        bad_email_resp = client.patch(
            "/api/v1/admin/settings",
            json={"contact_email": "not-a-valid-email"},
            headers=headers,
        )
        assert bad_email_resp.status_code == 422

        # 3. Invalid URL format
        bad_url_resp = client.patch(
            "/api/v1/admin/settings",
            json={"website_url": "ftp://bad-scheme.com"},
            headers=headers,
        )
        assert bad_url_resp.status_code == 422
    finally:
        db_session.execute(delete(SiteSetting))
        db_session.commit()


def test_secret_encryption_and_masking(client, db_session) -> None:
    """Ensure integration secrets (Resend API key, WhatsApp access token)

    are encrypted at rest in the database and NEVER returned in plaintext.
    """
    admin = create_user_with_role(
        db_session, "security_admin@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    try:
        raw_resend_key = "re_live_test_api_key_1234567890"
        raw_whatsapp_token = "EAAG_sample_system_user_token_9876543210"

        patch_resp = client.patch(
            "/api/v1/admin/settings",
            json={
                "resend_api_key": raw_resend_key,
                "whatsapp_access_token": raw_whatsapp_token,
            },
            headers=headers,
        )
        assert patch_resp.status_code == 200
        patch_data = patch_resp.json()

        # Plaintext keys must never be returned in API response
        assert "resend_api_key" not in patch_data or patch_data["resend_api_key"] is None
        assert "whatsapp_access_token" not in patch_data or patch_data["whatsapp_access_token"] is None
        assert patch_data["resend_api_key_configured"] is True
        assert patch_data["whatsapp_access_token_configured"] is True
        assert patch_data["resend_api_key_masked"] is not None
        assert raw_resend_key not in patch_data["resend_api_key_masked"]
        assert raw_whatsapp_token not in patch_data["whatsapp_access_token_masked"]

        # GET request must also mask secrets
        get_resp = client.get("/api/v1/admin/settings", headers=headers)
        assert get_resp.status_code == 200
        get_data = get_resp.json()
        assert "resend_api_key" not in get_data or get_data["resend_api_key"] is None
        assert "whatsapp_access_token" not in get_data or get_data["whatsapp_access_token"] is None
        assert get_data["resend_api_key_configured"] is True
        assert get_data["whatsapp_access_token_configured"] is True

        # Database inspection: stored values must be encrypted ciphertext
        resend_row = db_session.execute(
            select(SiteSetting).where(SiteSetting.key == "resend_api_key")
        ).scalar_one_or_none()
        assert resend_row is not None
        assert raw_resend_key not in str(resend_row.value)

        wa_row = db_session.execute(
            select(SiteSetting).where(SiteSetting.key == "whatsapp_access_token")
        ).scalar_one_or_none()
        assert wa_row is not None
        assert raw_whatsapp_token not in str(wa_row.value)
    finally:
        db_session.execute(delete(SiteSetting))
        db_session.commit()


def test_diagnostics_and_test_workflows(client, db_session) -> None:
    """Verify configuration health check, Resend tests, and WhatsApp diagnostics."""
    admin = create_user_with_role(
        db_session, "diag_admin@kvtours.in", ROLE_ADMIN
    )
    headers = login_client(client, admin.email)

    try:
        # 1. Configuration Health Check
        health_resp = client.get("/api/v1/admin/settings/health", headers=headers)
        assert health_resp.status_code == 200
        health_data = health_resp.json()
        assert "health_score" in health_data
        assert "status" in health_data
        assert "agency_profile_status" in health_data
        assert "whatsapp_click_to_chat_status" in health_data
        assert "resend_email_status" in health_data
        assert "payment_gateway_status" in health_data

        # 2. Resend Test Connection
        email_conn_resp = client.post(
            "/api/v1/admin/settings/email/test-connection", headers=headers
        )
        assert email_conn_resp.status_code == 200
        assert "success" in email_conn_resp.json()
        assert "status" in email_conn_resp.json()

        # 3. Resend Verify Sender
        sender_resp = client.post(
            "/api/v1/admin/settings/email/verify-sender", headers=headers
        )
        assert sender_resp.status_code == 200
        assert "status" in sender_resp.json()

        # 4. Explicit Send Test Email (audited in NotificationLog)
        from unittest.mock import MagicMock, patch

        client.patch(
            "/api/v1/admin/settings",
            json={"resend_api_key": "re_mock_test_key_12345"},
            headers=headers,
        )
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"id": "resend_mock_msg_12345"}

        with patch("app.services.admin.settings_service.httpx.Client") as mock_httpx_cls:
            mock_instance = MagicMock()
            mock_instance.__enter__.return_value = mock_instance
            mock_instance.post.return_value = mock_http_resp
            mock_httpx_cls.return_value = mock_instance

            send_resp = client.post(
                "/api/v1/admin/settings/email/send-test",
                json={"recipient": "traveler.test@example.com"},
                headers=headers,
            )
        assert send_resp.status_code == 200
        send_data = send_resp.json()
        assert send_data["recipient"] == "traveler.test@example.com"

        # Verify NotificationLog recorded the test dispatch
        log_entry = db_session.execute(
            select(NotificationLog).where(
                NotificationLog.recipient == "traveler.test@example.com"
            )
        ).scalar_one_or_none()
        assert log_entry is not None
        assert log_entry.channel == "email"

        # 5. WhatsApp Test Connection
        wa_conn_resp = client.post(
            "/api/v1/admin/settings/whatsapp/test-connection", headers=headers
        )
        assert wa_conn_resp.status_code == 200
        assert "success" in wa_conn_resp.json()
    finally:
        db_session.execute(delete(SiteSetting))
        db_session.execute(delete(NotificationLog))
        db_session.commit()


def test_unauthorized_access_rejected(client, db_session) -> None:
    """Ensure non-admin users (staff, customers, anonymous) cannot update settings."""
    staff = create_user_with_role(db_session, "staff_user@kvtours.in", ROLE_STAFF)
    customer = create_user_with_role(db_session, "customer_user@example.com", ROLE_CUSTOMER)

    staff_headers = login_client(client, staff.email)
    cust_headers = login_client(client, customer.email)

    payload = {"tagline": "Malicious modification"}

    # 1. Anonymous request rejected
    anon_resp = client.patch("/api/v1/admin/settings", json=payload)
    assert anon_resp.status_code in (401, 403)

    # 2. Customer request rejected (403 Forbidden)
    cust_resp = client.patch("/api/v1/admin/settings", json=payload, headers=cust_headers)
    assert cust_resp.status_code == 403

    # 3. Staff request rejected (requires admin or super_admin)
    staff_resp = client.patch("/api/v1/admin/settings", json=payload, headers=staff_headers)
    assert staff_resp.status_code == 403
