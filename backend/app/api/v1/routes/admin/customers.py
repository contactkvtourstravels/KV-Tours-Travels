"""Administrative customer management routes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
)
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.admin import PaginatedResponse
from app.schemas.admin_operations import CustomerDetailResponse, CustomerListItem
from app.services.admin.utils import paginate
from app.services.operations_service import OperationsService

router = APIRouter(prefix="/customers", tags=["admin-customers"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


@router.get("", response_model=PaginatedResponse[CustomerListItem])
def list_customers(
    _admin: StaffOrAbove,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
) -> PaginatedResponse[CustomerListItem]:
    """List customer records with trip counts and paid booking volume."""
    items, total = OperationsService.list_customers(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
    )
    return paginate(items, total, page, page_size)


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer_detail(
    customer_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> CustomerDetailResponse:
    """Retrieve full customer profile, complete booking and transaction history, and staff notes."""
    return OperationsService.get_customer_detail(db=db, customer_id=customer_id)
