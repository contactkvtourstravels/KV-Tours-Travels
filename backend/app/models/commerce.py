"""Bookings, customer travellers, add-ons, payments, coupons, and inquiries."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.common import JSON_DOCUMENT, MONEY, currency_check


class Booking(TimestampMixin, Base):
    __tablename__ = "bookings"
    __table_args__ = (
        UniqueConstraint("booking_reference", name="uq_bookings_reference"),
        ForeignKeyConstraint(
            ["departure_id", "package_id"],
            ["package_departures.id", "package_departures.package_id"],
            name="fk_bookings_departure_package",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "number_of_travellers >= 1",
            name="ck_bookings_number_of_travellers_positive",
        ),
        CheckConstraint("subtotal >= 0", name="ck_bookings_subtotal_nonnegative"),
        CheckConstraint("discount >= 0", name="ck_bookings_discount_nonnegative"),
        CheckConstraint("tax >= 0", name="ck_bookings_tax_nonnegative"),
        CheckConstraint("total >= 0", name="ck_bookings_total_nonnegative"),
        CheckConstraint(
            "status IN ('pending', 'payment_pending', 'confirmed', 'cancelled', 'completed')",
            name="ck_bookings_status",
        ),
        CheckConstraint(
            "payment_status IN ('pending', 'paid', 'failed', 'partially_paid', 'refunded')",
            name="ck_bookings_payment_status",
        ),
        currency_check(),
        Index("ix_bookings_user_created_at", "user_id", "created_at"),
        Index("ix_bookings_status_created_at", "status", "created_at"),
        Index("ix_bookings_departure_id", "departure_id"),
        Index("ix_bookings_user_idempotency", "user_id", "idempotency_key"),
        Index("ix_bookings_hold_expires", "hold_expires_at"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    booking_reference: Mapped[str] = mapped_column(String(32), nullable=False)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    package_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("packages.id", ondelete="RESTRICT"),
        nullable=False,
    )
    departure_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    coupon_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("coupons.id", ondelete="SET NULL")
    )
    offer_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("best_offers.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="pending"
    )
    payment_status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="pending"
    )
    number_of_travellers: Mapped[int] = mapped_column(Integer, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    discount: Mapped[Decimal] = mapped_column(MONEY, nullable=False, server_default="0")
    tax: Mapped[Decimal] = mapped_column(MONEY, nullable=False, server_default="0")
    total: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    customer_notes: Mapped[str | None] = mapped_column(Text)
    price_breakdown: Mapped[dict[str, object] | None] = mapped_column(JSON_DOCUMENT)
    idempotency_key: Mapped[str | None] = mapped_column(String(128))
    hold_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    def __init__(self, *args, **kwargs):
        if "traveller_count" in kwargs and "number_of_travellers" not in kwargs:
            kwargs["number_of_travellers"] = kwargs.pop("traveller_count")
        if "discount_amount" in kwargs and "discount" not in kwargs:
            kwargs["discount"] = kwargs.pop("discount_amount")
        if "tax_amount" in kwargs and "tax" not in kwargs:
            kwargs["tax"] = kwargs.pop("tax_amount")
        if "total_amount" in kwargs and "total" not in kwargs:
            kwargs["total"] = kwargs.pop("total_amount")
        super().__init__(*args, **kwargs)

    @property
    def traveller_count(self) -> int:
        """Alias for number_of_travellers."""
        return self.number_of_travellers

    @traveller_count.setter
    def traveller_count(self, value: int) -> None:
        self.number_of_travellers = value

    @property
    def discount_amount(self) -> Decimal:
        """Alias for discount."""
        return self.discount

    @discount_amount.setter
    def discount_amount(self, value: Decimal) -> None:
        self.discount = value

    @property
    def tax_amount(self) -> Decimal:
        """Alias for tax."""
        return self.tax

    @tax_amount.setter
    def tax_amount(self, value: Decimal) -> None:
        self.tax = value

    @property
    def total_amount(self) -> Decimal:
        """Alias for total."""
        return self.total

    @total_amount.setter
    def total_amount(self, value: Decimal) -> None:
        self.total = value

    @property
    def total_price(self) -> Decimal:
        """Alias for total."""
        return self.total

    @total_price.setter
    def total_price(self, value: Decimal) -> None:
        self.total = value

    user: Mapped[User] = relationship(back_populates="bookings")
    package: Mapped[Package] = relationship(back_populates="bookings")
    departure: Mapped[PackageDeparture] = relationship(foreign_keys=[departure_id])
    coupon: Mapped[Coupon | None] = relationship(back_populates="bookings")
    offer: Mapped[BestOffer | None] = relationship(back_populates="bookings")
    travellers: Mapped[list[BookingTraveller]] = relationship(
        back_populates="booking", cascade="all, delete-orphan", passive_deletes=True
    )
    add_ons: Mapped[list[BookingAddOn]] = relationship(
        back_populates="booking", cascade="all, delete-orphan", passive_deletes=True
    )
    payments: Mapped[list[Payment]] = relationship(
        back_populates="booking", passive_deletes=True
    )
    reviews: Mapped[list[Review]] = relationship(
        back_populates="booking", passive_deletes=True
    )
    coupon_usage: Mapped[CouponUsage | None] = relationship(
        back_populates="booking", passive_deletes=True
    )
    cancellation_request: Mapped[BookingCancellationRequest | None] = relationship(
        back_populates="booking",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class BookingTraveller(TimestampMixin, Base):
    """Traveller detail for a booking.

    Privacy & Data Minimization:
    A booking can have multiple travellers. Passport fields are strictly optional/nullable.
    They are intended only for international itineraries where required by border/visa authorities.
    Domestic trips must not collect or store passport information. Sensitive personal data
    must never be logged or exposed in client tokens.
    """

    __tablename__ = "booking_travellers"
    __table_args__ = (
        CheckConstraint(
            "gender IS NULL OR gender IN ('female', 'male', 'non_binary', 'undisclosed', 'other')",
            name="ck_travellers_gender",
        ),
        Index("ix_booking_travellers_booking_id", "booking_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    booking_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(24))
    nationality: Mapped[str | None] = mapped_column(String(3))
    passport_number: Mapped[str | None] = mapped_column(String(64))
    passport_expiry: Mapped[date | None] = mapped_column(Date)
    passport_issuing_country: Mapped[str | None] = mapped_column(String(3))
    contact_email: Mapped[str | None] = mapped_column(String(320))
    contact_phone: Mapped[str | None] = mapped_column(String(32))
    is_primary: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    booking: Mapped[Booking] = relationship(back_populates="travellers")


class SavedTraveller(TimestampMixin, Base):
    """Customer-managed reusable traveller profile for streamlined checkout.

    Data Minimization & Snapshot Isolation:
    Passport fields are strictly optional and intended only for international bookings.
    Modifying or deleting a saved traveller profile NEVER alters past historical bookings,
    which permanently retain frozen snapshots in booking_travellers.
    """

    __tablename__ = "saved_travellers"
    __table_args__ = (
        CheckConstraint(
            "gender IS NULL OR gender IN ('female', 'male', 'non_binary', 'undisclosed', 'other')",
            name="ck_saved_travellers_gender",
        ),
        Index("ix_saved_travellers_user_id", "user_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(24))
    nationality: Mapped[str | None] = mapped_column(String(3))
    passport_number: Mapped[str | None] = mapped_column(String(64))
    passport_expiry: Mapped[date | None] = mapped_column(Date)
    passport_issuing_country: Mapped[str | None] = mapped_column(String(3))
    contact_email: Mapped[str | None] = mapped_column(String(320))
    contact_phone: Mapped[str | None] = mapped_column(String(32))
    relationship_label: Mapped[str | None] = mapped_column(String(50))
    is_primary: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )

    user: Mapped[User] = relationship(back_populates="saved_travellers")


class BookingCancellationRequest(TimestampMixin, Base):
    """Customer-initiated cancellation request requiring staff review.

    Policy:
    Submitting a cancellation request communicates the customer's intent to KV Tours & Travels.
    It does not immediately issue refunds. Staff or management reviews the request against
    cancellation policies and determines the refund eligibility authoritatively.
    """

    __tablename__ = "booking_cancellation_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="ck_cancellation_requests_status",
        ),
        Index("ix_cancellation_requests_booking_id", "booking_id"),
        Index("ix_cancellation_requests_user_id", "user_id"),
        Index("ix_cancellation_requests_status", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    booking_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="pending"
    )
    admin_notes: Mapped[str | None] = mapped_column(Text)
    resolved_by_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    booking: Mapped[Booking] = relationship(back_populates="cancellation_request")
    user: Mapped[User] = relationship(foreign_keys=[user_id])
    resolved_by: Mapped[User | None] = relationship(foreign_keys=[resolved_by_id])


class AddOn(TimestampMixin, Base):
    __tablename__ = "add_ons"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_add_ons_price_nonnegative"),
        currency_check(),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    applicability_scope: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default=text("'all_packages'")
    )
    price_type: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default=text("'per_booking'")
    )
    min_quantity: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1")
    )
    max_quantity: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("10")
    )
    is_mandatory: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    display_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )

    booking_links: Mapped[list[BookingAddOn]] = relationship(
        back_populates="add_on", passive_deletes=True
    )
    package_links: Mapped[list[AddOnPackage]] = relationship(
        back_populates="add_on", cascade="all, delete-orphan", passive_deletes=True
    )
    destination_links: Mapped[list[AddOnDestination]] = relationship(
        back_populates="add_on", cascade="all, delete-orphan", passive_deletes=True
    )


class AddOnPackage(TimestampMixin, Base):
    __tablename__ = "add_on_packages"

    add_on_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("add_ons.id", ondelete="CASCADE"),
        primary_key=True,
    )
    package_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("packages.id", ondelete="CASCADE"),
        primary_key=True,
    )

    add_on: Mapped[AddOn] = relationship(back_populates="package_links")


class AddOnDestination(TimestampMixin, Base):
    __tablename__ = "add_on_destinations"

    add_on_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("add_ons.id", ondelete="CASCADE"),
        primary_key=True,
    )
    destination_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("destinations.id", ondelete="CASCADE"),
        primary_key=True,
    )

    add_on: Mapped[AddOn] = relationship(back_populates="destination_links")


class BookingAddOn(TimestampMixin, Base):
    __tablename__ = "booking_add_ons"
    __table_args__ = (
        UniqueConstraint(
            "booking_id", "add_on_id", name="uq_booking_add_ons_booking_add_on"
        ),
        CheckConstraint("quantity >= 1", name="ck_booking_add_ons_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_booking_add_ons_price_nonnegative"),
        CheckConstraint(
            "total_price >= 0", name="ck_booking_add_ons_total_nonnegative"
        ),
        currency_check(),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    booking_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
    )
    add_on_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("add_ons.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name_snapshot: Mapped[str] = mapped_column(String(180), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    unit_price: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    total_price: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)

    def __init__(self, *args, **kwargs):
        if "total_price" not in kwargs and "unit_price" in kwargs:
            qty = kwargs.get("quantity", 1)
            kwargs["total_price"] = kwargs["unit_price"] * qty
        super().__init__(*args, **kwargs)

    @property
    def price(self) -> Decimal:
        """Alias for unit_price."""
        return self.unit_price

    booking: Mapped[Booking] = relationship(back_populates="add_ons")
    add_on: Mapped[AddOn] = relationship(back_populates="booking_links")


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
        CheckConstraint(
            "status IN ('pending', 'authorized', 'captured', 'failed', 'partially_refunded', 'refunded', 'cancelled')",
            name="ck_payments_status",
        ),
        currency_check(),
        UniqueConstraint(
            "provider", "provider_order_id", name="uq_payments_provider_order"
        ),
        UniqueConstraint(
            "provider", "provider_payment_id", name="uq_payments_provider_payment"
        ),
        UniqueConstraint("idempotency_key", name="uq_payments_idempotency_key"),
        Index("ix_payments_booking_status", "booking_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    booking_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="RESTRICT"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    provider_order_id: Mapped[str | None] = mapped_column(String(150))
    provider_payment_id: Mapped[str | None] = mapped_column(String(150))
    provider_event_id: Mapped[str | None] = mapped_column(String(180))
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="pending"
    )
    payment_method: Mapped[str | None] = mapped_column(String(50))
    failure_code: Mapped[str | None] = mapped_column(String(100))
    failure_message: Mapped[str | None] = mapped_column(String(500))
    provider_created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    booking: Mapped[Booking] = relationship(back_populates="payments")
    refunds: Mapped[list[PaymentRefund]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )


class PaymentRefund(TimestampMixin, Base):
    __tablename__ = "payment_refunds"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payment_refunds_amount_positive"),
        CheckConstraint(
            "status IN ('pending', 'processed', 'failed', 'cancelled')",
            name="ck_payment_refunds_status",
        ),
        UniqueConstraint(
            "provider", "provider_refund_id", name="uq_payment_refunds_provider_refund"
        ),
        Index("ix_payment_refunds_payment_id", "payment_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    payment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("payments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    provider_refund_id: Mapped[str | None] = mapped_column(String(150))
    amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="pending"
    )
    reason: Mapped[str | None] = mapped_column(String(500))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    payment: Mapped[Payment] = relationship(back_populates="refunds")


class Coupon(TimestampMixin, Base):
    __tablename__ = "coupons"
    __table_args__ = (
        UniqueConstraint("code_normalized", name="uq_coupons_code_normalized"),
        CheckConstraint(
            "discount_type IN ('percentage', 'fixed_amount', 'fixed')",
            name="ck_coupons_discount_type",
        ),
        CheckConstraint(
            "discount_value > 0", name="ck_coupons_discount_value_positive"
        ),
        CheckConstraint(
            "minimum_booking_amount IS NULL OR minimum_booking_amount >= 0",
            name="ck_coupons_min_booking_nonnegative",
        ),
        CheckConstraint(
            "maximum_discount_amount IS NULL OR maximum_discount_amount >= 0",
            name="ck_coupons_max_discount_nonnegative",
        ),
        CheckConstraint(
            "total_usage_limit IS NULL OR total_usage_limit >= 1",
            name="ck_coupons_total_limit_positive",
        ),
        CheckConstraint(
            "per_user_usage_limit IS NULL OR per_user_usage_limit >= 1",
            name="ck_coupons_user_limit_positive",
        ),
        CheckConstraint(
            "valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from",
            name="ck_coupons_valid_window",
        ),
        CheckConstraint(
            "currency IS NULL OR (length(currency) = 3 AND currency = upper(currency))",
            name="ck_coupons_currency",
        ),
        CheckConstraint(
            "discount_type <> 'percentage' OR discount_value <= 100",
            name="ck_coupons_percentage_max_100",
        ),
        Index("ix_coupons_active_validity", "is_active", "valid_from", "valid_until"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    code_normalized: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    discount_type: Mapped[str] = mapped_column(String(24), nullable=False)
    discount_value: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    minimum_booking_amount: Mapped[Decimal | None] = mapped_column(MONEY)
    maximum_discount_amount: Mapped[Decimal | None] = mapped_column(MONEY)
    currency: Mapped[str | None] = mapped_column(String(3))
    total_usage_limit: Mapped[int | None] = mapped_column(Integer)
    per_user_usage_limit: Mapped[int | None] = mapped_column(Integer)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    bookings: Mapped[list[Booking]] = relationship(
        back_populates="coupon", passive_deletes=True
    )
    usages: Mapped[list[CouponUsage]] = relationship(
        back_populates="coupon", passive_deletes=True
    )


class CouponUsage(TimestampMixin, Base):
    __tablename__ = "coupon_usage"
    __table_args__ = (
        UniqueConstraint(
            "coupon_id", "booking_id", name="uq_coupon_usage_coupon_booking"
        ),
        Index("ix_coupon_usage_user_coupon", "user_id", "coupon_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    coupon_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("coupons.id", ondelete="RESTRICT"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    booking_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="RESTRICT"),
        nullable=False,
    )
    discount_amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    coupon: Mapped[Coupon] = relationship(back_populates="usages")
    booking: Mapped[Booking] = relationship(back_populates="coupon_usage")


class Inquiry(TimestampMixin, Base):
    __tablename__ = "inquiries"
    __table_args__ = (
        CheckConstraint(
            "status IN ('new', 'contacted', 'follow_up', 'converted', 'closed', 'in_progress', 'resolved')",
            name="ck_inquiries_status",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="ck_inquiries_priority",
        ),
        CheckConstraint(
            "source IN ('contact_form', 'package', 'destination', 'whatsapp', 'other')",
            name="ck_inquiries_source",
        ),
        Index("ix_inquiries_status_created_at", "status", "created_at"),
        Index("ix_inquiries_user_id", "user_id"),
        Index("ix_inquiries_assigned_to", "assigned_to_user_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    package_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("packages.id", ondelete="SET NULL")
    )
    destination_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("destinations.id", ondelete="SET NULL")
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="new"
    )
    priority: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="medium"
    )
    assigned_to_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    source: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="contact_form"
    )

    user: Mapped[User | None] = relationship(foreign_keys=[user_id])
    package: Mapped[Package | None] = relationship(foreign_keys=[package_id])
    destination: Mapped[Destination | None] = relationship(
        foreign_keys=[destination_id]
    )
    assigned_to: Mapped[User | None] = relationship(foreign_keys=[assigned_to_user_id])


class InternalNote(TimestampMixin, Base):
    """Staff-only internal notes for operational entities (bookings, customers, inquiries, departures).

    Confidentiality Rule:
    Internal notes are strictly restricted to staff, manager, admin, and super_admin.
    They must NEVER appear in customer-facing APIs, portal dashboards, confirmations, vouchers,
    receipts, emails, or WhatsApp dispatches.
    """

    __tablename__ = "internal_notes"
    __table_args__ = (
        CheckConstraint(
            "entity_type IN ('booking', 'customer', 'inquiry', 'departure')",
            name="ck_internal_notes_entity_type",
        ),
        Index("ix_internal_notes_entity", "entity_type", "entity_id", "created_at"),
        Index("ix_internal_notes_author", "author_user_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    author_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    note: Mapped[str] = mapped_column(Text, nullable=False)

    author: Mapped[User] = relationship(foreign_keys=[author_user_id])


class BankAccount(TimestampMixin, Base):
    """Authoritative administrative and customer-facing bank account for wire transfers and cash payments."""

    __tablename__ = "bank_accounts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'inactive')",
            name="ck_bank_accounts_status",
        ),
        CheckConstraint(
            "account_type IN ('Current', 'Savings', 'current', 'savings')",
            name="ck_bank_accounts_type",
        ),
        Index("ix_bank_accounts_status", "status"),
        Index("ix_bank_accounts_is_default", "is_default"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    account_holder_name: Mapped[str] = mapped_column(String(120), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=False)
    branch_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_type: Mapped[str] = mapped_column(String(30), nullable=False, default="Current")
    upi_id: Mapped[str | None] = mapped_column(String(100))
    swift_code: Mapped[str | None] = mapped_column(String(20))
    bank_address: Mapped[str | None] = mapped_column(String(255))
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    transfer_instructions: Mapped[str | None] = mapped_column(Text)
    branch_cash_instructions: Mapped[str | None] = mapped_column(Text)
    effective_date: Mapped[date | None] = mapped_column(Date)
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    updated_by: Mapped[User | None] = relationship(foreign_keys=[updated_by_user_id])


from app.models.catalog import BestOffer, Destination, Package, PackageDeparture, Review
from app.models.user import User
