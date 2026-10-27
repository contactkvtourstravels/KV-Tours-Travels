"""Administrative Bank Account Service.

Provides complete CRUD, default management, audit trails, secure masked representations,
and explicit authorized reveal operations for bank accounts used across Finance and Settings.
Synchronizes with the global SiteSetting bank_transfer_settings contract.
"""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_SUPER_ADMIN,
    get_user_roles,
)
from app.models.commerce import BankAccount, Payment
from app.models.content import SiteSetting
from app.models.user import User
from app.schemas.payment import (
    BankAccountCreateRequest,
    BankAccountDetailResponse,
    BankAccountListResponse,
    BankAccountResponse,
    BankAccountRevealResponse,
    BankAccountUpdateRequest,
)
from app.services.admin.audit_service import record_audit_log

logger = logging.getLogger(__name__)

SETTING_KEY_BANK_SETTINGS = "bank_transfer_settings"


def _mask_account_number(acc: str | None) -> str:
    """Mask account number showing only last 4 digits."""
    if not acc:
        return "None"
    s = str(acc).strip()
    if len(s) <= 4:
        return s
    last4 = s[-4:]
    return f"•••• •••• {last4}"


class BankAccountService:
    """Authoritative service for managing organization bank accounts across Finance & Settings."""

    @classmethod
    def ensure_seeded_from_site_setting(cls, db: Session) -> BankAccount | None:
        """Seed initial BankAccount from SiteSetting bank_transfer_settings if table is empty."""
        count = db.execute(select(func.count(BankAccount.id))).scalar_one()
        if count > 0:
            return None

        # Fetch existing SiteSetting row
        row = db.execute(
            select(SiteSetting).where(SiteSetting.key == SETTING_KEY_BANK_SETTINGS)
        ).scalar_one_or_none()

        raw: dict[str, Any] = {}
        if row and isinstance(row.value, dict):
            raw = row.value

        acc_num = str(raw.get("account_number") or "50200012345678")
        ifsc = str(raw.get("ifsc_code") or "HDFC0001234")
        bank_name = str(raw.get("bank_name") or "HDFC Bank")
        holder_name = str(raw.get("account_name") or "THE WILD ROUTE PVT LTD")
        branch_name = str(raw.get("branch_name") or "Palakkad Main Branch")
        acc_type = str(raw.get("account_type") or "Current")
        upi_id = raw.get("upi_id") or "thewildroute@hdfcbank"
        instructions = str(raw.get("payment_instructions") or "Please transfer the exact amount using NEFT / RTGS / IMPS or UPI.")

        seeded = BankAccount(
            account_holder_name=holder_name,
            bank_name=bank_name,
            account_number=acc_num,
            ifsc_code=ifsc,
            branch_name=branch_name,
            account_type=acc_type,
            upi_id=upi_id,
            currency="INR",
            status="active",
            is_default=True,
            is_public=True,
            transfer_instructions=instructions,
            branch_cash_instructions="Visit our office branch to deposit cash directly with receipt confirmation.",
        )
        db.add(seeded)
        db.flush()
        return seeded

    @classmethod
    def _sync_to_site_setting(cls, db: Session, account: BankAccount) -> None:
        """Synchronize default account fields into SiteSetting bank_transfer_settings for compatibility."""
        row = db.execute(
            select(SiteSetting).where(SiteSetting.key == SETTING_KEY_BANK_SETTINGS)
        ).scalar_one_or_none()

        data: dict[str, Any] = {}
        if row and isinstance(row.value, dict):
            data = dict(row.value)

        data["account_name"] = account.account_holder_name
        data["bank_name"] = account.bank_name
        data["account_number"] = account.account_number
        data["ifsc_code"] = account.ifsc_code
        data["branch_name"] = account.branch_name
        data["account_type"] = account.account_type
        data["upi_id"] = account.upi_id
        if account.transfer_instructions:
            data["payment_instructions"] = account.transfer_instructions

        if not row:
            row = SiteSetting(
                key=SETTING_KEY_BANK_SETTINGS,
                value=data,
                description="Consolidated bank wire and transfer gateway parameters",
            )
            db.add(row)
        else:
            row.value = data
        db.flush()

    @classmethod
    def _to_response(cls, acc: BankAccount) -> BankAccountResponse:
        return BankAccountResponse(
            id=acc.id,
            account_holder_name=acc.account_holder_name,
            bank_name=acc.bank_name,
            account_number_masked=_mask_account_number(acc.account_number),
            ifsc_code=acc.ifsc_code,
            branch_name=acc.branch_name,
            account_type=acc.account_type,
            upi_id=acc.upi_id,
            swift_code=acc.swift_code,
            bank_address=acc.bank_address,
            currency=acc.currency,
            status=acc.status,
            is_default=acc.is_default,
            is_public=acc.is_public,
            transfer_instructions=acc.transfer_instructions,
            branch_cash_instructions=acc.branch_cash_instructions,
            effective_date=acc.effective_date,
            created_at=acc.created_at,
            updated_at=acc.updated_at,
        )

    @classmethod
    def list_bank_accounts(
        cls,
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status: str | None = None,
    ) -> BankAccountListResponse:
        """List bank accounts with search, filter, and pagination."""
        cls.ensure_seeded_from_site_setting(db)

        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        stmt = select(BankAccount).order_by(desc(BankAccount.is_default), desc(BankAccount.created_at))

        if status and status.lower() != "all":
            stmt = stmt.where(BankAccount.status == status.lower())

        if search and search.strip():
            q = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    BankAccount.account_holder_name.ilike(q),
                    BankAccount.bank_name.ilike(q),
                    BankAccount.branch_name.ilike(q),
                    BankAccount.ifsc_code.ilike(q),
                    BankAccount.upi_id.ilike(q),
                )
            )

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = db.execute(count_stmt).scalar_one()

        items = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()

        return BankAccountListResponse(
            items=[cls._to_response(acc) for acc in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    @classmethod
    def get_bank_account(cls, db: Session, account_id: UUID) -> BankAccountDetailResponse:
        """Retrieve single bank account details (masked by default)."""
        acc = db.get(BankAccount, account_id)
        if not acc:
            raise HTTPException(status_code=404, detail="Bank account not found.")

        resp = cls._to_response(acc)
        return BankAccountDetailResponse(
            **resp.model_dump(),
            account_number=None,
            is_revealed=False,
        )

    @classmethod
    def create_bank_account(
        cls,
        db: Session,
        payload: BankAccountCreateRequest,
        current_user: User,
        ip_address: str | None = None,
    ) -> BankAccountResponse:
        """Create new administrative bank account with validations and audit record."""
        # Enforce authorized roles
        user_roles = get_user_roles(current_user)
        if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_MANAGER) for r in user_roles):
            raise HTTPException(
                status_code=403,
                detail="Only managers and administrators can create bank accounts.",
            )

        clean_acc = payload.account_number.strip()
        clean_ifsc = payload.ifsc_code.strip().upper()

        # Check existing duplicate active account number in same bank
        dup = db.execute(
            select(BankAccount).where(
                BankAccount.account_number == clean_acc,
                BankAccount.ifsc_code == clean_ifsc,
                BankAccount.status == "active",
            )
        ).scalars().first()
        if dup:
            raise HTTPException(
                status_code=409,
                detail=f"An active bank account with number '{clean_acc}' and IFSC '{clean_ifsc}' already exists.",
            )

        # If this is the first account or set as default, handle default flag
        count = db.execute(select(func.count(BankAccount.id))).scalar_one()
        is_default = payload.is_default or (count == 0)

        if is_default:
            db.query(BankAccount).update({"is_default": False})

        account = BankAccount(
            account_holder_name=payload.account_holder_name.strip(),
            bank_name=payload.bank_name.strip(),
            account_number=clean_acc,
            ifsc_code=clean_ifsc,
            branch_name=payload.branch_name.strip(),
            account_type=payload.account_type.strip(),
            upi_id=payload.upi_id.strip() if payload.upi_id else None,
            swift_code=payload.swift_code.strip().upper() if payload.swift_code else None,
            bank_address=payload.bank_address.strip() if payload.bank_address else None,
            currency=payload.currency.strip().upper() if payload.currency else "INR",
            status=payload.status.strip().lower(),
            is_default=is_default,
            is_public=payload.is_public,
            transfer_instructions=payload.transfer_instructions.strip() if payload.transfer_instructions else None,
            branch_cash_instructions=payload.branch_cash_instructions.strip() if payload.branch_cash_instructions else None,
            effective_date=payload.effective_date,
            created_by_user_id=current_user.id,
            updated_by_user_id=current_user.id,
        )
        db.add(account)
        db.flush()

        if is_default:
            cls._sync_to_site_setting(db, account)

        record_audit_log(
            db=db,
            action="bank_account_created",
            entity_type="bank_account",
            entity_id=str(account.id),
            actor_user_id=current_user.id,
            ip_address=ip_address,
            metadata={
                "bank_name": account.bank_name,
                "account_holder_name": account.account_holder_name,
                "account_number_masked": _mask_account_number(account.account_number),
                "ifsc_code": account.ifsc_code,
                "is_default": account.is_default,
                "is_public": account.is_public,
            },
        )
        db.commit()
        db.refresh(account)
        return cls._to_response(account)

    @classmethod
    def update_bank_account(
        cls,
        db: Session,
        account_id: UUID,
        payload: BankAccountUpdateRequest,
        current_user: User,
        ip_address: str | None = None,
    ) -> BankAccountResponse:
        """Update existing bank account details."""
        user_roles = get_user_roles(current_user)
        if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_MANAGER) for r in user_roles):
            raise HTTPException(
                status_code=403,
                detail="Only managers and administrators can update bank accounts.",
            )

        account = db.get(BankAccount, account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found.")

        changes: dict[str, Any] = {}

        if payload.account_holder_name is not None:
            account.account_holder_name = payload.account_holder_name.strip()
            changes["account_holder_name"] = account.account_holder_name
        if payload.bank_name is not None:
            account.bank_name = payload.bank_name.strip()
            changes["bank_name"] = account.bank_name
        if payload.account_number is not None:
            account.account_number = payload.account_number.strip()
            changes["account_number"] = "updated_redacted"
        if payload.ifsc_code is not None:
            account.ifsc_code = payload.ifsc_code.strip().upper()
            changes["ifsc_code"] = account.ifsc_code
        if payload.branch_name is not None:
            account.branch_name = payload.branch_name.strip()
            changes["branch_name"] = account.branch_name
        if payload.account_type is not None:
            account.account_type = payload.account_type.strip()
            changes["account_type"] = account.account_type
        if payload.upi_id is not None:
            account.upi_id = payload.upi_id.strip() if payload.upi_id else None
            changes["upi_id"] = account.upi_id
        if payload.swift_code is not None:
            account.swift_code = payload.swift_code.strip().upper() if payload.swift_code else None
            changes["swift_code"] = account.swift_code
        if payload.bank_address is not None:
            account.bank_address = payload.bank_address.strip() if payload.bank_address else None
            changes["bank_address"] = account.bank_address
        if payload.currency is not None:
            account.currency = payload.currency.strip().upper()
            changes["currency"] = account.currency
        if payload.status is not None:
            account.status = payload.status.strip().lower()
            changes["status"] = account.status
        if payload.is_public is not None:
            account.is_public = payload.is_public
            changes["is_public"] = account.is_public
        if payload.transfer_instructions is not None:
            account.transfer_instructions = payload.transfer_instructions.strip() if payload.transfer_instructions else None
        if payload.branch_cash_instructions is not None:
            account.branch_cash_instructions = payload.branch_cash_instructions.strip() if payload.branch_cash_instructions else None
        if payload.effective_date is not None:
            account.effective_date = payload.effective_date

        if payload.is_default is True:
            db.query(BankAccount).where(BankAccount.id != account.id).update({"is_default": False})
            account.is_default = True
            changes["is_default"] = True
            cls._sync_to_site_setting(db, account)
        elif payload.is_default is False and account.is_default:
            account.is_default = False
            changes["is_default"] = False

        account.updated_by_user_id = current_user.id
        db.flush()

        if account.is_default:
            cls._sync_to_site_setting(db, account)

        record_audit_log(
            db=db,
            action="bank_account_updated",
            entity_type="bank_account",
            entity_id=str(account.id),
            actor_user_id=current_user.id,
            ip_address=ip_address,
            metadata=changes,
        )
        db.commit()
        db.refresh(account)
        return cls._to_response(account)

    @classmethod
    def set_default_bank_account(
        cls,
        db: Session,
        account_id: UUID,
        current_user: User,
        ip_address: str | None = None,
    ) -> BankAccountResponse:
        """Mark an account as default and synchronize with global SiteSetting."""
        user_roles = get_user_roles(current_user)
        if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_MANAGER) for r in user_roles):
            raise HTTPException(
                status_code=403,
                detail="Only managers and administrators can set default bank accounts.",
            )

        account = db.get(BankAccount, account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found.")

        if account.status != "active":
            raise HTTPException(
                status_code=400,
                detail="Cannot set an inactive bank account as the default.",
            )

        db.query(BankAccount).where(BankAccount.id != account.id).update({"is_default": False})
        account.is_default = True
        account.updated_by_user_id = current_user.id
        db.flush()

        cls._sync_to_site_setting(db, account)

        record_audit_log(
            db=db,
            action="bank_account_default_set",
            entity_type="bank_account",
            entity_id=str(account.id),
            actor_user_id=current_user.id,
            ip_address=ip_address,
            metadata={"bank_name": account.bank_name, "holder": account.account_holder_name},
        )
        db.commit()
        db.refresh(account)
        return cls._to_response(account)

    @classmethod
    def reveal_bank_account(
        cls,
        db: Session,
        account_id: UUID,
        current_user: User,
        ip_address: str | None = None,
    ) -> BankAccountRevealResponse:
        """Explicit authorized action to reveal sensitive bank account number with audit trail."""
        user_roles = get_user_roles(current_user)
        if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_MANAGER) for r in user_roles):
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: full bank account details can only be revealed by authorized finance managers.",
            )

        account = db.get(BankAccount, account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found.")

        # Record audit log without recording the full account number
        record_audit_log(
            db=db,
            action="bank_account_revealed",
            entity_type="bank_account",
            entity_id=str(account.id),
            actor_user_id=current_user.id,
            ip_address=ip_address,
            metadata={
                "bank_name": account.bank_name,
                "account_holder": account.account_holder_name,
                "masked": _mask_account_number(account.account_number),
            },
        )
        db.commit()

        return BankAccountRevealResponse(
            id=account.id,
            account_holder_name=account.account_holder_name,
            bank_name=account.bank_name,
            account_number=account.account_number,
            ifsc_code=account.ifsc_code,
            revealed_at=datetime.now(timezone.utc),
        )

    @classmethod
    def delete_bank_account(
        cls,
        db: Session,
        account_id: UUID,
        current_user: User,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Delete bank account with safeguard preventing deletion if linked to payment records."""
        user_roles = get_user_roles(current_user)
        if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_MANAGER) for r in user_roles):
            raise HTTPException(
                status_code=403,
                detail="Only managers and administrators can delete bank accounts.",
            )

        account = db.get(BankAccount, account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found.")

        # Check if there are existing payments submitted via bank transfer
        existing_payments_count = db.execute(
            select(func.count(Payment.id)).where(
                Payment.provider.in_(["bank_transfer", "branch"])
            )
        ).scalar_one()

        if existing_payments_count > 0 and account.is_default:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cannot delete the default bank account linked to existing payment records. "
                    "Please set another account as default or deactivate this account instead."
                ),
            )

        # Do not allow deletion if it's the only account
        total_accounts = db.execute(select(func.count(BankAccount.id))).scalar_one()
        if total_accounts <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the sole configured bank account. Please edit or deactivate it instead.",
            )

        bank_name = account.bank_name
        masked = _mask_account_number(account.account_number)

        db.delete(account)
        db.flush()

        record_audit_log(
            db=db,
            action="bank_account_deleted",
            entity_type="bank_account",
            entity_id=str(account_id),
            actor_user_id=current_user.id,
            ip_address=ip_address,
            metadata={"bank_name": bank_name, "account_masked": masked},
        )
        db.commit()
        return {"success": True, "message": f"Bank account at {bank_name} successfully deleted."}

    @classmethod
    def export_csv(
        cls,
        db: Session,
        search: str | None = None,
        status: str | None = None,
        current_user: User | None = None,
        ip_address: str | None = None,
    ) -> str:
        """Export bank accounts as CSV with masked account numbers for audit compliance."""
        if current_user:
            user_roles = get_user_roles(current_user)
            if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_MANAGER) for r in user_roles):
                raise HTTPException(
                    status_code=403,
                    detail="Unauthorized to export financial bank account records.",
                )

        accounts = cls.list_bank_accounts(db, page=1, page_size=500, search=search, status=status).items

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID",
            "Account Holder Name",
            "Bank Name",
            "Account Number (Masked)",
            "IFSC Code",
            "Branch Name",
            "Account Type",
            "UPI ID",
            "SWIFT Code",
            "Currency",
            "Status",
            "Is Default",
            "Is Public",
            "Created At",
        ])

        for a in accounts:
            writer.writerow([
                str(a.id),
                a.account_holder_name,
                a.bank_name,
                a.account_number_masked,
                a.ifsc_code,
                a.branch_name,
                a.account_type,
                a.upi_id or "",
                a.swift_code or "",
                a.currency,
                a.status,
                "YES" if a.is_default else "NO",
                "YES" if a.is_public else "NO",
                a.created_at.isoformat(),
            ])

        if current_user:
            record_audit_log(
                db=db,
                action="bank_accounts_exported",
                entity_type="bank_account",
                entity_id="export",
                actor_user_id=current_user.id,
                ip_address=ip_address,
                metadata={"count": len(accounts)},
            )
            db.commit()

        return output.getvalue()
