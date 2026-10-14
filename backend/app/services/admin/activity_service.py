"""Service for activity and excursion catalog management."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ApiError
from app.models.catalog import Activity, Destination
from app.schemas.admin import (
    ActivityCreateRequest,
    ActivityResponse,
    ActivityUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.audit_service import record_audit_log
from app.services.admin.utils import paginate


def serialize_activity(act: Activity) -> ActivityResponse:
    dest_name = act.destination.name if act.destination else None
    return ActivityResponse(
        id=act.id,
        destination_id=act.destination_id,
        destination_name=dest_name,
        name=act.name,
        description=act.description,
        duration_minutes=act.duration_minutes,
        category=act.category,
        price=act.price,
        currency=act.currency,
        status=act.status,
        deleted_at=act.deleted_at,
        created_at=act.created_at,
        updated_at=act.updated_at,
    )


def list_activities(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    destination_id: UUID | None = None,
    category: str | None = None,
    status: str | None = None,
) -> PaginatedResponse[ActivityResponse]:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = select(Activity).options(joinedload(Activity.destination))

    if destination_id is not None:
        query = query.where(Activity.destination_id == destination_id)

    if category:
        query = query.where(func.lower(Activity.category) == category.strip().lower())

    if status:
        query = query.where(Activity.status == status.strip())
    else:
        # Default excludes deleted unless specifically requested
        query = query.where(Activity.deleted_at.is_(None))

    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.outerjoin(
            Destination, Activity.destination_id == Destination.id
        ).where(
            or_(
                func.lower(Activity.name).like(search_term),
                func.lower(Activity.category).like(search_term),
                func.lower(Activity.description).like(search_term),
                func.lower(Destination.name).like(search_term),
                func.lower(Destination.country).like(search_term),
            )
        )

    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.execute(count_query).scalar_one()

    query = (
        query.order_by(desc(Activity.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    activities = db.execute(query).unique().scalars().all()

    items = [serialize_activity(a) for a in activities]
    return paginate(items, total, page, page_size)


def get_activity_by_id(db: Session, activity_id: UUID) -> ActivityResponse:
    act = (
        db.execute(
            select(Activity)
            .options(joinedload(Activity.destination))
            .where(Activity.id == activity_id)
        )
        .unique()
        .scalar_one_or_none()
    )
    if not act:
        raise ApiError(
            status_code=404,
            code="ACTIVITY_NOT_FOUND",
            message=f"Activity {activity_id} not found.",
        )
    return serialize_activity(act)


def create_activity(
    db: Session,
    payload: ActivityCreateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> ActivityResponse:
    dest = db.execute(
        select(Destination).where(
            Destination.id == payload.destination_id, Destination.deleted_at.is_(None)
        )
    ).scalar_one_or_none()
    if not dest:
        raise ApiError(
            status_code=404,
            code="DESTINATION_NOT_FOUND",
            message=f"Active destination {payload.destination_id} not found.",
        )

    if payload.duration_minutes is not None and payload.duration_minutes <= 0:
        raise ApiError(
            status_code=400,
            code="INVALID_DURATION",
            message="Activity duration must be greater than 0 minutes.",
        )

    if payload.price is not None and payload.price < 0:
        raise ApiError(
            status_code=400,
            code="INVALID_PRICE",
            message="Activity price cannot be negative.",
        )

    activity = Activity(
        destination_id=payload.destination_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        duration_minutes=payload.duration_minutes,
        category=payload.category.strip() if payload.category else None,
        price=payload.price,
        currency=payload.currency.upper() if payload.currency else None,
        status=payload.status,
    )
    db.add(activity)
    db.flush()

    record_audit_log(
        db=db,
        action="activity_created",
        entity_type="activity",
        entity_id=str(activity.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "name": activity.name,
            "destination_id": str(activity.destination_id),
            "category": activity.category,
        },
    )
    db.commit()
    return get_activity_by_id(db, activity.id)


def update_activity(
    db: Session,
    activity_id: UUID,
    payload: ActivityUpdateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> ActivityResponse:
    act = db.execute(
        select(Activity).where(Activity.id == activity_id)
    ).scalar_one_or_none()
    if not act:
        raise ApiError(
            status_code=404,
            code="ACTIVITY_NOT_FOUND",
            message=f"Activity {activity_id} not found.",
        )

    changes: dict[str, object] = {}

    if payload.destination_id is not None:
        dest = db.execute(
            select(Destination).where(
                Destination.id == payload.destination_id,
                Destination.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if not dest:
            raise ApiError(
                status_code=404,
                code="DESTINATION_NOT_FOUND",
                message=f"Active destination {payload.destination_id} not found.",
            )
        changes["destination_id"] = {
            "old": str(act.destination_id),
            "new": str(payload.destination_id),
        }
        act.destination_id = payload.destination_id

    if payload.name is not None and payload.name.strip() != act.name:
        changes["name"] = {"old": act.name, "new": payload.name.strip()}
        act.name = payload.name.strip()

    if payload.description is not None:
        act.description = payload.description.strip() or None

    if payload.duration_minutes is not None:
        if payload.duration_minutes <= 0:
            raise ApiError(
                status_code=400,
                code="INVALID_DURATION",
                message="Activity duration must be greater than 0 minutes.",
            )
        changes["duration_minutes"] = {
            "old": act.duration_minutes,
            "new": payload.duration_minutes,
        }
        act.duration_minutes = payload.duration_minutes

    if "category" in payload.model_fields_set:
        act.category = payload.category.strip() if payload.category else None

    if payload.price is not None:
        if payload.price < 0:
            raise ApiError(
                status_code=400,
                code="INVALID_PRICE",
                message="Activity price cannot be negative.",
            )
        changes["price"] = {"old": str(act.price), "new": str(payload.price)}
        act.price = payload.price

    if payload.currency is not None:
        act.currency = payload.currency.upper() or None

    if payload.status is not None:
        changes["status"] = {"old": act.status, "new": payload.status}
        act.status = payload.status
        if payload.status == "active" and act.deleted_at is not None:
            act.deleted_at = None

    record_audit_log(
        db=db,
        action="activity_updated",
        entity_type="activity",
        entity_id=str(act.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"changes": changes},
    )
    db.commit()
    return get_activity_by_id(db, act.id)


def delete_activity(
    db: Session,
    activity_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> ActivityResponse:
    act = db.execute(
        select(Activity).where(Activity.id == activity_id)
    ).scalar_one_or_none()
    if not act:
        raise ApiError(
            status_code=404,
            code="ACTIVITY_NOT_FOUND",
            message=f"Activity {activity_id} not found.",
        )

    act.deleted_at = datetime.now(timezone.utc)
    act.status = "inactive"

    record_audit_log(
        db=db,
        action="activity_deactivated",
        entity_type="activity",
        entity_id=str(act.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"name": act.name},
    )
    db.commit()
    return get_activity_by_id(db, act.id)
