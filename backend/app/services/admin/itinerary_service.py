"""Service for package itinerary and day-activity management."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ApiError
from app.models.catalog import (
    Activity,
    Package,
    PackageDay,
    PackageDayActivity,
)
from app.schemas.admin import (
    PackageDayActivityResponse,
    PackageDayCreateRequest,
    PackageDayResponse,
    PackageDayUpdateRequest,
)
from app.services.admin.audit_service import record_audit_log


def serialize_package_day(day: PackageDay) -> PackageDayResponse:
    activities: list[PackageDayActivityResponse] = []
    if day.activity_links:
        for link in sorted(day.activity_links, key=lambda l: l.sort_order):
            act_name = link.activity.name if link.activity else "Unknown Activity"
            act_cat = link.activity.category if link.activity else None
            act_dur = link.activity.duration_minutes if link.activity else None
            activities.append(
                PackageDayActivityResponse(
                    id=link.id,
                    package_day_id=link.package_day_id,
                    activity_id=link.activity_id,
                    activity_name=act_name,
                    category=act_cat,
                    duration_minutes=act_dur,
                    sort_order=link.sort_order,
                )
            )

    return PackageDayResponse(
        id=day.id,
        package_id=day.package_id,
        day_number=day.day_number,
        title=day.title,
        description=day.description,
        accommodation=day.accommodation,
        meals=day.meals,
        transportation=day.transportation,
        activities=activities,
        created_at=day.created_at,
        updated_at=day.updated_at,
    )


def list_package_itinerary(db: Session, package_id: UUID) -> list[PackageDayResponse]:
    pkg = db.execute(
        select(Package).where(Package.id == package_id, Package.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package {package_id} not found.",
        )

    days = (
        db.execute(
            select(PackageDay)
            .options(
                joinedload(PackageDay.activity_links).joinedload(
                    PackageDayActivity.activity
                )
            )
            .where(PackageDay.package_id == package_id)
            .order_by(PackageDay.day_number)
        )
        .unique()
        .scalars()
        .all()
    )

    return [serialize_package_day(d) for d in days]


def create_package_day(
    db: Session,
    package_id: UUID,
    payload: PackageDayCreateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageDayResponse:
    pkg = db.execute(
        select(Package).where(Package.id == package_id, Package.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package {package_id} not found.",
        )

    # Validate day_number uniqueness within package
    existing_day = db.execute(
        select(PackageDay.id).where(
            PackageDay.package_id == package_id,
            PackageDay.day_number == payload.day_number,
        )
    ).scalar_one_or_none()
    if existing_day:
        raise ApiError(
            status_code=409,
            code="DUPLICATE_DAY_NUMBER",
            message=f"Day {payload.day_number} already exists in this package itinerary.",
        )

    day = PackageDay(
        package_id=package_id,
        day_number=payload.day_number,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        accommodation=payload.accommodation.strip() if payload.accommodation else None,
        meals=payload.meals.strip() if payload.meals else None,
        transportation=payload.transportation.strip()
        if payload.transportation
        else None,
    )
    db.add(day)
    db.flush()

    record_audit_log(
        db=db,
        action="package_day_created",
        entity_type="package_day",
        entity_id=str(day.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "day_number": day.day_number,
            "title": day.title,
        },
    )
    db.commit()

    # Re-fetch with relationships
    return get_package_day(db, package_id, day.id)


def get_package_day(db: Session, package_id: UUID, day_id: UUID) -> PackageDayResponse:
    day = (
        db.execute(
            select(PackageDay)
            .options(
                joinedload(PackageDay.activity_links).joinedload(
                    PackageDayActivity.activity
                )
            )
            .where(
                PackageDay.id == day_id,
                PackageDay.package_id == package_id,
            )
        )
        .unique()
        .scalar_one_or_none()
    )
    if not day:
        raise ApiError(
            status_code=404,
            code="DAY_NOT_FOUND",
            message=f"Itinerary day {day_id} not found in package {package_id}.",
        )
    return serialize_package_day(day)


def update_package_day(
    db: Session,
    package_id: UUID,
    day_id: UUID,
    payload: PackageDayUpdateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageDayResponse:
    day = db.execute(
        select(PackageDay).where(
            PackageDay.id == day_id,
            PackageDay.package_id == package_id,
        )
    ).scalar_one_or_none()
    if not day:
        raise ApiError(
            status_code=404,
            code="DAY_NOT_FOUND",
            message=f"Itinerary day {day_id} not found in package {package_id}.",
        )

    changes: dict[str, object] = {}

    if payload.day_number is not None and payload.day_number != day.day_number:
        # Check collision
        existing = db.execute(
            select(PackageDay.id).where(
                PackageDay.package_id == package_id,
                PackageDay.day_number == payload.day_number,
                PackageDay.id != day.id,
            )
        ).scalar_one_or_none()
        if existing:
            raise ApiError(
                status_code=409,
                code="DUPLICATE_DAY_NUMBER",
                message=f"Day {payload.day_number} already exists in this package itinerary.",
            )
        changes["day_number"] = {"old": day.day_number, "new": payload.day_number}
        day.day_number = payload.day_number

    if payload.title is not None and payload.title.strip() != day.title:
        changes["title"] = {"old": day.title, "new": payload.title.strip()}
        day.title = payload.title.strip()

    if payload.description is not None:
        day.description = payload.description.strip() or None
    if payload.accommodation is not None:
        day.accommodation = payload.accommodation.strip() or None
    if payload.meals is not None:
        day.meals = payload.meals.strip() or None
    if payload.transportation is not None:
        day.transportation = payload.transportation.strip() or None

    record_audit_log(
        db=db,
        action="package_day_updated",
        entity_type="package_day",
        entity_id=str(day.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"package_id": str(package_id), "changes": changes},
    )
    db.commit()
    return get_package_day(db, package_id, day.id)


def delete_package_day(
    db: Session,
    package_id: UUID,
    day_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> None:
    day = db.execute(
        select(PackageDay).where(
            PackageDay.id == day_id,
            PackageDay.package_id == package_id,
        )
    ).scalar_one_or_none()
    if not day:
        raise ApiError(
            status_code=404,
            code="DAY_NOT_FOUND",
            message=f"Itinerary day {day_id} not found in package {package_id}.",
        )

    record_audit_log(
        db=db,
        action="package_day_deleted",
        entity_type="package_day",
        entity_id=str(day.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"package_id": str(package_id), "day_number": day.day_number},
    )
    db.delete(day)
    db.commit()


def add_day_activity(
    db: Session,
    package_id: UUID,
    day_id: UUID,
    activity_id: UUID,
    sort_order: int,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageDayResponse:
    day = db.execute(
        select(PackageDay).where(
            PackageDay.id == day_id, PackageDay.package_id == package_id
        )
    ).scalar_one_or_none()
    if not day:
        raise ApiError(
            status_code=404,
            code="DAY_NOT_FOUND",
            message=f"Itinerary day {day_id} not found in package {package_id}.",
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

    # Check already linked
    existing = db.execute(
        select(PackageDayActivity.id).where(
            PackageDayActivity.package_day_id == day_id,
            PackageDayActivity.activity_id == activity_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise ApiError(
            status_code=409,
            code="ACTIVITY_ALREADY_LINKED",
            message="This activity is already assigned to this itinerary day.",
        )

    link = PackageDayActivity(
        package_day_id=day_id,
        activity_id=activity_id,
        sort_order=sort_order,
    )
    db.add(link)
    db.flush()

    record_audit_log(
        db=db,
        action="day_activity_added",
        entity_type="package_day_activity",
        entity_id=str(link.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "day_id": str(day_id),
            "activity_id": str(activity_id),
        },
    )
    db.commit()
    return get_package_day(db, package_id, day_id)


def remove_day_activity(
    db: Session,
    package_id: UUID,
    day_id: UUID,
    activity_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageDayResponse:
    link = db.execute(
        select(PackageDayActivity).where(
            PackageDayActivity.package_day_id == day_id,
            PackageDayActivity.activity_id == activity_id,
        )
    ).scalar_one_or_none()
    if not link:
        raise ApiError(
            status_code=404,
            code="LINK_NOT_FOUND",
            message="Activity is not linked to this itinerary day.",
        )

    record_audit_log(
        db=db,
        action="day_activity_removed",
        entity_type="package_day_activity",
        entity_id=str(link.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "day_id": str(day_id),
            "activity_id": str(activity_id),
        },
    )
    db.delete(link)
    db.commit()
    return get_package_day(db, package_id, day_id)


def reorder_package_itinerary(
    db: Session,
    package_id: UUID,
    day_ids: list[UUID],
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> list[PackageDayResponse]:
    """Atomically reorder itinerary days without unique-constraint collisions."""
    pkg = db.execute(
        select(Package).where(Package.id == package_id, Package.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package {package_id} not found.",
        )

    days = (
        db.execute(select(PackageDay).where(PackageDay.package_id == package_id))
        .scalars()
        .all()
    )
    day_map = {d.id: d for d in days}

    if len(day_ids) != len(days):
        raise ApiError(
            status_code=400,
            code="INVALID_DAY_COUNT",
            message=f"Provided {len(day_ids)} day IDs, but package has {len(days)} days.",
        )

    for did in day_ids:
        if did not in day_map:
            raise ApiError(
                status_code=400,
                code="INVALID_DAY_ID",
                message=f"Day ID {did} does not belong to package {package_id}.",
            )

    # 1. Set negative temporary day numbers to avoid unique constraint collisions
    for i, day in enumerate(days):
        day.day_number = -1000 - i
    db.flush()

    # 2. Assign new 1-indexed sequential numbers
    for idx, did in enumerate(day_ids, start=1):
        day_map[did].day_number = idx
    db.flush()

    record_audit_log(
        db=db,
        action="package_itinerary_reordered",
        entity_type="package_itinerary",
        entity_id=str(package_id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "ordered_day_ids": [str(d) for d in day_ids],
        },
    )
    db.commit()

    return list_package_itinerary(db, package_id)
