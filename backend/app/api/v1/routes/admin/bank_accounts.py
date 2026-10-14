"""Administrative Bank Account Management Routes.

Provides dedicated control over organization bank accounts under Finance & Reports.
Supports masked tables, explicit audited reveals, default account selection,
and safe CSV exports.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.csrf import verify_csrf_token
from app.core.permissions import ROLE_ADMIN, ROLE_MANAGER, ROLE_STAFF, ROLE_SUPER_ADMIN
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.payment import (
    BankAccountCreateRequest,
    BankAccountDetailResponse,
    BankAccountListResponse,
    BankAccountResponse,
    BankAccountRevealResponse,
    BankAccountUpdateRequest,
)
from app.services.admin.bank_account_service import BankAccountService

router = APIRouter(prefix="/bank-accounts", tags=["admin-bank-accounts"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]
ManagerOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


def _extract_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("", response_model=BankAccountListResponse)
def list_bank_accounts(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> BankAccountListResponse:
    """List administrative bank accounts with masked account numbers and default indicators."""
    return BankAccountService.list_bank_accounts(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        status=status_filter,
    )


@router.get("/export")
def export_bank_accounts_csv(
    admin_user: ManagerOrAbove,
    request: Request,
    db: DbSession,
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> Response:
    """Export bank accounts as CSV with masked account numbers for compliance."""
    ip_addr = _extract_ip(request)
    csv_content = BankAccountService.export_csv(
        db=db,
        search=search,
        status=status_filter,
        current_user=admin_user,
        ip_address=ip_addr,
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=kvtours_bank_accounts.csv"},
    )


@router.post("", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
def create_bank_account(
    payload: BankAccountCreateRequest,
    request: Request,
    admin_user: ManagerOrAbove,
    db: DbSession,
) -> BankAccountResponse:
    """Create a new bank account with strict format validation and CSRF protection."""
    verify_csrf_token(request)
    ip_addr = _extract_ip(request)
    return BankAccountService.create_bank_account(
        db=db,
        payload=payload,
        current_user=admin_user,
        ip_address=ip_addr,
    )


@router.get("/{account_id}", response_model=BankAccountDetailResponse)
def get_bank_account(
    account_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> BankAccountDetailResponse:
    """Retrieve detailed bank account info (account number remains masked)."""
    return BankAccountService.get_bank_account(db=db, account_id=account_id)


@router.put("/{account_id}", response_model=BankAccountResponse)
@router.patch("/{account_id}", response_model=BankAccountResponse)
def update_bank_account(
    account_id: UUID,
    payload: BankAccountUpdateRequest,
    request: Request,
    admin_user: ManagerOrAbove,
    db: DbSession,
) -> BankAccountResponse:
    """Update bank account details, instructions, or public visibility."""
    verify_csrf_token(request)
    ip_addr = _extract_ip(request)
    return BankAccountService.update_bank_account(
        db=db,
        account_id=account_id,
        payload=payload,
        current_user=admin_user,
        ip_address=ip_addr,
    )


@router.post("/{account_id}/set-default", response_model=BankAccountResponse)
def set_default_bank_account(
    account_id: UUID,
    request: Request,
    admin_user: ManagerOrAbove,
    db: DbSession,
) -> BankAccountResponse:
    """Set the specified account as the default account and synchronize with SiteSetting."""
    verify_csrf_token(request)
    ip_addr = _extract_ip(request)
    return BankAccountService.set_default_bank_account(
        db=db,
        account_id=account_id,
        current_user=admin_user,
        ip_address=ip_addr,
    )


@router.post("/{account_id}/reveal", response_model=BankAccountRevealResponse)
def reveal_bank_account_number(
    account_id: UUID,
    request: Request,
    admin_user: ManagerOrAbove,
    db: DbSession,
) -> BankAccountRevealResponse:
    """Explicitly reveal full sensitive account number for authorized finance staff with audit logging."""
    verify_csrf_token(request)
    ip_addr = _extract_ip(request)
    return BankAccountService.reveal_bank_account(
        db=db,
        account_id=account_id,
        current_user=admin_user,
        ip_address=ip_addr,
    )


@router.delete("/{account_id}")
def delete_bank_account(
    account_id: UUID,
    request: Request,
    admin_user: ManagerOrAbove,
    db: DbSession,
) -> dict[str, str | bool]:
    """Safely delete bank account, preventing deletion if linked to payment records."""
    verify_csrf_token(request)
    ip_addr = _extract_ip(request)
    return BankAccountService.delete_bank_account(
        db=db,
        account_id=account_id,
        current_user=admin_user,
        ip_address=ip_addr,
    )
