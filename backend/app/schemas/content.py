"""Pydantic schemas for dynamic, editable Website Content pages (About, Contact).

Provides draft/publish serialization, field-level validation, section ordering,
and agency profile fallback resolution.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ==============================================================================
# About Page Schemas
# ==============================================================================

class AboutHeroSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = True
    eyebrow: str = "Worldwide Curated Journeys"
    heading: str = ""  # If empty, dynamic template: "About {agency_name}"
    description: str = ""
    background_image_url: str | None = None


class AboutStorySection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = True
    eyebrow: str = "Our Origin & Heart"
    title: str = ""  # If empty, dynamic template: "Rooted in {city}, Inspired by the World"
    paragraphs: list[str] = Field(default_factory=list)
    image_url: str | None = None
    image_position: str = "right"  # "left" | "right"
    office_card_title: str = ""
    office_card_description: str = ""


class AboutMissionVisionSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = True
    mission_title: str = "Our Mission"
    mission_description: str = "To turn travel into a seamless art of discovery, pairing bespoke luxury with authentic cultural immersion."
    vision_title: str = "Our Vision"
    vision_description: str = "To be the most trusted travel curator, celebrated for uncompromising care, transparent planning, and unforgettable journeys."


class AboutPrincipleCard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    icon: str = "ShieldCheck"


class AboutPrinciplesSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = True
    eyebrow: str = "Our Standards"
    heading: str = "Our Core Travel Principles"
    description: str = "Honest, verified commitments that guide every itinerary we build."
    cards: list[AboutPrincipleCard] = Field(default_factory=list)


class AboutStatItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    label: str
    value: str
    icon: str = "Sparkles"


class AboutStatsSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = True
    heading: str = "By The Numbers"
    items: list[AboutStatItem] = Field(default_factory=list)


class AboutTeamMember(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    role: str
    bio: str = ""
    photo_url: str | None = None
    display_order: int = 0


class AboutTeamSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = False
    heading: str = "Meet Our Travel Designers"
    description: str = "The passionate explorers crafting your unforgettable itineraries."
    members: list[AboutTeamMember] = Field(default_factory=list)


class AboutTestimonialItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    author: str
    location: str = ""
    trip_name: str = ""
    quote: str
    rating: int = 5


class AboutTestimonialsSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = False
    heading: str = "Traveler Reflections"
    description: str = "Real stories from journeys we have curated."
    items: list[AboutTestimonialItem] = Field(default_factory=list)


class AboutCtaSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = True
    heading: str = ""  # If empty: "Experience the {agency_name} Difference"
    description: str = ""
    primary_button_text: str = "Plan Your Trip"
    primary_button_link: str = "/custom-trip"
    secondary_button_text: str = "Chat on WhatsApp"
    secondary_button_link: str | None = None


class AboutOfficeSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = True
    heading: str = "Visit Our Travel Lounge"
    address: str = ""
    hours: str = ""
    guidance: str = ""


class AboutPageContent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    hero: AboutHeroSection = Field(default_factory=AboutHeroSection)
    story: AboutStorySection = Field(default_factory=AboutStorySection)
    mission_vision: AboutMissionVisionSection = Field(default_factory=AboutMissionVisionSection)
    principles: AboutPrinciplesSection = Field(default_factory=AboutPrinciplesSection)
    stats: AboutStatsSection = Field(default_factory=AboutStatsSection)
    team: AboutTeamSection = Field(default_factory=AboutTeamSection)
    testimonials: AboutTestimonialsSection = Field(default_factory=AboutTestimonialsSection)
    cta: AboutCtaSection = Field(default_factory=AboutCtaSection)
    office: AboutOfficeSection = Field(default_factory=AboutOfficeSection)
    sections_order: list[str] = Field(
        default_factory=lambda: [
            "hero",
            "story",
            "mission_vision",
            "principles",
            "stats",
            "team",
            "testimonials",
            "cta",
        ]
    )
    seo_title: str | None = None
    seo_meta_description: str | None = None
    seo_og_image: str | None = None


# ==============================================================================
# Contact Page Schemas
# ==============================================================================

class ContactHeroSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = True
    eyebrow: str = "Concierge Desk"
    heading: str = "Connect With Our Travel Experts"
    description: str = "Have questions regarding upcoming departures, custom itineraries, or visa requirements? We are here to guide you every step of the way."
    background_image_url: str | None = None


class ContactCardsSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = True
    office_card_title: str = "Visit Our Office"
    office_card_heading: str = ""
    office_address: str = ""
    operating_hours: str = ""
    phone_card_title: str = "Direct Inquiries"
    phone_card_heading: str = "Call & Email"
    primary_phone: str = ""
    secondary_phone: str | None = None
    emergency_phone: str | None = None
    contact_email: str = ""
    whatsapp_card_title: str = "Fast WhatsApp Assistance"
    whatsapp_card_description: str = "Need quick departure availability, brochure PDFs, or urgent quotes? Our team is active on WhatsApp daily."
    whatsapp_button_text: str = "Chat on WhatsApp"


class ContactFormSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_section: bool = True
    eyebrow: str = "Send a Message"
    heading: str = "How Can We Assist Your Travels?"
    description: str = ""
    topics: list[str] = Field(
        default_factory=lambda: [
            "General Holiday Enquiry",
            "Group Tour Departure Booking",
            "Custom Honeymoon Escapes",
            "Corporate & Family Group Retreat",
            "Flight & Visa Assistance",
        ]
    )
    success_message: str = "Thank you! Our travel concierge has received your message and will reach out shortly."


class ContactMapSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_map: bool = True
    map_title: str = "Find Our Office Location"
    office_location_label: str = ""
    embed_url: str | None = None
    directions_url: str | None = None
    location_url: str | None = None
    zoom: int = Field(default=15, ge=1, le=21)

    @field_validator("embed_url")
    @classmethod
    def validate_embed_url(cls, v: str | None) -> str | None:
        if not v:
            return None
        v = v.strip()
        if "<iframe" in v.lower() and 'src="' in v.lower():
            m = re.search(r'src=["\']([^"\']+)["\']', v, re.IGNORECASE)
            if m:
                v = m.group(1).strip()
        if not (v.startswith("https://www.google.com/maps") or v.startswith("https://maps.google.com") or v.startswith("https://maps.app.goo.gl")):
            raise ValueError("Google Maps embed URL must be a valid HTTPS Google Maps URL.")
        return v


class ContactPageContent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    hero: ContactHeroSection = Field(default_factory=ContactHeroSection)
    cards: ContactCardsSection = Field(default_factory=ContactCardsSection)
    form: ContactFormSection = Field(default_factory=ContactFormSection)
    map: ContactMapSection = Field(default_factory=ContactMapSection)
    seo_title: str | None = None
    seo_meta_description: str | None = None
    seo_og_image: str | None = None


# ==============================================================================
# Main Website (Homepage) Schemas
# ==============================================================================

class HomeHeroSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    eyebrow: str = ""
    heading: str = ""
    description: str = ""
    media_type: str = "image"  # "image" | "video"
    image_url: str = "/images/hero/hero-4k.webp"
    video_url: str | None = None
    primary_cta_text: str = ""
    primary_cta_link: str = "/packages"
    secondary_cta_text: str = ""
    secondary_cta_link: str = "/custom-trip"
    whatsapp_cta_text: str = ""
    popular_tags: list[str] = Field(default_factory=list)

    @field_validator(
        "eyebrow",
        "heading",
        "description",
        "primary_cta_text",
        "primary_cta_link",
        "secondary_cta_text",
        "secondary_cta_link",
        "whatsapp_cta_text",
        mode="before",
    )
    @classmethod
    def _coerce_hero_str(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)


class HomeTrustIndicator(BaseModel):
    model_config = ConfigDict(extra="ignore")

    icon: str = "ShieldCheck"
    label: str = ""

    @field_validator("label", mode="before")
    @classmethod
    def _coerce_label(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)


class HomeSectionsVisibility(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trending_destinations: bool = True
    best_offers: bool = True
    featured_packages: bool = True
    travel_inspirations: bool = True
    upcoming_departures: bool = True
    custom_cta: bool = True


class HomeFeaturedContent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    featured_destination_ids: list[str] = Field(default_factory=list)
    featured_package_ids: list[str] = Field(default_factory=list)
    promo_banner_active: bool = False
    promo_banner_text: str | None = None
    promo_banner_link: str | None = None
    best_offers_enabled: bool = True


class HomePageContent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    hero: HomeHeroSection = Field(default_factory=HomeHeroSection)
    intro_eyebrow: str = ""
    intro_heading: str = ""
    intro_description: str = ""
    trust_indicators: list[HomeTrustIndicator] = Field(default_factory=list)

    featured_content: HomeFeaturedContent = Field(default_factory=HomeFeaturedContent)
    sections_visibility: HomeSectionsVisibility = Field(default_factory=HomeSectionsVisibility)
    sections_order: list[str] = Field(
        default_factory=lambda: [
            "hero",
            "trending_destinations",
            "best_offers",
            "featured_packages",
            "travel_inspirations",
            "upcoming_departures",
            "custom_cta",
        ]
    )
    seo_title: str | None = None
    seo_meta_description: str | None = None
    seo_og_image: str | None = None
    seo_social_title: str | None = None
    seo_social_description: str | None = None


# ==============================================================================
# Common Listing Page Schemas (Destinations, Packages, Group Trips, Custom Trip)
# ==============================================================================

class ListingHeroSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    eyebrow: str = ""
    heading: str = ""
    description: str = ""
    banner_image_url: str | None = None


class ListingCtaSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    show_cta: bool = False
    primary_button_text: str = "Custom Trip"
    primary_button_link: str = "/custom-trip"
    secondary_button_text: str | None = None
    secondary_button_link: str | None = None


class DestinationsPageContent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    hero: ListingHeroSection = Field(
        default_factory=lambda: ListingHeroSection(
            eyebrow="Worldwide Catalog",
            heading="Destinations Beyond the Ordinary",
            description="From turquoise island lagoons to dramatic mountain peaks, explore hand-selected destinations curated by our travel specialists.",
        )
    )
    introductory_text: str = ""
    cta: ListingCtaSection = Field(default_factory=ListingCtaSection)
    seo_title: str | None = None
    seo_meta_description: str | None = None
    seo_og_image: str | None = None


class PackagesPageContent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    hero: ListingHeroSection = Field(
        default_factory=lambda: ListingHeroSection(
            eyebrow="Curated Travel Packages",
            heading="Extraordinary Itineraries",
            description="Every journey includes curated accommodations, private transfers, and handpicked local experiences designed for discerning travelers.",
        )
    )
    introductory_text: str = ""
    cta: ListingCtaSection = Field(default_factory=ListingCtaSection)
    seo_title: str | None = None
    seo_meta_description: str | None = None
    seo_og_image: str | None = None


class GroupTripsPageContent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    hero: ListingHeroSection = Field(
        default_factory=lambda: ListingHeroSection(
            eyebrow="KV Signature Departures",
            heading="Upcoming Group Journeys",
            description="Travel together with fellow adventurers. Fixed departure dates with guaranteed small-group dynamics and transparent inclusions.",
        )
    )
    introductory_text: str = ""
    empty_state_note: str = "We frequently run promotional group tours. Register your interest to receive priority access to new batch dates."
    cta: ListingCtaSection = Field(default_factory=ListingCtaSection)
    seo_title: str | None = None
    seo_meta_description: str | None = None
    seo_og_image: str | None = None


class CustomTripCtaLabels(BaseModel):
    model_config = ConfigDict(extra="ignore")

    submit_button_label: str = "Submit Trip Request"
    whatsapp_button_label: str = "Discuss Faster on WhatsApp"
    secondary_cta_text: str | None = None
    secondary_cta_link: str | None = None
    success_title: str = "Trip Request Registered"
    success_message: str = "Thank you! Our travel concierge has received your bespoke itinerary request and will reach out shortly."


class CustomTripPageContent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    hero: ListingHeroSection = Field(
        default_factory=lambda: ListingHeroSection(
            eyebrow="Coimbatore Concierge Service",
            heading="Design Your Bespoke Journey",
            description="Every vacation should be as unique as you are. Share your travel wishes below and let our specialists curate an extraordinary, personalized itinerary.",
        )
    )
    introductory_text: str = ""
    cta_labels: CustomTripCtaLabels = Field(default_factory=CustomTripCtaLabels)
    seo_title: str | None = None
    seo_meta_description: str | None = None
    seo_og_image: str | None = None



# ==============================================================================
# Admin & Public API Envelope Schemas
# ==============================================================================

class AdminPageEnvelopeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    slug: str
    title: str
    draft: dict[str, Any]
    published: dict[str, Any]
    is_published: bool
    has_unpublished_changes: bool
    draft_saved_at: datetime | None = None
    published_at: datetime | None = None
    agency_context: dict[str, Any] = Field(default_factory=dict)


class AdminPageUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    draft: dict[str, Any]
    publish_immediately: bool = False


class PublicPageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    slug: str
    content: dict[str, Any]
    is_preview: bool = False
    published_at: datetime | None = None
    agency_branding: dict[str, Any] = Field(default_factory=dict)
