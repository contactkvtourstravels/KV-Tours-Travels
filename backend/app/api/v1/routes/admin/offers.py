"""Administrative Best Offers management routes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.csrf import verify_csrf_token
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
)
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.offers import (
    AdminOfferCreate,
    AdminOfferItem,
    AdminOfferListResponse,
    AdminOfferUpdate,
    MasterToggleRequest,
    MasterToggleResponse,
)
from app.services.offers_service import OffersService

router = APIRouter(prefix="/offers", tags=["admin-offers"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


def _extract_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _format_offer_item(item: AdminOfferItem) -> AdminOfferItem:
    item_dump = item.model_dump(mode="json")
    item.data = item_dump
    return item


@router.get("", response_model=AdminOfferListResponse)
def list_offers(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    status: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
) -> AdminOfferListResponse:
    """List all offers with search, filters, pricing warnings, and expiry indicators."""
    res = OffersService.get_admin_offers(
        db=db,
        page=page,
        page_size=page_size,
        status_filter=status,
        search=search,
    )
    for it in res.items:
        _format_offer_item(it)
    return res


@router.get("/settings", response_model=MasterToggleResponse)
@router.get("/master-toggle", response_model=MasterToggleResponse)
def get_master_toggle(
    _admin: StaffOrAbove,
    db: DbSession,
) -> MasterToggleResponse:
    """Get the current master toggle status for the Best Offers homepage section."""
    is_enabled = OffersService.is_master_toggle_enabled(db)
    msg = f"Best Offers section is currently {'enabled' if is_enabled else 'disabled'}."
    return MasterToggleResponse(
        enabled=is_enabled,
        best_offers_enabled=is_enabled,
        message=msg,
        data={
            "enabled": is_enabled,
            "best_offers_enabled": is_enabled,
            "message": msg,
        },
    )


@router.patch("/settings", response_model=MasterToggleResponse)
@router.patch("/master-toggle", response_model=MasterToggleResponse)
def update_master_toggle(
    payload: MasterToggleRequest,
    request: Request,
    admin: StaffOrAbove,
    db: DbSession,
) -> MasterToggleResponse:
    """Enable or disable the Best Offers section on the public homepage persistently."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    enabled_val = payload.get_enabled()
    result = OffersService.set_master_toggle(
        db=db,
        enabled=enabled_val,
        actor_id=admin.id,
        ip_address=ip_address,
    )
    msg = f"Best Offers homepage showcase successfully {'enabled' if result else 'disabled'}."
    return MasterToggleResponse(
        enabled=result,
        best_offers_enabled=result,
        message=msg,
        data={
            "enabled": result,
            "best_offers_enabled": result,
            "message": msg,
        },
    )


@router.get("/{offer_id}", response_model=AdminOfferItem)
def get_offer_detail(
    offer_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> AdminOfferItem:
    """Retrieve full offer details including authoritative pricing policy checks."""
    item = OffersService.get_admin_offer_by_id(db=db, offer_id=offer_id)
    return _format_offer_item(item)


@router.post("", response_model=AdminOfferItem, status_code=status.HTTP_201_CREATED)
def create_offer(
    payload: AdminOfferCreate,
    request: Request,
    admin: StaffOrAbove,
    db: DbSession,
) -> AdminOfferItem:
    """Create a new promotional offer for an existing catalog package."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    offer = OffersService.create_offer(
        db=db,
        payload=payload,
        actor_id=admin.id,
        ip_address=ip_address,
    )
    item = OffersService.get_admin_offer_by_id(db=db, offer_id=offer.id)
    return _format_offer_item(item)


@router.patch("/{offer_id}", response_model=AdminOfferItem)
def update_offer(
    offer_id: UUID,
    payload: AdminOfferUpdate,
    request: Request,
    admin: StaffOrAbove,
    db: DbSession,
) -> AdminOfferItem:
    """Update promotional offer details, discount rules, or status."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    OffersService.update_offer(
        db=db,
        offer_id=offer_id,
        payload=payload,
        actor_id=admin.id,
        ip_address=ip_address,
    )
    item = OffersService.get_admin_offer_by_id(db=db, offer_id=offer_id)
    return _format_offer_item(item)


@router.delete("/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_offer(
    offer_id: UUID,
    request: Request,
    admin: StaffOrAbove,
    db: DbSession,
) -> Response:
    """Delete an offer or archive it if referenced by historical bookings."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    OffersService.delete_or_archive_offer(
        db=db,
        offer_id=offer_id,
        actor_id=admin.id,
        ip_address=ip_address,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
