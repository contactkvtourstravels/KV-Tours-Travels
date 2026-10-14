"""Pydantic schemas for Best Offers management and public catalog display."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing_extensions import Self


class PublicOfferListItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: UUID
    package_id: UUID
    package_name: str
    package_title: str | None = None
    package_slug: str
    destination_name: str
    destination_slug: str
    duration_days: int
    duration_nights: int
    cover_image_url: str | None = None
    original_price: Decimal | str
    discount_type: str
    discount_value: Decimal | str
    discount_amount: Decimal | str
    discounted_price: Decimal | str
    savings: Decimal | str
    discount_badge: str
    offer_label: str | None = None
    is_featured: bool = False
    start_at: datetime | None = None
    end_at: datetime | None = None
    currency: str = "INR"

    @model_validator(mode="after")
    def populate_title(self) -> Self:
        if not self.package_title and self.package_name:
            self.package_title = self.package_name
        return self


class PublicOffersResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    section_enabled: bool
    best_offers_enabled: bool = True
    offers: list[PublicOfferListItem]
    items: list[PublicOfferListItem] = []
    data: dict[str, Any] | None = None

    @model_validator(mode="after")
    def sync_items(self) -> Self:
        if not self.items and self.offers:
            self.items = list(self.offers)
        if not self.offers and self.items:
            self.offers = list(self.items)
        self.best_offers_enabled = self.section_enabled
        if not self.data:
            self.data = {
                "section_enabled": self.section_enabled,
                "best_offers_enabled": self.best_offers_enabled,
                "items": [
                    item.model_dump(mode="json")
                    if hasattr(item, "model_dump")
                    else item
                    for item in self.items
                ],
                "offers": [
                    item.model_dump(mode="json")
                    if hasattr(item, "model_dump")
                    else item
                    for item in self.offers
                ],
            }
        return self


class AdminOfferItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: UUID
    package_id: UUID
    package_name: str
    package_title: str | None = None
    package_slug: str
    destination_name: str
    duration_days: int
    duration_nights: int
    cover_image_url: str | None = None
    package_is_published: bool
    current_package_price: Decimal | str
    original_price_snapshot: Decimal | str | None = None
    original_package_price: Decimal | str | None = None
    price_changed_warning: bool = False
    title: str
    short_description: str | None = None
    discount_type: str
    discount_value: Decimal | str
    calculated_discount_amount: Decimal | str
    discount_amount: Decimal | str | None = None
    calculated_discounted_price: Decimal | str
    discounted_price: Decimal | str | None = None
    savings: Decimal | str
    discount_badge: str
    offer_badge: str | None = None
    minimum_booking_amount: Decimal | None = None
    maximum_discount_amount: Decimal | None = None
    offer_label: str | None = None
    badge_text: str | None = None
    is_featured: bool
    status: str
    is_expired: bool
    start_at: datetime | None = None
    end_at: datetime | None = None
    display_order: int
    created_at: datetime
    updated_at: datetime
    data: dict[str, Any] | None = None

    @model_validator(mode="after")
    def sync_aliases(self) -> Self:
        if not self.package_title and self.package_name:
            self.package_title = self.package_name
        if self.original_package_price is None:
            self.original_package_price = (
                self.original_price_snapshot
                if self.original_price_snapshot is not None
                else self.current_package_price
            )
        if self.discount_amount is None:
            self.discount_amount = self.calculated_discount_amount
        if self.discounted_price is None:
            self.discounted_price = self.calculated_discounted_price
        if not self.offer_badge and self.discount_badge:
            self.offer_badge = self.discount_badge
        return self


class AdminOfferCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    package_id: UUID
    title: str | None = Field(default=None, max_length=180)
    short_description: str | None = Field(default=None, max_length=500)
    discount_type: str = Field(pattern="^(percentage|fixed_amount|fixed)$")
    discount_value: Decimal
    minimum_booking_amount: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    maximum_discount_amount: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    offer_label: str | None = Field(default=None, max_length=100)
    badge_text: str | None = Field(default=None, max_length=60)
    offer_badge: str | None = Field(default=None, max_length=60)
    is_featured: bool = False
    status: str = Field(
        default="active", pattern="^(draft|published|active|disabled|archived)$"
    )
    start_at: datetime | None = None
    end_at: datetime | None = None
    display_order: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_discount(self) -> Self:
        if self.discount_value <= Decimal("0.00"):
            raise ValueError("Discount value must be greater than zero.")
        if self.discount_type == "percentage" and self.discount_value > Decimal(
            "100.00"
        ):
            raise ValueError("Percentage discount cannot exceed 100%.")
        if self.offer_badge and not self.badge_text:
            self.badge_text = self.offer_badge
        return self


class AdminOfferUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    package_id: UUID | None = None
    title: str | None = Field(default=None, min_length=2, max_length=180)
    short_description: str | None = Field(default=None, max_length=500)
    discount_type: str | None = Field(
        default=None, pattern="^(percentage|fixed_amount|fixed)$"
    )
    discount_value: Decimal | None = None
    minimum_booking_amount: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    maximum_discount_amount: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    offer_label: str | None = Field(default=None, max_length=100)
    badge_text: str | None = Field(default=None, max_length=60)
    offer_badge: str | None = Field(default=None, max_length=60)
    is_featured: bool | None = None
    status: str | None = Field(
        default=None, pattern="^(draft|published|active|disabled|archived)$"
    )
    start_at: datetime | None = None
    end_at: datetime | None = None
    display_order: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_discount(self) -> Self:
        if self.discount_value is not None:
            if self.discount_value <= Decimal("0.00"):
                raise ValueError("Discount value must be greater than zero.")
            if self.discount_type == "percentage" and self.discount_value > Decimal(
                "100.00"
            ):
                raise ValueError("Percentage discount cannot exceed 100%.")
        if self.offer_badge and not self.badge_text:
            self.badge_text = self.offer_badge
        return self


class AdminOfferListResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    items: list[AdminOfferItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    section_enabled: bool
    best_offers_enabled: bool = True
    data: dict[str, Any] | None = None

    @model_validator(mode="after")
    def sync_data(self) -> Self:
        self.best_offers_enabled = self.section_enabled
        if not self.data:
            self.data = {
                "items": [
                    item.model_dump(mode="json")
                    if hasattr(item, "model_dump")
                    else item
                    for item in self.items
                ],
                "total": self.total,
                "section_enabled": self.section_enabled,
                "best_offers_enabled": self.best_offers_enabled,
            }
        return self


class MasterToggleRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    enabled: bool | None = None
    best_offers_enabled: bool | None = None

    def get_enabled(self) -> bool:
        if self.best_offers_enabled is not None:
            return self.best_offers_enabled
        if self.enabled is not None:
            return self.enabled
        return True


class MasterToggleResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    enabled: bool
    best_offers_enabled: bool = True
    message: str
    data: dict[str, Any] | None = None

    @model_validator(mode="after")
    def sync_data(self) -> Self:
        self.best_offers_enabled = self.enabled
        if not self.data:
            self.data = {
                "enabled": self.enabled,
                "best_offers_enabled": self.enabled,
                "message": self.message,
            }
        return self
