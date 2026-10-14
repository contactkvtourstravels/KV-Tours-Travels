"""Service for managing package associations with hotels and activities."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ApiError
from app.models.catalog import (
    Activity,
    Hotel,
    Package,
    PackageActivity,
    PackageHotel,
)
from app.schemas.admin import (
    PackageActivityResponse,
    PackageHotelResponse,
)
from app.services.admin.audit_service import record_audit_log


def list_package_hotels(db: Session, package_id: UUID) -> list[PackageHotelResponse]:
    pkg = db.execute(
        select(Package).where(Package.id == package_id, Package.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package {package_id} not found.",
        )

    links = (
        db.execute(
            select(PackageHotel)
            .options(joinedload(PackageHotel.hotel))
            .where(PackageHotel.package_id == package_id)
        )
        .scalars()
        .all()
    )

    return [
        PackageHotelResponse(
            id=l.id,
            package_id=l.package_id,
            hotel_id=l.hotel_id,
            hotel_name=l.hotel.name if l.hotel else "Unknown Hotel",
            star_rating=l.hotel.star_rating if l.hotel else None,
            address=l.hotel.address if l.hotel else None,
        )
        for l in links
    ]


def bind_package_hotel(
    db: Session,
    package_id: UUID,
    hotel_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageHotelResponse:
    pkg = db.execute(
        select(Package).where(Package.id == package_id, Package.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package {package_id} not found.",
        )

    hotel = db.execute(
        select(Hotel).where(Hotel.id == hotel_id, Hotel.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not hotel:
        raise ApiError(
            status_code=404,
            code="HOTEL_NOT_FOUND",
            message=f"Active hotel {hotel_id} not found.",
        )

    existing = db.execute(
        select(PackageHotel).where(
            PackageHotel.package_id == package_id,
            PackageHotel.hotel_id == hotel_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise ApiError(
            status_code=409,
            code="HOTEL_ALREADY_LINKED",
            message="Hotel is already linked to this package.",
        )

    link = PackageHotel(package_id=package_id, hotel_id=hotel_id)
    db.add(link)
    db.flush()

    record_audit_log(
        db=db,
        action="package_hotel_linked",
        entity_type="package_hotel",
        entity_id=str(link.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "hotel_id": str(hotel_id),
            "hotel_name": hotel.name,
        },
    )
    db.commit()

    return PackageHotelResponse(
        id=link.id,
        package_id=link.package_id,
        hotel_id=link.hotel_id,
        hotel_name=hotel.name,
        star_rating=hotel.star_rating,
        address=hotel.address,
    )


def unbind_package_hotel(
    db: Session,
    package_id: UUID,
    hotel_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> None:
    link = db.execute(
        select(PackageHotel).where(
            PackageHotel.package_id == package_id,
            PackageHotel.hotel_id == hotel_id,
        )
    ).scalar_one_or_none()
    if not link:
        raise ApiError(
            status_code=404,
            code="LINK_NOT_FOUND",
            message="Hotel is not linked to this package.",
        )

    record_audit_log(
        db=db,
        action="package_hotel_unlinked",
        entity_type="package_hotel",
        entity_id=str(link.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "hotel_id": str(hotel_id),
        },
    )
    db.delete(link)
    db.commit()


def list_package_activities(
    db: Session, package_id: UUID
) -> list[PackageActivityResponse]:
    pkg = db.execute(
        select(Package).where(Package.id == package_id, Package.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package {package_id} not found.",
        )

    links = (
        db.execute(
            select(PackageActivity)
            .options(joinedload(PackageActivity.activity))
            .where(PackageActivity.package_id == package_id)
        )
        .scalars()
        .all()
    )

    return [
        PackageActivityResponse(
            id=l.id,
            package_id=l.package_id,
            activity_id=l.activity_id,
            activity_name=l.activity.name if l.activity else "Unknown Activity",
            category=l.activity.category if l.activity else None,
            duration_minutes=l.activity.duration_minutes if l.activity else None,
        )
        for l in links
    ]


def bind_package_activity(
    db: Session,
    package_id: UUID,
    activity_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageActivityResponse:
    pkg = db.execute(
        select(Package).where(Package.id == package_id, Package.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package {package_id} not found.",
        )

    act = db.execute(
        select(Activity).where(
            Activity.id == activity_id, Activity.deleted_at.is_(None)
        )
    ).scalar_one_or_none()
    if not act:
        raise ApiError(
            status_code=404,
            code="ACTIVITY_NOT_FOUND",
            message=f"Active activity {activity_id} not found.",
        )

    existing = db.execute(
        select(PackageActivity).where(
            PackageActivity.package_id == package_id,
            PackageActivity.activity_id == activity_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise ApiError(
            status_code=409,
            code="ACTIVITY_ALREADY_LINKED",
            message="Activity is already linked to this package.",
        )

    link = PackageActivity(package_id=package_id, activity_id=activity_id)
    db.add(link)
    db.flush()

    record_audit_log(
        db=db,
        action="package_activity_linked",
        entity_type="package_activity",
        entity_id=str(link.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "activity_id": str(activity_id),
            "activity_name": act.name,
        },
    )
    db.commit()

    return PackageActivityResponse(
        id=link.id,
        package_id=link.package_id,
        activity_id=link.activity_id,
        activity_name=act.name,
        category=act.category,
        duration_minutes=act.duration_minutes,
    )


def unbind_package_activity(
    db: Session,
    package_id: UUID,
    activity_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> None:
    link = db.execute(
        select(PackageActivity).where(
            PackageActivity.package_id == package_id,
            PackageActivity.activity_id == activity_id,
        )
    ).scalar_one_or_none()
    if not link:
        raise ApiError(
            status_code=404,
            code="LINK_NOT_FOUND",
            message="Activity is not linked to this package.",
        )

    record_audit_log(
        db=db,
        action="package_activity_unlinked",
        entity_type="package_activity",
        entity_id=str(link.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "activity_id": str(activity_id),
        },
    )
    db.delete(link)
    db.commit()
