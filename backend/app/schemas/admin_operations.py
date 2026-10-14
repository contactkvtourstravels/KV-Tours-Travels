"""Pydantic schemas for administrative operations, analytics, and business reporting."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.admin import (
    RecentAuditItem,
    RecentBookingItem,
    RecentInquiryItem,
)

# ==============================================================================
# Operations Dashboard
# ==============================================================================


class OperationsDashboardMetricsResponse(BaseModel):
    """Authoritative operations dashboard summary metrics derived directly from the database."""

    model_config = ConfigDict(extra="forbid")

    today_bookings: int
    pending_payments: int
    confirmed_bookings: int
    upcoming_departures: int
    cancellation_requests: int
    pending_inquiries: int
    total_revenue: Decimal
    outstanding_payments: Decimal
    recent_bookings: list[RecentBookingItem]
    recent_inquiries: list[RecentInquiryItem]
    recent_audit_activity: list[RecentAuditItem]


# ==============================================================================
# Revenue Analytics
# ==============================================================================


class RevenueTimeSeriesItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: str
    paid_revenue: Decimal
    refunded_amount: Decimal
    net_revenue: Decimal
    bookings_count: int


class RevenueAnalyticsResponse(BaseModel):
    """Aggregate financial revenue metrics computed using exact Decimal arithmetic."""

    model_config = ConfigDict(extra="forbid")

    total_revenue: Decimal
    paid_revenue: Decimal
    pending_payments: Decimal
    refunded_amount: Decimal
    net_revenue: Decimal
    period: str
    start_date: str
    end_date: str
    time_series: list[RevenueTimeSeriesItem]


# ==============================================================================
# Booking Analytics
# ==============================================================================


class BookingStatusCountItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    count: int


class BookingTimeSeriesItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: str
    count: int
    total_value: Decimal


class BookingAnalyticsResponse(BaseModel):
    """Booking performance indicators aggregated directly by SQL queries."""

    model_config = ConfigDict(extra="forbid")

    total_bookings: int
    confirmed_count: int
    pending_payment_count: int
    cancelled_count: int
    completed_count: int
    conversion_rate: float
    average_booking_value: Decimal
    average_travellers_per_booking: float
    by_status: list[BookingStatusCountItem]
    time_series: list[BookingTimeSeriesItem]


# ==============================================================================
# Customer Analytics
# ==============================================================================


class CustomerAnalyticsResponse(BaseModel):
    """Real customer metrics and retention indicators without personal data exposure."""

    model_config = ConfigDict(extra="forbid")

    total_customers: int
    new_customers: int
    returning_customers: int
    customers_with_upcoming_trips: int
    customers_with_completed_trips: int


# ==============================================================================
# Package & Destination Performance
# ==============================================================================


class PackagePerformanceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    package_id: UUID
    package_name: str
    destination_name: str
    bookings_count: int
    travellers_count: int
    gross_booking_value: Decimal
    confirmed_revenue: Decimal
    cancellations_count: int
    conversion_rate: float


class PackagePerformanceResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PackagePerformanceItem]


class DestinationPerformanceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination_id: UUID
    destination_name: str
    packages_count: int
    bookings_count: int
    travellers_count: int
    revenue: Decimal


class DestinationPerformanceResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[DestinationPerformanceItem]


# ==============================================================================
# Internal Notes
# ==============================================================================


class InternalNoteCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: str = Field(min_length=1, max_length=5000)


class InternalNoteResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    entity_type: str
    entity_id: UUID
    author_id: UUID
    author_name: str
    author_email: str
    note: str
    created_at: datetime


# ==============================================================================
# Departure Operations & Manifests
# ==============================================================================


class DepartureOperationalItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    package_id: UUID
    package_name: str
    destination_name: str
    departure_date: str
    return_date: str | None
    total_capacity: int
    reserved_capacity: int
    available_capacity: int
    confirmed_travellers: int
    pending_travellers: int
    operational_status: Literal[
        "scheduled", "open", "limited", "sold_out", "departed", "cancelled"
    ]
    status: str
    special_price: Decimal | None
    currency: str


class DepartureManifestTraveller(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    first_name: str
    last_name: str
    date_of_birth: str | None
    gender: str | None
    nationality: str | None
    passport_number_masked: str | None
    is_primary: bool


class DepartureManifestBooking(BaseModel):
    model_config = ConfigDict(extra="forbid")

    booking_id: UUID
    booking_reference: str
    lead_traveller_name: str
    lead_traveller_phone: str | None
    lead_traveller_email: str | None
    traveller_count: int
    payment_status: str
    customer_notes: str | None
    travellers: list[DepartureManifestTraveller]


class DepartureManifestResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    departure_id: UUID
    departure_date: str
    return_date: str | None
    package_name: str
    destination_name: str
    total_capacity: int
    reserved_capacity: int
    available_capacity: int
    status: str
    bookings: list[DepartureManifestBooking]
    internal_notes: list[InternalNoteResponse]


# ==============================================================================
# Customer Management
# ==============================================================================


class CustomerListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None
    status: str
    created_at: datetime
    booking_count: int
    upcoming_trips_count: int
    completed_trips_count: int
    total_paid_value: Decimal


class CustomerPaymentHistoryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    booking_id: UUID
    booking_reference: str
    provider: str
    provider_payment_id: str | None
    amount: Decimal
    currency: str
    status: str
    captured_at: datetime | None
    created_at: datetime


class CustomerCancellationHistoryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    booking_id: UUID
    booking_reference: str
    reason: str
    status: str
    resolved_at: datetime | None
    created_at: datetime


class CustomerInquiryHistoryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    message: str
    status: str
    created_at: datetime


class CustomerDetailResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None
    status: str
    created_at: datetime
    saved_traveller_count: int
    bookings: list[RecentBookingItem]
    payments: list[CustomerPaymentHistoryItem]
    cancellations: list[CustomerCancellationHistoryItem]
    inquiries: list[CustomerInquiryHistoryItem]
    internal_notes: list[InternalNoteResponse]


# ==============================================================================
# Inquiry / Lead Management
# ==============================================================================


class InquiryListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    email: str
    phone: str | None
    destination_name: str | None
    package_name: str | None
    message: str
    status: str
    priority: str
    source: str
    assigned_to_name: str | None
    assigned_to_user_id: UUID | None
    created_at: datetime
    updated_at: datetime


class InquiryDetailResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str
    email: str
    phone: str | None
    destination_name: str | None
    destination_id: UUID | None
    package_name: str | None
    package_id: UUID | None
    message: str
    status: str
    priority: str
    source: str
    assigned_to_name: str | None
    assigned_to_user_id: UUID | None
    created_at: datetime
    updated_at: datetime
    internal_notes: list[InternalNoteResponse]


class InquiryUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: (
        Literal[
            "new",
            "contacted",
            "follow_up",
            "converted",
            "closed",
            "in_progress",
            "resolved",
        ]
        | None
    ) = None
    priority: Literal["low", "medium", "high", "urgent"] | None = None
    assigned_to_user_id: UUID | None = None


# ==============================================================================
# Payment Reconciliation
# ==============================================================================


class PaymentReconciliationItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    payment_id: UUID
    booking_id: UUID
    booking_reference: str
    customer_name: str
    customer_email: str
    provider: str
    provider_order_id: str | None
    provider_payment_id: str | None
    amount: Decimal
    currency: str
    payment_status: str
    booking_status: str
    booking_payment_status: str
    created_at: datetime
    captured_at: datetime | None
    mismatch_types: list[str]


class PaymentReconciliationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PaymentReconciliationItem]
    mismatch_summary: dict[str, int]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==============================================================================
# Contact Customer
# ==============================================================================


class ContactCustomerEmailRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    booking_id: UUID | None = None
    inquiry_id: UUID | None = None
    subject: str = Field(min_length=2, max_length=200)
    body: str = Field(min_length=5, max_length=5000)


class ContactCustomerEmailResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    message: str
    recipient: str


class ContactCustomerWhatsAppResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    click_to_chat_url: str
    recipient_phone: str
    message: str
