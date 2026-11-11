"""Service layer for editable Website Content pages (About, Contact).

Manages draft persistence, publishing workflow, audit logging,
and seamless agency profile attribute resolution.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.content import AuditLog, SiteSetting
from app.schemas.content import (
    AboutPageContent,
    AdminPageEnvelopeResponse,
    ContactPageContent,
    CustomTripPageContent,
    DestinationsPageContent,
    GroupTripsPageContent,
    HomePageContent,
    PackagesPageContent,
    PublicPageResponse,
)
from app.services.catalog_service import get_public_settings

logger = logging.getLogger(__name__)


def get_default_about_content(agency_name: str, city: str, address: str) -> dict[str, Any]:
    """Generate rich default initial content for the About Page."""
    return {
        "hero": {
            "show_section": True,
            "eyebrow": f"{city} Born • Worldwide Curated",
            "heading": "",  # Fallback to f"About {agency_name}"
            "description": "Crafting bespoke international holidays, signature group escapes, and domestic expeditions with genuine care and meticulous attention to detail.",
            "background_image_url": None,
        },
        "story": {
            "show_section": True,
            "eyebrow": "Our Origin & Heart",
            "title": "",  # Fallback to f"Rooted in {city}, Inspired by the World"
            "paragraphs": [
                f"{agency_name} was established in {city} to offer discerning travelers a refreshing alternative to impersonal booking portals and rigid group tours.",
                "We believe that travel is deeply personal. Whether it is stepping onto the pristine atolls of the Maldives, discovering the lagoons of Lakshadweep, traversing the snowy landscapes of Kazakhstan, or breathing the pine air of Manali, every journey should feel effortless and memorable.",
            ],
            "image_url": None,
            "image_position": "right",
            "office_card_title": f"{agency_name} Concierge Office",
            "office_card_description": f"Headquartered at {address}, our team provides face-to-face consultations as well as digital planning for clients across South India and beyond.",
        },
        "mission_vision": {
            "show_section": True,
            "mission_title": "Our Mission",
            "mission_description": "To transform travel into a seamless art of discovery, pairing bespoke luxury with authentic cultural immersion.",
            "vision_title": "Our Vision",
            "vision_description": "To be the most trusted travel curator, celebrated for uncompromising traveler care, transparent planning, and unforgettable journeys.",
        },
        "principles": {
            "show_section": True,
            "eyebrow": "Our Standards",
            "heading": "Our Core Travel Principles",
            "description": "Honest, verified commitments that guide every itinerary we build.",
            "cards": [
                {
                    "id": "vetted_accommodations",
                    "title": "Vetted Accommodations",
                    "description": "We don't book random hotels off algorithm aggregators. Every resort, boutique hotel, and stay partner is verified for cleanliness, safety, hospitality, and location.",
                    "icon": "ShieldCheck",
                },
                {
                    "id": "personal_care",
                    "title": "Personal Care",
                    "description": f"You are not a ticket number. A designated {city} travel advisor coordinates your visas, flights, and vouchers, and remains reachable via WhatsApp throughout your entire holiday.",
                    "icon": "HeartHandshake",
                },
                {
                    "id": "transparent_planning",
                    "title": "Transparent Planning",
                    "description": "No hidden surcharges or surprise fees. Every quote clearly specifies room categories, inclusions, transfers, meal plans, and activity admissions before you pay.",
                    "icon": "Sparkles",
                },
            ],
        },
        "stats": {
            "show_section": True,
            "heading": "By The Numbers",
            "items": [
                {"id": "stat_1", "label": "Happy Travelers", "value": "12,000+", "icon": "Users"},
                {"id": "stat_2", "label": "Destinations Covered", "value": "45+", "icon": "Globe"},
                {"id": "stat_3", "label": "Years of Excellence", "value": "12+", "icon": "Sparkles"},
                {"id": "stat_4", "label": "Curated Itineraries", "value": "3,500+", "icon": "Compass"},
            ],
        },
        "team": {
            "show_section": False,
            "heading": "Meet Our Travel Designers",
            "description": "The passionate explorers crafting your unforgettable itineraries.",
            "members": [],
        },
        "testimonials": {
            "show_section": False,
            "heading": "Traveler Reflections",
            "description": "Real stories from journeys we have curated.",
            "items": [],
        },
        "cta": {
            "show_section": True,
            "heading": "",  # Fallback to f"Experience the {agency_name} Difference"
            "description": f"Let us turn your vacation dreams into a seamless reality. Connect with our {city} advisors today.",
            "primary_button_text": "Plan Your Trip",
            "primary_button_link": "/custom-trip",
            "secondary_button_text": "Chat on WhatsApp",
            "secondary_button_link": None,
        },
        "office": {
            "show_section": True,
            "heading": "Visit Our Travel Lounge",
            "address": address,
            "hours": "Mon – Sat: 09:30 AM – 07:30 PM IST",
            "guidance": "Free client parking available on premises. Walk-ins welcome during office hours.",
        },
        "sections_order": [
            "hero",
            "story",
            "mission_vision",
            "principles",
            "stats",
            "team",
            "testimonials",
            "cta",
        ],
        "seo_title": f"About Us | {agency_name}",
        "seo_meta_description": f"Learn about {agency_name}, our journey, team, and bespoke travel philosophy.",
        "seo_og_image": None,
    }


def get_default_contact_content(agency_name: str, city: str, address: str, phone: str, email: str, hours: str) -> dict[str, Any]:
    """Generate rich default initial content for the Contact Page."""
    return {
        "hero": {
            "show_section": True,
            "eyebrow": f"{city} Concierge",
            "heading": "Connect With Our Travel Experts",
            "description": "Have questions regarding upcoming departures, custom itineraries, or visa requirements? We are here to guide you every step of the way.",
        },
        "cards": {
            "show_section": True,
            "office_card_title": "Visit Our Office",
            "office_card_heading": f"{city} Head Office",
            "office_address": address,
            "operating_hours": hours or "Mon – Sat: 09:30 AM – 07:30 PM IST",
            "phone_card_title": "Direct Inquiries",
            "phone_card_heading": "Call & Email",
            "primary_phone": phone,
            "secondary_phone": None,
            "emergency_phone": None,
            "contact_email": email,
            "whatsapp_card_title": "Fast WhatsApp Assistance",
            "whatsapp_card_description": f"Need quick departure availability, brochure PDFs, or urgent quotes? Our {city} team is active on WhatsApp daily.",
            "whatsapp_button_text": "Chat on WhatsApp",
        },
        "form": {
            "show_section": True,
            "eyebrow": "Send a Message",
            "heading": "How Can We Assist Your Travels?",
            "description": "Fill out the inquiry form below and our destination specialist will contact you within 2 business hours.",
            "topics": [
                "General Holiday Enquiry",
                "Group Tour Departure Booking",
                "Custom Honeymoon Escapes",
                "Corporate & Family Group Retreat",
                "Flight & Visa Assistance",
            ],
            "success_message": "Thank you! Our travel concierge has received your message and will reach out shortly.",
        },
        "map": {
            "show_map": True,
            "map_title": "Find Our Office Location",
            "office_location_label": f"{agency_name} Headquarters",
            "embed_url": None,
            "directions_url": None,
            "location_url": None,
            "zoom": 15,
        },
        "seo_title": f"Contact Us | {agency_name}",
        "seo_meta_description": f"Reach out to {agency_name} in {city} for customized holiday packages, group departures, and travel support.",
        "seo_og_image": None,
    }


def get_default_home_content(agency_name: str, city: str, current_settings: dict[str, Any] | None = None) -> dict[str, Any]:
    """Generate default initial content for the Main Website (Homepage)."""
    settings = current_settings or {}
    headline = settings.get("hero_headline") or "Your Journey. Our Expertise."
    subtitle = (
        settings.get("hero_subtitle")
        or f"Curating bespoke international escapes, breathtaking domestic expeditions, and signature group departures from {city}."
    )
    img_url = settings.get("hero_image_url") or "/images/hero/hero-4k.webp"
    eyebrow = f"{agency_name.upper()} • {city.upper()}"
    return {
        "hero": {
            "eyebrow": eyebrow,
            "heading": headline,
            "description": subtitle,
            "media_type": "image",
            "image_url": img_url,
            "video_url": None,
            "primary_cta_text": "Explore Curated Journeys",
            "primary_cta_link": "/packages",
            "secondary_cta_text": "Plan Custom Trip",
            "secondary_cta_link": "/custom-trip",
            "whatsapp_cta_text": "WhatsApp Us",
            "popular_tags": ["Maldives", "Lakshadweep", "Bali", "Manali", "Kazakhstan", "Japan"],
        },
        "intro_eyebrow": "Bespoke Travel",
        "intro_heading": "Handcrafted Journeys Beyond the Ordinary",
        "intro_description": "Every itinerary is tailored from scratch with private transfers, verified boutique stays, and dedicated concierge support.",
        "trust_indicators": [
            {"icon": "ShieldCheck", "label": "Verified Luxury Stays"},
            {"icon": "Sparkles", "label": "Personalized Concierge"},
            {"icon": "Plane", "label": "Seamless Flight Logistics"},
        ],
        "featured_content": {
            "featured_destination_ids": settings.get("featured_destination_ids") or [],
            "featured_package_ids": settings.get("featured_package_ids") or [],
            "promo_banner_active": bool(settings.get("promo_banner_active", False)),
            "promo_banner_text": settings.get("promo_banner_text") or "Special Seasonal Offer: Up to 15% off Early Bird Bookings",
            "promo_banner_link": settings.get("promo_banner_link") or "/offers",
            "best_offers_enabled": bool(settings.get("best_offers_enabled", True)),
        },
        "sections_visibility": {
            "trending_destinations": True,
            "best_offers": True,
            "featured_packages": True,
            "travel_inspirations": True,
            "upcoming_departures": True,
            "custom_cta": True,
        },
        "sections_order": [
            "hero",
            "trending_destinations",
            "best_offers",
            "featured_packages",
            "travel_inspirations",
            "upcoming_departures",
            "custom_cta",
        ],
        "seo_title": f"{agency_name} | Luxury & Adventure Journeys {city}",
        "seo_meta_description": f"Curated international holidays, private expeditions, and bespoke vacations by {agency_name}.",
        "seo_og_image": img_url,
        "seo_social_title": f"{agency_name} | Bespoke Luxury Escapes",
        "seo_social_description": f"Explore world-class holidays and signature departures crafted from {city}.",
    }


def get_default_destinations_content(agency_name: str, city: str) -> dict[str, Any]:
    """Generate default initial content for the Destinations catalog listing page."""
    return {
        "hero": {
            "eyebrow": "Worldwide Catalog",
            "heading": "Destinations Beyond the Ordinary",
            "description": f"From turquoise island lagoons to dramatic mountain peaks, explore hand-selected destinations curated by {agency_name} {city}.",
            "banner_image_url": None,
        },
        "introductory_text": "From turquoise island lagoons to dramatic mountain peaks, explore hand-selected destinations curated by our travel specialists.",
        "cta": {
            "show_cta": False,
            "primary_button_text": "Plan Custom Trip",
            "primary_button_link": "/custom-trip",
            "secondary_button_text": "WhatsApp Concierge",
            "secondary_button_link": None,
        },
        "seo_title": f"Destinations Beyond the Ordinary | {agency_name}",
        "seo_meta_description": f"Explore destinations hand-curated by {agency_name}. Verified stays and bespoke holiday itineraries.",
        "seo_og_image": None,
    }


def get_default_packages_content(agency_name: str, city: str) -> dict[str, Any]:
    """Generate default initial content for the Packages catalog listing page."""
    return {
        "hero": {
            "eyebrow": "Curated Travel Packages",
            "heading": "Extraordinary Itineraries",
            "description": "Every journey includes curated accommodations, private transfers, and handpicked local experiences designed for discerning travelers.",
            "banner_image_url": None,
        },
        "introductory_text": "Every journey includes curated accommodations, private transfers, and handpicked local experiences designed for discerning travelers.",
        "cta": {
            "show_cta": False,
            "primary_button_text": "Custom Plan",
            "primary_button_link": "/custom-trip",
            "secondary_button_text": "Chat on WhatsApp",
            "secondary_button_link": None,
        },
        "seo_title": f"Extraordinary Itineraries | {agency_name}",
        "seo_meta_description": f"Browse handpicked travel packages by {agency_name} with private transfers and boutique resort stays.",
        "seo_og_image": None,
    }


def get_default_group_trips_content(agency_name: str, city: str) -> dict[str, Any]:
    """Generate default initial content for the Group Trips & Departures page."""
    return {
        "hero": {
            "eyebrow": f"{agency_name} Signature Departures",
            "heading": "Upcoming Group Journeys",
            "description": f"Travel together with fellow adventurers from {city} and across India. Fixed departure dates with guaranteed small-group dynamics and transparent inclusions.",
            "banner_image_url": None,
        },
        "introductory_text": "Fixed departure dates with guaranteed small-group dynamics and transparent inclusions.",
        "empty_state_note": "We frequently run promotional group tours to Manali, Maldives, Lakshadweep, and Kazakhstan. Register your interest below to receive priority access to new batch dates.",
        "cta": {
            "show_cta": False,
            "primary_button_text": "Inquire Group Date",
            "primary_button_link": "/contact",
            "secondary_button_text": None,
            "secondary_button_link": None,
        },
        "seo_title": f"Upcoming Group Journeys | {agency_name}",
        "seo_meta_description": f"Fixed departure group tours and expeditions curated by {agency_name}.",
        "seo_og_image": None,
    }


def get_default_custom_trip_content(agency_name: str, city: str) -> dict[str, Any]:
    """Generate default initial content for the Custom Trip planner page."""
    return {
        "hero": {
            "eyebrow": f"{city} Concierge Service",
            "heading": "Design Your Bespoke Journey",
            "description": f"Every vacation should be as unique as you are. Share your travel wishes below and let our {city} specialists curate an extraordinary, personalized itinerary.",
            "banner_image_url": None,
        },
        "introductory_text": "Every vacation should be as unique as you are. Share your travel wishes below and let our specialists curate an extraordinary, personalized itinerary.",
        "cta_labels": {
            "submit_button_label": "Submit Trip Request",
            "whatsapp_button_label": "Discuss Faster on WhatsApp",
            "secondary_cta_text": None,
            "secondary_cta_link": None,
            "success_title": "Trip Request Registered",
            "success_message": "Thank you! Our travel concierge has received your bespoke itinerary request and will reach out shortly.",
        },
        "seo_title": f"Design Your Bespoke Journey | {agency_name}",
        "seo_meta_description": f"Design your tailored holiday with {agency_name}'s dedicated travel specialists in {city}.",
        "seo_og_image": None,
    }


SUPPORTED_PAGE_TITLES: dict[str, str] = {
    "about": "About Page Content Management",
    "contact": "Contact Page Content Management",
    "home": "Main Website Content Management",
    "destinations": "Destinations Page Hero Management",
    "packages": "Packages Page Hero Management",
    "group-trips": "Group Trips Page Hero Management",
    "custom-trip": "Custom Trip Page Hero Management",
}


def _canonical_slug(slug: str) -> str:
    """Normalize page slug variants to their canonical system identifiers."""
    s = slug.lower().strip()
    if s in ("main", "homepage"):
        return "home"
    return s


def _get_agency_context(db: Session) -> dict[str, Any]:
    """Retrieve active agency profile variables for dynamic page templating."""
    pub = get_public_settings(db)
    agency_display = pub.public_display_name or pub.agency_name or "KV Tours & Travels"
    return {
        "agency_name": pub.agency_name or agency_display,
        "public_display_name": pub.public_display_name or agency_display,
        "legal_business_name": pub.legal_business_name or agency_display,
        "short_name": pub.short_name or agency_display,
        "tagline": pub.tagline,
        "city": pub.city or "Palakkad",
        "state": pub.state or "Kerala",
        "office_address": pub.office_address,
        "contact_phone": pub.contact_phone,
        "secondary_phone": pub.secondary_phone,
        "emergency_phone": pub.emergency_phone,
        "contact_email": pub.contact_email,
        "support_whatsapp": pub.support_whatsapp or pub.whatsapp_number,
        "whatsapp_number": pub.whatsapp_number,
        "operating_hours": pub.operating_hours,
        "brand_primary_color": pub.brand_primary_color or "#24292F",
        "brand_secondary_color": pub.brand_secondary_color or "#C5A880",
        "brand_accent_color": pub.brand_accent_color or "#D4AF37",
        "primary_font": pub.primary_font or "Playfair Display",
        "secondary_font": pub.secondary_font or "Inter",
        "google_maps_embed_url": pub.google_maps_embed_url,
        "google_maps_url": pub.google_maps_url,
        "google_maps_directions_url": pub.google_maps_directions_url,
        "google_maps_zoom": pub.google_maps_zoom or 15,
        "google_maps_display_enabled": pub.google_maps_display_enabled,
        "office_location_label": pub.office_location_label,
        "logo_url": pub.logo_url,
        "favicon_url": pub.favicon_url,
    }


def _get_legacy_home_settings(db: Session) -> dict[str, Any]:
    """Extract legacy site_settings either from composite record or individual key rows."""
    existing_settings: dict[str, Any] = {}
    settings_row = db.get(SiteSetting, "site_settings")
    if settings_row and isinstance(settings_row.value, dict):
        existing_settings.update(settings_row.value)
    for k in (
        "hero_headline",
        "hero_subtitle",
        "hero_image_url",
        "featured_destination_ids",
        "featured_package_ids",
        "promo_banner_active",
        "promo_banner_text",
        "promo_banner_link",
        "best_offers_enabled",
    ):
        r = db.get(SiteSetting, k)
        if r and r.value is not None:
            existing_settings[k] = r.value
    return existing_settings


def get_admin_page(db: Session, slug: str) -> AdminPageEnvelopeResponse:
    """Load the complete draft and published content envelope for an admin editor."""
    canon = _canonical_slug(slug)
    if canon not in SUPPORTED_PAGE_TITLES:
        supported_str = ", ".join(f"'{k}'" for k in sorted(SUPPORTED_PAGE_TITLES.keys()))
        raise ValueError(f"Unsupported page slug: '{slug}'. Must be one of: {supported_str}.")

    key = f"page_content_{canon}"
    row = db.get(SiteSetting, key)
    agency_ctx = _get_agency_context(db)

    if not row or not isinstance(row.value, dict):
        if canon == "about":
            default_content = get_default_about_content(
                agency_name=agency_ctx["agency_name"],
                city=agency_ctx["city"],
                address=agency_ctx["office_address"],
            )
        elif canon == "contact":
            default_content = get_default_contact_content(
                agency_name=agency_ctx["agency_name"],
                city=agency_ctx["city"],
                address=agency_ctx["office_address"],
                phone=agency_ctx["contact_phone"],
                email=agency_ctx["contact_email"],
                hours=agency_ctx["operating_hours"],
            )
        elif canon == "home":
            # Inherit legacy site settings if available
            existing_settings = _get_legacy_home_settings(db)
            default_content = get_default_home_content(
                agency_name=agency_ctx["agency_name"],
                city=agency_ctx["city"],
                current_settings=existing_settings,
            )
        elif canon == "destinations":
            default_content = get_default_destinations_content(
                agency_name=agency_ctx["agency_name"],
                city=agency_ctx["city"],
            )
        elif canon == "packages":
            default_content = get_default_packages_content(
                agency_name=agency_ctx["agency_name"],
                city=agency_ctx["city"],
            )
        elif canon == "group-trips":
            default_content = get_default_group_trips_content(
                agency_name=agency_ctx["agency_name"],
                city=agency_ctx["city"],
            )
        elif canon == "custom-trip":
            default_content = get_default_custom_trip_content(
                agency_name=agency_ctx["agency_name"],
                city=agency_ctx["city"],
            )
        else:
            default_content = {}

        envelope_data = {
            "draft": default_content,
            "published": default_content,
            "is_published": True,
            "has_unpublished_changes": False,
            "draft_saved_at": None,
            "published_at": datetime.now(timezone.utc).isoformat(),
        }

        # Store initial envelope into SiteSetting
        new_row = SiteSetting(
            key=key,
            value=envelope_data,
            description=f"Authoritative CMS content document for the {canon} page.",
            is_public=False,
        )
        db.add(new_row)
        db.commit()
        db.refresh(new_row)
        row = new_row

    envelope = row.value if isinstance(row.value, dict) else {}
    draft = envelope.get("draft") or {}
    published = envelope.get("published") or {}
    is_published = bool(envelope.get("is_published", True))
    has_unpublished_changes = bool(envelope.get("has_unpublished_changes", False))

    if canon == "home":
        existing_settings = _get_legacy_home_settings(db)
        if isinstance(draft, dict) and "featured_content" not in draft:
            draft["featured_content"] = {
                "featured_destination_ids": existing_settings.get("featured_destination_ids") or [],
                "featured_package_ids": existing_settings.get("featured_package_ids") or [],
                "promo_banner_active": bool(existing_settings.get("promo_banner_active", False)),
                "promo_banner_text": existing_settings.get("promo_banner_text") or "Special Seasonal Offer: Up to 15% off Early Bird Bookings",
                "promo_banner_link": existing_settings.get("promo_banner_link") or "/offers",
                "best_offers_enabled": bool(existing_settings.get("best_offers_enabled", True)),
            }
        if isinstance(published, dict) and "featured_content" not in published:
            published["featured_content"] = dict(draft.get("featured_content", {}))

    draft_saved_at = None
    if envelope.get("draft_saved_at"):
        try:
            draft_saved_at = datetime.fromisoformat(str(envelope["draft_saved_at"]))
        except ValueError:
            pass

    published_at = None
    if envelope.get("published_at"):
        try:
            published_at = datetime.fromisoformat(str(envelope["published_at"]))
        except ValueError:
            pass

    return AdminPageEnvelopeResponse(
        slug=canon,
        title=SUPPORTED_PAGE_TITLES[canon],
        draft=draft,
        published=published,
        is_published=is_published,
        has_unpublished_changes=has_unpublished_changes,
        draft_saved_at=draft_saved_at,
        published_at=published_at,
        agency_context=agency_ctx,
    )


def _sync_home_to_site_settings(db: Session, home_content: dict[str, Any]) -> None:
    """Synchronize published home content to legacy site_settings so all consumers stay unified."""
    from sqlalchemy.orm.attributes import flag_modified

    hero = home_content.get("hero") or {}
    featured = home_content.get("featured_content") or {}

    sync_map: dict[str, Any] = {}
    if hero.get("heading") is not None:
        sync_map["hero_headline"] = hero["heading"]
    if hero.get("description") is not None:
        sync_map["hero_subtitle"] = hero["description"]
    if hero.get("image_url") is not None:
        sync_map["hero_image_url"] = hero["image_url"]

    if "featured_destination_ids" in featured:
        sync_map["featured_destination_ids"] = featured["featured_destination_ids"]
    if "featured_package_ids" in featured:
        sync_map["featured_package_ids"] = featured["featured_package_ids"]
    if "promo_banner_active" in featured:
        sync_map["promo_banner_active"] = featured["promo_banner_active"]
    if "promo_banner_text" in featured:
        sync_map["promo_banner_text"] = featured["promo_banner_text"]
    if "promo_banner_link" in featured:
        sync_map["promo_banner_link"] = featured["promo_banner_link"]
    if "best_offers_enabled" in featured:
        sync_map["best_offers_enabled"] = featured["best_offers_enabled"]

    # 1. Update individual keys in site_settings
    for k, v in sync_map.items():
        row_k = db.get(SiteSetting, k)
        if row_k is None:
            row_k = SiteSetting(
                key=k,
                value=v,
                description=f"Administrative {k.replace('_', ' ')}",
                is_public=True,
            )
            db.add(row_k)
        else:
            row_k.value = v
            row_k.is_public = True
            flag_modified(row_k, "value")

    # 2. Update composite 'site_settings' row for backwards compatibility and tests
    row = db.get(SiteSetting, "site_settings")
    val = dict(row.value) if row and isinstance(row.value, dict) else {}
    val.update(sync_map)
    if row is None:
        row = SiteSetting(
            key="site_settings",
            value=val,
            description="Composite site settings",
            is_public=True,
        )
        db.add(row)
    else:
        row.value = val
        flag_modified(row, "value")


def update_admin_page(
    db: Session,
    slug: str,
    draft_data: dict[str, Any],
    admin_id: UUID,
    ip_address: str | None = None,
    publish_immediately: bool = False,
) -> AdminPageEnvelopeResponse:
    """Save draft or immediately publish changes to a content page."""
    canon = _canonical_slug(slug)
    if canon not in SUPPORTED_PAGE_TITLES:
        supported_str = ", ".join(f"'{k}'" for k in sorted(SUPPORTED_PAGE_TITLES.keys()))
        raise ValueError(f"Unsupported page slug: '{slug}'. Must be one of: {supported_str}.")

    # Validate against strict schemas
    if canon == "about":
        validated_draft = AboutPageContent(**draft_data).model_dump()
    elif canon == "contact":
        validated_draft = ContactPageContent(**draft_data).model_dump()
    elif canon == "home":
        validated_draft = HomePageContent(**draft_data).model_dump()
    elif canon == "destinations":
        validated_draft = DestinationsPageContent(**draft_data).model_dump()
    elif canon == "packages":
        validated_draft = PackagesPageContent(**draft_data).model_dump()
    elif canon == "group-trips":
        validated_draft = GroupTripsPageContent(**draft_data).model_dump()
    elif canon == "custom-trip":
        validated_draft = CustomTripPageContent(**draft_data).model_dump()
    else:
        validated_draft = draft_data

    key = f"page_content_{canon}"
    from sqlalchemy.orm.attributes import flag_modified

    row = db.get(SiteSetting, key)
    envelope = dict(row.value) if row and isinstance(row.value, dict) else {}

    now_iso = datetime.now(timezone.utc).isoformat()
    envelope["draft"] = validated_draft
    envelope["draft_saved_at"] = now_iso

    action = "page_draft_saved"
    if publish_immediately:
        envelope["published"] = validated_draft
        envelope["is_published"] = True
        envelope["has_unpublished_changes"] = False
        envelope["published_at"] = now_iso
        action = "page_published"
        if canon == "home":
            _sync_home_to_site_settings(db, validated_draft)
    else:
        envelope["has_unpublished_changes"] = True

    if not row:
        row = SiteSetting(
            key=key,
            value=dict(envelope),
            description=f"Authoritative CMS content document for the {canon} page.",
            is_public=False,
        )
        db.add(row)
    else:
        row.value = dict(envelope)
        flag_modified(row, "value")

    # Record Audit Log
    db.add(
        AuditLog(
            actor_user_id=admin_id,
            action=action,
            entity_type=f"content_page_{canon}",
            entity_id=canon,
            ip_address=ip_address,
            metadata_json={
                "slug": canon,
                "publish_immediately": publish_immediately,
                "has_unpublished_changes": envelope.get("has_unpublished_changes"),
            },
        )
    )

    db.commit()
    db.refresh(row)

    return get_admin_page(db, canon)


def publish_admin_page(
    db: Session,
    slug: str,
    admin_id: UUID,
    ip_address: str | None = None,
) -> AdminPageEnvelopeResponse:
    """Promote the current draft to the published public version."""
    canon = _canonical_slug(slug)
    key = f"page_content_{canon}"
    row = db.get(SiteSetting, key)
    if not row or not isinstance(row.value, dict):
        # Force initialization if needed
        get_admin_page(db, canon)
        row = db.get(SiteSetting, key)

    from sqlalchemy.orm.attributes import flag_modified

    envelope = dict(row.value) if row and isinstance(row.value, dict) else {}
    draft = envelope.get("draft")
    if not draft:
        raise ValueError(f"No draft content exists to publish for '{canon}'.")

    now_iso = datetime.now(timezone.utc).isoformat()
    envelope["published"] = draft
    envelope["is_published"] = True
    envelope["has_unpublished_changes"] = False
    envelope["published_at"] = now_iso
    row.value = dict(envelope)
    flag_modified(row, "value")

    if canon == "home" and isinstance(draft, dict):
        _sync_home_to_site_settings(db, draft)

    # Record Audit Log
    db.add(
        AuditLog(
            actor_user_id=admin_id,
            action="page_published",
            entity_type=f"content_page_{canon}",
            entity_id=canon,
            ip_address=ip_address,
            metadata_json={"slug": canon, "published_at": now_iso},
        )
    )

    db.commit()
    db.refresh(row)
    return get_admin_page(db, canon)


def discard_admin_page_draft(
    db: Session,
    slug: str,
    admin_id: UUID,
    ip_address: str | None = None,
) -> AdminPageEnvelopeResponse:
    """Discard all uncommitted draft changes and restore draft from published state."""
    canon = _canonical_slug(slug)
    key = f"page_content_{canon}"
    row = db.get(SiteSetting, key)
    if not row or not isinstance(row.value, dict):
        return get_admin_page(db, canon)

    from sqlalchemy.orm.attributes import flag_modified

    envelope = dict(row.value)
    published = envelope.get("published") or {}
    envelope["draft"] = published
    envelope["has_unpublished_changes"] = False
    row.value = dict(envelope)
    flag_modified(row, "value")

    db.add(
        AuditLog(
            actor_user_id=admin_id,
            action="page_draft_discarded",
            entity_type=f"content_page_{canon}",
            entity_id=canon,
            ip_address=ip_address,
            metadata_json={"slug": canon},
        )
    )

    db.commit()
    db.refresh(row)
    return get_admin_page(db, canon)


def get_public_page(
    db: Session,
    slug: str,
    is_preview: bool = False,
) -> PublicPageResponse:
    """Retrieve public content for a page (or draft content if preview authorized)."""
    canon = _canonical_slug(slug)
    if canon not in SUPPORTED_PAGE_TITLES:
        raise ValueError(f"Unknown page slug: '{slug}'.")

    key = f"page_content_{canon}"
    row = db.get(SiteSetting, key)
    agency_ctx = _get_agency_context(db)

    if not row or not isinstance(row.value, dict):
        admin_envelope = get_admin_page(db, canon)
        content = admin_envelope.published
        published_at = admin_envelope.published_at
    else:
        envelope = row.value
        content = envelope.get("draft" if is_preview else "published") or envelope.get("published") or {}
        published_at = None
        if envelope.get("published_at"):
            try:
                published_at = datetime.fromisoformat(str(envelope["published_at"]))
            except ValueError:
                pass

    if canon == "home" and isinstance(content, dict) and "featured_content" not in content:
        existing_settings = _get_legacy_home_settings(db)
        content["featured_content"] = {
            "featured_destination_ids": existing_settings.get("featured_destination_ids") or [],
            "featured_package_ids": existing_settings.get("featured_package_ids") or [],
            "promo_banner_active": bool(existing_settings.get("promo_banner_active", False)),
            "promo_banner_text": existing_settings.get("promo_banner_text") or "Special Seasonal Offer: Up to 15% off Early Bird Bookings",
            "promo_banner_link": existing_settings.get("promo_banner_link") or "/offers",
            "best_offers_enabled": bool(existing_settings.get("best_offers_enabled", True)),
        }

    return PublicPageResponse(
        slug=canon,
        content=content,
        is_preview=is_preview,
        published_at=published_at,
        agency_branding=agency_ctx,
    )

