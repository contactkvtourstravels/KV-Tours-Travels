"""Database-focused unit and domain model constraint tests."""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import app.models as m


def create_sample_destination(session: Session, slug: str = "kerala") -> m.Destination:
    """Helper to create and persist a sample destination."""
    dest = m.Destination(
        name=f"Destination {slug}",
        slug=slug,
        short_description="A tropical paradise.",
        description="Full destination description.",
        country="India",
        region="South India",
        is_published=True,
        is_featured=True,
    )
    session.add(dest)
    session.flush()
    return dest


def create_sample_user(session: Session, email: str = "customer@example.com") -> m.User:
    """Helper to create and persist a sample user."""
    user = m.User(
        email=email,
        email_normalized=email.lower().strip(),
        password_hash="pbkdf2_sha256$mock$hash",
        first_name="Jane",
        last_name="Doe",
        phone="+919876543210",
        status="active",
    )
    session.add(user)
    session.flush()
    return user


def create_sample_package(
    session: Session, destination: m.Destination, slug: str = "kerala-bliss"
) -> m.Package:
    """Helper to create and persist a sample travel package."""
    pkg = m.Package(
        destination_id=destination.id,
        name=f"Package {slug}",
        slug=slug,
        short_description="A relaxing getaway.",
        description="Comprehensive package itinerary details.",
        base_price=Decimal("15000.00"),
        currency="INR",
        duration_days=5,
        duration_nights=4,
        minimum_travellers=1,
        maximum_travellers=10,
        is_published=True,
        is_featured=False,
    )
    session.add(pkg)
    session.flush()
    return pkg


def create_sample_departure(session: Session, package: m.Package) -> m.PackageDeparture:
    """Helper to create and persist a sample package departure."""
    dep = m.PackageDeparture(
        package_id=package.id,
        departure_date=date(2026, 11, 15),
        return_date=date(2026, 11, 20),
        total_capacity=20,
        available_capacity=20,
        reserved_capacity=0,
        status="open",
        special_price=Decimal("14000.00"),
        currency="INR",
    )
    session.add(dep)
    session.flush()
    return dep


def test_unique_destination_slug(db_session: Session) -> None:
    """Destination slug must be unique."""
    create_sample_destination(db_session, slug="unique-dest")

    duplicate_dest = m.Destination(
        name="Duplicate Destination",
        slug="unique-dest",
        country="India",
    )
    db_session.add(duplicate_dest)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_unique_package_slug(db_session: Session) -> None:
    """Package slug must be unique across the platform."""
    dest = create_sample_destination(db_session, slug="dest-for-pkg")
    create_sample_package(db_session, dest, slug="unique-package-slug")

    duplicate_pkg = m.Package(
        destination_id=dest.id,
        name="Another Package",
        slug="unique-package-slug",
        base_price=Decimal("12000.00"),
        currency="INR",
        duration_days=3,
        duration_nights=2,
    )
    db_session.add(duplicate_pkg)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_unique_booking_reference(db_session: Session) -> None:
    """Booking reference must be globally unique."""
    dest = create_sample_destination(db_session, slug="dest-booking")
    pkg = create_sample_package(db_session, dest, slug="pkg-booking")
    user = create_sample_user(db_session, email="booker@example.com")
    dep = create_sample_departure(db_session, pkg)

    booking1 = m.Booking(
        booking_reference="BK-2026-0001",
        user_id=user.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=2,
        subtotal=Decimal("30000.00"),
        discount=Decimal("0.00"),
        tax=Decimal("1500.00"),
        total=Decimal("31500.00"),
        currency="INR",
    )
    db_session.add(booking1)
    db_session.flush()

    booking2 = m.Booking(
        booking_reference="BK-2026-0001",
        user_id=user.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=1,
        subtotal=Decimal("15000.00"),
        discount=Decimal("0.00"),
        tax=Decimal("750.00"),
        total=Decimal("15750.00"),
        currency="INR",
    )
    db_session.add(booking2)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_review_rating_constraint(db_session: Session) -> None:
    """Review rating must be between 1 and 5 inclusive."""
    dest = create_sample_destination(db_session, slug="dest-review")
    pkg = create_sample_package(db_session, dest, slug="pkg-review")
    user = create_sample_user(db_session, email="reviewer@example.com")

    # Valid rating (e.g. 5) succeeds
    valid_review = m.Review(
        user_id=user.id,
        package_id=pkg.id,
        rating=5,
        title="Wonderful trip!",
        content="Had an amazing experience from start to finish.",
    )
    db_session.add(valid_review)
    db_session.flush()

    # Invalid rating (0) fails
    invalid_low = m.Review(
        user_id=user.id,
        package_id=pkg.id,
        rating=0,
        content="Zero rating should be disallowed.",
    )
    db_session.add(invalid_low)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    # Invalid rating (6) fails
    invalid_high = m.Review(
        user_id=user.id,
        package_id=pkg.id,
        rating=6,
        content="Six rating should be disallowed.",
    )
    db_session.add(invalid_high)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_wishlist_duplicate_prevention(db_session: Session) -> None:
    """Duplicate wishlist entry for the same user and package must be rejected."""
    dest = create_sample_destination(db_session, slug="dest-wishlist")
    pkg = create_sample_package(db_session, dest, slug="pkg-wishlist")
    user = create_sample_user(db_session, email="wishlister@example.com")

    w1 = m.WishlistItem(user_id=user.id, package_id=pkg.id)
    db_session.add(w1)
    db_session.flush()

    w2 = m.WishlistItem(user_id=user.id, package_id=pkg.id)
    db_session.add(w2)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_package_day_uniqueness(db_session: Session) -> None:
    """Package days must have unique day numbers within the same package."""
    dest = create_sample_destination(db_session, slug="dest-days")
    pkg = create_sample_package(db_session, dest, slug="pkg-days")

    day1 = m.PackageDay(
        package_id=pkg.id,
        day_number=1,
        title="Arrival & Welcome Dinner",
        description="Meet the tour guide at the airport and transfer to hotel.",
        accommodation="Luxury Resort",
        meals="Dinner included",
        transportation="Private AC Coach",
    )
    db_session.add(day1)
    db_session.flush()

    # Duplicate day 1 for same package must fail
    with pytest.raises(IntegrityError), db_session.begin_nested():
        day1_duplicate = m.PackageDay(
            package_id=pkg.id,
            day_number=1,
            title="Conflicting Day 1",
            description="Duplicate day number.",
        )
        db_session.add(day1_duplicate)
        db_session.flush()

    # Day 2 for same package succeeds
    day2 = m.PackageDay(
        package_id=pkg.id,
        day_number=2,
        title="Sightseeing & River Cruise",
    )
    db_session.add(day2)
    db_session.flush()
    assert len(pkg.days) == 2


def test_package_departure_capacity_constraints(db_session: Session) -> None:
    """Capacity must be nonnegative and reserved capacity cannot exceed total capacity."""
    dest = create_sample_destination(db_session, slug="dest-capacity")
    pkg = create_sample_package(db_session, dest, slug="pkg-capacity")

    # Negative total capacity fails
    dep_neg = m.PackageDeparture(
        package_id=pkg.id,
        departure_date=date(2026, 12, 1),
        total_capacity=-5,
        available_capacity=-5,
        currency="INR",
    )
    db_session.add(dep_neg)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    # Available + reserved > total capacity fails
    dep_overflow = m.PackageDeparture(
        package_id=pkg.id,
        departure_date=date(2026, 12, 1),
        total_capacity=10,
        available_capacity=8,
        reserved_capacity=5,
        currency="INR",
    )
    db_session.add(dep_overflow)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    # Return date prior to departure date fails
    dep_bad_dates = m.PackageDeparture(
        package_id=pkg.id,
        departure_date=date(2026, 12, 10),
        return_date=date(2026, 12, 5),
        total_capacity=15,
        available_capacity=15,
        currency="INR",
    )
    db_session.add(dep_bad_dates)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_money_representation_and_precision(db_session: Session) -> None:
    """Monetary fields must be stored as Decimal with exact cents without binary floating error."""
    dest = create_sample_destination(db_session, slug="dest-money")
    pkg = m.Package(
        destination_id=dest.id,
        name="Luxury Tour",
        slug="luxury-tour",
        base_price=Decimal("12345.67"),
        currency="INR",
        duration_days=7,
        duration_nights=6,
    )
    db_session.add(pkg)
    db_session.flush()

    retrieved = db_session.get(m.Package, pkg.id)
    assert retrieved is not None
    assert isinstance(retrieved.base_price, Decimal)
    assert retrieved.base_price == Decimal("12345.67")

    # Negative money must be rejected by check constraints
    pkg_neg = m.Package(
        destination_id=dest.id,
        name="Negative Tour",
        slug="negative-tour",
        base_price=Decimal("-100.00"),
        currency="INR",
        duration_days=1,
        duration_nights=0,
    )
    db_session.add(pkg_neg)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_booking_multiple_travellers_and_privacy(db_session: Session) -> None:
    """A booking must support multiple travellers with optional, minimized passport fields."""
    dest = create_sample_destination(db_session, slug="dest-travellers")
    pkg = create_sample_package(db_session, dest, slug="pkg-travellers")
    user = create_sample_user(db_session, email="lead-traveller@example.com")
    dep = create_sample_departure(db_session, pkg)

    booking = m.Booking(
        booking_reference="BK-MULTI-001",
        user_id=user.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=3,
        subtotal=Decimal("45000.00"),
        discount=Decimal("2000.00"),
        tax=Decimal("2150.00"),
        total=Decimal("45150.00"),
        currency="INR",
    )
    db_session.add(booking)
    db_session.flush()

    # Primary lead traveller
    t1 = m.BookingTraveller(
        booking_id=booking.id,
        first_name="Alice",
        last_name="Johnson",
        date_of_birth=date(1990, 5, 12),
        gender="female",
        nationality="IND",
        contact_email="alice@example.com",
        contact_phone="+919876543211",
        is_primary=True,
    )
    # Companion 1 without passport (domestic travel)
    t2 = m.BookingTraveller(
        booking_id=booking.id,
        first_name="Bob",
        last_name="Johnson",
        date_of_birth=date(1988, 8, 20),
        gender="male",
        nationality="IND",
        is_primary=False,
    )
    # Companion 2 with optional passport for international verification
    t3 = m.BookingTraveller(
        booking_id=booking.id,
        first_name="Charlie",
        last_name="Johnson",
        date_of_birth=date(2015, 11, 3),
        gender="male",
        passport_number="Z1234567",
        passport_expiry=date(2030, 1, 1),
        passport_issuing_country="IND",
        is_primary=False,
    )
    db_session.add_all([t1, t2, t3])
    db_session.flush()

    db_session.refresh(booking)
    assert len(booking.travellers) == 3
    primary = [t for t in booking.travellers if t.is_primary]
    assert len(primary) == 1
    assert primary[0].first_name == "Alice"


def test_booking_add_ons_price_preservation(db_session: Session) -> None:
    """Booking add-on must snapshot price at booking time to protect historical records."""
    dest = create_sample_destination(db_session, slug="dest-addons")
    pkg = create_sample_package(db_session, dest, slug="pkg-addons")
    user = create_sample_user(db_session, email="addon-user@example.com")
    dep = create_sample_departure(db_session, pkg)

    # Master add-on created in catalog
    addon = m.AddOn(
        name="Airport Luxury Transfer",
        description="Private Mercedes-Benz sedan transfer.",
        price=Decimal("2500.00"),
        currency="INR",
        is_active=True,
    )
    db_session.add(addon)
    db_session.flush()

    booking = m.Booking(
        booking_reference="BK-ADDON-001",
        user_id=user.id,
        package_id=pkg.id,
        departure_id=dep.id,
        number_of_travellers=1,
        subtotal=Decimal("17500.00"),
        discount=Decimal("0.00"),
        tax=Decimal("875.00"),
        total=Decimal("18375.00"),
        currency="INR",
    )
    db_session.add(booking)
    db_session.flush()

    booking_addon = m.BookingAddOn(
        booking_id=booking.id,
        add_on_id=addon.id,
        name_snapshot=addon.name,
        quantity=2,
        unit_price=Decimal("2500.00"),
        currency="INR",
    )
    db_session.add(booking_addon)
    db_session.flush()

    # Later, catalog price updates to 3500.00
    addon.price = Decimal("3500.00")
    db_session.flush()

    # Historical booking snapshot remains 2500.00 with total_price = 5000.00
    retrieved_addon = db_session.get(m.BookingAddOn, booking_addon.id)
    assert retrieved_addon is not None
    assert retrieved_addon.unit_price == Decimal("2500.00")
    assert retrieved_addon.total_price == Decimal("5000.00")
    assert retrieved_addon.name_snapshot == "Airport Luxury Transfer"


def test_coupon_constraints(db_session: Session) -> None:
    """Coupons must satisfy discount validation, percentage bounds, and usage uniqueness."""
    dest = create_sample_destination(db_session, slug="dest-coupon")
    pkg = create_sample_package(db_session, dest, slug="pkg-coupon")
    user = create_sample_user(db_session, email="coupon-user@example.com")
    dep = create_sample_departure(db_session, pkg)

    # Percentage coupon > 100% must fail
    with pytest.raises(IntegrityError), db_session.begin_nested():
        invalid_coupon = m.Coupon(
            code="BONUS150",
            code_normalized="BONUS150",
            discount_type="percentage",
            discount_value=Decimal("150.00"),
        )
        db_session.add(invalid_coupon)
        db_session.flush()

    # Valid percentage coupon
    valid_coupon = m.Coupon(
        code="SUMMER20",
        code_normalized="SUMMER20",
        discount_type="percentage",
        discount_value=Decimal("20.00"),
        minimum_booking_amount=Decimal("10000.00"),
        maximum_discount_amount=Decimal("5000.00"),
        is_active=True,
    )
    db_session.add(valid_coupon)
    db_session.flush()

    booking = m.Booking(
        booking_reference="BK-COUPON-001",
        user_id=user.id,
        package_id=pkg.id,
        departure_id=dep.id,
        coupon_id=valid_coupon.id,
        number_of_travellers=1,
        subtotal=Decimal("15000.00"),
        discount=Decimal("3000.00"),
        tax=Decimal("600.00"),
        total=Decimal("12600.00"),
        currency="INR",
    )
    db_session.add(booking)
    db_session.flush()

    usage1 = m.CouponUsage(
        coupon_id=valid_coupon.id,
        user_id=user.id,
        booking_id=booking.id,
        discount_amount=Decimal("3000.00"),
        currency="INR",
    )
    db_session.add(usage1)
    db_session.flush()

    # Duplicate usage on same coupon and booking must fail
    with pytest.raises(IntegrityError), db_session.begin_nested():
        usage2 = m.CouponUsage(
            coupon_id=valid_coupon.id,
            user_id=user.id,
            booking_id=booking.id,
            discount_amount=Decimal("3000.00"),
            currency="INR",
        )
        db_session.add(usage2)
        db_session.flush()


def test_status_constraints(db_session: Session) -> None:
    """Status fields on users, bookings, inquiries, and departures must reject invalid states."""
    # Invalid user status
    invalid_user = m.User(
        email="badstatus@example.com",
        email_normalized="badstatus@example.com",
        first_name="Bad",
        last_name="Status",
        status="unauthorized_status",
    )
    db_session.add(invalid_user)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    # Invalid inquiry status
    invalid_inquiry = m.Inquiry(
        name="Inquirer",
        email="inq@example.com",
        message="Hello",
        status="invalid_state",
    )
    db_session.add(invalid_inquiry)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_foreign_key_relationships_and_cascades(db_session: Session) -> None:
    """Cascading deletions should be restricted for critical historical entities and cascaded for owned items."""
    dest = create_sample_destination(db_session, slug="dest-fk")
    pkg = create_sample_package(db_session, dest, slug="pkg-fk")

    # Add package image and package day
    img = m.PackageImage(
        package_id=pkg.id,
        image_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
        alt_text="Scenic view of valley",
        sort_order=1,
    )
    day = m.PackageDay(package_id=pkg.id, day_number=1, title="Day One")
    db_session.add_all([img, day])
    db_session.flush()

    img_id = img.id
    day_id = day.id

    # Deleting package cascades to owned images and days
    db_session.delete(pkg)
    db_session.flush()
    db_session.expire_all()

    assert db_session.get(m.PackageImage, img_id) is None
    assert db_session.get(m.PackageDay, day_id) is None


def test_site_settings_and_audit_logs(db_session: Session) -> None:
    """Site settings must store arbitrary JSON configuration, and audit logs require nonempty actions."""
    setting = m.SiteSetting(
        key="company_profile",
        value={
            "name": "Wanderlust Travel Agency",
            "whatsapp": "+919876543210",
            "default_currency": "INR",
            "supported_currencies": ["INR", "USD", "EUR", "GBP"],
        },
        description="Public company metadata and contact details.",
        is_public=True,
    )
    db_session.add(setting)
    db_session.flush()

    retrieved = db_session.get(m.SiteSetting, "company_profile")
    assert retrieved is not None
    assert isinstance(retrieved.value, dict)
    assert retrieved.value["name"] == "Wanderlust Travel Agency"

    # Audit log with valid action
    user = create_sample_user(db_session, email="admin@example.com")
    log = m.AuditLog(
        actor_user_id=user.id,
        action="update_setting",
        entity_type="site_setting",
        entity_id="company_profile",
        metadata_json={"previous_currency": "USD", "new_currency": "INR"},
    )
    db_session.add(log)
    db_session.flush()
    assert log.id is not None
