"""Service for administrative site configuration, communication settings, and branding management."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.encryption import (
    DecryptionError,
    decrypt_secret,
    encrypt_secret,
    resolve_encryption_key,
)
from app.models.content import NotificationLog, SiteSetting
from app.schemas.admin import (
    AdminSiteSettingsResponse,
    AdminSiteSettingsUpdateRequest,
    ConfigurationHealthResponse,
    EmailSendTestResponse,
    EmailTestConnectionResponse,
    ResendWebhookStatsResponse,
    ResendWebhookVerifyResponse,
    WhatsAppTestConnectionResponse,
)
from app.services.admin.audit_service import record_audit_log

logger = logging.getLogger(__name__)


def _mask_token(token: str | None) -> str | None:
    if not token or len(token) < 8:
        return "********" if token else None
    return f"{token[:4]}****{token[-4:]}"


def _parse_bool(val: Any, default: bool) -> bool:
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    return str(val).lower() in ("true", "1", "yes")


def get_decrypted_secret(db: Session, key: str) -> str | None:
    """Retrieve secret from database SiteSetting and decrypt if AES-256-GCM encrypted."""
    row = db.get(SiteSetting, key)
    if not row or not row.value:
        return None
    raw_val = str(row.value).strip()
    if not raw_val:
        return None

    if raw_val.startswith("v1:"):
        key_bytes = resolve_encryption_key(get_settings())
        if key_bytes and len(key_bytes) == 32:
            try:
                return decrypt_secret(raw_val, key_bytes)
            except DecryptionError as exc:
                logger.error("Failed to decrypt secret %s: %s", key, exc)
                return None
        logger.warning("Encryption key not configured to decrypt secret %s", key)
        return None

    return raw_val


def _store_secret(db: Session, key: str, plaintext: str, description: str) -> None:
    """Store secret encrypted if key configured, otherwise stored private."""
    clean_val = plaintext.strip()
    key_bytes = resolve_encryption_key(get_settings())
    stored_val = clean_val
    if key_bytes and len(key_bytes) == 32:
        try:
            stored_val = encrypt_secret(clean_val, key_bytes)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not encrypt secret %s: %s; storing unencrypted.", key, exc)

    row = db.get(SiteSetting, key)
    if row is None:
        row = SiteSetting(
            key=key,
            value=stored_val,
            description=description,
            is_public=False,
        )
        db.add(row)
    else:
        row.value = stored_val
        row.is_public = False


def resolve_resend_signing_secret(db: Session) -> tuple[str | None, str]:
    """Retrieve Resend webhook signing secret from database or environment.

    Returns (plaintext_secret, source), where source is 'database', 'environment', or 'none'.
    Decrypts AES-256-GCM encrypted database values. Never returns un-decryptable or corrupted tokens.
    """
    import os

    # 1. Authoritative database setting
    db_secret = get_decrypted_secret(db, "resend_webhook_signing_secret")
    if db_secret and len(db_secret.strip()) > 0:
        return db_secret.strip(), "database"

    # 2. Config / Environment fallback
    settings = get_settings()
    env_sec = getattr(settings, "resend_webhook_signing_secret", None)
    if env_sec:
        val = env_sec.get_secret_value() if hasattr(env_sec, "get_secret_value") else str(env_sec)
        if val and len(val.strip()) > 0:
            return val.strip(), "environment"

    direct_env = os.environ.get("RESEND_WEBHOOK_SIGNING_SECRET")
    if direct_env and len(direct_env.strip()) > 0:
        return direct_env.strip(), "environment"

    return None, "none"


def check_resend_signing_secret_status(db: Session) -> dict[str, Any]:
    """Check whether Resend signing secret is genuinely saved and decryptable."""
    row = db.get(SiteSetting, "resend_webhook_signing_secret")
    decrypted, source = resolve_resend_signing_secret(db)

    if decrypted:
        return {
            "configured": True,
            "decryptable": True,
            "source": source,
            "secret": decrypted,
            "masked": _mask_token(decrypted),
            "status": "ready",
        }

    if row and row.value and str(row.value).strip():
        # A record exists in the DB, but decryption failed (e.g. key mismatch or corruption)
        return {
            "configured": True,
            "decryptable": False,
            "source": "database",
            "secret": None,
            "masked": None,
            "status": "decryption_failed",
            "error": "Secret is stored in database but cannot be decrypted with the active encryption key.",
        }

    return {
        "configured": False,
        "decryptable": False,
        "source": "none",
        "secret": None,
        "masked": None,
        "status": "not_configured",
    }


def get_admin_settings(db: Session) -> AdminSiteSettingsResponse:
    """Retrieve agency branding, contact, and operational settings from database with config fallbacks."""
    settings = get_settings()
    rows = db.execute(select(SiteSetting)).scalars().all()
    overrides: dict[str, Any] = {r.key: r.value for r in rows if r.value is not None}

    # WhatsApp secrets status
    wa_token_raw = overrides.get("whatsapp_access_token")
    wa_token_str = str(wa_token_raw) if wa_token_raw else None
    wa_token_configured = bool(wa_token_str and len(wa_token_str) > 0) or bool(
        settings.whatsapp_access_token.get_secret_value()
    )
    wa_token_masked = (
        _mask_token(get_decrypted_secret(db, "whatsapp_access_token") or settings.whatsapp_access_token.get_secret_value())
        if wa_token_configured
        else None
    )

    wa_verify_raw = overrides.get("whatsapp_verify_token")
    wa_verify_str = str(wa_verify_raw) if wa_verify_raw else None
    wa_verify_configured = bool(wa_verify_str and len(wa_verify_str) > 0) or bool(
        settings.whatsapp_verify_token.get_secret_value()
    )
    wa_verify_masked = (
        _mask_token(get_decrypted_secret(db, "whatsapp_verify_token") or settings.whatsapp_verify_token.get_secret_value())
        if wa_verify_configured
        else None
    )

    wa_secret_raw = overrides.get("whatsapp_app_secret")
    wa_secret_str = str(wa_secret_raw) if wa_secret_raw else None
    wa_secret_configured = bool(wa_secret_str and len(wa_secret_str) > 0)
    wa_secret_masked = (
        _mask_token(get_decrypted_secret(db, "whatsapp_app_secret"))
        if wa_secret_configured
        else None
    )

    # Resend email secrets status
    resend_key_raw = overrides.get("resend_api_key")
    resend_key_str = str(resend_key_raw) if resend_key_raw else None
    resend_key_configured = bool(resend_key_str and len(resend_key_str) > 0) or bool(
        settings.resend_api_key.get_secret_value()
    )
    resend_key_masked = (
        _mask_token(get_decrypted_secret(db, "resend_api_key") or settings.resend_api_key.get_secret_value())
        if resend_key_configured
        else None
    )

    webhook_status = check_resend_signing_secret_status(db)
    resend_webhook_configured = webhook_status["configured"] and webhook_status["decryptable"]
    resend_webhook_masked = webhook_status["masked"]
    tunnel_raw = overrides.get("resend_webhook_tunnel_url")
    tunnel_url = str(tunnel_raw).strip() if tunnel_raw else ""
    if tunnel_url.startswith("https://"):
        resend_webhook_url = f"{tunnel_url.rstrip('/')}/api/v1/webhooks/resend"
    elif settings.backend_url.startswith("https://"):
        resend_webhook_url = f"{settings.backend_url.rstrip('/')}/api/v1/webhooks/resend"
    else:
        resend_webhook_url = None

    feat_dests = overrides.get("featured_destination_ids")
    featured_destination_ids = [str(x) for x in feat_dests] if isinstance(feat_dests, list) else []
    feat_pkgs = overrides.get("featured_package_ids")
    featured_package_ids = [str(x) for x in feat_pkgs] if isinstance(feat_pkgs, list) else []

    operating_hours_val = str(
        overrides.get("operating_hours")
        or overrides.get("business_hours")
        or "Mon - Sat: 9:00 AM - 7:00 PM"
    )

    # Latest update timestamp across site settings
    latest_update = (
        db.execute(select(func.max(SiteSetting.updated_at))).scalar()
        if rows
        else None
    )

    return AdminSiteSettingsResponse(
        # Business Identity
        legal_business_name=str(overrides.get("legal_business_name")) if overrides.get("legal_business_name") else None,
        agency_name=str(overrides.get("agency_name") or overrides.get("public_display_name") or settings.agency_name),
        public_display_name=str(overrides.get("public_display_name") or overrides.get("agency_name") or settings.agency_name),
        tagline=str(overrides.get("tagline", "Your Journey. Our Expertise.")),
        logo_url=str(overrides.get("logo_url")) if overrides.get("logo_url") else None,
        favicon_url=str(overrides.get("favicon_url")) if overrides.get("favicon_url") else None,
        business_description=str(overrides.get("business_description")) if overrides.get("business_description") else None,
        registered_office_address=str(overrides.get("registered_office_address")) if overrides.get("registered_office_address") else None,
        office_address=str(
            overrides.get(
                "office_address",
                "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012",
            )
        ),
        public_office_address=str(overrides.get("public_office_address")) if overrides.get("public_office_address") else None,
        agency_location=str(overrides.get("agency_location", settings.agency_location)),
        city=str(overrides.get("city", "Coimbatore")),
        state=str(overrides.get("state", "Tamil Nadu")),
        postal_code=str(overrides.get("postal_code", "641012")),
        country=str(overrides.get("country", "India")),
        time_zone=str(overrides.get("time_zone", "Asia/Kolkata")),
        currency=str(overrides.get("currency", "INR")),

        # Contact Details
        contact_phone=str(overrides.get("contact_phone", settings.contact_phone)),
        secondary_phone=str(overrides.get("secondary_phone")) if overrides.get("secondary_phone") else None,
        support_whatsapp=str(overrides.get("support_whatsapp")) if overrides.get("support_whatsapp") else str(overrides.get("whatsapp_number", settings.whatsapp_number)),
        emergency_phone=str(overrides.get("emergency_phone")) if overrides.get("emergency_phone") else None,
        contact_email=str(overrides.get("contact_email", settings.contact_email)),
        customer_support_email=str(overrides.get("customer_support_email")) if overrides.get("customer_support_email") else str(overrides.get("contact_email", settings.contact_email)),
        booking_email=str(overrides.get("booking_email")) if overrides.get("booking_email") else "bookings@kvtours.in",
        general_inquiry_email=str(overrides.get("general_inquiry_email")) if overrides.get("general_inquiry_email") else str(overrides.get("contact_email", settings.contact_email)),
        reply_to_email=str(overrides.get("reply_to_email")) if overrides.get("reply_to_email") else "concierge@kvtours.in",

        # Social and Online
        instagram_handle=str(overrides.get("instagram_handle", "@kvtours_travels")),
        instagram_url=str(overrides.get("instagram_url")) if overrides.get("instagram_url") else "https://instagram.com/kvtours_travels",
        facebook_url=str(overrides.get("facebook_url")) if overrides.get("facebook_url") else None,
        website_url=str(overrides.get("website_url")) if overrides.get("website_url") else "https://kvtours.in",
        google_maps_url=str(overrides.get("google_maps_url")) if overrides.get("google_maps_url") else None,

        # Business Information
        operating_hours=operating_hours_val,
        business_hours=operating_hours_val,
        holiday_notice=str(overrides.get("holiday_notice")) if overrides.get("holiday_notice") else None,
        office_contact_instructions=str(overrides.get("office_contact_instructions")) if overrides.get("office_contact_instructions") else None,

        # WhatsApp Click-to-Chat
        whatsapp_number=str(overrides.get("whatsapp_number", settings.whatsapp_number)),
        whatsapp_country_code=str(overrides.get("whatsapp_country_code", "+91")),
        whatsapp_prefilled_message=str(
            overrides.get(
                "whatsapp_prefilled_message",
                "Hi KV Tours, I am interested in planning a trip.",
            )
        ),
        whatsapp_package_message=str(overrides.get("whatsapp_package_message", "Hi KV Tours, I am interested in this package.")),
        whatsapp_destination_message=str(overrides.get("whatsapp_destination_message", "Hi KV Tours, I would like to know more about this destination.")),
        whatsapp_custom_trip_message=str(overrides.get("whatsapp_custom_trip_message", "Hi KV Tours, I would like to plan a custom holiday.")),
        whatsapp_booking_support_message=str(overrides.get("whatsapp_booking_support_message", "Hi KV Tours, I need assistance with my booking.")),
        whatsapp_enabled=_parse_bool(overrides.get("whatsapp_enabled"), True),
        whatsapp_show_floating_concierge=_parse_bool(overrides.get("whatsapp_show_floating_concierge"), True),
        whatsapp_show_header_button=_parse_bool(overrides.get("whatsapp_show_header_button"), True),
        whatsapp_show_on_homepage=_parse_bool(
            overrides.get("whatsapp_show_on_homepage"), True
        ),
        whatsapp_show_on_footer=_parse_bool(
            overrides.get("whatsapp_show_on_footer"), True
        ),
        whatsapp_show_on_package_pages=_parse_bool(
            overrides.get("whatsapp_show_on_package_pages"), True
        ),
        whatsapp_show_on_contact_page=_parse_bool(
            overrides.get("whatsapp_show_on_contact_page"), True
        ),

        # WhatsApp Cloud API
        whatsapp_cloud_api_enabled=_parse_bool(
            overrides.get("whatsapp_cloud_api_enabled"), False
        ),
        whatsapp_phone_number_id=str(overrides.get("whatsapp_phone_number_id"))
        if overrides.get("whatsapp_phone_number_id")
        else None,
        whatsapp_business_account_id=str(overrides.get("whatsapp_business_account_id"))
        if overrides.get("whatsapp_business_account_id")
        else None,
        whatsapp_api_version=str(overrides.get("whatsapp_api_version", "v20.0")),
        whatsapp_access_token_configured=wa_token_configured,
        whatsapp_access_token_masked=wa_token_masked,
        whatsapp_verify_token_configured=wa_verify_configured,
        whatsapp_verify_token_masked=wa_verify_masked,
        whatsapp_app_secret_configured=wa_secret_configured,
        whatsapp_app_secret_masked=wa_secret_masked,

        # Resend Email Configuration
        email_environment_mode=str(overrides.get("email_environment_mode", "development")),
        email_provider=str(overrides.get("email_provider", "resend")),
        resend_api_key_configured=resend_key_configured,
        resend_api_key_masked=resend_key_masked,
        resend_webhook_signing_secret_configured=resend_webhook_configured,
        resend_webhook_signing_secret_masked=resend_webhook_masked,
        resend_webhook_url=resend_webhook_url,
        resend_webhook_tunnel_url=tunnel_url if tunnel_url else None,
        email_sender_name=str(overrides.get("email_sender_name", "KV Tours & Travels")),
        email_sender_email=str(
            overrides.get(
                "email_sender_email",
                "onboarding@resend.dev" if str(overrides.get("email_environment_mode", "development")) == "development" else "bookings@kvtours.in",
            )
        ),
        email_reply_to=str(overrides.get("email_reply_to", "concierge@kvtours.in")),
        admin_notification_email=str(overrides.get("admin_notification_email", "admin@kvtours.in")),
        email_enabled=_parse_bool(overrides.get("email_enabled"), True),
        email_booking_confirmation_enabled=_parse_bool(
            overrides.get("email_booking_confirmation_enabled"), True
        ),
        email_inquiry_ack_enabled=_parse_bool(
            overrides.get("email_inquiry_ack_enabled"), True
        ),
        email_payment_receipt_enabled=_parse_bool(
            overrides.get("email_payment_receipt_enabled"), True
        ),
        email_cancellation_updates_enabled=_parse_bool(
            overrides.get("email_cancellation_updates_enabled"), True
        ),
        email_trip_reminders_enabled=_parse_bool(
            overrides.get("email_trip_reminders_enabled"), True
        ),
        email_subject_booking_confirmation=str(overrides.get("email_subject_booking_confirmation", "Your Booking Confirmation — KV Tours & Travels")),
        email_subject_payment_receipt=str(overrides.get("email_subject_payment_receipt", "Payment Receipt — KV Tours & Travels")),
        email_subject_inquiry_ack=str(overrides.get("email_subject_inquiry_ack", "Inquiry Received — KV Tours & Travels")),
        email_subject_trip_reminder=str(overrides.get("email_subject_trip_reminder", "Your Upcoming Journey with KV Tours & Travels")),

        # Homepage Content & Visibility
        hero_headline=str(overrides.get("hero_headline", "Handcrafted Journeys Beyond the Ordinary")),
        hero_subtitle=str(overrides.get("hero_subtitle", "Coimbatore's premier luxury travel curator crafting extraordinary journeys across India and the globe.")),
        hero_image_url=str(overrides.get("hero_image_url")) if overrides.get("hero_image_url") else None,
        contact_cta_text=str(overrides.get("contact_cta_text", "Speak With Concierge")),
        whatsapp_cta_text=str(overrides.get("whatsapp_cta_text", "Chat on WhatsApp")),
        featured_destination_ids=featured_destination_ids,
        featured_package_ids=featured_package_ids,
        promo_banner_active=_parse_bool(overrides.get("promo_banner_active"), False),
        promo_banner_text=str(overrides.get("promo_banner_text"))
        if overrides.get("promo_banner_text")
        else None,
        promo_banner_link=str(overrides.get("promo_banner_link"))
        if overrides.get("promo_banner_link")
        else None,
        best_offers_enabled=_parse_bool(overrides.get("best_offers_enabled"), True),

        # Rebranding, Typography & Identity
        short_name=str(overrides.get("short_name")) if overrides.get("short_name") else None,
        secondary_logo_url=str(overrides.get("secondary_logo_url")) if overrides.get("secondary_logo_url") else None,
        brand_primary_color=str(overrides.get("brand_primary_color", "#24292F")),
        brand_secondary_color=str(overrides.get("brand_secondary_color", "#C5A880")),
        brand_accent_color=str(overrides.get("brand_accent_color", "#D4AF37")),
        primary_font=str(overrides.get("primary_font", "Playfair Display")),
        secondary_font=str(overrides.get("secondary_font", "Inter")),
        year_established=int(overrides["year_established"]) if overrides.get("year_established") is not None and str(overrides.get("year_established")).isdigit() else None,
        registration_number=str(overrides.get("registration_number")) if overrides.get("registration_number") else None,
        tax_id=str(overrides.get("tax_id")) if overrides.get("tax_id") else None,

        # Extended Social Media
        youtube_url=str(overrides.get("youtube_url")) if overrides.get("youtube_url") else None,
        linkedin_url=str(overrides.get("linkedin_url")) if overrides.get("linkedin_url") else None,
        twitter_url=str(overrides.get("twitter_url")) if overrides.get("twitter_url") else None,

        # SEO & Social Metadata
        seo_website_title=str(overrides.get("seo_website_title")) if overrides.get("seo_website_title") else None,
        seo_meta_description=str(overrides.get("seo_meta_description")) if overrides.get("seo_meta_description") else None,
        seo_og_image_url=str(overrides.get("seo_og_image_url")) if overrides.get("seo_og_image_url") else None,
        seo_social_title=str(overrides.get("seo_social_title")) if overrides.get("seo_social_title") else None,
        seo_social_description=str(overrides.get("seo_social_description")) if overrides.get("seo_social_description") else None,
        organization_structured_data=overrides.get("organization_structured_data") if isinstance(overrides.get("organization_structured_data"), dict) else None,

        # Google Maps & Office Location
        google_maps_embed_url=str(overrides.get("google_maps_embed_url")) if overrides.get("google_maps_embed_url") else None,
        google_maps_latitude=float(overrides["google_maps_latitude"]) if overrides.get("google_maps_latitude") is not None else None,
        google_maps_longitude=float(overrides["google_maps_longitude"]) if overrides.get("google_maps_longitude") is not None else None,
        google_maps_zoom=int(overrides["google_maps_zoom"]) if overrides.get("google_maps_zoom") is not None else 15,
        google_maps_display_enabled=_parse_bool(overrides.get("google_maps_display_enabled"), True),
        google_maps_directions_url=str(overrides.get("google_maps_directions_url")) if overrides.get("google_maps_directions_url") else None,
        office_location_label=str(overrides.get("office_location_label")) if overrides.get("office_location_label") else None,

        updated_at=latest_update,
    )


def update_admin_settings(
    db: Session,
    payload: AdminSiteSettingsUpdateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> AdminSiteSettingsResponse:
    """Upsert agency settings, mask sensitive secrets, and record audit log."""
    changes: dict[str, object] = {}

    standard_fields = [
        "legal_business_name",
        "agency_name",
        "public_display_name",
        "tagline",
        "logo_url",
        "favicon_url",
        "business_description",
        "registered_office_address",
        "office_address",
        "public_office_address",
        "agency_location",
        "city",
        "state",
        "postal_code",
        "country",
        "time_zone",
        "currency",
        "contact_phone",
        "secondary_phone",
        "support_whatsapp",
        "emergency_phone",
        "contact_email",
        "customer_support_email",
        "booking_email",
        "general_inquiry_email",
        "reply_to_email",
        "instagram_handle",
        "instagram_url",
        "facebook_url",
        "website_url",
        "google_maps_url",
        "operating_hours",
        "business_hours",
        "holiday_notice",
        "office_contact_instructions",
        "whatsapp_number",
        "whatsapp_country_code",
        "whatsapp_prefilled_message",
        "whatsapp_package_message",
        "whatsapp_destination_message",
        "whatsapp_custom_trip_message",
        "whatsapp_booking_support_message",
        "whatsapp_enabled",
        "whatsapp_show_floating_concierge",
        "whatsapp_show_header_button",
        "whatsapp_show_on_homepage",
        "whatsapp_show_on_footer",
        "whatsapp_show_on_package_pages",
        "whatsapp_show_on_contact_page",
        "whatsapp_cloud_api_enabled",
        "whatsapp_phone_number_id",
        "whatsapp_business_account_id",
        "whatsapp_api_version",
        "email_environment_mode",
        "email_provider",
        "resend_webhook_tunnel_url",
        "email_sender_name",
        "email_sender_email",
        "email_reply_to",
        "admin_notification_email",
        "email_enabled",
        "email_booking_confirmation_enabled",
        "email_inquiry_ack_enabled",
        "email_payment_receipt_enabled",
        "email_cancellation_updates_enabled",
        "email_trip_reminders_enabled",
        "email_subject_booking_confirmation",
        "email_subject_payment_receipt",
        "email_subject_inquiry_ack",
        "email_subject_trip_reminder",
        "hero_headline",
        "hero_subtitle",
        "hero_image_url",
        "contact_cta_text",
        "whatsapp_cta_text",
        "featured_destination_ids",
        "featured_package_ids",
        "promo_banner_active",
        "promo_banner_text",
        "promo_banner_link",
        "best_offers_enabled",
        "short_name",
        "secondary_logo_url",
        "brand_primary_color",
        "brand_secondary_color",
        "brand_accent_color",
        "primary_font",
        "secondary_font",
        "year_established",
        "registration_number",
        "tax_id",
        "youtube_url",
        "linkedin_url",
        "twitter_url",
        "seo_website_title",
        "seo_meta_description",
        "seo_og_image_url",
        "seo_social_title",
        "seo_social_description",
        "organization_structured_data",
        "google_maps_embed_url",
        "google_maps_latitude",
        "google_maps_longitude",
        "google_maps_zoom",
        "google_maps_display_enabled",
        "google_maps_directions_url",
        "office_location_label",
    ]

    # Harmonize aliases
    if payload.operating_hours is not None and payload.business_hours is None:
        payload.business_hours = payload.operating_hours
    elif payload.business_hours is not None and payload.operating_hours is None:
        payload.operating_hours = payload.business_hours

    if payload.support_whatsapp is not None and payload.whatsapp_number is None:
        payload.whatsapp_number = payload.support_whatsapp
    elif payload.whatsapp_number is not None and payload.support_whatsapp is None:
        payload.support_whatsapp = payload.whatsapp_number

    if payload.agency_name is not None and payload.public_display_name is None:
        payload.public_display_name = payload.agency_name
    elif payload.public_display_name is not None and payload.agency_name is None:
        payload.agency_name = payload.public_display_name

    # Validate development tunnel URL (Requirement 2)
    if payload.resend_webhook_tunnel_url is not None:
        t_url = payload.resend_webhook_tunnel_url.strip()
        if t_url:
            if not t_url.startswith("https://"):
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=400,
                    detail="Development tunnel URL must begin with 'https://' (Resend requires HTTPS).",
                )
            if "YOUR-ACTUAL-TUNNEL-DOMAIN" in t_url:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=400,
                    detail="Please replace example placeholder with your real active HTTPS tunnel URL.",
                )

    for f in standard_fields:
        val = getattr(payload, f)
        if val is not None:
            clean_val: Any = val
            if isinstance(val, str):
                clean_val = val.strip()
            row = db.get(SiteSetting, f)
            if row is None:
                row = SiteSetting(
                    key=f,
                    value=clean_val,
                    description=f"Administrative {f.replace('_', ' ')}",
                    is_public=True,
                )
                db.add(row)
                changes[f] = {"old": None, "new": clean_val}
            else:
                old_val = row.value
                row.value = clean_val
                row.is_public = True
                changes[f] = {"old": old_val, "new": clean_val}

    # Handle sensitive integration secrets with AES-256-GCM encryption
    secret_fields = [
        ("whatsapp_access_token", "WhatsApp Cloud API Access Token"),
        ("whatsapp_verify_token", "WhatsApp Webhook Verification Token"),
        ("whatsapp_app_secret", "WhatsApp App Secret for Webhook Signing"),
        ("resend_api_key", "Resend Transactional Email API Key"),
        ("resend_webhook_signing_secret", "Resend Webhook Signing Secret"),
    ]

    for sec_key, sec_desc in secret_fields:
        sec_val = getattr(payload, sec_key, None)
        if sec_val is not None:
            clean_sec = sec_val.strip()
            if clean_sec:
                _store_secret(db, sec_key, clean_sec, sec_desc)
                changes[sec_key] = {"status": "updated_secret_redacted"}
            else:
                # If an explicit empty string was passed, remove the secret record from database
                existing_row = db.get(SiteSetting, sec_key)
                if existing_row:
                    db.delete(existing_row)
                    changes[sec_key] = {"status": "removed"}

    if changes:
        record_audit_log(
            db=db,
            action="site_settings_updated",
            entity_type="site_settings",
            entity_id="global",
            actor_user_id=current_admin_id,
            ip_address=ip_address,
            metadata={"changes": changes},
        )
        db.commit()

    return get_admin_settings(db)


def test_resend_connection(db: Session) -> EmailTestConnectionResponse:
    """Validate Resend API key authentication via official Resend endpoint."""
    api_key = get_decrypted_secret(db, "resend_api_key") or get_settings().resend_api_key.get_secret_value()
    if not api_key:
        return EmailTestConnectionResponse(
            success=False,
            status="unconfigured",
            message="Resend API key is not configured. Please input a key starting with 're_'.",
            provider="resend",
            api_key_configured=False,
        )

    # Clean key
    api_key = api_key.strip()
    if not api_key.startswith("re_"):
        return EmailTestConnectionResponse(
            success=False,
            status="invalid_format",
            message="Resend API key format is invalid. Keys must start with 're_'.",
            provider="resend",
            api_key_configured=True,
        )

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(
                "https://api.resend.com/api-keys",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return EmailTestConnectionResponse(
                    success=True,
                    status="authenticated",
                    message="Successfully authenticated with Resend API. Integration is operational.",
                    provider="resend",
                    api_key_configured=True,
                    details={"keys_count": len(data.get("data", []))},
                )
            if resp.status_code in (401, 403):
                return EmailTestConnectionResponse(
                    success=False,
                    status="unauthorized",
                    message="Resend rejected the provided API key. Please check that the key is valid and active.",
                    provider="resend",
                    api_key_configured=True,
                    details={"status_code": resp.status_code},
                )
            return EmailTestConnectionResponse(
                success=False,
                status="provider_error",
                message=f"Resend returned status code {resp.status_code}.",
                provider="resend",
                api_key_configured=True,
                details={"status_code": resp.status_code},
            )
    except httpx.RequestError as exc:
        logger.warning("Resend connection test error: %s", exc)
        return EmailTestConnectionResponse(
            success=False,
            status="network_error",
            message=f"Network error communicating with api.resend.com: {exc.__class__.__name__}",
            provider="resend",
            api_key_configured=True,
        )


def verify_resend_sender(db: Session) -> EmailTestConnectionResponse:
    """Verify sender domain configuration via Resend API."""
    settings = get_settings()
    sender_row = db.get(SiteSetting, "email_sender_email")
    env_mode_row = db.get(SiteSetting, "email_environment_mode")
    env_mode = str(env_mode_row.value).strip() if env_mode_row and env_mode_row.value else "development"
    sender_email = str(sender_row.value).strip() if sender_row and sender_row.value else ("onboarding@resend.dev" if env_mode == "development" else settings.email_from)
    if "<" in sender_email and ">" in sender_email:
        sender_email = sender_email.split("<")[1].split(">")[0].strip()

    domain = sender_email.split("@")[-1] if "@" in sender_email else "kvtours.in"

    api_key = get_decrypted_secret(db, "resend_api_key") or settings.resend_api_key.get_secret_value()
    if not api_key:
        return EmailTestConnectionResponse(
            success=False,
            status="unconfigured",
            message=f"Resend API key missing. Cannot verify domain '{domain}'.",
            provider="resend",
            api_key_configured=False,
            sender_domain=domain,
            sender_status="unknown",
            is_sandbox=False,
        )

    # Detect Resend Sandbox domain
    if domain.lower() == "resend.dev" or sender_email.lower().endswith("@resend.dev"):
        return EmailTestConnectionResponse(
            success=True,
            status="sandbox_ready",
            message=(
                "Resend Sandbox Active (onboarding@resend.dev). In Development/Test Mode without a custom domain, "
                "emails can only be delivered to your Resend account owner email or official test sinks (delivered@resend.dev, bounced@resend.dev)."
            ),
            provider="resend",
            api_key_configured=True,
            sender_domain=domain,
            sender_status="sandbox_ready",
            is_sandbox=True,
            permitted_recipients_note="Resend account owner email or delivered@resend.dev / bounced@resend.dev",
            details={"sandbox": True, "sender": sender_email},
        )

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(
                "https://api.resend.com/domains",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.status_code == 200:
                domains = resp.json().get("data", [])
                matching = next((d for d in domains if d.get("name") == domain), None)
                if matching:
                    domain_id = matching.get("id")
                    if domain_id and "records" not in matching:
                        try:
                            detail_resp = client.get(
                                f"https://api.resend.com/domains/{domain_id}",
                                headers={"Authorization": f"Bearer {api_key}"},
                            )
                            if detail_resp.status_code == 200:
                                matching = detail_resp.json()
                        except httpx.HTTPError:
                            logger.warning("Failed to fetch domain records for domain %s", domain_id)

                    d_status = matching.get("status", "pending")
                    is_verified = d_status == "verified"
                    return EmailTestConnectionResponse(
                        success=is_verified,
                        status=d_status,
                        message=f"Domain '{domain}' status in Resend is '{d_status}'.",
                        provider="resend",
                        api_key_configured=True,
                        sender_domain=domain,
                        sender_status=d_status,
                        is_sandbox=False,
                        dns_records=matching.get("records") if isinstance(matching.get("records"), list) else None,
                        details=matching,
                    )
                return EmailTestConnectionResponse(
                    success=False,
                    status="not_found",
                    message=f"Domain '{domain}' was not found in your Resend account. Add and verify your domain at resend.com/domains, or use 'onboarding@resend.dev' in Development Mode.",
                    provider="resend",
                    api_key_configured=True,
                    sender_domain=domain,
                    sender_status="not_found",
                    is_sandbox=False,
                )
            return EmailTestConnectionResponse(
                success=False,
                status="api_error",
                message=f"Resend returned HTTP {resp.status_code} while fetching domains.",
                provider="resend",
                api_key_configured=True,
                sender_domain=domain,
                is_sandbox=False,
            )
    except Exception as exc:  # noqa: BLE001
        return EmailTestConnectionResponse(
            success=False,
            status="network_error",
            message=f"Could not connect to Resend API: {exc}",
            provider="resend",
            api_key_configured=True,
            sender_domain=domain,
            is_sandbox=False,
        )


def send_test_email(
    db: Session,
    recipient_email: str,
    subject: str,
    notes: str | None,
    admin_id: UUID,
) -> EmailSendTestResponse:
    """Send an explicit test email to verify transactional delivery without affecting customers."""
    settings = get_settings()
    api_key = get_decrypted_secret(db, "resend_api_key") or settings.resend_api_key.get_secret_value()

    sender_name_row = db.get(SiteSetting, "email_sender_name")
    sender_name = str(sender_name_row.value).strip() if sender_name_row and sender_name_row.value else settings.agency_name

    sender_email_row = db.get(SiteSetting, "email_sender_email")
    sender_email = str(sender_email_row.value).strip() if sender_email_row and sender_email_row.value else "bookings@kvtours.in"

    reply_to_row = db.get(SiteSetting, "email_reply_to")
    reply_to = str(reply_to_row.value).strip() if reply_to_row and reply_to_row.value else "concierge@kvtours.in"

    from_header = f"{sender_name} <{sender_email}>"

    html_content = f"""
    <div style="font-family: sans-serif; color: #202124; max-width: 600px; padding: 24px;">
        <h2 style="color: #0A0A0A; border-bottom: 2px solid #D4AF37; padding-bottom: 8px;">
            KV TOURS & TRAVELS — System Delivery Verification
        </h2>
        <p>This is an automated test message dispatched by an authorized administrator.</p>
        <div style="background: #F7F7F5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Recipient:</strong> {recipient_email}</p>
            <p><strong>Sender:</strong> {from_header}</p>
            <p><strong>Reply-To:</strong> {reply_to}</p>
            <p><strong>Timestamp:</strong> {datetime.now(timezone.utc).isoformat()}</p>
            {f'<p><strong>Admin Notes:</strong> {notes}</p>' if notes else ''}
        </div>
        <p style="color: #70757A; font-size: 12px;">KV Tours & Travels Coimbatore • Authoritative Notification Engine</p>
    </div>
    """

    provider = "resend"

    if not api_key:
        raise ValueError("Resend API key is not configured. Please enter and save your Resend API key before sending test emails.")

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_header,
                    "to": [recipient_email],
                    "reply_to": reply_to,
                    "subject": subject,
                    "html": html_content,
                },
            )
            if resp.status_code != 200:
                err_msg = resp.text
                try:
                    err_body = resp.json()
                    if isinstance(err_body, dict) and err_body.get("message"):
                        err_msg = str(err_body["message"])
                except ValueError:
                    pass
                if resp.status_code == 403:
                    raise ValueError(
                        f"Resend Sandbox Restriction: {err_msg}. "
                        "In Development Mode without a verified domain, Resend only permits sending to your Resend account owner email "
                        "or official test sinks 'delivered@resend.dev' and 'bounced@resend.dev'."
                    )
                raise ValueError(f"Resend rejected test email (HTTP {resp.status_code}): {err_msg}")

            data = resp.json()
            provider_msg_id = str(data.get("id") or f"resend-{uuid4().hex[:8]}")
    except httpx.RequestError as exc:
        logger.error("Failed to connect to Resend API: %s", exc)
        raise ValueError(f"Network error connecting to api.resend.com: {exc.__class__.__name__}") from exc

    log_entry = NotificationLog(
        channel="email",
        notification_type="admin_test_email",
        recipient=recipient_email,
        recipient_user_id=admin_id,
        subject=subject,
        provider=provider,
        provider_message_id=provider_msg_id,
        status="sent",
        sent_at=datetime.now(timezone.utc),
    )
    db.add(log_entry)
    db.commit()

    return EmailSendTestResponse(
        success=True,
        message=f"Test email successfully accepted by {provider.upper()} provider.",
        provider=provider,
        message_id=provider_msg_id,
        recipient=recipient_email,
        timestamp=datetime.now(timezone.utc),
    )


def test_whatsapp_connection(db: Session) -> WhatsAppTestConnectionResponse:
    """Validate Meta WhatsApp Business Cloud API credentials via Graph API."""
    settings = get_settings()
    phone_id_row = db.get(SiteSetting, "whatsapp_phone_number_id")
    phone_id = (
        str(phone_id_row.value).strip()
        if phone_id_row and phone_id_row.value
        else settings.whatsapp_business_phone_id
    )

    api_ver_row = db.get(SiteSetting, "whatsapp_api_version")
    api_version = (
        str(api_ver_row.value).strip()
        if api_ver_row and api_ver_row.value
        else "v20.0"
    )

    token = get_decrypted_secret(db, "whatsapp_access_token") or settings.whatsapp_access_token.get_secret_value()

    if not phone_id or not token:
        return WhatsAppTestConnectionResponse(
            success=False,
            status="unconfigured",
            message="Meta WhatsApp Cloud API Phone Number ID and Access Token must both be configured.",
            phone_number_id=phone_id or None,
        )

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(
                f"https://graph.facebook.com/{api_version}/{phone_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return WhatsAppTestConnectionResponse(
                    success=True,
                    status="connected",
                    message="Successfully connected to Meta Graph API. WhatsApp Business Phone is verified.",
                    phone_number_id=phone_id,
                    verified_name=data.get("verified_name"),
                    display_phone_number=data.get("display_phone_number"),
                    quality_rating=data.get("quality_rating"),
                    details=data,
                )
            error_data = resp.json().get("error", {})
            err_msg = error_data.get("message") or f"Meta Graph API error (HTTP {resp.status_code})"
            return WhatsAppTestConnectionResponse(
                success=False,
                status="meta_error",
                message=err_msg,
                phone_number_id=phone_id,
                details=error_data,
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("WhatsApp connection test network error: %s", exc)
        return WhatsAppTestConnectionResponse(
            success=False,
            status="network_error",
            message=f"Network error communicating with Meta Graph API: {exc}",
            phone_number_id=phone_id,
        )


def get_configuration_health(db: Session) -> ConfigurationHealthResponse:
    """Analyze and score overall business and integration setup."""
    admin_settings = get_admin_settings(db)

    # 1. Profile Health
    profile_required = [
        ("agency_name", bool(admin_settings.agency_name)),
        ("tagline", bool(admin_settings.tagline)),
        ("office_address", bool(admin_settings.office_address)),
        ("city", bool(admin_settings.city)),
        ("contact_phone", bool(admin_settings.contact_phone)),
        ("contact_email", bool(admin_settings.contact_email)),
        ("time_zone", bool(admin_settings.time_zone)),
        ("currency", bool(admin_settings.currency)),
    ]
    missing_fields = [k for k, present in profile_required if not present]
    profile_score = int((len(profile_required) - len(missing_fields)) / len(profile_required) * 100)
    profile_status = "complete" if profile_score == 100 else "incomplete"

    # 2. WhatsApp Click-to-Chat
    wa_c2c_status = "active" if admin_settings.whatsapp_enabled and admin_settings.whatsapp_number else "inactive"

    # 3. WhatsApp Cloud API
    wa_cloud_status = (
        "connected"
        if admin_settings.whatsapp_cloud_api_enabled and admin_settings.whatsapp_access_token_configured and admin_settings.whatsapp_phone_number_id
        else "unconfigured"
    )

    # 4. Resend Email
    email_status = (
        "configured"
        if admin_settings.resend_api_key_configured and admin_settings.email_enabled
        else "unconfigured"
    )

    # 5. Payment Gateway
    razorpay_row = db.get(SiteSetting, "razorpay_gateway_config")
    rzp_configured = False
    if razorpay_row and isinstance(razorpay_row.value, dict):
        rzp_configured = bool(razorpay_row.value.get("enabled"))
    payment_status = "configured" if rzp_configured else "default_test"

    # 6. Bank Transfer
    bank_row = db.get(SiteSetting, "bank_transfer_settings")
    bank_status = "disabled"
    if bank_row and isinstance(bank_row.value, dict):
        bank_status = "enabled" if bank_row.value.get("bank_transfer_enabled") else "disabled"

    # Composite score
    score = 0
    score += int(profile_score * 0.35)  # 35%
    if wa_c2c_status == "active":
        score += 20  # 20%
    if email_status == "configured":
        score += 25  # 25%
    if payment_status == "configured":
        score += 10  # 10%
    if bank_status == "enabled":
        score += 10  # 10%

    overall_status = "healthy" if score >= 80 else "warning" if score >= 50 else "action_required"

    items = [
        {
            "name": "Agency Business Identity",
            "status": profile_status,
            "score": profile_score,
            "description": f"{profile_score}% completed. Authoritative legal and contact details.",
        },
        {
            "name": "WhatsApp Click-to-Chat",
            "status": wa_c2c_status,
            "score": 100 if wa_c2c_status == "active" else 0,
            "description": f"Direct wa.me support number: {admin_settings.whatsapp_number}",
        },
        {
            "name": "WhatsApp Cloud API",
            "status": wa_cloud_status,
            "score": 100 if wa_cloud_status == "connected" else 0,
            "description": "Meta Graph API automated message delivery.",
        },
        {
            "name": "Resend Transactional Email",
            "status": email_status,
            "score": 100 if email_status == "configured" else 0,
            "description": f"Sender: {admin_settings.email_sender_email}",
        },
        {
            "name": "Online Payment Gateway",
            "status": payment_status,
            "score": 100 if payment_status == "configured" else 50,
            "description": "Razorpay sandbox/live processing.",
        },
        {
            "name": "Direct Bank Transfer",
            "status": bank_status,
            "score": 100 if bank_status == "enabled" else 0,
            "description": "Branch & NEFT/RTGS payment verification.",
        },
    ]

    return ConfigurationHealthResponse(
        overall_status=overall_status,
        overall_score=score,
        status=overall_status,
        health_score=score,
        agency_profile_status=profile_status,
        agency_profile_completed_percentage=profile_score,
        missing_profile_fields=missing_fields,
        whatsapp_click_to_chat_status=wa_c2c_status,
        whatsapp_cloud_api_status=wa_cloud_status,
        resend_email_status=email_status,
        payment_gateway_status=payment_status,
        bank_transfer_status=bank_status,
        items=items,
    )


def verify_resend_webhook_configuration(
    db: Session,
    signing_secret: str | None = None,
) -> ResendWebhookVerifyResponse:
    import base64
    import binascii
    import hashlib
    import hmac

    from app.api.v1.routes.webhooks import verify_resend_svix_signature
    from app.models.content import AuditLog

    settings = get_settings()
    local_url = "http://localhost:8000/api/v1/webhooks/resend"

    # 1. URL resolution: Local reference vs Public HTTPS endpoint
    tunnel_row = db.get(SiteSetting, "resend_webhook_tunnel_url")
    tunnel_url = str(tunnel_row.value).strip() if tunnel_row and tunnel_row.value else ""

    public_webhook_url: str | None = None
    if tunnel_url.startswith("https://"):
        public_webhook_url = f"{tunnel_url.rstrip('/')}/api/v1/webhooks/resend"
        is_https = True
        webhook_url = public_webhook_url
    elif settings.backend_url.startswith("https://"):
        public_webhook_url = f"{settings.backend_url.rstrip('/')}/api/v1/webhooks/resend"
        is_https = True
        webhook_url = public_webhook_url
    else:
        is_https = False
        webhook_url = local_url

    # 2. Secret resolution & persistence check
    if signing_secret and signing_secret.strip():
        secret_to_check = signing_secret.strip()
        secret_status = {
            "configured": True,
            "decryptable": True,
            "source": "input",
            "masked": _mask_token(secret_to_check),
            "status": "ready",
        }
    else:
        secret_status = check_resend_signing_secret_status(db)
        secret_to_check = secret_status["secret"]

    # Handle undecryptable secret
    if secret_status["status"] == "decryption_failed":
        return ResendWebhookVerifyResponse(
            success=False,
            status="decryption_failed",
            message="Webhook signing secret is present in database but cannot be decrypted with the active encryption key. Please re-enter and save the signing secret.",
            webhook_url=webhook_url,
            local_url=local_url,
            public_webhook_url=public_webhook_url,
            is_https=is_https,
            signing_secret_configured=False,
            signing_secret_masked=None,
            secret_saved_and_decryptable=False,
            signature_verification_valid=False,
            public_https_configured=is_https,
            endpoint_reachable=False,
            endpoint_reachable_detail="Secret undecryptable",
            resend_registration_status="manual_verification_required",
            resend_registration_detail="Fix signing secret first",
            last_event=None,
        )

    # Handle unconfigured secret
    if not secret_to_check:
        return ResendWebhookVerifyResponse(
            success=False,
            status="unconfigured",
            message="Resend webhook signing secret is not configured. Retrieve 'whsec_...' from Resend Dashboard > Webhooks.",
            webhook_url=webhook_url,
            local_url=local_url,
            public_webhook_url=public_webhook_url,
            is_https=is_https,
            signing_secret_configured=False,
            signing_secret_masked=None,
            secret_saved_and_decryptable=False,
            signature_verification_valid=False,
            public_https_configured=is_https,
            endpoint_reachable=False,
            endpoint_reachable_detail="No signing secret configured",
            resend_registration_status="manual_verification_required",
            resend_registration_detail="Register webhook and copy signing secret from Resend Dashboard",
            last_event=None,
        )

    clean_sec = secret_to_check.strip()
    if not clean_sec.startswith("whsec_") and len(clean_sec) < 20:
        return ResendWebhookVerifyResponse(
            success=False,
            status="invalid_format",
            message="Invalid signing secret format. Resend webhook secrets typically start with 'whsec_'.",
            webhook_url=webhook_url,
            local_url=local_url,
            public_webhook_url=public_webhook_url,
            is_https=is_https,
            signing_secret_configured=True,
            signing_secret_masked=_mask_token(clean_sec),
            secret_saved_and_decryptable=True,
            signature_verification_valid=False,
            public_https_configured=is_https,
            endpoint_reachable=False,
            resend_registration_status="manual_verification_required",
            resend_registration_detail="Secret format invalid",
            last_event=None,
        )

    # 3. Test Svix signature generation and validation
    dummy_payload = b'{"type":"email.delivered"}'
    test_id = f"test_{uuid4().hex[:8]}"
    test_ts = str(int(datetime.now(timezone.utc).timestamp()))

    clean_key = clean_sec.removeprefix("whsec_")
    try:
        key_bytes = base64.b64decode(clean_key)
    except (binascii.Error, ValueError):
        key_bytes = clean_key.encode()

    to_sign = f"{test_id}.{test_ts}.".encode() + dummy_payload
    sig_digest = hmac.new(key_bytes, to_sign, hashlib.sha256).digest()
    sig_b64 = base64.b64encode(sig_digest).decode("utf-8")

    verified = verify_resend_svix_signature(
        raw_body=dummy_payload,
        svix_id=test_id,
        svix_timestamp=test_ts,
        svix_signature=f"v1,{sig_b64}",
        secret=clean_sec,
    )

    if not verified:
        return ResendWebhookVerifyResponse(
            success=False,
            status="verification_failed",
            message="Signature algorithm validation failed with provided secret.",
            webhook_url=webhook_url,
            local_url=local_url,
            public_webhook_url=public_webhook_url,
            is_https=is_https,
            signing_secret_configured=True,
            signing_secret_masked=_mask_token(clean_sec),
            secret_saved_and_decryptable=True,
            signature_verification_valid=False,
            public_https_configured=is_https,
            endpoint_reachable=False,
            resend_registration_status="manual_verification_required",
            resend_registration_detail="Signature algorithm failed",
            last_event=None,
        )

    # 4. Probe public HTTPS endpoint reachability (if public HTTPS)
    endpoint_reachable: bool | None = None
    endpoint_reachable_detail: str | None = None
    if is_https and public_webhook_url:
        try:
            with httpx.Client(timeout=2.5) as client:
                resp = client.request("OPTIONS", public_webhook_url)
                endpoint_reachable = True
                endpoint_reachable_detail = f"Public endpoint responded with HTTP {resp.status_code}."
        except Exception as exc:  # noqa: BLE001
            endpoint_reachable = False
            endpoint_reachable_detail = f"Could not reach public endpoint: {exc}"
    else:
        endpoint_reachable = False
        endpoint_reachable_detail = "Local HTTP (localhost) cannot receive webhooks from Resend. Use HTTPS tunnel."

    # 5. Check Resend registration status via Resend API
    resend_registration_status = "manual_verification_required"
    resend_registration_detail = "Check Resend Dashboard > Webhooks to verify registration."
    api_key = get_decrypted_secret(db, "resend_api_key") or getattr(settings.resend_api_key, "get_secret_value", lambda: "")()
    if api_key and api_key.startswith("re_"):
        try:
            with httpx.Client(timeout=3.0) as client:
                r_hooks = client.get(
                    "https://api.resend.com/webhooks",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                if r_hooks.status_code == 200:
                    h_data = r_hooks.json()
                    hook_list = h_data.get("data", []) if isinstance(h_data, dict) else []
                    target = public_webhook_url or webhook_url
                    matched = [
                        h for h in hook_list
                        if isinstance(h, dict) and (h.get("endpoint") == target or h.get("url") == target)
                    ]
                    if matched:
                        resend_registration_status = "verified_in_resend"
                        resend_registration_detail = f"Registered in Resend with ID {matched[0].get('id')} ({matched[0].get('status', 'active')})."
                    else:
                        resend_registration_status = "not_registered"
                        resend_registration_detail = f"Webhook URL '{target}' not found in Resend. Register it under Resend Dashboard > Webhooks."
                elif r_hooks.status_code == 403:
                    resend_registration_status = "manual_verification_required"
                    resend_registration_detail = "Resend API key does not have permissions to list webhooks. Verify manually in Resend Dashboard."
        except Exception as exc:  # noqa: BLE001
            resend_registration_status = "manual_verification_required"
            resend_registration_detail = f"Could not query Resend API: {exc}"

    # 6. Retrieve last received event from AuditLog
    last_audit = db.execute(
        select(AuditLog)
        .where(AuditLog.action == "resend_webhook_received")
        .order_by(AuditLog.created_at.desc())
        .limit(1)
    ).scalars().first()
    last_event = None
    if last_audit:
        m = last_audit.metadata_json or {}
        last_event = {
            "event_type": m.get("event_type", "unknown"),
            "email_id": m.get("email_id"),
            "recipient": m.get("recipient"),
            "received_at": last_audit.created_at.isoformat(),
            "matched_log_id": m.get("matched_log_id"),
        }

    # 7. Construct response message
    if not is_https:
        msg = (
            "Webhook signing engine successfully verified. Note: Resend requires a public HTTPS endpoint. "
            "Localhost (HTTP) cannot receive webhooks directly from Resend. "
            "Configure an HTTPS development tunnel (e.g. 'ngrok http 8000') or deploy to an HTTPS server."
        )
    else:
        msg = f"Webhook signing engine successfully verified. Active HTTPS endpoint ready: {webhook_url}"

    return ResendWebhookVerifyResponse(
        success=True,
        status="verified",
        message=msg,
        webhook_url=webhook_url,
        local_url=local_url,
        public_webhook_url=public_webhook_url,
        is_https=is_https,
        signing_secret_configured=True,
        signing_secret_masked=_mask_token(clean_sec),
        secret_saved_and_decryptable=True,
        signature_verification_valid=True,
        public_https_configured=is_https,
        endpoint_reachable=endpoint_reachable,
        endpoint_reachable_detail=endpoint_reachable_detail,
        resend_registration_status=resend_registration_status,
        resend_registration_detail=resend_registration_detail,
        last_event=last_event,
        diagnostics={
            "algorithm": "HMAC-SHA256 (Svix standard)",
            "secret_prefix": clean_sec[:6] if len(clean_sec) >= 6 else "raw",
            "webhook_endpoint": webhook_url,
            "is_https": is_https,
            "secret_source": secret_status.get("source", "unknown"),
            "verified_at": datetime.now(timezone.utc).isoformat(),
        },
    )


def get_resend_webhook_stats(db: Session) -> ResendWebhookStatsResponse:
    """Retrieve delivery and bounce statistics from logged Resend webhook events."""
    from app.models.content import AuditLog

    settings = get_settings()
    local_url = "http://localhost:8000/api/v1/webhooks/resend"
    tunnel_row = db.get(SiteSetting, "resend_webhook_tunnel_url")
    tunnel_url = str(tunnel_row.value).strip() if tunnel_row and tunnel_row.value else ""
    public_webhook_url: str | None = None
    if tunnel_url.startswith("https://"):
        public_webhook_url = f"{tunnel_url.rstrip('/')}/api/v1/webhooks/resend"
        webhook_url = public_webhook_url
        is_https = True
    elif settings.backend_url.startswith("https://"):
        public_webhook_url = f"{settings.backend_url.rstrip('/')}/api/v1/webhooks/resend"
        webhook_url = public_webhook_url
        is_https = True
    else:
        webhook_url = local_url
        is_https = False

    sec_status = check_resend_signing_secret_status(db)
    is_configured = sec_status["configured"] and sec_status["decryptable"]

    events_stmt = (
        select(AuditLog)
        .where(AuditLog.action == "resend_webhook_received")
        .order_by(AuditLog.created_at.desc())
    )
    total = db.execute(select(func.count(AuditLog.id)).where(AuditLog.action == "resend_webhook_received")).scalar_one()

    recent_logs = db.execute(events_stmt.limit(10)).scalars().all()

    delivered_count = 0
    bounced_count = 0
    complained_count = 0
    recent_events: list[dict[str, Any]] = []

    last_event_at = None
    last_event_type = None
    last_event: dict[str, Any] | None = None

    if recent_logs:
        last_event_at = recent_logs[0].created_at
        m0 = recent_logs[0].metadata_json or {}
        last_event_type = m0.get("event_type")
        last_event = {
            "event_type": m0.get("event_type", "unknown"),
            "email_id": m0.get("email_id"),
            "recipient": m0.get("recipient"),
            "received_at": recent_logs[0].created_at.isoformat(),
            "matched_log_id": m0.get("matched_log_id"),
        }

    all_events = db.execute(
        select(AuditLog.metadata_json).where(AuditLog.action == "resend_webhook_received")
    ).scalars().all()

    for meta in all_events:
        if isinstance(meta, dict):
            etype = meta.get("event_type")
            if etype == "email.delivered":
                delivered_count += 1
            elif etype == "email.bounced":
                bounced_count += 1
            elif etype == "email.complained":
                complained_count += 1

    for l in recent_logs:
        m = l.metadata_json or {}
        recent_events.append({
            "id": str(l.id),
            "event_id": l.entity_id,
            "event_type": m.get("event_type", "unknown"),
            "email_id": m.get("email_id"),
            "recipient": m.get("recipient"),
            "subject": m.get("subject"),
            "timestamp": l.created_at.isoformat(),
        })

    return ResendWebhookStatsResponse(
        webhook_url=webhook_url,
        local_url=local_url,
        public_tunnel_url=public_webhook_url,
        signing_secret_configured=is_configured,
        signing_secret_saved_and_decryptable=is_configured,
        signing_secret_masked=sec_status["masked"],
        public_https_configured=is_https,
        total_events_received=total,
        delivered_count=delivered_count,
        bounced_count=bounced_count,
        complained_count=complained_count,
        last_event_at=last_event_at,
        last_event_type=last_event_type,
        last_event=last_event,
        recent_events=recent_events,
    )

