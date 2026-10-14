"""Service for package departures, group trip inventory, and capacity management."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ApiError
from app.models.catalog import Package, PackageDeparture
from app.models.commerce import Booking
from app.schemas.admin import (
    PackageDepartureCreateRequest,
    PackageDepartureResponse,
    PackageDepartureUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.audit_service import record_audit_log
from app.services.admin.utils import paginate


def parse_date(date_str: str | date | None) -> date | None:
    if date_str is None:
        return None
    if isinstance(date_str, date):
        return date_str
    try:
        return date.fromisoformat(date_str.strip())
    except ValueError:
        raise ApiError(
            status_code=400,
            code="INVALID_DATE_FORMAT",
            message=f"Date '{date_str}' must be in YYYY-MM-DD format.",
        )


def serialize_departure(dep: PackageDeparture) -> PackageDepartureResponse:
    pkg_name = dep.package.name if dep.package else None
    return PackageDepartureResponse(
        id=dep.id,
        package_id=dep.package_id,
        package_name=pkg_name,
        departure_date=dep.departure_date.isoformat(),
        return_date=dep.return_date.isoformat() if dep.return_date else None,
        total_capacity=dep.total_capacity,
        available_capacity=dep.available_capacity,
        reserved_capacity=dep.reserved_capacity,
        status=dep.status,  # type: ignore[arg-type]
        special_price=dep.special_price,
        currency=dep.currency,
        booking_cutoff_date=dep.booking_cutoff_date.isoformat() if getattr(dep, "booking_cutoff_date", None) else None,
        created_at=dep.created_at,
        updated_at=dep.updated_at,
    )


def list_departures(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    package_id: UUID | None = None,
    status: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
) -> PaginatedResponse[PackageDepartureResponse]:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = select(PackageDeparture).options(joinedload(PackageDeparture.package))

    if package_id is not None:
        query = query.where(PackageDeparture.package_id == package_id)

    if status:
        query = query.where(PackageDeparture.status == status.strip())

    if from_date:
        parsed_from = parse_date(from_date)
        if parsed_from:
            query = query.where(PackageDeparture.departure_date >= parsed_from)

    if to_date:
        parsed_to = parse_date(to_date)
        if parsed_to:
            query = query.where(PackageDeparture.departure_date <= parsed_to)

    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.execute(count_query).scalar_one()

    query = (
        query.order_by(desc(PackageDeparture.departure_date))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    departures = db.execute(query).unique().scalars().all()

    items = [serialize_departure(d) for d in departures]
    return paginate(items, total, page, page_size)


def get_departure_by_id(db: Session, departure_id: UUID) -> PackageDepartureResponse:
    dep = (
        db.execute(
            select(PackageDeparture)
            .options(joinedload(PackageDeparture.package))
            .where(PackageDeparture.id == departure_id)
        )
        .unique()
        .scalar_one_or_none()
    )
    if not dep:
        raise ApiError(
            status_code=404,
            code="DEPARTURE_NOT_FOUND",
            message=f"Departure {departure_id} not found.",
        )
    return serialize_departure(dep)


def list_package_departures(
    db: Session,
    package_id: UUID,
) -> list[PackageDepartureResponse]:
    query = (
        select(PackageDeparture)
        .options(joinedload(PackageDeparture.package))
        .where(PackageDeparture.package_id == package_id)
        .order_by(PackageDeparture.departure_date.asc())
    )
    departures = db.execute(query).unique().scalars().all()
    return [serialize_departure(d) for d in departures]


def create_departure(
    db: Session,
    payload: PackageDepartureCreateRequest,
    current_admin_id: UUID,
    package_id: UUID | None = None,
    ip_address: str | None = None,
) -> PackageDepartureResponse:
    effective_package_id = package_id or payload.package_id
    if not effective_package_id:
        raise ApiError(
            status_code=400,
            code="MISSING_PACKAGE_ID",
            message="Package ID is required to create a departure.",
        )
    pkg = db.execute(
        select(Package).where(
            Package.id == effective_package_id, Package.deleted_at.is_(None)
        )
    ).scalar_one_or_none()
    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Active package {effective_package_id} not found.",
        )

    dep_date = parse_date(payload.departure_date)
    ret_date = parse_date(payload.return_date) if payload.return_date else None

    if not dep_date:
        raise ApiError(
            status_code=400,
            code="MISSING_DEPARTURE_DATE",
            message="Departure date is required.",
        )

    if ret_date and ret_date < dep_date:
        raise ApiError(
            status_code=400,
            code="INVALID_RETURN_DATE",
            message="Return date cannot be earlier than departure date.",
        )

    if payload.total_capacity < 0 or payload.total_capacity > 100:
        raise ApiError(
            status_code=400,
            code="INVALID_CAPACITY",
            message="Total capacity must be between 0 and 100 seats.",
        )

    if payload.special_price is not None and payload.special_price < 0:
        raise ApiError(
            status_code=400,
            code="INVALID_PRICE",
            message="Special price cannot be negative.",
        )

    cutoff_date = parse_date(payload.booking_cutoff_date) if payload.booking_cutoff_date else None

    departure = PackageDeparture(
        package_id=effective_package_id,
        departure_date=dep_date,
        return_date=ret_date,
        total_capacity=payload.total_capacity,
        available_capacity=payload.total_capacity,
        reserved_capacity=0,
        status=payload.status,
        special_price=payload.special_price,
        currency=payload.currency.upper(),
        booking_cutoff_date=cutoff_date,
    )
    db.add(departure)
    db.flush()

    record_audit_log(
        db=db,
        action="departure_created",
        entity_type="package_departure",
        entity_id=str(departure.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "departure_date": departure.departure_date.isoformat(),
            "total_capacity": departure.total_capacity,
            "status": departure.status,
        },
    )
    db.commit()
    return get_departure_by_id(db, departure.id)


def update_departure(
    db: Session,
    departure_id: UUID,
    payload: PackageDepartureUpdateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageDepartureResponse:
    # Use row-level locking for concurrency safety
    dep = db.execute(
        select(PackageDeparture)
        .where(PackageDeparture.id == departure_id)
        .with_for_update()
    ).scalar_one_or_none()

    if not dep:
        raise ApiError(
            status_code=404,
            code="DEPARTURE_NOT_FOUND",
            message=f"Departure {departure_id} not found.",
        )

    changes: dict[str, object] = {}

    if payload.departure_date is not None:
        new_dep_date = parse_date(payload.departure_date)
        if new_dep_date:
            cur_ret_date = dep.return_date
            if payload.return_date is not None:
                cur_ret_date = parse_date(payload.return_date)
            if cur_ret_date and cur_ret_date < new_dep_date:
                raise ApiError(
                    status_code=400,
                    code="INVALID_RETURN_DATE",
                    message="Return date cannot be earlier than departure date.",
                )
            changes["departure_date"] = {
                "old": dep.departure_date.isoformat(),
                "new": new_dep_date.isoformat(),
            }
            dep.departure_date = new_dep_date

    if payload.return_date is not None:
        new_ret_date = parse_date(payload.return_date)
        if new_ret_date and new_ret_date < dep.departure_date:
            raise ApiError(
                status_code=400,
                code="INVALID_RETURN_DATE",
                message="Return date cannot be earlier than departure date.",
            )
        dep.return_date = new_ret_date

    if payload.total_capacity is not None:
        if payload.total_capacity < 0 or payload.total_capacity > 100:
            raise ApiError(
                status_code=400,
                code="INVALID_CAPACITY",
                message="Total capacity must be between 0 and 100 seats.",
            )
        # Prevent capacity reducing below current reserved and active bookings
        booked_seats_query = select(
            func.coalesce(func.sum(Booking.number_of_travellers), 0)
        ).where(
            Booking.departure_id == dep.id,
            Booking.status.in_(["pending", "payment_pending", "confirmed"]),
        )
        actual_booked_seats = db.execute(booked_seats_query).scalar_one()
        min_required_capacity = max(dep.reserved_capacity, actual_booked_seats)

        if payload.total_capacity < min_required_capacity:
            raise ApiError(
                status_code=400,
                code="CAPACITY_BELOW_RESERVED",
                message=f"Total capacity cannot be less than currently reserved or booked seats ({min_required_capacity}).",
            )
        changes["total_capacity"] = {
            "old": dep.total_capacity,
            "new": payload.total_capacity,
        }
        dep.total_capacity = payload.total_capacity
        dep.available_capacity = dep.total_capacity - dep.reserved_capacity

    if payload.reserved_capacity is not None:
        if payload.reserved_capacity < 0:
            raise ApiError(
                status_code=400,
                code="INVALID_CAPACITY",
                message="Reserved capacity cannot be negative.",
            )
        if payload.reserved_capacity > dep.total_capacity:
            raise ApiError(
                status_code=400,
                code="RESERVED_EXCEEDS_TOTAL",
                message="Reserved capacity cannot exceed total capacity.",
            )
        dep.reserved_capacity = payload.reserved_capacity
        dep.available_capacity = dep.total_capacity - dep.reserved_capacity

    # Final check preventing negative availability
    if dep.available_capacity < 0:
        raise ApiError(
            status_code=400,
            code="NEGATIVE_AVAILABILITY",
            message="Available capacity calculation resulted in a negative number.",
        )

    # Automatic status adjustment if fully booked or reopened
    if dep.available_capacity == 0 and dep.status == "open":
        dep.status = "sold_out"
    elif dep.available_capacity > 0 and dep.status == "sold_out" and payload.status is None:
        dep.status = "open"

    if payload.special_price is not None:
        if payload.special_price < 0:
            raise ApiError(
                status_code=400,
                code="INVALID_PRICE",
                message="Special price cannot be negative.",
            )
        dep.special_price = payload.special_price

    if payload.currency is not None:
        dep.currency = payload.currency.upper()

    if payload.booking_cutoff_date is not None:
        new_cutoff = parse_date(payload.booking_cutoff_date)
        changes["booking_cutoff_date"] = {
            "old": dep.booking_cutoff_date.isoformat() if dep.booking_cutoff_date else None,
            "new": new_cutoff.isoformat() if new_cutoff else None,
        }
        dep.booking_cutoff_date = new_cutoff

    if payload.status is not None:
        changes["status"] = {"old": dep.status, "new": payload.status}
        dep.status = payload.status

    record_audit_log(
        db=db,
        action="departure_updated",
        entity_type="package_departure",
        entity_id=str(dep.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"changes": changes},
    )
    db.commit()
    return get_departure_by_id(db, dep.id)


def delete_or_cancel_departure(
    db: Session,
    departure_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageDepartureResponse:
    dep = db.execute(
        select(PackageDeparture).where(PackageDeparture.id == departure_id)
    ).scalar_one_or_none()

    if not dep:
        raise ApiError(
            status_code=404,
            code="DEPARTURE_NOT_FOUND",
            message=f"Departure {departure_id} not found.",
        )

    # Check active bookings
    booking_count = db.execute(
        select(func.count(Booking.id)).where(Booking.departure_id == departure_id)
    ).scalar_one()

    if booking_count > 0:
        # Safe cancellation preserving customer financial record
        dep.status = "cancelled"
        record_audit_log(
            db=db,
            action="departure_cancelled",
            entity_type="package_departure",
            entity_id=str(dep.id),
            actor_user_id=current_admin_id,
            ip_address=ip_address,
            metadata={
                "reason": "Cancelled departure with existing customer bookings",
                "active_bookings_count": booking_count,
            },
        )
        db.commit()
        return get_departure_by_id(db, dep.id)

    # No bookings: safe deletion
    record_audit_log(
        db=db,
        action="departure_deleted",
        entity_type="package_departure",
        entity_id=str(dep.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(dep.package_id),
            "departure_date": dep.departure_date.isoformat(),
        },
    )
    dep.status = "cancelled"
    db.delete(dep)
    db.commit()
    return serialize_departure(dep)
