"""Administrative inquiry management routes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
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
from app.schemas.admin import PaginatedResponse
from app.schemas.admin_operations import (
    InquiryDetailResponse,
    InquiryListItem,
    InquiryUpdateRequest,
)
from app.services.admin.utils import paginate
from app.services.operations_service import OperationsService

router = APIRouter(prefix="/inquiries", tags=["admin-inquiries"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


@router.get("", response_model=PaginatedResponse[InquiryListItem])
def list_inquiries(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    status: Annotated[str | None, Query()] = None,
    priority: Annotated[str | None, Query()] = None,
    destination_id: Annotated[UUID | None, Query()] = None,
    package_id: Annotated[UUID | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
) -> PaginatedResponse[InquiryListItem]:
    """List customer inquiries and leads with operational filters."""
    items, total = OperationsService.list_inquiries(
        db=db,
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        destination_id=destination_id,
        package_id=package_id,
        search=search,
    )
    return paginate(items, total, page, page_size)


@router.get("/{inquiry_id}", response_model=InquiryDetailResponse)
def get_inquiry(
    inquiry_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> InquiryDetailResponse:
    """Retrieve inquiry details including internal staff notes."""
    return OperationsService.get_inquiry_detail(db=db, inquiry_id=inquiry_id)


@router.patch(
    "/{inquiry_id}",
    response_model=InquiryDetailResponse,
    dependencies=[Depends(verify_csrf_token)],
)
def update_inquiry(
    inquiry_id: UUID,
    payload: InquiryUpdateRequest,
    admin_user: StaffOrAbove,
    db: DbSession,
    request: Request,
) -> InquiryDetailResponse:
    """Update status, priority, or assigned staff member for an inquiry."""
    client_ip = request.client.host if request.client else None
    return OperationsService.update_inquiry(
        db=db,
        inquiry_id=inquiry_id,
        admin_user_id=admin_user.id,
        status=payload.status,
        priority=payload.priority,
        assigned_to_user_id=payload.assigned_to_user_id,
        ip_address=client_ip,
    )
