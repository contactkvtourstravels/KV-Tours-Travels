"""Service for hotel catalog management."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ApiError
from app.models.catalog import Destination, Hotel
from app.schemas.admin import (
    HotelCreateRequest,
    HotelResponse,
    HotelUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.audit_service import record_audit_log
from app.services.admin.utils import paginate


def serialize_hotel(hotel: Hotel) -> HotelResponse:
    dest_name = hotel.destination.name if hotel.destination else None
    return HotelResponse(
        id=hotel.id,
        destination_id=hotel.destination_id,
        destination_name=dest_name,
        name=hotel.name,
        description=hotel.description,
        address=hotel.address,
        star_rating=hotel.star_rating,
        website_url=hotel.website_url,
        contact_phone=hotel.contact_phone,
        contact_email=hotel.contact_email,
        is_active=hotel.is_active and hotel.deleted_at is None,
        deleted_at=hotel.deleted_at,
        created_at=hotel.created_at,
        updated_at=hotel.updated_at,
    )


def list_hotels(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    destination_id: UUID | None = None,
    is_active: bool | None = None,
) -> PaginatedResponse[HotelResponse]:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = select(Hotel).options(joinedload(Hotel.destination))

    if is_active is True:
        query = query.where(Hotel.deleted_at.is_(None), Hotel.is_active.is_(True))
    elif is_active is False:
        query = query.where(
            or_(Hotel.deleted_at.is_not(None), Hotel.is_active.is_(False))
        )

    if destination_id is not None:
        query = query.where(Hotel.destination_id == destination_id)

    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.outerjoin(
            Destination, Hotel.destination_id == Destination.id
        ).where(
            or_(
                func.lower(Hotel.name).like(search_term),
                func.lower(Hotel.address).like(search_term),
                func.lower(Destination.name).like(search_term),
                func.lower(Destination.country).like(search_term),
            )
        )

    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.execute(count_query).scalar_one()

    query = (
        query.order_by(desc(Hotel.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    hotels = db.execute(query).unique().scalars().all()

    items = [serialize_hotel(h) for h in hotels]
    return paginate(items, total, page, page_size)


def get_hotel_by_id(db: Session, hotel_id: UUID) -> HotelResponse:
    hotel = (
        db.execute(
            select(Hotel)
            .options(joinedload(Hotel.destination))
            .where(Hotel.id == hotel_id)
        )
        .unique()
        .scalar_one_or_none()
    )
    if not hotel:
        raise ApiError(
            status_code=404,
            code="HOTEL_NOT_FOUND",
            message=f"Hotel {hotel_id} not found.",
        )
    return serialize_hotel(hotel)


def create_hotel(
    db: Session,
    payload: HotelCreateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> HotelResponse:
    # Verify destination exists
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

    if payload.star_rating is not None and not (1 <= payload.star_rating <= 5):
        raise ApiError(
            status_code=400,
            code="INVALID_STAR_RATING",
            message="Hotel star rating must be between 1 and 5.",
        )

    hotel = Hotel(
        destination_id=payload.destination_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        address=payload.address.strip() if payload.address else None,
        star_rating=payload.star_rating,
        website_url=payload.website_url.strip() if payload.website_url else None,
        contact_phone=payload.contact_phone.strip() if payload.contact_phone else None,
        contact_email=payload.contact_email.strip() if payload.contact_email else None,
        is_active=payload.is_active,
    )
    db.add(hotel)
    db.flush()

    record_audit_log(
        db=db,
        action="hotel_created",
        entity_type="hotel",
        entity_id=str(hotel.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "name": hotel.name,
            "destination_id": str(hotel.destination_id),
            "star_rating": hotel.star_rating,
        },
    )
    db.commit()
    return get_hotel_by_id(db, hotel.id)


def update_hotel(
    db: Session,
    hotel_id: UUID,
    payload: HotelUpdateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> HotelResponse:
    hotel = db.execute(select(Hotel).where(Hotel.id == hotel_id)).scalar_one_or_none()
    if not hotel:
        raise ApiError(
            status_code=404,
            code="HOTEL_NOT_FOUND",
            message=f"Hotel {hotel_id} not found.",
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
            "old": str(hotel.destination_id),
            "new": str(payload.destination_id),
        }
        hotel.destination_id = payload.destination_id

    if payload.name is not None and payload.name.strip() != hotel.name:
        changes["name"] = {"old": hotel.name, "new": payload.name.strip()}
        hotel.name = payload.name.strip()

    if payload.description is not None:
        hotel.description = payload.description.strip() or None
    if payload.address is not None:
        hotel.address = payload.address.strip() or None

    if payload.star_rating is not None:
        if not (1 <= payload.star_rating <= 5):
            raise ApiError(
                status_code=400,
                code="INVALID_STAR_RATING",
                message="Hotel star rating must be between 1 and 5.",
            )
        changes["star_rating"] = {"old": hotel.star_rating, "new": payload.star_rating}
        hotel.star_rating = payload.star_rating

    if payload.website_url is not None:
        hotel.website_url = payload.website_url.strip() or None
    if payload.contact_phone is not None:
        hotel.contact_phone = payload.contact_phone.strip() or None
    if payload.contact_email is not None:
        hotel.contact_email = payload.contact_email.strip() or None

    if payload.is_active is not None:
        changes["is_active"] = {"old": hotel.is_active, "new": payload.is_active}
        hotel.is_active = payload.is_active
        if payload.is_active and hotel.deleted_at is not None:
            hotel.deleted_at = None

    record_audit_log(
        db=db,
        action="hotel_updated",
        entity_type="hotel",
        entity_id=str(hotel.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"changes": changes},
    )
    db.commit()
    return get_hotel_by_id(db, hotel.id)


def delete_hotel(
    db: Session,
    hotel_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> HotelResponse:
    hotel = db.execute(select(Hotel).where(Hotel.id == hotel_id)).scalar_one_or_none()
    if not hotel:
        raise ApiError(
            status_code=404,
            code="HOTEL_NOT_FOUND",
            message=f"Hotel {hotel_id} not found.",
        )

    hotel.deleted_at = datetime.now(timezone.utc)
    hotel.is_active = False

    record_audit_log(
        db=db,
        action="hotel_deactivated",
        entity_type="hotel",
        entity_id=str(hotel.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"name": hotel.name},
    )
    db.commit()
    return get_hotel_by_id(db, hotel.id)
