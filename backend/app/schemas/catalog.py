"""Public customer-facing catalog response schemas."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PublicImageItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_url: str
    alt_text: str
    is_featured: bool
    sort_order: int


class PublicDestinationListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    slug: str
    country: str
    region: str | None
    state_or_city: str | None = None
    category: str | None = None
    travel_type: str | None = None
    cover_image_url: str | None = None
    display_order: int = 0
    short_description: str | None
    featured_image: PublicImageItem | None = None
    package_count: int = 0


class PublicDestinationDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    slug: str
    country: str
    region: str | None
    state_or_city: str | None = None
    category: str | None = None
    travel_type: str | None = None
    cover_image_url: str | None = None
    display_order: int = 0
    short_description: str | None
    description: str | None
    highlights: list[dict[str, Any]] = []
    travel_guide: dict[str, Any] = {}
    faqs: list[dict[str, Any]] = []
    social_image_url: str | None = None
    images: list[PublicImageItem]
    seo_title: str | None
    seo_description: str | None


class PublicHotelSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    star_rating: int | None
    address: str | None


class PublicActivitySummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    category: str | None
    duration_minutes: int | None


class PublicItineraryDaySummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day_number: int
    title: str
    description: str | None
    accommodation: str | None
    meals: str | None
    transportation: str | None
    activities: list[PublicActivitySummary]


class PublicDepartureSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    departure_date: date
    return_date: date | None
    total_capacity: int
    available_capacity: int
    special_price: Decimal | None
    currency: str
    status: str
    booking_cutoff_date: date | None = None


class PublicPackageListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    slug: str
    destination_name: str
    destination_slug: str
    category: str | None = None
    travel_type: str | None = None
    cover_image_url: str | None = None
    base_price: Decimal
    currency: str
    duration_days: int
    duration_nights: int
    minimum_travellers: int
    maximum_travellers: int | None
    featured_image: PublicImageItem | None = None
    is_featured: bool


class PublicAddOnSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    description: str | None
    price: Decimal
    currency: str
    applicability_scope: str = "all_packages"
    price_type: str = "per_booking"
    min_quantity: int = 1
    max_quantity: int = 10
    is_mandatory: bool = False


class PublicPackageDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    slug: str
    destination_name: str
    destination_slug: str
    short_description: str | None
    description: str | None
    category: str | None = None
    travel_type: str | None = None
    difficulty_level: str | None = None
    departure_location: str | None = None
    cover_image_url: str | None = None
    inclusions: list[str] = []
    exclusions: list[str] = []
    child_price: Decimal | None = None
    infant_price: Decimal | None = None
    single_room_supplement: Decimal | None = None
    booking_cutoff_days: int = 0
    cancellation_policy: str | None = None
    base_price: Decimal
    currency: str
    duration_days: int
    duration_nights: int
    minimum_travellers: int
    maximum_travellers: int | None
    seo_title: str | None
    seo_description: str | None
    images: list[PublicImageItem]
    hotels: list[PublicHotelSummary]
    activities: list[PublicActivitySummary]
    itinerary: list[PublicItineraryDaySummary]
    upcoming_departures: list[PublicDepartureSummary]
    add_ons: list[PublicAddOnSummary] = []


class PublicDepartureListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    departure_date: date
    return_date: date | None
    total_capacity: int
    available_capacity: int
    special_price: Decimal | None
    base_price: Decimal
    currency: str
    status: str
    booking_cutoff_date: date | None = None
    package_id: UUID
    package_name: str
    package_slug: str
    duration_days: int
    duration_nights: int
    destination_name: str
    destination_slug: str
    featured_image: PublicImageItem | None = None


class PublicInquiryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    email: str
    phone: str | None = None
    package_id: UUID | None = None
    destination_id: UUID | None = None
    message: str
    source: str = "contact_form"


class PublicInquiryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    status: str
    message: str


class PublicSiteSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Business Identity
    legal_business_name: str | None = None
    agency_name: str
    public_display_name: str | None = None
    short_name: str | None = None
    admin_panel_name: str | None = None
    admin_portal_subtitle: str | None = None
    tagline: str
    logo_url: str | None = None
    secondary_logo_url: str | None = None
    favicon_url: str | None = None
    brand_primary_color: str | None = "#24292F"
    brand_secondary_color: str | None = "#C5A880"
    brand_accent_color: str | None = "#D4AF37"
    primary_font: str | None = "Playfair Display"
    secondary_font: str | None = "Inter"
    year_established: int | None = None
    registration_number: str | None = None
    tax_id: str | None = None
    business_description: str | None = None
    registered_office_address: str | None = None
    office_address: str
    public_office_address: str | None = None
    agency_location: str
    city: str | None = "Coimbatore"
    state: str | None = "Tamil Nadu"
    postal_code: str | None = "641012"
    country: str | None = "India"
    time_zone: str = "Asia/Kolkata"
    currency: str

    # Contact Details
    contact_phone: str
    secondary_phone: str | None = None
    support_whatsapp: str | None = None
    emergency_phone: str | None = None
    contact_email: str
    customer_support_email: str | None = None
    booking_email: str | None = None
    general_inquiry_email: str | None = None

    # Social and Online
    instagram_handle: str
    instagram_url: str | None = None
    facebook_url: str | None = None
    youtube_url: str | None = None
    linkedin_url: str | None = None
    twitter_url: str | None = None
    website_url: str | None = None
    google_maps_url: str | None = None

    # Google Maps & Directions
    google_maps_embed_url: str | None = None
    google_maps_latitude: float | None = None
    google_maps_longitude: float | None = None
    google_maps_zoom: int | None = 15
    google_maps_display_enabled: bool = True
    google_maps_directions_url: str | None = None
    office_location_label: str | None = None

    # SEO & Social Metadata
    seo_website_title: str | None = None
    seo_meta_description: str | None = None
    seo_og_image_url: str | None = None
    seo_social_title: str | None = None
    seo_social_description: str | None = None
    organization_structured_data: dict[str, Any] | None = None

    # Business Hours
    operating_hours: str = "Mon - Sat: 9:00 AM - 7:00 PM"
    business_hours: str = "Mon - Sat: 9:00 AM - 7:00 PM"
    holiday_notice: str | None = None
    office_contact_instructions: str | None = None

    # WhatsApp
    whatsapp_number: str
    whatsapp_country_code: str = "+91"
    whatsapp_prefilled_message: str = "Hi The Wild Route, I am interested in planning a trip."
    whatsapp_package_message: str = "Hi The Wild Route, I am interested in this package."
    whatsapp_destination_message: str = "Hi The Wild Route, I would like to know more about this destination."
    whatsapp_custom_trip_message: str = "Hi The Wild Route, I would like to plan a custom holiday."
    whatsapp_booking_support_message: str = "Hi The Wild Route, I need assistance with my booking."
    whatsapp_enabled: bool = True
    whatsapp_show_floating_concierge: bool = True
    whatsapp_concierge_floating: bool = True
    whatsapp_show_header_button: bool = True
    whatsapp_show_on_homepage: bool = True
    whatsapp_show_on_footer: bool = True
    whatsapp_show_on_package_pages: bool = True
    whatsapp_show_on_contact_page: bool = True

    # Homepage Content & Visibility
    hero_headline: str = "Handcrafted Journeys Beyond the Ordinary"
    hero_subtitle: str = "Coimbatore's premier luxury travel curator crafting extraordinary journeys across India and the globe."
    hero_image_url: str | None = None
    contact_cta_text: str = "Speak With Concierge"
    whatsapp_cta_text: str = "Chat on WhatsApp"
    promo_banner_active: bool = False
    promo_banner_text: str | None = None
    promo_banner_link: str | None = None
    featured_destination_ids: list[str] = Field(default_factory=list)
    featured_package_ids: list[str] = Field(default_factory=list)
    best_offers_enabled: bool = True
    online_payments_enabled: bool = False
    online_payments_maintenance_message: str | None = None

    # Travel Voucher & PDF Settings
    pdf_header_title: str | None = None
    pdf_header_subtitle: str | None = None
    pdf_office_address: str | None = None
    pdf_contact_info: str | None = None
    pdf_checkin_instructions: str | None = None
    pdf_logistics_notice: str | None = None
    pdf_helpline_info: str | None = None
    pdf_footer_declaration: str | None = None
    pdf_badge_label: str | None = None
    pdf_logo_url: str | None = None
