"""Service for catalog add-on extras management."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ApiError
from app.models.catalog import Destination, Package
from app.models.commerce import AddOn, AddOnDestination, AddOnPackage
from app.schemas.admin import (
    AddOnCreateRequest,
    AddOnResponse,
    AddOnUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.audit_service import record_audit_log
from app.services.admin.utils import paginate


def serialize_add_on(addon: AddOn) -> AddOnResponse:
    pkg_ids = [l.package_id for l in addon.package_links] if addon.package_links else []
    dest_ids = (
        [l.destination_id for l in addon.destination_links]
        if addon.destination_links
        else []
    )
    return AddOnResponse(
        id=addon.id,
        name=addon.name,
        description=addon.description,
        price=addon.price,
        currency=addon.currency,
        applicability_scope=addon.applicability_scope or "all_packages",
        price_type=addon.price_type or "per_booking",
        min_quantity=addon.min_quantity or 1,
        max_quantity=addon.max_quantity or 10,
        is_mandatory=addon.is_mandatory or False,
        display_order=addon.display_order or 0,
        package_ids=pkg_ids,
        destination_ids=dest_ids,
        is_active=addon.is_active,
        created_at=addon.created_at,
        updated_at=addon.updated_at,
    )


def list_add_ons(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    is_active: bool | None = None,
) -> PaginatedResponse[AddOnResponse]:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    query = select(AddOn).options(
        joinedload(AddOn.package_links),
        joinedload(AddOn.destination_links),
    )

    if is_active is not None:
        query = query.where(AddOn.is_active == is_active)

    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(AddOn.name).like(search_term),
                func.lower(AddOn.description).like(search_term),
            )
        )

    count_query = select(func.count(AddOn.id.distinct())).select_from(
        query.order_by(None).subquery()
    )
    total = db.execute(count_query).scalar_one()

    query = (
        query.order_by(AddOn.display_order.asc(), desc(AddOn.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    addons = db.execute(query).unique().scalars().all()

    items = [serialize_add_on(a) for a in addons]
    return paginate(items, total, page, page_size)


def get_add_on_by_id(db: Session, add_on_id: UUID) -> AddOnResponse:
    addon = (
        db.execute(
            select(AddOn)
            .options(
                joinedload(AddOn.package_links),
                joinedload(AddOn.destination_links),
            )
            .where(AddOn.id == add_on_id)
        )
        .unique()
        .scalar_one_or_none()
    )
    if not addon:
        raise ApiError(
            status_code=404,
            code="ADD_ON_NOT_FOUND",
            message=f"Add-on {add_on_id} not found.",
        )
    return serialize_add_on(addon)


def create_add_on(
    db: Session,
    payload: AddOnCreateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> AddOnResponse:
    if payload.price < 0:
        raise ApiError(
            status_code=400,
            code="INVALID_PRICE",
            message="Add-on price cannot be negative.",
        )

    if payload.max_quantity < payload.min_quantity:
        raise ApiError(
            status_code=400,
            code="INVALID_QUANTITY_RANGE",
            message="Max quantity cannot be less than min quantity.",
        )

    addon = AddOn(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        price=payload.price,
        currency=payload.currency.upper(),
        applicability_scope=payload.applicability_scope,
        price_type=payload.price_type,
        min_quantity=payload.min_quantity,
        max_quantity=payload.max_quantity,
        is_mandatory=payload.is_mandatory,
        display_order=payload.display_order,
        is_active=payload.is_active,
    )
    db.add(addon)
    db.flush()

    # Link packages if scope requires it
    if (
        payload.applicability_scope in ("selected_packages", "single_package")
        and payload.package_ids
    ):
        # Validate packages exist
        existing_pkgs = (
            db.execute(select(Package.id).where(Package.id.in_(payload.package_ids)))
            .scalars()
            .all()
        )
        for pkg_id in existing_pkgs:
            db.add(AddOnPackage(add_on_id=addon.id, package_id=pkg_id))

    # Link destinations if scope requires it
    if (
        payload.applicability_scope == "selected_destinations"
        and payload.destination_ids
    ):
        existing_dests = (
            db.execute(
                select(Destination.id).where(
                    Destination.id.in_(payload.destination_ids)
                )
            )
            .scalars()
            .all()
        )
        for dest_id in existing_dests:
            db.add(AddOnDestination(add_on_id=addon.id, destination_id=dest_id))

    db.flush()

    record_audit_log(
        db=db,
        action="add_on_created",
        entity_type="add_on",
        entity_id=str(addon.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "name": addon.name,
            "price": str(addon.price),
            "currency": addon.currency,
            "applicability_scope": addon.applicability_scope,
            "price_type": addon.price_type,
        },
    )
    db.commit()

    return get_add_on_by_id(db, addon.id)


def update_add_on(
    db: Session,
    add_on_id: UUID,
    payload: AddOnUpdateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> AddOnResponse:
    addon = (
        db.execute(
            select(AddOn)
            .options(
                joinedload(AddOn.package_links),
                joinedload(AddOn.destination_links),
            )
            .where(AddOn.id == add_on_id)
        )
        .unique()
        .scalar_one_or_none()
    )
    if not addon:
        raise ApiError(
            status_code=404,
            code="ADD_ON_NOT_FOUND",
            message=f"Add-on {add_on_id} not found.",
        )

    changes: dict[str, object] = {}

    if payload.name is not None and payload.name.strip() != addon.name:
        changes["name"] = {"old": addon.name, "new": payload.name.strip()}
        addon.name = payload.name.strip()

    if payload.description is not None:
        addon.description = payload.description.strip() or None

    if payload.price is not None:
        if payload.price < 0:
            raise ApiError(
                status_code=400,
                code="INVALID_PRICE",
                message="Add-on price cannot be negative.",
            )
        changes["price"] = {"old": str(addon.price), "new": str(payload.price)}
        addon.price = payload.price

    if payload.currency is not None:
        addon.currency = payload.currency.upper()

    if payload.applicability_scope is not None:
        changes["applicability_scope"] = {
            "old": addon.applicability_scope,
            "new": payload.applicability_scope,
        }
        addon.applicability_scope = payload.applicability_scope

    if payload.price_type is not None:
        changes["price_type"] = {"old": addon.price_type, "new": payload.price_type}
        addon.price_type = payload.price_type

    if payload.min_quantity is not None:
        addon.min_quantity = payload.min_quantity

    if payload.max_quantity is not None:
        addon.max_quantity = payload.max_quantity

    if addon.max_quantity < addon.min_quantity:
        raise ApiError(
            status_code=400,
            code="INVALID_QUANTITY_RANGE",
            message="Max quantity cannot be less than min quantity.",
        )

    if payload.is_mandatory is not None:
        addon.is_mandatory = payload.is_mandatory

    if payload.display_order is not None:
        addon.display_order = payload.display_order

    if payload.is_active is not None:
        changes["is_active"] = {"old": addon.is_active, "new": payload.is_active}
        addon.is_active = payload.is_active

    # Handle package associations update
    if payload.package_ids is not None:
        addon.package_links.clear()
        if payload.package_ids:
            existing_pkgs = (
                db.execute(
                    select(Package.id).where(Package.id.in_(payload.package_ids))
                )
                .scalars()
                .all()
            )
            for pkg_id in existing_pkgs:
                addon.package_links.append(
                    AddOnPackage(add_on_id=addon.id, package_id=pkg_id)
                )

    # Handle destination associations update
    if payload.destination_ids is not None:
        addon.destination_links.clear()
        if payload.destination_ids:
            existing_dests = (
                db.execute(
                    select(Destination.id).where(
                        Destination.id.in_(payload.destination_ids)
                    )
                )
                .scalars()
                .all()
            )
            for dest_id in existing_dests:
                addon.destination_links.append(
                    AddOnDestination(add_on_id=addon.id, destination_id=dest_id)
                )

    record_audit_log(
        db=db,
        action="add_on_updated",
        entity_type="add_on",
        entity_id=str(addon.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"changes": changes},
    )
    db.commit()
    return get_add_on_by_id(db, addon.id)


def delete_add_on(
    db: Session,
    add_on_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> AddOnResponse:
    addon = db.execute(select(AddOn).where(AddOn.id == add_on_id)).scalar_one_or_none()
    if not addon:
        raise ApiError(
            status_code=404,
            code="ADD_ON_NOT_FOUND",
            message=f"Add-on {add_on_id} not found.",
        )

    addon.is_active = False

    record_audit_log(
        db=db,
        action="add_on_deactivated",
        entity_type="add_on",
        entity_id=str(addon.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"name": addon.name},
    )
    db.commit()
    return get_add_on_by_id(db, addon.id)
