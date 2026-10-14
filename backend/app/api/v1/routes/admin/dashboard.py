"""Administrative dashboard routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
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
from app.schemas.admin import AdminDashboardMetricsResponse
from app.services.admin.dashboard_service import get_dashboard_metrics

router = APIRouter(prefix="/dashboard", tags=["admin-dashboard"])

DbSession = Annotated[Session, Depends(get_db_session)]
AdminStaffUser = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


@router.get("/metrics", response_model=AdminDashboardMetricsResponse)
def get_metrics(
    _admin: AdminStaffUser,
    db: DbSession,
) -> AdminDashboardMetricsResponse:
    """Retrieve real-time database dashboard metrics.

    Accessible to staff, manager, admin, and super_admin.
    """
    return get_dashboard_metrics(db)
