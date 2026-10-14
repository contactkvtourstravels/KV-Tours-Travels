"""Pydantic schemas for administration platform APIs."""

from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal
from typing import Any, Generic, Literal, Self, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

T = TypeVar("T")


def _clean_optional_text(v: Any) -> Any:
    """Normalize custom categories/descriptions: trim whitespace and convert 'None' to null."""
    if v is None:
        return None
    if isinstance(v, str):
        cleaned = " ".join(v.strip().split())
        if not cleaned or cleaned.lower() in ("none", "null", "not applicable", "n/a"):
            return None
        return cleaned
    return v


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard pagination wrapper for list responses."""

    model_config = ConfigDict(extra="forbid")

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==============================================================================
# Dashboard Metrics
# ==============================================================================


class RecentBookingItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    booking_reference: str
    customer_name: str
    customer_email: str
    package_name: str
    total_amount: Decimal
    currency: str
    status: str
    payment_status: str
    created_at: datetime


class RecentInquiryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    email: str
    message_preview: str
    status: str
    source: str
    created_at: datetime


class RecentAuditItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    action: str
    entity_type: str
    entity_id: str | None
    actor_email: str | None
    created_at: datetime


class AdminDashboardMetricsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_customers: int
    total_users: int
    total_destinations: int
    published_destinations: int
    total_packages: int
    published_packages: int
    total_bookings: int
    pending_bookings: int
    confirmed_bookings: int
    total_inquiries: int
    unread_inquiries: int
    active_hotels: int = 0
    active_activities: int = 0
    upcoming_departures: int = 0
    total_revenue: Decimal = Decimal("0.00")
    recent_bookings: list[RecentBookingItem]
    recent_inquiries: list[RecentInquiryItem]
    recent_audit_activity: list[RecentAuditItem]


# ==============================================================================
# Audit Logs
# ==============================================================================


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    actor_user_id: UUID | None
    actor_email: str | None
    actor_name: str | None
    action: str
    entity_type: str
    entity_id: str | None
    ip_address: str | None
    metadata_json: dict[str, Any] | None
    created_at: datetime


# ==============================================================================
# User Management
# ==============================================================================


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: str | None
    status: str
    is_deleted: bool
    roles: list[str]
    created_at: datetime
    updated_at: datetime


class AdminUserStatusUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["active", "inactive", "suspended", "pending_verification"]
    reason: str | None = Field(default=None, max_length=255)


class AdminUserRolesUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    roles: list[Literal["customer", "staff", "manager", "admin", "super_admin"]] = (
        Field(min_length=1)
    )


# ==============================================================================
# Destinations
# ==============================================================================


class DestinationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    slug: str
    short_description: str | None
    description: str | None
    country: str
    region: str | None
    state_or_city: str | None = None
    category: str | None = None
    travel_type: str | None = None
    cover_image_url: str | None = None
    display_order: int = 0
    highlights_json: list[dict[str, Any]] | None = None
    travel_guide_json: dict[str, Any] | None = None
    faqs_json: list[dict[str, Any]] | None = None
    social_image_url: str | None = None
    is_featured: bool
    is_published: bool
    is_active: bool
    deleted_at: datetime | None
    seo_title: str | None
    seo_description: str | None
    created_at: datetime
    updated_at: datetime
    package_count: int = 0


class DestinationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=180)
    slug: str | None = Field(default=None, max_length=200)
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    country: str = Field(min_length=2, max_length=100)
    region: str | None = Field(default=None, max_length=120)
    state_or_city: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=80)
    travel_type: str | None = Field(default=None, max_length=80)
    cover_image_url: str | None = Field(default=None, max_length=2048)
    display_order: int = Field(default=0, ge=0)
    highlights_json: list[dict[str, Any]] | None = None
    travel_guide_json: dict[str, Any] | None = None
    faqs_json: list[dict[str, Any]] | None = None
    social_image_url: str | None = Field(default=None, max_length=2048)
    is_featured: bool = False
    is_published: bool = False
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=320)

    @field_validator("category", "travel_type", mode="before")
    @classmethod
    def clean_categories(cls, v: Any) -> Any:
        return _clean_optional_text(v)


class DestinationUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=180)
    slug: str | None = Field(default=None, max_length=200)
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    country: str | None = Field(default=None, min_length=2, max_length=100)
    region: str | None = Field(default=None, max_length=120)
    state_or_city: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=80)
    travel_type: str | None = Field(default=None, max_length=80)
    cover_image_url: str | None = Field(default=None, max_length=2048)
    display_order: int | None = Field(default=None, ge=0)
    highlights_json: list[dict[str, Any]] | None = None
    travel_guide_json: dict[str, Any] | None = None
    faqs_json: list[dict[str, Any]] | None = None
    social_image_url: str | None = Field(default=None, max_length=2048)
    is_featured: bool | None = None
    is_published: bool | None = None
    is_active: bool | None = None
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=320)

    @field_validator("category", "travel_type", mode="before")
    @classmethod
    def clean_categories(cls, v: Any) -> Any:
        return _clean_optional_text(v)


# ==============================================================================
# Packages
# ==============================================================================


class PackageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    destination_id: UUID
    destination_name: str | None = None
    destination_is_published: bool | None = None
    name: str
    slug: str
    short_description: str | None
    description: str | None
    base_price: Decimal
    currency: str
    duration_days: int
    duration_nights: int
    minimum_travellers: int
    maximum_travellers: int | None
    category: str | None = None
    travel_type: str | None = None
    difficulty_level: str | None = None
    departure_location: str | None = None
    cover_image_url: str | None = None
    inclusions_json: list[str] | None = None
    exclusions_json: list[str] | None = None
    child_price: Decimal | None = None
    infant_price: Decimal | None = None
    single_room_supplement: Decimal | None = None
    booking_cutoff_days: int = 0
    cancellation_policy: str | None = None
    is_featured: bool
    is_published: bool
    is_active: bool
    deleted_at: datetime | None
    seo_title: str | None
    seo_description: str | None
    created_at: datetime
    updated_at: datetime


class PackageCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination_id: UUID
    name: str = Field(min_length=2, max_length=200)
    slug: str | None = Field(default=None, max_length=220)
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    base_price: Decimal = Field(ge=0)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    duration_days: int = Field(ge=1)
    duration_nights: int = Field(ge=0)
    minimum_travellers: int = Field(default=1, ge=1)
    maximum_travellers: int | None = Field(default=None, ge=1)
    category: str | None = Field(default=None, max_length=80)
    travel_type: str | None = Field(default=None, max_length=80)
    difficulty_level: str | None = Field(default=None, max_length=50)
    departure_location: str | None = Field(default=None, max_length=120)
    cover_image_url: str | None = Field(default=None, max_length=2048)
    inclusions_json: list[str] | None = None
    exclusions_json: list[str] | None = None
    child_price: Decimal | None = Field(default=None, ge=0)
    infant_price: Decimal | None = Field(default=None, ge=0)
    single_room_supplement: Decimal | None = Field(default=None, ge=0)
    booking_cutoff_days: int = Field(default=0, ge=0)
    cancellation_policy: str | None = None
    is_featured: bool = False
    is_published: bool = False
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=320)

    @field_validator("category", "travel_type", "difficulty_level", mode="before")
    @classmethod
    def clean_package_categories(cls, v: Any) -> Any:
        return _clean_optional_text(v)


class PackageUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination_id: UUID | None = None
    name: str | None = Field(default=None, min_length=2, max_length=200)
    slug: str | None = Field(default=None, max_length=220)
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    base_price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    duration_days: int | None = Field(default=None, ge=1)
    duration_nights: int | None = Field(default=None, ge=0)
    minimum_travellers: int | None = Field(default=None, ge=1)
    maximum_travellers: int | None = Field(default=None, ge=1)
    category: str | None = Field(default=None, max_length=80)
    travel_type: str | None = Field(default=None, max_length=80)
    difficulty_level: str | None = Field(default=None, max_length=50)
    departure_location: str | None = Field(default=None, max_length=120)
    cover_image_url: str | None = Field(default=None, max_length=2048)
    inclusions_json: list[str] | None = None
    exclusions_json: list[str] | None = None
    child_price: Decimal | None = Field(default=None, ge=0)
    infant_price: Decimal | None = Field(default=None, ge=0)
    single_room_supplement: Decimal | None = Field(default=None, ge=0)
    booking_cutoff_days: int | None = Field(default=None, ge=0)
    cancellation_policy: str | None = None
    is_featured: bool | None = None
    is_published: bool | None = None
    is_active: bool | None = None
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=320)

    @field_validator("category", "travel_type", "difficulty_level", mode="before")
    @classmethod
    def clean_package_categories(cls, v: Any) -> Any:
        return _clean_optional_text(v)


# ==============================================================================
# Destination Images
# ==============================================================================


class DestinationImageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    destination_id: UUID
    image_url: str
    cloudinary_public_id: str | None
    alt_text: str
    sort_order: int
    is_featured: bool
    created_at: datetime


class DestinationImageCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_url: str = Field(min_length=5, max_length=2048)
    cloudinary_public_id: str | None = Field(default=None, max_length=255)
    alt_text: str = Field(min_length=2, max_length=300)
    sort_order: int = Field(default=0, ge=0)
    is_featured: bool = False


class DestinationImageUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_url: str | None = Field(default=None, min_length=5, max_length=2048)
    cloudinary_public_id: str | None = Field(default=None, max_length=255)
    alt_text: str | None = Field(default=None, min_length=2, max_length=300)
    sort_order: int | None = Field(default=None, ge=0)
    is_featured: bool | None = None


# ==============================================================================
# Package Images
# ==============================================================================


class PackageImageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    package_id: UUID
    image_url: str
    cloudinary_public_id: str | None
    alt_text: str
    sort_order: int
    is_featured: bool
    created_at: datetime


class PackageImageCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_url: str = Field(min_length=5, max_length=2048)
    cloudinary_public_id: str | None = Field(default=None, max_length=255)
    alt_text: str = Field(min_length=2, max_length=300)
    sort_order: int = Field(default=0, ge=0)
    is_featured: bool = False


class PackageImageUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_url: str | None = Field(default=None, min_length=5, max_length=2048)
    cloudinary_public_id: str | None = Field(default=None, max_length=255)
    alt_text: str | None = Field(default=None, min_length=2, max_length=300)
    sort_order: int | None = Field(default=None, ge=0)
    is_featured: bool | None = None


# ==============================================================================
# Hotels
# ==============================================================================


class HotelResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    destination_id: UUID
    destination_name: str | None = None
    name: str
    description: str | None
    address: str | None
    star_rating: int | None
    website_url: str | None
    contact_phone: str | None
    contact_email: str | None
    is_active: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class HotelCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination_id: UUID
    name: str = Field(min_length=2, max_length=200)
    description: str | None = None
    address: str | None = None
    star_rating: int | None = Field(default=None, ge=1, le=5)
    website_url: str | None = Field(default=None, max_length=2048)
    contact_phone: str | None = Field(default=None, max_length=32)
    contact_email: str | None = Field(default=None, max_length=320)
    is_active: bool = True


class HotelUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination_id: UUID | None = None
    name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    address: str | None = None
    star_rating: int | None = Field(default=None, ge=1, le=5)
    website_url: str | None = Field(default=None, max_length=2048)
    contact_phone: str | None = Field(default=None, max_length=32)
    contact_email: str | None = Field(default=None, max_length=320)
    is_active: bool | None = None


# ==============================================================================
# Activities
# ==============================================================================


class ActivityResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    destination_id: UUID
    destination_name: str | None = None
    name: str
    description: str | None
    duration_minutes: int | None
    category: str | None
    price: Decimal | None
    currency: str | None
    status: str
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ActivityCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination_id: UUID
    name: str = Field(min_length=2, max_length=200)
    description: str | None = None
    duration_minutes: int | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, max_length=80)
    price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    status: str = Field(default="active", max_length=24)

    @field_validator("category", mode="before")
    @classmethod
    def clean_activity_category(cls, v: Any) -> Any:
        return _clean_optional_text(v)


class ActivityUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination_id: UUID | None = None
    name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    duration_minutes: int | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, max_length=80)
    price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    status: str | None = Field(default=None, max_length=24)

    @field_validator("category", mode="before")
    @classmethod
    def clean_activity_category(cls, v: Any) -> Any:
        return _clean_optional_text(v)


# ==============================================================================
# Package Itinerary (PackageDay) & Day Activities
# ==============================================================================


class PackageDayActivityResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    package_day_id: UUID
    activity_id: UUID
    activity_name: str
    category: str | None
    duration_minutes: int | None
    sort_order: int


class PackageDayResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    package_id: UUID
    day_number: int
    title: str
    description: str | None
    accommodation: str | None
    meals: str | None
    transportation: str | None
    activities: list[PackageDayActivityResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class PackageDayCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day_number: int = Field(ge=1)
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    accommodation: str | None = Field(default=None, max_length=500)
    meals: str | None = Field(default=None, max_length=300)
    transportation: str | None = Field(default=None, max_length=500)


class PackageDayUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day_number: int | None = Field(default=None, ge=1)
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    accommodation: str | None = Field(default=None, max_length=500)
    meals: str | None = Field(default=None, max_length=300)
    transportation: str | None = Field(default=None, max_length=500)


class PackageDayReorderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day_ids: list[UUID] = Field(min_length=1)


class PackageDayAddActivityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    activity_id: UUID
    sort_order: int = Field(default=0, ge=0)


# ==============================================================================
# Package Hotel & Activity Bindings
# ==============================================================================


class PackageHotelResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    package_id: UUID
    hotel_id: UUID
    hotel_name: str
    star_rating: int | None
    address: str | None


class PackageHotelBindRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hotel_id: UUID


class PackageActivityResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    package_id: UUID
    activity_id: UUID
    activity_name: str
    category: str | None
    duration_minutes: int | None


class PackageActivityBindRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    activity_id: UUID


# ==============================================================================
# Group Trip Departures (PackageDeparture)
# ==============================================================================


class PackageDepartureResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    package_id: UUID
    package_name: str | None = None
    departure_date: datetime | str
    return_date: datetime | str | None
    total_capacity: int
    available_capacity: int
    reserved_capacity: int
    status: Literal["draft", "open", "closed", "cancelled", "sold_out"]
    special_price: Decimal | None
    currency: str
    booking_cutoff_date: datetime | str | None = None
    created_at: datetime
    updated_at: datetime


class PackageDepartureCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    package_id: UUID | None = None
    departure_date: str = Field(description="YYYY-MM-DD format")
    return_date: str | None = Field(default=None, description="YYYY-MM-DD format")
    total_capacity: int = Field(ge=0, le=100)
    special_price: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    status: Literal["draft", "open", "closed", "cancelled", "sold_out"] = "open"
    booking_cutoff_date: str | None = Field(default=None, description="YYYY-MM-DD format")


class PackageDepartureUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    departure_date: str | None = Field(default=None, description="YYYY-MM-DD format")
    return_date: str | None = Field(default=None, description="YYYY-MM-DD format")
    total_capacity: int | None = Field(default=None, ge=0, le=100)
    reserved_capacity: int | None = Field(default=None, ge=0)
    special_price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    status: Literal["draft", "open", "closed", "cancelled", "sold_out"] | None = None
    booking_cutoff_date: str | None = Field(default=None, description="YYYY-MM-DD format")


# ==============================================================================
# Add-Ons
# ==============================================================================


class AddOnResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    description: str | None
    price: Decimal
    currency: str
    applicability_scope: Literal[
        "all_packages", "selected_packages", "selected_destinations", "single_package"
    ] = "all_packages"
    price_type: Literal[
        "per_booking", "per_traveller", "per_room_night", "per_unit"
    ] = "per_booking"
    min_quantity: int = 1
    max_quantity: int = 10
    is_mandatory: bool = False
    display_order: int = 0
    package_ids: list[UUID] = Field(default_factory=list)
    destination_ids: list[UUID] = Field(default_factory=list)
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AddOnCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=180)
    description: str | None = None
    price: Decimal = Field(ge=0)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    applicability_scope: Literal[
        "all_packages", "selected_packages", "selected_destinations", "single_package"
    ] = "all_packages"
    price_type: Literal[
        "per_booking", "per_traveller", "per_room_night", "per_unit"
    ] = "per_booking"
    min_quantity: int = Field(default=1, ge=1)
    max_quantity: int = Field(default=10, ge=1)
    is_mandatory: bool = False
    display_order: int = Field(default=0, ge=0)
    package_ids: list[UUID] = Field(default_factory=list)
    destination_ids: list[UUID] = Field(default_factory=list)
    is_active: bool = True


class AddOnUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    applicability_scope: (
        Literal[
            "all_packages",
            "selected_packages",
            "selected_destinations",
            "single_package",
        ]
        | None
    ) = None
    price_type: (
        Literal["per_booking", "per_traveller", "per_room_night", "per_unit"] | None
    ) = None
    min_quantity: int | None = Field(default=None, ge=1)
    max_quantity: int | None = Field(default=None, ge=1)
    is_mandatory: bool | None = None
    display_order: int | None = Field(default=None, ge=0)
    package_ids: list[UUID] | None = None
    destination_ids: list[UUID] | None = None
    is_active: bool | None = None


# ==============================================================================
# Cloudinary Signed Upload
# ==============================================================================


class SignedUploadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    folder: str = Field(default="travelagency/catalog", max_length=120)
    resource_type: Literal["image"] = "image"


class SignedUploadResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cloud_name: str
    api_key: str
    timestamp: int
    signature: str
    folder: str
    upload_url: str


class MediaUploadRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(default="image/jpeg", max_length=100)
    file_data: str = ""  # Base64 string or data URL
    data_url: str | None = None
    folder: str = Field(default="travelagency/catalog", max_length=120)

    @model_validator(mode="after")
    def populate_file_data(self) -> MediaUploadRequest:
        if not self.file_data and self.data_url:
            self.file_data = self.data_url
        if not self.file_data:
            raise ValueError("file_data or data_url must be provided")
        return self


class MediaUploadResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str
    public_id: str | None = None
    filename: str
    content_type: str
    size_bytes: int
    storage_type: str = "local"


# ==============================================================================
# Site Settings Management
# ==============================================================================


class AdminSiteSettingsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Business Identity
    legal_business_name: str | None = None
    agency_name: str = "KV TOURS & TRAVELS"
    public_display_name: str | None = None
    tagline: str = "Coimbatore • Luxury & Adventure Journeys"
    logo_url: str | None = None
    favicon_url: str | None = None
    business_description: str | None = None
    registered_office_address: str | None = None
    office_address: str = "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012"
    public_office_address: str | None = None
    agency_location: str = "Coimbatore, Tamil Nadu, India"
    city: str | None = "Coimbatore"
    state: str | None = "Tamil Nadu"
    postal_code: str | None = "641012"
    country: str | None = "India"
    time_zone: str = "Asia/Kolkata"
    currency: str = "INR"

    # Contact Details
    contact_phone: str = "+91 94420 00000"
    secondary_phone: str | None = None
    support_whatsapp: str | None = None
    emergency_phone: str | None = None
    contact_email: str = "contact@kvtours.in"
    customer_support_email: str | None = None
    booking_email: str | None = None
    general_inquiry_email: str | None = None
    reply_to_email: str | None = None

    # Social and Online Presence
    instagram_handle: str | None = "@kvtours_travels"
    instagram_url: str | None = None
    facebook_url: str | None = None
    website_url: str | None = None
    google_maps_url: str | None = None

    # Business Information
    operating_hours: str = "Mon - Sat: 9:00 AM - 7:00 PM"
    business_hours: str = "Mon - Sat: 9:00 AM - 7:00 PM"
    holiday_notice: str | None = None
    office_contact_instructions: str | None = None

    # WhatsApp Click-to-Chat
    whatsapp_number: str = "+919442000000"
    whatsapp_country_code: str = "+91"
    whatsapp_prefilled_message: str = "Hi KV Tours, I am interested in planning a trip."
    whatsapp_package_message: str = "Hi KV Tours, I am interested in this package."
    whatsapp_destination_message: str = "Hi KV Tours, I would like to know more about this destination."
    whatsapp_custom_trip_message: str = "Hi KV Tours, I would like to plan a custom holiday."
    whatsapp_booking_support_message: str = "Hi KV Tours, I need assistance with my booking."
    whatsapp_enabled: bool = True
    whatsapp_show_floating_concierge: bool = True
    whatsapp_show_header_button: bool = True
    whatsapp_show_on_homepage: bool = True
    whatsapp_show_on_footer: bool = True
    whatsapp_show_on_package_pages: bool = True
    whatsapp_show_on_contact_page: bool = True

    # WhatsApp Cloud API
    whatsapp_cloud_api_enabled: bool = False
    whatsapp_phone_number_id: str | None = None
    whatsapp_business_account_id: str | None = None
    whatsapp_api_version: str = "v20.0"
    whatsapp_access_token_configured: bool = False
    whatsapp_access_token_masked: str | None = None
    whatsapp_verify_token_configured: bool = False
    whatsapp_verify_token_masked: str | None = None
    whatsapp_app_secret_configured: bool = False
    whatsapp_app_secret_masked: str | None = None

    # Resend Email Configuration
    email_environment_mode: str = "development"
    email_provider: str = "resend"
    resend_api_key_configured: bool = False
    resend_api_key_masked: str | None = None
    resend_webhook_signing_secret_configured: bool = False
    resend_webhook_signing_secret_masked: str | None = None
    resend_webhook_url: str | None = None
    resend_webhook_tunnel_url: str | None = None
    email_sender_name: str = "KV Tours & Travels"
    email_sender_email: str = "bookings@kvtours.in"
    email_reply_to: str = "concierge@kvtours.in"
    admin_notification_email: str | None = "admin@kvtours.in"
    email_enabled: bool = True
    email_booking_confirmation_enabled: bool = True
    email_inquiry_ack_enabled: bool = True
    email_payment_receipt_enabled: bool = True
    email_cancellation_updates_enabled: bool = True
    email_trip_reminders_enabled: bool = True
    email_subject_booking_confirmation: str = "Your Booking Confirmation — KV Tours & Travels"
    email_subject_payment_receipt: str = "Payment Receipt — KV Tours & Travels"
    email_subject_inquiry_ack: str = "Inquiry Received — KV Tours & Travels"
    email_subject_trip_reminder: str = "Your Upcoming Journey with KV Tours & Travels"

    # Homepage Content & Visibility
    hero_headline: str = "Handcrafted Journeys Beyond the Ordinary"
    hero_subtitle: str = "Coimbatore's premier luxury travel curator crafting extraordinary journeys across India and the globe."
    hero_image_url: str | None = None
    contact_cta_text: str = "Speak With Concierge"
    whatsapp_cta_text: str = "Chat on WhatsApp"
    featured_destination_ids: list[str] = Field(default_factory=list)
    featured_package_ids: list[str] = Field(default_factory=list)
    promo_banner_active: bool = False
    promo_banner_text: str | None = None
    promo_banner_link: str | None = None
    best_offers_enabled: bool = True

    # Rebranding, Typography & Identity
    short_name: str | None = None
    secondary_logo_url: str | None = None
    brand_primary_color: str | None = "#24292F"
    brand_secondary_color: str | None = "#C5A880"
    brand_accent_color: str | None = "#D4AF37"
    primary_font: str | None = "Playfair Display"
    secondary_font: str | None = "Inter"
    year_established: int | None = None
    registration_number: str | None = None
    tax_id: str | None = None

    # Extended Social Media
    youtube_url: str | None = None
    linkedin_url: str | None = None
    twitter_url: str | None = None

    # SEO & Social Sharing
    seo_website_title: str | None = None
    seo_meta_description: str | None = None
    seo_og_image_url: str | None = None
    seo_social_title: str | None = None
    seo_social_description: str | None = None
    organization_structured_data: dict[str, Any] | None = None

    # Google Maps & Office Location
    google_maps_embed_url: str | None = None
    google_maps_latitude: float | None = None
    google_maps_longitude: float | None = None
    google_maps_zoom: int | None = 15
    google_maps_display_enabled: bool = True
    google_maps_directions_url: str | None = None
    office_location_label: str | None = None

    updated_at: datetime | None = None


def _validate_phone_field(v: Any, field_name: str) -> str | None:
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return None
        if not re.match(r"^[\d\+\-\s\(\)\.]{7,25}$", v):
            raise ValueError(f"{field_name} must contain between 7 and 25 valid phone characters.")
        return v
    return str(v)


def _validate_email_field(v: Any, field_name: str) -> str | None:
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return None
        if "@" not in v or "." not in v.split("@")[-1] or len(v) > 320:
            raise ValueError(f"{field_name} must be a valid email address.")
        return v
    return str(v)


def _validate_url_field(v: Any, field_name: str) -> str | None:
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return None
        if not v.startswith(("http://", "https://", "/")):
            raise ValueError(f"{field_name} must be a valid HTTP/HTTPS URL or path.")
        return v
    return str(v)


def _validate_maps_embed_url(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return None
        if "<iframe" in v.lower() and 'src="' in v.lower():
            import re
            m = re.search(r'src=["\']([^"\']+)["\']', v, re.IGNORECASE)
            if m:
                v = m.group(1).strip()
        if not (v.startswith("https://www.google.com/maps") or v.startswith("https://maps.google.com") or v.startswith("https://maps.app.goo.gl")):
            raise ValueError("Google Maps embed URL must be a valid HTTPS Google Maps URL (e.g., https://www.google.com/maps/embed?...).")
        return v
    return str(v)


class AdminSiteSettingsUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Business Identity
    legal_business_name: str | None = None
    agency_name: str | None = None
    public_display_name: str | None = None
    short_name: str | None = None
    tagline: str | None = None
    logo_url: str | None = None
    secondary_logo_url: str | None = None
    favicon_url: str | None = None
    brand_primary_color: str | None = None
    brand_secondary_color: str | None = None
    brand_accent_color: str | None = None
    primary_font: str | None = None
    secondary_font: str | None = None
    year_established: int | None = None
    registration_number: str | None = None
    tax_id: str | None = None
    business_description: str | None = None
    registered_office_address: str | None = None
    office_address: str | None = None
    public_office_address: str | None = None
    agency_location: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    time_zone: str | None = None
    currency: str | None = None

    # Contact Details
    contact_phone: str | None = None
    secondary_phone: str | None = None
    support_whatsapp: str | None = None
    emergency_phone: str | None = None
    contact_email: str | None = None
    customer_support_email: str | None = None
    booking_email: str | None = None
    general_inquiry_email: str | None = None
    reply_to_email: str | None = None

    # Social and Online Presence
    instagram_handle: str | None = None
    instagram_url: str | None = None
    facebook_url: str | None = None
    youtube_url: str | None = None
    linkedin_url: str | None = None
    twitter_url: str | None = None
    website_url: str | None = None
    google_maps_url: str | None = None

    # Business Information
    operating_hours: str | None = None
    business_hours: str | None = None
    holiday_notice: str | None = None
    office_contact_instructions: str | None = None

    # Google Maps & Directions
    google_maps_embed_url: str | None = None
    google_maps_latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    google_maps_longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    google_maps_zoom: int | None = Field(default=None, ge=1, le=21)
    google_maps_display_enabled: bool | None = None
    google_maps_directions_url: str | None = None
    office_location_label: str | None = None

    # SEO & Social Metadata
    seo_website_title: str | None = None
    seo_meta_description: str | None = None
    seo_og_image_url: str | None = None
    seo_social_title: str | None = None
    seo_social_description: str | None = None
    organization_structured_data: dict[str, Any] | None = None

    # WhatsApp Click-to-Chat
    whatsapp_number: str | None = None
    whatsapp_country_code: str | None = None
    whatsapp_prefilled_message: str | None = None
    whatsapp_package_message: str | None = None
    whatsapp_destination_message: str | None = None
    whatsapp_custom_trip_message: str | None = None
    whatsapp_booking_support_message: str | None = None
    whatsapp_enabled: bool | None = None
    whatsapp_show_floating_concierge: bool | None = None
    whatsapp_show_header_button: bool | None = None
    whatsapp_show_on_homepage: bool | None = None
    whatsapp_show_on_footer: bool | None = None
    whatsapp_show_on_package_pages: bool | None = None
    whatsapp_show_on_contact_page: bool | None = None

    # WhatsApp Cloud API
    whatsapp_cloud_api_enabled: bool | None = None
    whatsapp_phone_number_id: str | None = None
    whatsapp_business_account_id: str | None = None
    whatsapp_api_version: str | None = None
    whatsapp_access_token: str | None = None
    whatsapp_verify_token: str | None = None
    whatsapp_app_secret: str | None = None

    # Resend Email Configuration
    email_environment_mode: str | None = None
    email_provider: str | None = None
    resend_api_key: str | None = None
    resend_webhook_signing_secret: str | None = None
    resend_webhook_tunnel_url: str | None = None
    email_sender_name: str | None = None
    email_sender_email: str | None = None
    email_reply_to: str | None = None
    admin_notification_email: str | None = None
    email_enabled: bool | None = None
    email_booking_confirmation_enabled: bool | None = None
    email_inquiry_ack_enabled: bool | None = None
    email_payment_receipt_enabled: bool | None = None
    email_cancellation_updates_enabled: bool | None = None
    email_trip_reminders_enabled: bool | None = None
    email_subject_booking_confirmation: str | None = None
    email_subject_payment_receipt: str | None = None
    email_subject_inquiry_ack: str | None = None
    email_subject_trip_reminder: str | None = None

    # Homepage Content & Visibility
    hero_headline: str | None = None
    hero_subtitle: str | None = None
    hero_image_url: str | None = None
    contact_cta_text: str | None = None
    whatsapp_cta_text: str | None = None
    featured_destination_ids: list[str] | None = None
    featured_package_ids: list[str] | None = None
    promo_banner_active: bool | None = None
    promo_banner_text: str | None = None
    promo_banner_link: str | None = None
    best_offers_enabled: bool | None = None

    @field_validator(
        "contact_phone",
        "secondary_phone",
        "support_whatsapp",
        "emergency_phone",
        "whatsapp_number",
        mode="before",
    )
    @classmethod
    def validate_phones(cls, v: Any, info: Any) -> str | None:
        return _validate_phone_field(v, info.field_name)

    @field_validator(
        "contact_email",
        "customer_support_email",
        "booking_email",
        "general_inquiry_email",
        "reply_to_email",
        "email_sender_email",
        "admin_notification_email",
        mode="before",
    )
    @classmethod
    def validate_emails(cls, v: Any, info: Any) -> str | None:
        return _validate_email_field(v, info.field_name)

    @field_validator(
        "logo_url",
        "secondary_logo_url",
        "favicon_url",
        "instagram_url",
        "facebook_url",
        "youtube_url",
        "linkedin_url",
        "twitter_url",
        "website_url",
        "google_maps_url",
        "google_maps_directions_url",
        "hero_image_url",
        "promo_banner_link",
        "seo_og_image_url",
        mode="before",
    )
    @classmethod
    def validate_urls(cls, v: Any, info: Any) -> str | None:
        return _validate_url_field(v, info.field_name)

    @field_validator("google_maps_embed_url", mode="before")
    @classmethod
    def validate_maps_embed(cls, v: Any) -> str | None:
        return _validate_maps_embed_url(v)


class EmailTestConnectionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    status: str
    message: str
    provider: str
    api_key_configured: bool
    sender_domain: str | None = None
    sender_status: str | None = None
    is_sandbox: bool = False
    permitted_recipients_note: str | None = None
    dns_records: list[dict[str, Any]] | None = None
    details: dict[str, Any] | None = None


class EmailSendTestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipient_email: str | None = None
    recipient: str | None = None
    subject: str = "KV Tours & Travels — System Test Notification"
    notes: str | None = None

    @model_validator(mode="after")
    def validate_recipient(self) -> Self:
        target = self.recipient_email or self.recipient
        if not target or not target.strip():
            raise ValueError("recipient_email is required.")
        clean = _validate_email_field(target, "recipient_email")
        self.recipient_email = clean
        return self


class EmailSendTestResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    message: str
    provider: str
    message_id: str | None = None
    recipient: str
    timestamp: datetime


class WhatsAppTestConnectionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    status: str
    message: str
    phone_number_id: str | None = None
    verified_name: str | None = None
    display_phone_number: str | None = None
    quality_rating: str | None = None
    details: dict[str, Any] | None = None


class ConfigurationHealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall_status: str
    overall_score: int
    status: str | None = None
    health_score: int | None = None
    agency_profile_status: str
    agency_profile_completed_percentage: int
    missing_profile_fields: list[str]
    whatsapp_click_to_chat_status: str
    whatsapp_cloud_api_status: str
    resend_email_status: str
    payment_gateway_status: str
    bank_transfer_status: str
    items: list[dict[str, Any]]


class ResendWebhookVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    signing_secret: str | None = None


class ResendWebhookVerifyResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    status: str
    message: str
    webhook_url: str
    is_https: bool = False
    local_url: str | None = None
    public_webhook_url: str | None = None
    signing_secret_configured: bool
    signing_secret_masked: str | None = None
    secret_saved_and_decryptable: bool = False
    signature_verification_valid: bool = False
    public_https_configured: bool = False
    endpoint_reachable: bool | None = None
    endpoint_reachable_detail: str | None = None
    resend_registration_status: str = "manual_verification_required"
    resend_registration_detail: str | None = None
    last_event: dict[str, Any] | None = None
    diagnostics: dict[str, Any] | None = None


class ResendWebhookStatsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    webhook_url: str
    local_url: str | None = None
    public_tunnel_url: str | None = None
    signing_secret_configured: bool
    signing_secret_saved_and_decryptable: bool = False
    signing_secret_masked: str | None = None
    public_https_configured: bool = False
    total_events_received: int
    delivered_count: int
    bounced_count: int
    complained_count: int
    last_event_at: datetime | None = None
    last_event_type: str | None = None
    last_event: dict[str, Any] | None = None
    recent_events: list[dict[str, Any]] = Field(default_factory=list)

