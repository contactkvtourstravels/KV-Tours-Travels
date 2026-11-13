"""Tests for Phase 7 Public Website APIs.

Verifies:
- Public site settings endpoint (Coimbatore location, WhatsApp config)
- Public inquiry submission (contact form, custom trip planner)
- Public departures listing (filtering open, upcoming, published packages)
- Public package detail with add-ons and itinerary
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.models.catalog import Destination, Package, PackageDeparture
from app.models.commerce import AddOn, Inquiry


def test_public_settings_endpoint(client, db_session) -> None:
    resp = client.get("/api/v1/settings")
    assert resp.status_code == 200
    assert "public" in resp.headers.get("Cache-Control", "")
    assert "s-maxage" in resp.headers.get("Cache-Control", "")
    data = resp.json()
    assert data["agency_name"] in ("The Wild Route", "Wild Route", "The Wild Root", "Wild Root", "KV Tours & Travels")
    assert any(loc in data["agency_location"] for loc in ("Coimbatore", "India", "Kerala"))
    assert "whatsapp_number" in data
    assert data["currency"] == "INR"


def test_public_inquiry_submission(client, db_session) -> None:
    # 1. Submit general contact inquiry
    inq_resp = client.post(
        "/api/v1/inquiries",
        json={
            "name": "Kavitha Raman",
            "email": "kavitha@example.com",
            "phone": "+91 98420 12345",
            "message": "Interested in a customized family tour package from Coimbatore.",
            "source": "contact_form",
        },
    )
    assert inq_resp.status_code == 201
    inq_data = inq_resp.json()
    assert inq_data["status"] == "new"
    assert "Coimbatore travel concierge" in inq_data["message"]

    # Verify record in database
    db_inq = db_session.execute(
        select(Inquiry).where(Inquiry.email == "kavitha@example.com")
    ).scalar_one_or_none()
    assert db_inq is not None
    assert db_inq.name == "Kavitha Raman"
    assert db_inq.source == "contact_form"

    # 2. Submit custom trip enquiry linked to destination
    dest = Destination(
        name="Switzerland",
        slug="switzerland-alps",
        country="Switzerland",
        is_published=True,
    )
    db_session.add(dest)
    db_session.commit()

    dest_inq = client.post(
        "/api/v1/inquiries",
        json={
            "name": "Suresh Babu",
            "email": "suresh@example.com",
            "destination_id": str(dest.id),
            "message": "Custom trip for 4 adults in May 2027.",
            "source": "other",
        },
    )
    assert dest_inq.status_code == 201


def test_public_departures_listing(client, db_session) -> None:
    dest = Destination(
        name="Georgia Caucasus",
        slug="georgia-caucasus",
        country="Georgia",
        is_published=True,
    )
    db_session.add(dest)
    db_session.flush()

    pkg = Package(
        destination_id=dest.id,
        name="Tbilisi & Kazbegi Explorer",
        slug="tbilisi-kazbegi-explorer",
        base_price=Decimal("49000.00"),
        currency="INR",
        duration_days=6,
        duration_nights=5,
        is_published=True,
    )
    db_session.add(pkg)
    db_session.flush()

    today = datetime.now(timezone.utc).date()
    dep1 = PackageDeparture(
        package_id=pkg.id,
        departure_date=today + timedelta(days=30),
        return_date=today + timedelta(days=36),
        total_capacity=18,
        available_capacity=18,
        reserved_capacity=0,
        special_price=Decimal("47000.00"),
        currency="INR",
        status="open",
    )
    db_session.add(dep1)

    # Add an active AddOn
    addon = AddOn(
        name="Travel Insurance Gold",
        description="Comprehensive medical and cancellation cover.",
        price=Decimal("1500.00"),
        currency="INR",
        is_active=True,
    )
    db_session.add(addon)
    db_session.commit()

    # List public departures
    dep_resp = client.get("/api/v1/departures")
    assert dep_resp.status_code == 200
    departures = dep_resp.json()
    assert len(departures) >= 1
    found = next(
        (d for d in departures if d["package_slug"] == "tbilisi-kazbegi-explorer"), None
    )
    assert found is not None
    assert found["destination_name"] == "Georgia Caucasus"
    assert found["available_capacity"] == 18

    # Check package detail has add_ons
    pkg_resp = client.get(f"/api/v1/packages/{pkg.slug}")
    assert pkg_resp.status_code == 200
    pkg_data = pkg_resp.json()
    assert "add_ons" in pkg_data
    assert any(a["name"] == "Travel Insurance Gold" for a in pkg_data["add_ons"])

    # Check dedicated public add-ons catalog endpoint
    addon_resp = client.get("/api/v1/add-ons")
    assert addon_resp.status_code == 200
    addons_list = addon_resp.json()
    assert len(addons_list) >= 1
    assert any(a["name"] == "Travel Insurance Gold" for a in addons_list)

    # Check consolidated public home feed endpoint
    feed_resp = client.get("/api/v1/public/home-feed")
    assert feed_resp.status_code == 200
    feed_data = feed_resp.json()
    assert "destinations" in feed_data
    assert "packages" in feed_data
    assert "departures" in feed_data
    assert "settings" in feed_data
    assert "content" in feed_data

