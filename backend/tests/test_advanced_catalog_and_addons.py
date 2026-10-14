"""Comprehensive automated tests for advanced destination, package, add-on scope isolation, and settings."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.catalog import Destination, Package, PackageDeparture
from app.models.commerce import User
from app.schemas.admin import (
    AddOnCreateRequest,
    AdminSiteSettingsUpdateRequest,
    DestinationCreateRequest,
    DestinationUpdateRequest,
    PackageCreateRequest,
)
from app.schemas.booking import BookingAddOnSelect, PriceCalculationRequest
from app.services.admin.add_on_service import create_add_on
from app.services.admin.destination_service import (
    create_destination,
    update_destination,
)
from app.services.admin.package_service import create_package
from app.services.admin.settings_service import update_admin_settings
from app.services.booking_service import BookingService
from app.services.catalog_service import (
    get_eligible_add_ons_for_package,
    get_public_destination_by_slug,
    get_public_package_by_slug,
    get_public_settings,
)


def _create_test_admin(db: Session) -> User:
    email = f"admin_{uuid4().hex[:8]}@kvtours.in"
    admin = User(
        email=email,
        email_normalized=email.lower(),
        password_hash="hashed_pw",
        first_name="Admin",
        last_name="Tester",
    )
    db.add(admin)
    db.flush()
    return admin


# ==============================================================================
# PHASE 3: Destination Advanced Management Tests
# ==============================================================================


def test_destination_rich_fields_crud_and_public_sync(db_session: Session) -> None:
    admin = _create_test_admin(db_session)

    # 1. Create Destination with rich highlights, travel guide, FAQs, category, and SEO
    highlights = [
        {
            "title": "Snorkeling at Coral Reefs",
            "description": "Crystal clear blue waters.",
            "image_url": "https://example.com/h1.jpg",
        },
        {
            "title": "Sunset Cruise",
            "description": "Relaxing luxury catamaran tour.",
            "image_url": "https://example.com/h2.jpg",
        },
    ]
    travel_guide = {
        "best_time_to_visit": "October to April",
        "recommended_duration": "5 Days / 4 Nights",
        "local_language": "Malayalam, English",
        "currency": "INR",
        "time_zone": "IST (UTC+5:30)",
        "weather_info": "Tropical maritime climate",
    }
    faqs = [
        {
            "question": "Do I need a permit for Lakshadweep?",
            "answer": "Yes, permits are arranged by KV Tours & Travels.",
        },
    ]

    create_payload = DestinationCreateRequest(
        name="Lakshadweep Islands Test",
        slug="lakshadweep-islands-test",
        country="India",
        region="Arabian Sea",
        state_or_city="Kavaratti",
        category="Islands & Beaches",
        travel_type="Luxury Leisure",
        cover_image_url="https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f",
        display_order=1,
        highlights_json=highlights,
        travel_guide_json=travel_guide,
        faqs_json=faqs,
        social_image_url="https://example.com/social.jpg",
        is_featured=True,
        is_published=True,
        seo_title="Explore Lakshadweep Islands | KV Tours & Travels",
        seo_description="Handcrafted Lakshadweep holiday packages from Coimbatore.",
    )

    dest = create_destination(db_session, create_payload, admin.id)
    assert dest.id is not None
    assert dest.name == "Lakshadweep Islands Test"
    assert dest.state_or_city == "Kavaratti"
    assert dest.category == "Islands & Beaches"
    assert dest.travel_type == "Luxury Leisure"
    assert dest.display_order == 1
    assert dest.highlights_json == highlights
    assert dest.travel_guide_json == travel_guide
    assert dest.faqs_json == faqs
    assert dest.social_image_url == "https://example.com/social.jpg"

    # 2. Verify public view reflects all structured content without code changes
    public_dest = get_public_destination_by_slug(db_session, "lakshadweep-islands-test")
    assert public_dest.name == "Lakshadweep Islands Test"
    assert public_dest.state_or_city == "Kavaratti"
    assert public_dest.category == "Islands & Beaches"
    assert len(public_dest.highlights) == 2
    assert public_dest.highlights[0]["title"] == "Snorkeling at Coral Reefs"
    assert public_dest.travel_guide["best_time_to_visit"] == "October to April"
    assert len(public_dest.faqs) == 1
    assert public_dest.faqs[0]["question"] == "Do I need a permit for Lakshadweep?"

    # 3. Update destination highlights and unpublish
    update_payload = DestinationUpdateRequest(
        highlights_json=[
            {"title": "Deep Sea Scuba Diving", "description": "Certified PADI divers."}
        ],
        is_published=False,
    )
    updated = update_destination(db_session, dest.id, update_payload, admin.id)
    assert len(updated.highlights_json) == 1
    assert updated.highlights_json[0]["title"] == "Deep Sea Scuba Diving"
    assert updated.is_published is False

    # 4. Verify unpublished destination is hidden from public API
    try:
        get_public_destination_by_slug(db_session, "lakshadweep-islands-test")
        raise AssertionError("Should have raised 404 for unpublished destination")
    except ApiError as e:
        assert "not found" in str(e).lower() or getattr(e, "status_code", None) == 404


# ==============================================================================
# PHASE 4: Package Advanced Management Tests
# ==============================================================================


def test_package_rich_details_inclusions_and_pricing(db_session: Session) -> None:
    admin = _create_test_admin(db_session)

    dest = Destination(
        name="Maldives Luxury",
        slug=f"maldives-luxury-{uuid4().hex[:6]}",
        country="Maldives",
        is_published=True,
    )
    db_session.add(dest)
    db_session.flush()

    inclusions = [
        "Return speedboat transfers",
        "Overwater villa accommodation",
        "Daily gourmet breakfast and dinner",
        "Guided snorkeling excursion",
    ]
    exclusions = [
        "International flight tickets",
        "Alcoholic beverages outside meal plan",
        "Personal travel insurance",
    ]

    create_pkg_payload = PackageCreateRequest(
        destination_id=dest.id,
        name="Maldives Overwater Paradise",
        slug=f"maldives-overwater-{uuid4().hex[:6]}",
        short_description="5-star overwater villa luxury with turquoise lagoon.",
        base_price=Decimal("125000.00"),
        currency="INR",
        duration_days=5,
        duration_nights=4,
        minimum_travellers=1,
        maximum_travellers=6,
        category="Honeymoon & Romantic",
        travel_type="Ultra Luxury",
        difficulty_level="Relaxed",
        departure_location="Male International Airport",
        cover_image_url="https://images.unsplash.com/photo-1514282401047-d79a71a590e8",
        inclusions_json=inclusions,
        exclusions_json=exclusions,
        child_price=Decimal("65000.00"),
        infant_price=Decimal("15000.00"),
        single_room_supplement=Decimal("35000.00"),
        booking_cutoff_days=3,
        cancellation_policy="Full refund up to 14 days before departure.",
        is_featured=True,
        is_published=True,
    )

    pkg = create_package(db_session, create_pkg_payload, admin.id)
    assert pkg.id is not None
    assert pkg.inclusions_json == inclusions
    assert pkg.exclusions_json == exclusions
    assert pkg.child_price == Decimal("65000.00")
    assert pkg.infant_price == Decimal("15000.00")
    assert pkg.single_room_supplement == Decimal("35000.00")
    assert pkg.booking_cutoff_days == 3
    assert pkg.cancellation_policy == "Full refund up to 14 days before departure."

    # Verify public package detail exposes inclusions, exclusions, and tiered pricing
    pub_pkg = get_public_package_by_slug(db_session, pkg.slug)
    assert pub_pkg.name == "Maldives Overwater Paradise"
    assert pub_pkg.inclusions == inclusions
    assert pub_pkg.exclusions == exclusions
    assert pub_pkg.child_price == Decimal("65000.00")
    assert pub_pkg.cancellation_policy == "Full refund up to 14 days before departure."


# ==============================================================================
# PHASE 5: Add-On Applicability Scope & Isolation Tests (CRITICAL)
# ==============================================================================


def test_addon_applicability_scope_and_isolation(db_session: Session) -> None:
    admin = _create_test_admin(db_session)

    # Setup Destinations
    dest_bali = Destination(
        name="Bali",
        slug=f"bali-{uuid4().hex[:6]}",
        country="Indonesia",
        is_published=True,
    )
    dest_swiss = Destination(
        name="Switzerland",
        slug=f"swiss-{uuid4().hex[:6]}",
        country="Switzerland",
        is_published=True,
    )
    db_session.add_all([dest_bali, dest_swiss])
    db_session.flush()

    # Setup Packages
    pkg_bali_a = Package(
        destination_id=dest_bali.id,
        name="Bali Highlights",
        slug=f"bali-highlights-{uuid4().hex[:6]}",
        base_price=Decimal("45000.00"),
        currency="INR",
        duration_days=5,
        duration_nights=4,
        is_published=True,
    )
    pkg_bali_b = Package(
        destination_id=dest_bali.id,
        name="Bali Romantic Retreat",
        slug=f"bali-romantic-{uuid4().hex[:6]}",
        base_price=Decimal("60000.00"),
        currency="INR",
        duration_days=6,
        duration_nights=5,
        is_published=True,
    )
    pkg_swiss_c = Package(
        destination_id=dest_swiss.id,
        name="Swiss Alps Panoramic",
        slug=f"swiss-alps-{uuid4().hex[:6]}",
        base_price=Decimal("180000.00"),
        currency="INR",
        duration_days=7,
        duration_nights=6,
        is_published=True,
    )
    db_session.add_all([pkg_bali_a, pkg_bali_b, pkg_swiss_c])
    db_session.flush()

    # 1. Create Add-on 1: Global (All Packages)
    addon_global = create_add_on(
        db_session,
        AddOnCreateRequest(
            name="Travel Insurance Comprehensive",
            price=Decimal("1500.00"),
            applicability_scope="all_packages",
            price_type="per_traveller",
            min_quantity=1,
            max_quantity=10,
        ),
        admin.id,
    )

    # 2. Create Add-on 2: Specific to Bali Destination (Selected Destinations)
    create_add_on(
        db_session,
        AddOnCreateRequest(
            name="Nusa Penida Speedboat Transfer",
            price=Decimal("3500.00"),
            applicability_scope="selected_destinations",
            destination_ids=[dest_bali.id],
            price_type="per_traveller",
        ),
        admin.id,
    )

    # 3. Create Add-on 3: Single Package (Only pkg_bali_a)
    addon_single_pkg = create_add_on(
        db_session,
        AddOnCreateRequest(
            name="Ubud Floating Breakfast Experience",
            price=Decimal("2500.00"),
            applicability_scope="single_package",
            package_ids=[pkg_bali_a.id],
            price_type="per_booking",
        ),
        admin.id,
    )

    # 4. Create Add-on 4: Selected Packages (Swiss pkg_swiss_c only)
    addon_swiss_pkg = create_add_on(
        db_session,
        AddOnCreateRequest(
            name="Jungfraujoch Top of Europe Rail Pass",
            price=Decimal("18500.00"),
            applicability_scope="selected_packages",
            package_ids=[pkg_swiss_c.id],
            price_type="per_traveller",
        ),
        admin.id,
    )

    # TEST ISOLATION ON PUBLIC QUERIES:
    # Package Bali A should get: Global, Bali Dest, Single Pkg (Ubud)
    bali_a_addons = get_eligible_add_ons_for_package(
        db_session, pkg_bali_a.id, pkg_bali_a.destination_id
    )
    bali_a_addon_names = {a.name for a in bali_a_addons}
    assert "Travel Insurance Comprehensive" in bali_a_addon_names
    assert "Nusa Penida Speedboat Transfer" in bali_a_addon_names
    assert "Ubud Floating Breakfast Experience" in bali_a_addon_names
    assert (
        "Jungfraujoch Top of Europe Rail Pass" not in bali_a_addon_names
    )  # Must NOT leak Swiss addon!

    # Package Bali B should get: Global, Bali Dest (NOT Ubud single package!)
    bali_b_addons = get_eligible_add_ons_for_package(
        db_session, pkg_bali_b.id, pkg_bali_b.destination_id
    )
    bali_b_addon_names = {a.name for a in bali_b_addons}
    assert "Travel Insurance Comprehensive" in bali_b_addon_names
    assert "Nusa Penida Speedboat Transfer" in bali_b_addon_names
    assert (
        "Ubud Floating Breakfast Experience" not in bali_b_addon_names
    )  # Must NOT leak single package addon!
    assert "Jungfraujoch Top of Europe Rail Pass" not in bali_b_addon_names

    # Package Swiss C should get: Global, Swiss Pkg (NOT Bali Dest, NOT Ubud)
    swiss_c_addons = get_eligible_add_ons_for_package(
        db_session, pkg_swiss_c.id, pkg_swiss_c.destination_id
    )
    swiss_c_addon_names = {a.name for a in swiss_c_addons}
    assert "Travel Insurance Comprehensive" in swiss_c_addon_names
    assert "Jungfraujoch Top of Europe Rail Pass" in swiss_c_addon_names
    assert "Nusa Penida Speedboat Transfer" not in swiss_c_addon_names
    assert "Ubud Floating Breakfast Experience" not in swiss_c_addon_names

    # TEST SERVER-SIDE PRICE CALCULATION & REJECTION:
    dep = PackageDeparture(
        package_id=pkg_swiss_c.id,
        departure_date=datetime.now(timezone.utc).date() + timedelta(days=30),
        total_capacity=20,
        available_capacity=20,
        currency="INR",
        status="open",
    )
    db_session.add(dep)
    db_session.flush()

    # Attempt to apply Bali add-on to Swiss package -> Must be REJECTED with 400 Bad Request
    illegal_calc_request = PriceCalculationRequest(
        package_id=pkg_swiss_c.id,
        departure_id=dep.id,
        number_of_travellers=2,
        add_ons=[
            BookingAddOnSelect(
                add_on_id=addon_single_pkg.id, quantity=1
            ),  # Ubud breakfast
        ],
    )
    try:
        BookingService.calculate_price(db_session, illegal_calc_request)
        raise AssertionError("Server-side checkout must reject ineligible add-ons!")
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "not applicable" in exc.detail

    # Legal price calculation with per_traveller Swiss addon + Global addon
    legal_calc_request = PriceCalculationRequest(
        package_id=pkg_swiss_c.id,
        departure_id=dep.id,
        number_of_travellers=2,
        add_ons=[
            BookingAddOnSelect(
                add_on_id=addon_global.id, quantity=1
            ),  # 1500 * 2 = 3000
            BookingAddOnSelect(
                add_on_id=addon_swiss_pkg.id, quantity=1
            ),  # 18500 * 2 = 37000
        ],
    )
    pricing = BookingService.calculate_price(db_session, legal_calc_request)
    # 2 travellers * 180000 = 360000 package subtotal
    # Addons: 3000 + 37000 = 40000
    assert pricing.package_subtotal == Decimal("360000.00")
    assert pricing.add_ons_subtotal == Decimal("40000.00")
    assert pricing.subtotal == Decimal("400000.00")


# ==============================================================================
# PHASE 6: Centralized Communication & Settings Tests
# ==============================================================================


def test_centralized_whatsapp_email_and_business_settings(db_session: Session) -> None:
    from app.models.content import SiteSetting

    admin = _create_test_admin(db_session)

    try:
        # 1. Update WhatsApp click-to-chat, Cloud API secrets, Email, and Business Profile
        update_payload = AdminSiteSettingsUpdateRequest(
            agency_name="KV Tours & Travels Coimbatore",
            whatsapp_number="9876543210",
            whatsapp_country_code="+91",
            whatsapp_prefilled_message="Namaste KV Tours, please help me plan a family trip.",
            whatsapp_enabled=True,
            whatsapp_show_on_homepage=True,
            whatsapp_show_on_footer=True,
            whatsapp_show_on_package_pages=True,
            whatsapp_show_on_contact_page=True,
            whatsapp_cloud_api_enabled=True,
            whatsapp_phone_number_id="109876543212345",
            whatsapp_business_account_id="987654321987654",
            whatsapp_api_version="v19.0",
            whatsapp_access_token="EAAGsecret_meta_token_value_xyz123",
            email_sender_name="KV Concierge",
            email_sender_email="concierge@kvtours.in",
            email_booking_confirmation_enabled=True,
            email_inquiry_ack_enabled=True,
            email_payment_receipt_enabled=True,
            secondary_phone="+91 422 2490000",
            business_hours="Mon - Sat: 9:00 AM - 7:30 PM",
            facebook_url="https://facebook.com/kvtourstravels",
            time_zone="Asia/Kolkata",
        )

        admin_settings = update_admin_settings(db_session, update_payload, admin.id)

        # 2. Verify server-side secret masking: full token is NEVER returned
        assert admin_settings.whatsapp_access_token_configured is True
        assert admin_settings.whatsapp_access_token_masked is not None
        assert "EAAG" in admin_settings.whatsapp_access_token_masked
        assert (
            "****" in admin_settings.whatsapp_access_token_masked
            or "..." in admin_settings.whatsapp_access_token_masked
        )
        assert (
            "EAAGsecret_meta_token_value_xyz123"
            not in admin_settings.whatsapp_access_token_masked
        )

        # 3. Update without passing whatsapp_access_token: secret must be PRESERVED
        second_update = AdminSiteSettingsUpdateRequest(
            agency_name="KV Tours & Travels Elite"
        )
        re_updated = update_admin_settings(db_session, second_update, admin.id)
        assert re_updated.agency_name == "KV Tours & Travels Elite"
        assert re_updated.whatsapp_access_token_configured is True

        # 4. Verify public settings reflect the updated WhatsApp number, country code, and prefilled text
        pub_settings = get_public_settings(db_session)
        assert pub_settings.agency_name == "KV Tours & Travels Elite"
        assert pub_settings.whatsapp_number == "9876543210"
        assert pub_settings.whatsapp_country_code == "+91"
        assert (
            pub_settings.whatsapp_prefilled_message
            == "Namaste KV Tours, please help me plan a family trip."
        )
        assert pub_settings.whatsapp_enabled is True
        assert pub_settings.secondary_phone == "+91 422 2490000"
    finally:
        db_session.query(SiteSetting).delete()
        db_session.commit()
