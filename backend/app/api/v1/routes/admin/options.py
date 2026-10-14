"""Administrative routes for flexible catalog options and category management."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
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
from app.schemas.options import CatalogCategoriesResponse, CategoryCreateRequest
from app.services.admin.options_service import (
    add_catalog_category,
    get_catalog_categories,
)

router = APIRouter(prefix="/options", tags=["admin-options"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


@router.get("/categories", response_model=CatalogCategoriesResponse)
def list_catalog_categories(
    _admin: StaffOrAbove,
    db: DbSession,
) -> CatalogCategoriesResponse:
    """Retrieve all available categories and options across catalog modules."""
    return get_catalog_categories(db)


@router.post("/categories", response_model=CatalogCategoriesResponse)
def register_catalog_category(
    payload: CategoryCreateRequest,
    request: Request,
    _admin: StaffOrAbove,
    db: DbSession,
) -> CatalogCategoriesResponse:
    """Register and persist a new reusable custom category option."""
    verify_csrf_token(request)
    return add_catalog_category(
        db=db,
        field=payload.field,
        value=payload.value,
    )
