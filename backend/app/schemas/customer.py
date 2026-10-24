"""Customer portal schemas: profile, saved travellers, cancellations, dashboard, receipts."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.booking import BookingSummaryResponse


class SavedTravellerCreate(BaseModel):
    """Payload to create a reusable customer traveller profile."""

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date | None = None
    gender: str | None = Field(
        None, pattern=r"^(female|male|non_binary|undisclosed|other)$"
    )
    nationality: str | None = Field(None, min_length=2, max_length=3)
    contact_email: str | None = Field(None, max_length=320)
    contact_phone: str | None = Field(None, max_length=32)
    relationship_label: str | None = Field(
        None, max_length=50, description="e.g. Self, Spouse, Child, Friend, Companion"
    )
    is_primary: bool = False
    # Passport details only for international travel
    passport_number: str | None = Field(None, max_length=64)
    passport_expiry: date | None = None
    passport_issuing_country: str | None = Field(None, min_length=2, max_length=3)


class SavedTravellerUpdate(BaseModel):
    """Payload to update an existing saved traveller profile."""

    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    date_of_birth: date | None = None
    gender: str | None = Field(
        None, pattern=r"^(female|male|non_binary|undisclosed|other)$"
    )
    nationality: str | None = Field(None, min_length=2, max_length=3)
    contact_email: str | None = Field(None, max_length=320)
    contact_phone: str | None = Field(None, max_length=32)
    relationship_label: str | None = Field(None, max_length=50)
    is_primary: bool | None = None
    passport_number: str | None = Field(None, max_length=64)
    passport_expiry: date | None = None
    passport_issuing_country: str | None = Field(None, min_length=2, max_length=3)


class SavedTravellerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    first_name: str
    last_name: str
    date_of_birth: date | None = None
    gender: str | None = None
    nationality: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    relationship_label: str | None = None
    is_primary: bool
    passport_number: str | None = None
    passport_expiry: date | None = None
    passport_issuing_country: str | None = None
    created_at: datetime
    updated_at: datetime


class CustomerProfileUpdate(BaseModel):
    """Allowed customer profile fields for self-service updates."""

    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=32)


class CustomerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: str | None = None
    status: str
    created_at: datetime
    email_immutability_notice: str = (
        "Email address is locked to protect customer security. "
        "To request an email change, please contact concierge support."
    )


class CancellationRequestCreate(BaseModel):
    """Customer request to cancel a confirmed booking."""

    reason: str = Field(..., min_length=5, max_length=1000)


class CancellationRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    booking_id: UUID
    user_id: UUID
    reason: str
    status: str
    admin_notes: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CancellationRequestReview(BaseModel):
    """Staff/Admin review of a customer cancellation request."""

    status: str = Field(..., pattern=r"^(approved|rejected)$")
    admin_notes: str | None = Field(None, max_length=1000)


class CancellationRequestDetailResponse(CancellationRequestResponse):
    booking_reference: str
    package_title: str
    customer_name: str
    customer_email: str
    total_amount: Decimal
    currency: str


class WhatsAppConciergeAction(BaseModel):
    action_type: str
    label: str
    prefilled_message: str
    click_to_chat_url: str
    display_phone: str


class CustomerDashboardSummary(BaseModel):
    """Aggregated metrics and activity for authenticated customer dashboard."""

    user_name: str
    user_email: str
    total_bookings: int
    active_bookings_count: int
    completed_trips_count: int
    upcoming_trips: list[BookingSummaryResponse]
    recent_bookings: list[BookingSummaryResponse]
    saved_travellers_count: int
    whatsapp_concierge: WhatsAppConciergeAction


class TravelVoucherData(BaseModel):
    """Immutable travel voucher data model for display or PDF export."""

    agency_name: str
    public_display_name: str | None = None
    legal_business_name: str | None = None
    logo_url: str | None = None
    tax_id: str | None = None
    registration_number: str | None = None
    agency_location: str
    agency_phone: str
    agency_email: str
    whatsapp_number: str
    booking_reference: str
    customer_name: str
    customer_email: str
    package_title: str
    destination_name: str
    departure_date: date
    return_date: date | None = None
    number_of_travellers: int
    travellers: list[dict[str, Any]]
    itinerary_days: list[dict[str, Any]]
    hotel_information: list[dict[str, Any]]
    activities: list[dict[str, Any]]
    booking_status: str
    payment_status: str
    special_notes: str | None = None
    issued_at: datetime
    # PDF Customizations
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


class PaymentReceiptData(BaseModel):
    """Immutable payment receipt data model."""

    receipt_number: str
    agency_name: str
    public_display_name: str | None = None
    legal_business_name: str | None = None
    logo_url: str | None = None
    tax_id: str | None = None
    registration_number: str | None = None
    agency_location: str
    agency_phone: str
    agency_email: str
    booking_reference: str
    customer_name: str
    customer_email: str
    package_title: str
    destination_name: str
    travel_dates: str
    payment_provider: str
    payment_id: str
    razorpay_order_id: str | None = None
    payment_date: datetime
    payment_status: str
    currency: str
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    receipt_issued_at: datetime
