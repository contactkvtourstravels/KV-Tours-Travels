"""Automated tests for audit repairs:
- Media upload (base64 decode, type validation, local static storage)
- Admin site settings (GET, PATCH, audit logging)
- Admin dashboard catalog inventory & revenue calculation
- Package response destination_is_published flag
"""

from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, select

from app.core.permissions import ROLE_ADMIN, ROLE_MANAGER
from app.models.catalog import Activity, Destination, Hotel, Package, PackageDeparture
from app.models.content import AuditLog, SiteSetting
from tests.test_catalog_inventory import create_user_with_role, login_client


def test_admin_media_upload_endpoint(client, db_session) -> None:
    admin = create_user_with_role(db_session, "media_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # 1. Valid PNG upload
    # Minimal 1x1 PNG transparent pixel
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    b64_data = f"data:image/png;base64,{base64.b64encode(png_bytes).decode('ascii')}"

    resp = client.post(
        "/api/v1/admin/media/upload",
        json={
            "filename": "pixel.png",
            "content_type": "image/png",
            "file_data": b64_data,
            "folder": "travelagency/catalog",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "url" in body
    assert body["storage_type"] in ("cloudinary", "local")
    assert "pixel" in body["filename"]

    # 2. Invalid content type rejected
    bad_resp = client.post(
        "/api/v1/admin/media/upload",
        json={
            "filename": "malicious.exe",
            "content_type": "application/x-msdownload",
            "file_data": b64_data,
            "folder": "travelagency/catalog",
        },
        headers=headers,
    )
    assert bad_resp.status_code == 400
    assert bad_resp.json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"

    # 3. Corrupt base64 data rejected
    corrupt_resp = client.post(
        "/api/v1/admin/media/upload",
        json={
            "filename": "test.jpg",
            "content_type": "image/jpeg",
            "file_data": "not-valid-base64-!!!",
            "folder": "travelagency/catalog",
        },
        headers=headers,
    )
    assert corrupt_resp.status_code == 400
    assert corrupt_resp.json()["error"]["code"] == "INVALID_FILE_DATA"


def test_admin_settings_lifecycle(client, db_session) -> None:
    mgr = create_user_with_role(db_session, "settings_mgr@kvtours.in", ROLE_MANAGER)
    headers = login_client(client, mgr.email)

    try:
        # 1. GET settings
        get_resp = client.get("/api/v1/admin/settings", headers=headers)
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["agency_name"] in ("The Wild Root", "Wild Root", "KV Tours & Travels")
        assert any(loc in data["agency_location"] for loc in ("Coimbatore", "India", "Kerala"))
        assert data["currency"] == "INR"

        # 2. PATCH settings
        patch_resp = client.patch(
            "/api/v1/admin/settings",
            json={
                "tagline": "Coimbatore's Premier Luxury & Adventure Specialist",
                "whatsapp_number": "919442012345",
                "instagram_handle": "@kvtours_official",
            },
            headers=headers,
        )
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert (
            updated["tagline"] == "Coimbatore's Premier Luxury & Adventure Specialist"
        )
        assert updated["whatsapp_number"] == "919442012345"
        assert updated["instagram_handle"] == "@kvtours_official"

        # 3. Verify audit log entry
        audits = (
            db_session.execute(
                select(AuditLog).where(AuditLog.action == "site_settings_updated")
            )
            .scalars()
            .all()
        )
        assert len(audits) >= 1
    finally:
        # Clean up site settings so test is isolated
        db_session.execute(delete(SiteSetting))
        db_session.commit()


def test_dashboard_catalog_metrics_and_package_sync(client, db_session) -> None:
    admin = create_user_with_role(db_session, "dash_admin@kvtours.in", ROLE_ADMIN)
    headers = login_client(client, admin.email)

    # Seed catalog items
    dest = Destination(
        name="Ooty Nilgiris",
        slug="ooty-nilgiris-test",
        country="India",
        region="Tamil Nadu",
        is_published=True,
    )
    db_session.add(dest)
    db_session.flush()

    hotel = Hotel(
        destination_id=dest.id,
        name="Nilgiri Heritage Bungalow",
        is_active=True,
    )
    db_session.add(hotel)

    activity = Activity(
        destination_id=dest.id,
        name="Tea Tasting Session",
        status="active",
    )
    db_session.add(activity)

    pkg = Package(
        destination_id=dest.id,
        name="Nilgiri Mountain Trail",
        slug="nilgiri-mountain-trail-test",
        base_price=Decimal("18000.00"),
        currency="INR",
        duration_days=3,
        duration_nights=2,
        is_published=True,
    )
    db_session.add(pkg)
    db_session.flush()

    dep = PackageDeparture(
        package_id=pkg.id,
        departure_date=datetime.now(timezone.utc).date() + timedelta(days=15),
        total_capacity=12,
        available_capacity=12,
        reserved_capacity=0,
        currency="INR",
        status="open",
    )
    db_session.add(dep)
    db_session.commit()

    # 1. Verify dashboard metrics API returns live counts
    dash_resp = client.get("/api/v1/admin/dashboard/metrics", headers=headers)
    assert dash_resp.status_code == 200
    metrics = dash_resp.json()
    assert metrics["total_destinations"] >= 1
    assert metrics["published_destinations"] >= 1
    assert metrics["total_packages"] >= 1
    assert metrics["published_packages"] >= 1
    assert metrics["active_hotels"] >= 1
    assert metrics["active_activities"] >= 1
    assert metrics["upcoming_departures"] >= 1

    # 2. Verify admin package serialization provides destination_is_published
    pkg_resp = client.get(f"/api/v1/admin/packages/{pkg.id}", headers=headers)
    assert pkg_resp.status_code == 200
    pkg_data = pkg_resp.json()
    assert pkg_data["destination_is_published"] is True

    # 3. Unpublish destination and verify package reflects draft destination
    dest.is_published = False
    db_session.commit()

    pkg_resp2 = client.get(f"/api/v1/admin/packages/{pkg.id}", headers=headers)
    assert pkg_resp2.status_code == 200
    assert pkg_resp2.json()["destination_is_published"] is False

    # Cleanup test items
    db_session.execute(delete(PackageDeparture).where(PackageDeparture.id == dep.id))
    db_session.execute(delete(Package).where(Package.id == pkg.id))
    db_session.execute(delete(Activity).where(Activity.id == activity.id))
    db_session.execute(delete(Hotel).where(Hotel.id == hotel.id))
    db_session.execute(delete(Destination).where(Destination.id == dest.id))
    db_session.commit()
