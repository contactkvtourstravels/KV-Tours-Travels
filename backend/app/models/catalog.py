"""Travel catalog, reusable experiences, inventory, and customer reviews."""

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


class Destination(TimestampMixin, Base):
    __tablename__ = "destinations"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_destinations_slug"),
        Index("ix_destinations_published_featured", "is_published", "is_featured"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False)
    short_description: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[str | None] = mapped_column(String(120))
    state_or_city: Mapped[str | None] = mapped_column(String(120))
    category: Mapped[str | None] = mapped_column(String(80))
    travel_type: Mapped[str | None] = mapped_column(String(80))
    cover_image_url: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    highlights_json: Mapped[list | dict | None] = mapped_column(JSON_DOCUMENT)
    travel_guide_json: Mapped[dict | None] = mapped_column(JSON_DOCUMENT)
    faqs_json: Mapped[list | None] = mapped_column(JSON_DOCUMENT)
    social_image_url: Mapped[str | None] = mapped_column(Text)
    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    is_published: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    seo_title: Mapped[str | None] = mapped_column(String(180))
    seo_description: Mapped[str | None] = mapped_column(String(320))

    @property
    def region_or_state(self) -> str | None:
        """Alias for region matching specification."""
        return self.region

    @region_or_state.setter
    def region_or_state(self, value: str | None) -> None:
        self.region = value

    images: Mapped[list[DestinationImage]] = relationship(
        back_populates="destination",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="DestinationImage.sort_order",
    )
    packages: Mapped[list[Package]] = relationship(
        back_populates="destination", passive_deletes=True
    )
    hotels: Mapped[list[Hotel]] = relationship(
        back_populates="destination", passive_deletes=True
    )
    activities: Mapped[list[Activity]] = relationship(
        back_populates="destination", passive_deletes=True
    )


class DestinationImage(TimestampMixin, Base):
    __tablename__ = "destination_images"
    __table_args__ = (
        Index("ix_destination_images_destination_sort", "destination_id", "sort_order"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    destination_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("destinations.id", ondelete="CASCADE"),
        nullable=False,
    )
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    cloudinary_public_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    alt_text: Mapped[str] = mapped_column(String(300), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    destination: Mapped[Destination] = relationship(back_populates="images")


class Package(TimestampMixin, Base):
    __tablename__ = "packages"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_packages_slug"),
        CheckConstraint("base_price >= 0", name="ck_packages_base_price_nonnegative"),
        CheckConstraint(
            "duration_days >= 1", name="ck_packages_duration_days_positive"
        ),
        CheckConstraint(
            "duration_nights >= 0", name="ck_packages_duration_nights_nonnegative"
        ),
        CheckConstraint(
            "minimum_travellers >= 1", name="ck_packages_minimum_travellers_positive"
        ),
        CheckConstraint(
            "maximum_travellers IS NULL OR maximum_travellers >= minimum_travellers",
            name="ck_packages_traveller_range",
        ),
        currency_check(),
        Index("ix_packages_destination_published", "destination_id", "is_published"),
        Index("ix_packages_published_featured", "is_published", "is_featured"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    destination_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("destinations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), nullable=False)
    short_description: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    base_price: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_nights: Mapped[int] = mapped_column(Integer, nullable=False)
    minimum_travellers: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="1"
    )
    maximum_travellers: Mapped[int | None] = mapped_column(Integer)
    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    is_published: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    category: Mapped[str | None] = mapped_column(String(80))
    travel_type: Mapped[str | None] = mapped_column(String(80))
    difficulty_level: Mapped[str | None] = mapped_column(String(50))
    departure_location: Mapped[str | None] = mapped_column(String(120))
    cover_image_url: Mapped[str | None] = mapped_column(Text)
    inclusions_json: Mapped[list | None] = mapped_column(JSON_DOCUMENT)
    exclusions_json: Mapped[list | None] = mapped_column(JSON_DOCUMENT)
    child_price: Mapped[Decimal | None] = mapped_column(MONEY)
    infant_price: Mapped[Decimal | None] = mapped_column(MONEY)
    single_room_supplement: Mapped[Decimal | None] = mapped_column(MONEY)
    booking_cutoff_days: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("3")
    )
    cancellation_policy: Mapped[str | None] = mapped_column(Text)
    seo_title: Mapped[str | None] = mapped_column(String(180))
    seo_description: Mapped[str | None] = mapped_column(String(320))

    def __init__(self, *args, **kwargs):
        if "title" in kwargs and "name" not in kwargs:
            kwargs["name"] = kwargs.pop("title")
        if "price" in kwargs and "base_price" not in kwargs:
            kwargs["base_price"] = kwargs.pop("price")
        super().__init__(*args, **kwargs)

    @property
    def title(self) -> str:
        """Alias for name."""
        return self.name

    @title.setter
    def title(self, value: str) -> None:
        self.name = value

    @property
    def price(self) -> Decimal:
        """Alias for base_price."""
        return self.base_price

    @price.setter
    def price(self, value: Decimal) -> None:
        self.base_price = value

    @property
    def min_travellers(self) -> int:
        """Alias for minimum_travellers."""
        return self.minimum_travellers

    @min_travellers.setter
    def min_travellers(self, value: int) -> None:
        self.minimum_travellers = value

    @property
    def max_travellers(self) -> int | None:
        """Alias for maximum_travellers."""
        return self.maximum_travellers

    @max_travellers.setter
    def max_travellers(self, value: int | None) -> None:
        self.maximum_travellers = value

    destination: Mapped[Destination] = relationship(back_populates="packages")
    images: Mapped[list[PackageImage]] = relationship(
        back_populates="package",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="PackageImage.sort_order",
    )
    days: Mapped[list[PackageDay]] = relationship(
        back_populates="package",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="PackageDay.day_number",
    )
    departures: Mapped[list[PackageDeparture]] = relationship(
        back_populates="package", passive_deletes=True
    )
    wishlist_items: Mapped[list[WishlistItem]] = relationship(
        back_populates="package", passive_deletes=True
    )
    reviews: Mapped[list[Review]] = relationship(
        back_populates="package", passive_deletes=True
    )
    bookings: Mapped[list[Booking]] = relationship(
        back_populates="package", passive_deletes=True
    )
    hotel_links: Mapped[list[PackageHotel]] = relationship(
        back_populates="package", cascade="all, delete-orphan"
    )
    activity_links: Mapped[list[PackageActivity]] = relationship(
        back_populates="package", cascade="all, delete-orphan"
    )
    best_offers: Mapped[list[BestOffer]] = relationship(
        back_populates="package", cascade="all, delete-orphan", passive_deletes=True
    )


class PackageImage(TimestampMixin, Base):
    __tablename__ = "package_images"
    __table_args__ = (
        Index("ix_package_images_package_sort", "package_id", "sort_order"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    package_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    cloudinary_public_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    alt_text: Mapped[str] = mapped_column(String(300), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    package: Mapped[Package] = relationship(back_populates="images")


class PackageDay(TimestampMixin, Base):
    __tablename__ = "package_days"
    __table_args__ = (
        UniqueConstraint(
            "package_id", "day_number", name="uq_package_days_package_day"
        ),
        CheckConstraint("day_number >= 1", name="ck_package_days_day_number_positive"),
        Index("ix_package_days_package_id", "package_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    package_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    accommodation: Mapped[str | None] = mapped_column(String(500))
    meals: Mapped[str | None] = mapped_column(String(300))
    transportation: Mapped[str | None] = mapped_column(String(500))
    package: Mapped[Package] = relationship(back_populates="days")
    activity_links: Mapped[list[PackageDayActivity]] = relationship(
        back_populates="package_day", cascade="all, delete-orphan"
    )


class Hotel(TimestampMixin, Base):
    __tablename__ = "hotels"
    __table_args__ = (
        CheckConstraint(
            "star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 5)",
            name="ck_hotels_star_rating",
        ),
        Index("ix_hotels_destination_id", "destination_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    destination_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("destinations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    star_rating: Mapped[int | None] = mapped_column(Integer)
    website_url: Mapped[str | None] = mapped_column(String(2048))
    contact_phone: Mapped[str | None] = mapped_column(String(32))
    contact_email: Mapped[str | None] = mapped_column(String(320))
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    destination: Mapped[Destination] = relationship(back_populates="hotels")
    package_links: Mapped[list[PackageHotel]] = relationship(
        back_populates="hotel", passive_deletes=True
    )


class Activity(TimestampMixin, Base):
    __tablename__ = "activities"
    __table_args__ = (
        CheckConstraint(
            "duration_minutes IS NULL OR duration_minutes > 0",
            name="ck_activities_duration_positive",
        ),
        CheckConstraint(
            "price IS NULL OR price >= 0", name="ck_activities_price_nonnegative"
        ),
        currency_check(),
        Index("ix_activities_destination_status", "destination_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    destination_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("destinations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    category: Mapped[str | None] = mapped_column(String(80))
    price: Mapped[Decimal | None] = mapped_column(MONEY)
    currency: Mapped[str | None] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="active"
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    destination: Mapped[Destination] = relationship(back_populates="activities")
    package_links: Mapped[list[PackageActivity]] = relationship(
        back_populates="activity", passive_deletes=True
    )
    day_links: Mapped[list[PackageDayActivity]] = relationship(
        back_populates="activity", passive_deletes=True
    )


class PackageHotel(TimestampMixin, Base):
    __tablename__ = "package_hotels"
    __table_args__ = (
        UniqueConstraint(
            "package_id", "hotel_id", name="uq_package_hotels_package_hotel"
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    package_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    hotel_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hotels.id", ondelete="RESTRICT"), nullable=False
    )
    package: Mapped[Package] = relationship(back_populates="hotel_links")
    hotel: Mapped[Hotel] = relationship(back_populates="package_links")


class PackageActivity(TimestampMixin, Base):
    __tablename__ = "package_activities"
    __table_args__ = (
        UniqueConstraint(
            "package_id", "activity_id", name="uq_package_activities_package_activity"
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    package_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    activity_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("activities.id", ondelete="RESTRICT"),
        nullable=False,
    )
    package: Mapped[Package] = relationship(back_populates="activity_links")
    activity: Mapped[Activity] = relationship(back_populates="package_links")


class PackageDayActivity(TimestampMixin, Base):
    __tablename__ = "package_day_activities"
    __table_args__ = (
        UniqueConstraint(
            "package_day_id",
            "activity_id",
            name="uq_package_day_activities_day_activity",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    package_day_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("package_days.id", ondelete="CASCADE"),
        nullable=False,
    )
    activity_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("activities.id", ondelete="RESTRICT"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    package_day: Mapped[PackageDay] = relationship(back_populates="activity_links")
    activity: Mapped[Activity] = relationship(back_populates="day_links")


class PackageDeparture(TimestampMixin, Base):
    __tablename__ = "package_departures"
    __table_args__ = (
        CheckConstraint(
            "return_date IS NULL OR return_date >= departure_date",
            name="ck_departures_return_after_departure",
        ),
        CheckConstraint(
            "total_capacity >= 0", name="ck_departures_total_capacity_nonnegative"
        ),
        CheckConstraint(
            "available_capacity >= 0",
            name="ck_departures_available_capacity_nonnegative",
        ),
        CheckConstraint(
            "reserved_capacity >= 0", name="ck_departures_reserved_nonnegative"
        ),
        CheckConstraint(
            "available_capacity + reserved_capacity <= total_capacity",
            name="ck_departures_capacity_sum",
        ),
        CheckConstraint(
            "special_price IS NULL OR special_price >= 0",
            name="ck_departures_special_price_nonnegative",
        ),
        CheckConstraint(
            "status IN ('draft', 'open', 'closed', 'cancelled', 'sold_out')",
            name="ck_departures_status",
        ),
        currency_check(),
        UniqueConstraint("id", "package_id", name="uq_departures_id_package"),
        Index(
            "ix_departures_package_date_status",
            "package_id",
            "departure_date",
            "status",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    package_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("packages.id", ondelete="RESTRICT"),
        nullable=False,
    )
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    return_date: Mapped[date | None] = mapped_column(Date)
    total_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    available_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    reserved_capacity: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="draft"
    )
    special_price: Mapped[Decimal | None] = mapped_column(MONEY)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    booking_cutoff_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    def __init__(self, *args, **kwargs):
        if "capacity" in kwargs and "total_capacity" not in kwargs:
            kwargs["total_capacity"] = kwargs.pop("capacity")
        if "total_capacity" in kwargs and "available_capacity" not in kwargs:
            reserved = kwargs.get("reserved_capacity", 0)
            kwargs["available_capacity"] = kwargs["total_capacity"] - reserved
        if "base_price" in kwargs and "special_price" not in kwargs:
            kwargs["special_price"] = kwargs.pop("base_price")
        kwargs.pop("is_active", None)
        super().__init__(*args, **kwargs)

    @property
    def capacity(self) -> int:
        """Alias for total_capacity."""
        return self.total_capacity

    @capacity.setter
    def capacity(self, value: int) -> None:
        self.total_capacity = value

    @property
    def base_price(self) -> Decimal | None:
        """Alias for special_price."""
        return self.special_price

    @base_price.setter
    def base_price(self, value: Decimal | None) -> None:
        self.special_price = value

    @property
    def is_active(self) -> bool:
        return self.status not in ("closed", "cancelled")

    package: Mapped[Package] = relationship(back_populates="departures")
    bookings: Mapped[list[Booking]] = relationship(
        primaryjoin="PackageDeparture.id == foreign(Booking.departure_id)",
        viewonly=True,
    )


class WishlistItem(TimestampMixin, Base):
    __tablename__ = "wishlist_items"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "package_id", name="uq_wishlist_items_user_package"
        ),
        Index("ix_wishlist_items_package_id", "package_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    package_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    user: Mapped[User] = relationship(back_populates="wishlist_items")
    package: Mapped[Package] = relationship(back_populates="wishlist_items")


class Review(TimestampMixin, Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
        Index(
            "ix_reviews_package_approved_created",
            "package_id",
            "is_approved",
            "created_at",
        ),
        Index("ix_reviews_approved_featured", "is_approved", "is_featured"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    package_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("packages.id", ondelete="RESTRICT"),
        nullable=False,
    )
    booking_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "bookings.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_reviews_booking_id_bookings",
        ),
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(180))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_approved: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )

    user: Mapped[User] = relationship(back_populates="reviews")
    package: Mapped[Package] = relationship(back_populates="reviews")
    booking: Mapped[Booking | None] = relationship(back_populates="reviews")


class BestOffer(TimestampMixin, Base):
    __tablename__ = "best_offers"
    __table_args__ = (
        CheckConstraint(
            "discount_type IN ('percentage', 'fixed_amount', 'fixed')",
            name="ck_best_offers_discount_type",
        ),
        CheckConstraint(
            "discount_value > 0",
            name="ck_best_offers_discount_value_positive",
        ),
        CheckConstraint(
            "discount_type <> 'percentage' OR discount_value <= 100",
            name="ck_best_offers_percentage_max_100",
        ),
        CheckConstraint(
            "minimum_booking_amount IS NULL OR minimum_booking_amount >= 0",
            name="ck_best_offers_min_booking_nonnegative",
        ),
        CheckConstraint(
            "maximum_discount_amount IS NULL OR maximum_discount_amount >= 0",
            name="ck_best_offers_max_discount_nonnegative",
        ),
        CheckConstraint(
            "end_at IS NULL OR start_at IS NULL OR end_at >= start_at",
            name="ck_best_offers_valid_window",
        ),
        CheckConstraint(
            "status IN ('draft', 'published', 'active', 'disabled', 'archived')",
            name="ck_best_offers_status",
        ),
        Index("ix_best_offers_package_status", "package_id", "status"),
        Index("ix_best_offers_validity", "status", "start_at", "end_at"),
        Index("ix_best_offers_display_order", "display_order", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    package_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    short_description: Mapped[str | None] = mapped_column(String(500))
    discount_type: Mapped[str] = mapped_column(String(24), nullable=False)
    discount_value: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    original_price_snapshot: Mapped[Decimal | None] = mapped_column(MONEY)
    minimum_booking_amount: Mapped[Decimal | None] = mapped_column(MONEY)
    maximum_discount_amount: Mapped[Decimal | None] = mapped_column(MONEY)
    offer_label: Mapped[str | None] = mapped_column(String(100))
    badge_text: Mapped[str | None] = mapped_column(String(60))
    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="active"
    )
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    display_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )

    package: Mapped[Package] = relationship(back_populates="best_offers")
    bookings: Mapped[list[Booking]] = relationship(back_populates="offer")


from app.models.commerce import Booking
from app.models.user import User
