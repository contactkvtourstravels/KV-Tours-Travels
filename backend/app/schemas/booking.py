"""Schemas for customer and administrative booking engine operations."""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.schemas.payment import PaymentDetailResponse


class BookingTravellerCreate(BaseModel):
    """Traveller details provided during checkout."""

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date | None = None
    gender: str | None = Field(
        None, pattern=r"^(female|male|non_binary|undisclosed|other)$"
    )
    nationality: str | None = Field(None, min_length=2, max_length=3)
    contact_email: str | None = Field(None, max_length=320)
    contact_phone: str | None = Field(None, max_length=32)
    is_primary: bool = False
    # Passport details only for international travel
    passport_number: str | None = Field(None, max_length=64)
    passport_expiry: date | None = None
    passport_issuing_country: str | None = Field(None, min_length=2, max_length=3)


class BookingTravellerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    date_of_birth: date | None = None
    gender: str | None = None
    nationality: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    is_primary: bool
    passport_number: str | None = None
    passport_expiry: date | None = None
    passport_issuing_country: str | None = None


class BookingAddOnSelect(BaseModel):
    add_on_id: UUID
    quantity: int = Field(1, ge=1, le=50)


class BookingAddOnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    add_on_id: UUID
    name_snapshot: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    currency: str


class PriceCalculationRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    package_id: UUID
    departure_id: UUID
    number_of_travellers: int | None = Field(default=None, ge=1, le=100)
    adults: int | None = None
    children: int = 0
    infants: int = 0
    add_ons: list[BookingAddOnSelect] = []
    coupon_code: str | None = None
    offer_id: UUID | None = None

    def model_post_init(self, context: Any, /) -> None:
        if self.number_of_travellers is None:
            total = (self.adults or 0) + (self.children or 0)
            self.number_of_travellers = (
                max(1, min(100, total)) if (self.adults is not None or self.children) else 1
            )


class AddOnCalculationDetail(BaseModel):
    add_on_id: UUID
    name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    currency: str


class PriceCalculationResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    package_id: UUID
    departure_id: UUID
    number_of_travellers: int
    base_price_per_traveller: Decimal
    package_subtotal: Decimal
    add_ons_subtotal: Decimal
    add_ons_details: list[AddOnCalculationDetail] = []
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    currency: str
    coupon_code: str | None = None
    coupon_valid: bool | None = None
    coupon_message: str | None = None
    offer_id: UUID | None = None
    offer_title: str | None = None
    offer_discount_per_traveller: Decimal | None = None
    discount_amount: Decimal | str | None = None
    offer_applied: dict[str, Any] | None = None
    data: dict[str, Any] | None = None


class BookingCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    package_id: UUID
    departure_id: UUID
    number_of_travellers: int | None = Field(default=None, ge=1, le=100)
    adults: int | None = None
    children: int = 0
    infants: int = 0
    travellers: list[BookingTravellerCreate] = []
    lead_passenger_name: str | None = None
    lead_passenger_email: str | None = None
    lead_passenger_phone: str | None = None
    add_ons: list[BookingAddOnSelect] = []
    coupon_code: str | None = None
    offer_id: UUID | None = None
    customer_notes: str | None = Field(None, max_length=1000)
    idempotency_key: str | None = Field(None, max_length=128)

    def model_post_init(self, context: Any, /) -> None:
        if self.number_of_travellers is None:
            total = (self.adults or 0) + (self.children or 0)
            self.number_of_travellers = (
                max(1, min(100, total)) if (self.adults is not None or self.children) else 1
            )
        if not self.travellers and self.lead_passenger_name:
            names = self.lead_passenger_name.strip().split(" ", 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else "Traveler"
            self.travellers = [
                BookingTravellerCreate(
                    first_name=first_name,
                    last_name=last_name,
                    contact_email=self.lead_passenger_email,
                    contact_phone=self.lead_passenger_phone,
                    is_primary=True,
                )
            ]
            for _ in range(self.number_of_travellers - 1):
                self.travellers.append(
                    BookingTravellerCreate(
                        first_name="Guest",
                        last_name=last_name,
                        is_primary=False,
                    )
                )


class BookingSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")

    id: UUID
    booking_reference: str
    package_id: UUID
    package_title: str
    package_slug: str
    destination_name: str
    departure_id: UUID
    departure_date: date
    return_date: date | None = None
    status: str
    payment_status: str
    number_of_travellers: int
    total: Decimal
    currency: str
    created_at: datetime
    hold_expires_at: datetime | None = None

    @field_serializer("hold_expires_at", "created_at", when_used="always")
    def serialize_utc_datetime(self, dt: datetime | None) -> str | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class BookingDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")

    id: UUID
    booking_reference: str
    user_id: UUID
    customer_name: str
    customer_email: str
    package_id: UUID
    package_title: str
    package_slug: str
    destination_name: str
    departure_id: UUID
    departure_date: date
    return_date: date | None = None
    status: str
    payment_status: str
    number_of_travellers: int
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    currency: str
    total_paid: Decimal = Decimal("0.00")
    outstanding_balance: Decimal = Decimal("0.00")
    deposit_amount: Decimal | None = None
    is_fully_paid: bool = False
    offer_id: UUID | None = None
    discount_amount: Decimal | str | None = None
    total_price: Decimal | str | None = None
    customer_notes: str | None = None
    price_breakdown: dict[str, Any] | None = None
    travellers: list[BookingTravellerResponse] = []
    add_ons: list[BookingAddOnResponse] = []
    payments: list[PaymentDetailResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    hold_expires_at: datetime | None = None
    data: dict[str, Any] | None = None

    @field_serializer("hold_expires_at", "created_at", "updated_at", when_used="always")
    def serialize_detail_utc_datetime(self, dt: datetime | None) -> str | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class BookingStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern=r"^(pending|confirmed|cancelled|completed)$")
    reason: str | None = Field(None, max_length=500)


class BookingListResponse(BaseModel):
    items: list[BookingSummaryResponse]
    total: int
    page: int
    page_size: int
