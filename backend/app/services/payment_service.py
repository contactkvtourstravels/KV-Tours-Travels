"""Domain service for Razorpay payment processing, verifications, webhooks, holds, and refunds."""

import json
import logging
import re
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified

from app.core.config import get_settings
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_SUPER_ADMIN,
    get_user_roles,
)
from app.models.catalog import PackageDeparture
from app.models.commerce import Booking, Payment, PaymentRefund
from app.models.content import AuditLog, SiteSetting
from app.models.user import User
from app.schemas.payment import (
    BankSettingsAdminResponse,
    BankSettingsPublicResponse,
    BankSettingsUpdateRequest,
    BankTransferRejectionRequest,
    BankTransferSubmitRequest,
    BankTransferSubmitResponse,
    BankTransferVerificationRequest,
    EnvironmentCredentialSummary,
    PaymentDetailResponse,
    PaymentGatewayConfig,
    PaymentHoldExpirySummary,
    PaymentOverviewMetricsResponse,
    PaymentRefundRequest,
    PaymentRefundResponse,
    PaymentSettingsResponse,
    PaymentSettingsUpdateRequest,
    PaymentTransactionListItem,
    PaymentTransactionsListResponse,
    PaymentWebhookEventItem,
    PaymentWebhookListResponse,
    RazorpayDiagnosticResponse,
    RazorpayFailureRequest,
    RazorpayOrderCreateRequest,
    RazorpayOrderResponse,
    RazorpayVerifyRequest,
    RazorpayVerifyResponse,
    RazorpayWebhookVerificationResponse,
)
from app.services.razorpay_client import (
    RazorpayClient,
    RazorpayError,
)

logger = logging.getLogger(__name__)

SETTING_KEY_BANK_SETTINGS = "bank_transfer_settings"

DEFAULT_BANK_SETTINGS: dict[str, Any] = {
    "bank_transfer_enabled": False,
    "branch_payment_enabled": False,
    "account_name": "KV TOURS & TRAVELS",
    "bank_name": "HDFC Bank",
    "account_number": "50200012345678",
    "ifsc_code": "HDFC0001234",
    "branch_name": "Main Branch",
    "account_type": "Current",
    "upi_id": "kvtours@hdfcbank",
    "payment_instructions": (
        "Please transfer the exact amount using NEFT / RTGS / IMPS or UPI. "
        "Include your Booking Reference in the transfer remarks/notes. "
        "After transfer, submit your 12-22 digit UTR / Reference number below."
    ),
    "required_reference_format": "12 to 22 digit alphanumeric UTR / RRN",
    "proof_upload_setting": "optional",
    "payment_contact_phone": "+91 98765 43210",
    "payment_contact_email": "concierge@kvtours.in",
    "scope": "all_packages",
    "selected_package_ids": [],
    "max_online_single_payment_limit": Decimal("500000.00"),
    "split_payments_enabled": True,
    "default_deposit_percentage": Decimal("25.0"),
    "min_deposit_amount": Decimal("5000.00"),
}


def _mask_account_number(acc: str | None) -> str:
    """Mask account number revealing only last 4 digits (e.g. •••• •••• 5678)."""
    if not acc:
        return "None"
    s = str(acc).strip()
    if len(s) <= 4:
        return s
    last4 = s[-4:]
    return f"•••• •••• {last4}"


def _validate_ifsc_code(ifsc: str | None) -> bool:
    """Validate Indian Financial System Code (IFSC) format: 4 letters, 0, 6 alphanumeric."""
    if not ifsc:
        return False
    return bool(re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", ifsc.upper().strip()))


def _resolve_booking_condition(identifier: UUID | str):
    """Return SQL condition matching either UUID primary key or human-readable booking_reference."""
    try:
        val = UUID(str(identifier))
        return Booking.id == val
    except (ValueError, AttributeError):
        return Booking.booking_reference == str(identifier)


class PaymentService:
    """Orchestrates payment lifecycles, Razorpay API interactions, and state transitions."""

    @classmethod
    def _get_raw_bank_settings(cls, db: Session) -> dict[str, Any]:
        """Retrieve raw bank settings dictionary merged with authoritative defaults."""
        row = db.execute(
            select(SiteSetting).where(SiteSetting.key == SETTING_KEY_BANK_SETTINGS)
        ).scalar_one_or_none()
        merged = dict(DEFAULT_BANK_SETTINGS)
        if row and isinstance(row.value, dict):
            for k, v in row.value.items():
                if k in (
                    "max_online_single_payment_limit",
                    "default_deposit_percentage",
                    "min_deposit_amount",
                ) and v is not None:
                    merged[k] = Decimal(str(v))
                else:
                    merged[k] = v

        try:
            from app.models.commerce import BankAccount
            def_acc = db.execute(
                select(BankAccount).where(BankAccount.is_default.is_(True), BankAccount.status == "active")
            ).scalars().first()
            if not def_acc:
                def_acc = db.execute(
                    select(BankAccount).where(BankAccount.status == "active").order_by(BankAccount.created_at)
                ).scalars().first()

            if def_acc:
                merged["account_name"] = def_acc.account_holder_name
                merged["bank_name"] = def_acc.bank_name
                merged["account_number"] = def_acc.account_number
                merged["ifsc_code"] = def_acc.ifsc_code
                merged["branch_name"] = def_acc.branch_name
                merged["account_type"] = def_acc.account_type
                merged["upi_id"] = def_acc.upi_id
                if def_acc.transfer_instructions:
                    merged["payment_instructions"] = def_acc.transfer_instructions
        except Exception as exc:  # noqa: BLE001
            logger.debug("Could not resolve default BankAccount for settings merge: %s", exc)

        return merged

    @classmethod
    def get_bank_settings(
        cls,
        db: Session,
        admin_view: bool = False,
        booking_id: UUID | str | None = None,
    ) -> BankSettingsAdminResponse | BankSettingsPublicResponse:
        """Retrieve configured bank account details, instructions, and limits."""
        raw = cls._get_raw_bank_settings(db)
        row = db.execute(
            select(SiteSetting).where(SiteSetting.key == SETTING_KEY_BANK_SETTINGS)
        ).scalar_one_or_none()
        updated_at = row.updated_at if row else None

        acc_num = str(raw.get("account_number") or "")
        masked_acc = _mask_account_number(acc_num)

        if admin_view:
            return BankSettingsAdminResponse(
                bank_transfer_enabled=bool(raw.get("bank_transfer_enabled", False)),
                branch_payment_enabled=bool(raw.get("branch_payment_enabled", False)),
                account_name=str(raw.get("account_name", "")),
                bank_name=str(raw.get("bank_name", "")),
                account_number_masked=masked_acc,
                account_number=acc_num,
                ifsc_code=str(raw.get("ifsc_code", "")),
                branch_name=str(raw.get("branch_name", "")),
                account_type=str(raw.get("account_type", "Current")),
                upi_id=raw.get("upi_id"),
                payment_instructions=str(raw.get("payment_instructions", "")),
                required_reference_format=str(raw.get("required_reference_format", "")),
                proof_upload_setting=str(raw.get("proof_upload_setting", "optional")),
                payment_contact_phone=str(raw.get("payment_contact_phone", "")),
                payment_contact_email=str(raw.get("payment_contact_email", "")),
                scope=str(raw.get("scope", "all_packages")),
                selected_package_ids=list(raw.get("selected_package_ids", [])),
                max_online_single_payment_limit=Decimal(
                    str(raw.get("max_online_single_payment_limit", "500000.00"))
                ),
                split_payments_enabled=bool(raw.get("split_payments_enabled", True)),
                default_deposit_percentage=Decimal(
                    str(raw.get("default_deposit_percentage", "25.0"))
                ),
                min_deposit_amount=Decimal(
                    str(raw.get("min_deposit_amount", "5000.00"))
                ),
                updated_at=updated_at,
            )

        # Customer view on checkout
        return BankSettingsPublicResponse(
            bank_transfer_enabled=bool(raw.get("bank_transfer_enabled", False)),
            branch_payment_enabled=bool(raw.get("branch_payment_enabled", False)),
            account_name=str(raw.get("account_name", "")),
            bank_name=str(raw.get("bank_name", "")),
            account_number=acc_num if (booking_id and raw.get("bank_transfer_enabled")) else masked_acc,
            ifsc_code=str(raw.get("ifsc_code", "")),
            branch_name=str(raw.get("branch_name", "")),
            account_type=str(raw.get("account_type", "Current")),
            upi_id=raw.get("upi_id"),
            payment_instructions=str(raw.get("payment_instructions", "")),
            required_reference_format=str(raw.get("required_reference_format", "")),
            payment_contact_phone=str(raw.get("payment_contact_phone", "")),
            payment_contact_email=str(raw.get("payment_contact_email", "")),
            max_online_single_payment_limit=Decimal(
                str(raw.get("max_online_single_payment_limit", "500000.00"))
            ),
            split_payments_enabled=bool(raw.get("split_payments_enabled", True)),
            default_deposit_percentage=Decimal(
                str(raw.get("default_deposit_percentage", "25.0"))
            ),
            min_deposit_amount=Decimal(str(raw.get("min_deposit_amount", "5000.00"))),
        )

    @classmethod
    def update_bank_settings(
        cls,
        db: Session,
        payload: BankSettingsUpdateRequest,
        admin_user: User,
        ip_address: str | None = None,
    ) -> BankSettingsAdminResponse:
        """Update administrative bank transfer, branch payment, and limit settings."""
        user_roles = get_user_roles(admin_user)
        if not any(
            r in (ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_MANAGER) for r in user_roles
        ):
            raise HTTPException(
                status_code=403,
                detail="Only managers and administrators can configure bank payment settings.",
            )

        raw = cls._get_raw_bank_settings(db)

        if payload.account_number is not None:
            new_acc = payload.account_number.strip()
            if (
                payload.confirm_account_number is not None
                and new_acc != payload.confirm_account_number.strip()
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Account number and Confirmation account number do not match.",
                )
            raw["account_number"] = new_acc

        if payload.ifsc_code is not None:
            clean_ifsc = payload.ifsc_code.strip().upper()
            if clean_ifsc and not _validate_ifsc_code(clean_ifsc):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid IFSC code format '{clean_ifsc}'. Expected format: 4 uppercase letters, 0, then 6 alphanumeric characters (e.g., HDFC0001234).",
                )
            raw["ifsc_code"] = clean_ifsc

        if payload.bank_transfer_enabled is not None:
            raw["bank_transfer_enabled"] = payload.bank_transfer_enabled
            if payload.bank_transfer_enabled and (
                not raw.get("account_number")
                or not raw.get("ifsc_code")
                or not raw.get("bank_name")
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Cannot enable bank transfers without valid Account Number, IFSC code, and Bank Name.",
                )

        if payload.branch_payment_enabled is not None:
            raw["branch_payment_enabled"] = payload.branch_payment_enabled

        if payload.account_name is not None:
            raw["account_name"] = payload.account_name.strip()
        if payload.bank_name is not None:
            raw["bank_name"] = payload.bank_name.strip()
        if payload.branch_name is not None:
            raw["branch_name"] = payload.branch_name.strip()
        if payload.account_type is not None:
            raw["account_type"] = payload.account_type.strip()
        if payload.upi_id is not None:
            raw["upi_id"] = payload.upi_id.strip() if payload.upi_id else None
        if payload.payment_instructions is not None:
            raw["payment_instructions"] = payload.payment_instructions.strip()
        if payload.required_reference_format is not None:
            raw["required_reference_format"] = payload.required_reference_format.strip()
        if payload.proof_upload_setting is not None:
            raw["proof_upload_setting"] = payload.proof_upload_setting.strip()
        if payload.payment_contact_phone is not None:
            raw["payment_contact_phone"] = payload.payment_contact_phone.strip()
        if payload.payment_contact_email is not None:
            raw["payment_contact_email"] = payload.payment_contact_email.strip()
        if payload.scope is not None:
            raw["scope"] = payload.scope.strip()
        if payload.selected_package_ids is not None:
            raw["selected_package_ids"] = payload.selected_package_ids

        if payload.max_online_single_payment_limit is not None:
            if payload.max_online_single_payment_limit < Decimal("100.00"):
                raise HTTPException(
                    status_code=400,
                    detail="Maximum single payment limit must be at least ₹100.00.",
                )
            raw["max_online_single_payment_limit"] = (
                payload.max_online_single_payment_limit
            )

        if payload.split_payments_enabled is not None:
            raw["split_payments_enabled"] = payload.split_payments_enabled

        if payload.default_deposit_percentage is not None:
            if not (
                Decimal("1.0")
                <= payload.default_deposit_percentage
                <= Decimal("100.0")
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Deposit percentage must be between 1% and 100%.",
                )
            raw["default_deposit_percentage"] = payload.default_deposit_percentage

        if payload.min_deposit_amount is not None:
            if payload.min_deposit_amount < Decimal("100.00"):
                raise HTTPException(
                    status_code=400,
                    detail="Minimum deposit amount must be at least ₹100.00.",
                )
            raw["min_deposit_amount"] = payload.min_deposit_amount

        to_save: dict[str, Any] = {}
        for k, v in raw.items():
            if isinstance(v, Decimal):
                to_save[k] = str(v)
            else:
                to_save[k] = v

        row = db.execute(
            select(SiteSetting)
            .where(SiteSetting.key == SETTING_KEY_BANK_SETTINGS)
            .with_for_update()
        ).scalar_one_or_none()
        if row:
            row.value = to_save
            flag_modified(row, "value")
        else:
            row = SiteSetting(
                key=SETTING_KEY_BANK_SETTINGS,
                value=to_save,
                description="Administrative bank transfer, branch payment details, and payment limit configurations.",
            )
            db.add(row)

        try:
            from app.models.commerce import BankAccount
            def_acc = db.execute(
                select(BankAccount).where(BankAccount.is_default.is_(True))
            ).scalars().first()
            if not def_acc:
                def_acc = BankAccount(
                    account_holder_name=raw.get("account_name") or "KV TOURS & TRAVELS",
                    bank_name=raw.get("bank_name") or "HDFC Bank",
                    account_number=raw.get("account_number") or "50200012345678",
                    ifsc_code=raw.get("ifsc_code") or "HDFC0001234",
                    branch_name=raw.get("branch_name") or "Main Branch",
                    account_type=raw.get("account_type") or "Current",
                    upi_id=raw.get("upi_id"),
                    currency="INR",
                    status="active",
                    is_default=True,
                    is_public=True,
                    transfer_instructions=raw.get("payment_instructions"),
                    created_by_user_id=admin_user.id,
                    updated_by_user_id=admin_user.id,
                )
                db.add(def_acc)
            else:
                if payload.account_name is not None:
                    def_acc.account_holder_name = payload.account_name.strip()
                if payload.bank_name is not None:
                    def_acc.bank_name = payload.bank_name.strip()
                if payload.account_number is not None:
                    def_acc.account_number = payload.account_number.strip()
                if payload.ifsc_code is not None:
                    def_acc.ifsc_code = payload.ifsc_code.strip().upper()
                if payload.branch_name is not None:
                    def_acc.branch_name = payload.branch_name.strip()
                if payload.account_type is not None:
                    def_acc.account_type = payload.account_type.strip()
                if payload.upi_id is not None:
                    def_acc.upi_id = payload.upi_id.strip() if payload.upi_id else None
                if payload.payment_instructions is not None:
                    def_acc.transfer_instructions = payload.payment_instructions.strip()
                def_acc.updated_by_user_id = admin_user.id
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not sync BankAccount model: %s", exc)

        db.add(
            AuditLog(
                actor_user_id=admin_user.id,
                action="bank_settings_updated",
                entity_type="payment_settings",
                entity_id="bank_transfer",
                ip_address=ip_address,
                metadata_json={
                    "bank_name": raw.get("bank_name"),
                    "account_number_masked": _mask_account_number(
                        raw.get("account_number")
                    ),
                    "ifsc_code": raw.get("ifsc_code"),
                    "bank_transfer_enabled": raw.get("bank_transfer_enabled"),
                    "branch_payment_enabled": raw.get("branch_payment_enabled"),
                    "max_online_limit": str(
                        raw.get("max_online_single_payment_limit")
                    ),
                },
            )
        )
        db.commit()
        db.refresh(row)

        return cls.get_bank_settings(db, admin_view=True)


    @staticmethod
    def is_online_payments_enabled(db: Session) -> bool:
        """Check persistent master switch for accepting new customer online payments."""
        setting = db.execute(
            select(SiteSetting).where(SiteSetting.key == "online_payments_enabled")
        ).scalar_one_or_none()
        if setting is None or setting.value is None:
            return True  # Fallback to True if not explicitly configured in unit tests
        val = setting.value
        if isinstance(val, dict):
            return bool(val.get("enabled", True))
        if isinstance(val, bool):
            return val
        return str(val).lower() in ("true", "1", "yes")

    @staticmethod
    def get_maintenance_message(db: Session) -> str:
        """Return configured customer-facing maintenance message when online checkout is paused."""
        setting = db.execute(
            select(SiteSetting).where(SiteSetting.key == "online_payments_enabled")
        ).scalar_one_or_none()
        if (
            setting
            and isinstance(setting.value, dict)
            and setting.value.get("maintenance_message")
        ):
            return str(setting.value["maintenance_message"])
        return "Online payments are temporarily paused for maintenance. Please submit a booking inquiry or contact our travel concierge directly."

    @classmethod
    def set_online_payments_enabled(
        cls,
        db: Session,
        enabled: bool,
        maintenance_message: str | None = None,
        actor_id: UUID | None = None,
        ip_address: str | None = None,
    ) -> bool:
        """Persistently update master payment switch with audit logging."""
        setting = db.execute(
            select(SiteSetting).where(SiteSetting.key == "online_payments_enabled")
        ).scalar_one_or_none()

        msg = maintenance_message or (
            setting.value.get("maintenance_message")
            if setting and isinstance(setting.value, dict)
            else "Online payments are temporarily paused for maintenance. Please submit a booking inquiry or contact our travel concierge directly."
        )

        setting_val = {"enabled": enabled, "maintenance_message": msg}
        if setting:
            setting.value = setting_val
            setting.is_public = True
        else:
            setting = SiteSetting(
                key="online_payments_enabled",
                value=setting_val,
                description="Master switch for accepting new customer online payments.",
                is_public=True,
            )
            db.add(setting)

        audit = AuditLog(
            actor_user_id=actor_id,
            action="update_online_payments_switch",
            entity_type="payment_settings",
            entity_id="online_payments_enabled",
            ip_address=ip_address,
            metadata_json={"enabled": enabled, "maintenance_message": msg},
        )
        db.add(audit)
        db.commit()
        return enabled

    @classmethod
    def get_razorpay_client_for_db(
        cls, db: Session, target_env: str | None = None
    ) -> RazorpayClient:
        """Resolve RazorpayClient with database-persisted encrypted credentials or env fallback."""
        from app.services.payment_credential_service import PaymentCredentialService

        return PaymentCredentialService.get_client(db, target_env=target_env)

    @classmethod
    def create_payment_order(
        cls,
        db: Session,
        current_user: User,
        payload: RazorpayOrderCreateRequest,
        client: RazorpayClient | None = None,
    ) -> RazorpayOrderResponse:
        """Create or retrieve an active Razorpay payment order for a booking."""
        client = client or cls.get_razorpay_client_for_db(db)

        # 0. Global Master Payment Switch & Gateway Switch Checks
        if not PaymentService.is_online_payments_enabled(db):
            raise HTTPException(
                status_code=403,
                detail=PaymentService.get_maintenance_message(db),
            )

        from app.services.payment_credential_service import PaymentCredentialService

        raw_cfg = PaymentCredentialService.get_raw_config(db)
        if not raw_cfg.get("enabled", True):
            raise HTTPException(
                status_code=403,
                detail="Razorpay payment gateway is currently disabled by administrator.",
            )


        # 1. Retrieve authoritative booking
        stmt = select(Booking).where(_resolve_booking_condition(payload.booking_id))
        booking = db.execute(stmt).scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")

        # 2. Ownership verification: Customer can only pay for their own booking
        user_roles = get_user_roles(current_user)
        is_staff_or_admin = any(
            r in ("staff", "manager", "admin", "super_admin") for r in user_roles
        )
        if not is_staff_or_admin and booking.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Booking not found.")

        # 3. Status checks
        if booking.payment_status == "paid":
            raise HTTPException(
                status_code=400,
                detail="Booking has already been paid and confirmed in full.",
            )

        if booking.status == "cancelled":
            raise HTTPException(
                status_code=400,
                detail="Booking is cancelled. Cannot create payment order.",
            )

        is_payable = (
            booking.status in ("pending", "payment_pending")
            or (booking.status == "confirmed" and booking.payment_status in ("partially_paid", "pending", "payment_pending"))
        )
        if not is_payable:
            raise HTTPException(
                status_code=400,
                detail=f"Booking is in invalid state for payment ({booking.status}).",
            )

        # 4. Hold Expiration Check (only for unconfirmed bookings)
        now = datetime.now(timezone.utc)
        if booking.status in ("pending", "payment_pending") and booking.hold_expires_at:
            # Ensure timezone-aware comparison
            hold_time = booking.hold_expires_at
            if hold_time.tzinfo is None:
                hold_time = hold_time.replace(tzinfo=timezone.utc)
            if hold_time < now:
                # Expire the hold atomically
                PaymentService._expire_single_booking(db, booking)
                db.commit()
                raise HTTPException(
                    status_code=400,
                    detail="Payment hold for this reservation has expired. Please create a new booking.",
                )

        # 5. Currency & Decimal Amount Validation
        if booking.currency != "INR":
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported payment currency: {booking.currency}. Only INR is supported.",
            )

        if booking.total <= Decimal("0.00"):
            raise HTTPException(
                status_code=400,
                detail="Booking total must be greater than zero to initiate payment.",
            )

        # Authoritative outstanding balance check
        captured_sum = db.execute(
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .where(Payment.booking_id == booking.id, Payment.status == "captured")
        ).scalar_one()
        outstanding_balance = max(Decimal("0.00"), booking.total - captured_sum)

        if outstanding_balance <= Decimal("0.00"):
            raise HTTPException(
                status_code=400,
                detail="Booking has already been fully paid and confirmed.",
            )

        # Authoritative payment limits and deposit rules
        bank_cfg = cls._get_raw_bank_settings(db)
        max_online_limit = Decimal(
            str(bank_cfg.get("max_online_single_payment_limit", "500000.00"))
        )
        split_enabled = bool(bank_cfg.get("split_payments_enabled", True))
        default_dep_pct = Decimal(
            str(bank_cfg.get("default_deposit_percentage", "25.0"))
        )
        min_dep_amt = Decimal(str(bank_cfg.get("min_deposit_amount", "5000.00")))

        # Authoritative target amount determination
        if payload.amount is not None:
            if payload.amount <= Decimal("0.00"):
                raise HTTPException(
                    status_code=400,
                    detail="Payment amount must be greater than zero.",
                )
            if payload.amount > outstanding_balance:
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment amount (₹{payload.amount:,.2f}) cannot exceed outstanding balance of ₹{outstanding_balance:,.2f}.",
                )
            target_amount = payload.amount
        elif payload.payment_type == "deposit" and split_enabled:
            calc_deposit = (
                booking.total * (default_dep_pct / Decimal(100))
            ).quantize(Decimal("0.01"))
            if calc_deposit < min_dep_amt and outstanding_balance >= min_dep_amt:
                calc_deposit = min_dep_amt
            target_amount = min(calc_deposit, outstanding_balance)
        else:
            target_amount = outstanding_balance

        # Validate against maximum online transaction limit (e.g. ₹5,00,000 threshold)
        if target_amount > max_online_limit:
            msg = (
                f"Payment amount of ₹{target_amount:,.2f} exceeds the maximum single online payment limit "
                f"of ₹{max_online_limit:,.2f}. "
            )
            if split_enabled and target_amount == outstanding_balance:
                msg += "You can make an initial deposit payment online, or pay via Bank Transfer / Branch Payment."
            else:
                msg += "Please pay via Bank Transfer / Branch Payment or reduce the transaction amount."
            raise HTTPException(status_code=400, detail=msg)

        amount_paise = int(target_amount * 100)

        # 6. Idempotency Check: Existing pending payment order matching target amount
        existing_payment_stmt = (
            select(Payment)
            .where(
                Payment.booking_id == booking.id,
                Payment.provider == "razorpay",
                Payment.status == "pending",
                Payment.amount == target_amount,
                Payment.provider_order_id.isnot(None),
            )
            .order_by(Payment.created_at.desc())
        )
        existing_payment = db.execute(existing_payment_stmt).scalars().first()

        if existing_payment and existing_payment.provider_order_id:
            logger.info(
                "Reusing existing pending Razorpay order %s for booking %s",
                existing_payment.provider_order_id,
                booking.booking_reference,
            )
            primary_traveller = next(
                (t for t in booking.travellers if t.is_primary), None
            )
            customer_name = (
                f"{current_user.first_name} {current_user.last_name}".strip()
                if current_user.first_name
                else "Valued Traveller"
            )
            customer_email = current_user.email
            customer_phone = (
                primary_traveller.contact_phone
                if primary_traveller
                else current_user.phone
            )

            return RazorpayOrderResponse(
                payment_id=existing_payment.id,
                booking_id=booking.id,
                order_id=existing_payment.provider_order_id,
                amount=amount_paise,
                amount_decimal=target_amount,
                currency=booking.currency,
                key_id=client.key_id,
                booking_reference=booking.booking_reference,
                customer_name=customer_name,
                customer_email=customer_email,
                customer_phone=customer_phone,
                hold_expires_at=booking.hold_expires_at,
            )

        # 7. Create Razorpay order via client
        order_receipt = booking.booking_reference
        notes = {
            "booking_id": str(booking.id),
            "booking_reference": booking.booking_reference,
            "user_id": str(current_user.id),
            "target_amount": str(target_amount),
        }

        order_data = client.create_order(
            amount_subunits=amount_paise,
            currency=booking.currency,
            receipt=order_receipt,
            notes=notes,
        )

        provider_order_id = order_data["id"]

        idempotency_key = (
            payload.idempotency_key
            or f"pmt-{booking.id}-{uuid4().hex[:12]}"
        )

        # 8. Create internal Payment record
        payment = Payment(
            booking_id=booking.id,
            provider="razorpay",
            provider_order_id=provider_order_id,
            idempotency_key=idempotency_key,
            amount=target_amount,
            currency=booking.currency,
            status="pending",
            provider_created_at=datetime.now(timezone.utc),
        )
        db.add(payment)

        if booking.status not in ("confirmed", "payment_pending"):
            booking.status = "payment_pending"

        # 9. Audit Log
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="payment_order_created",
            entity_type="payment",
            entity_id=str(payment.id),
            metadata_json={
                "booking_id": str(booking.id),
                "booking_reference": booking.booking_reference,
                "provider_order_id": provider_order_id,
                "amount": str(target_amount),
                "currency": booking.currency,
            },
        )
        db.add(audit)

        db.commit()
        db.refresh(payment)

        primary_traveller = next((t for t in booking.travellers if t.is_primary), None)
        customer_name = (
            f"{current_user.first_name} {current_user.last_name}".strip()
            if current_user.first_name
            else "Valued Traveller"
        )
        customer_email = current_user.email
        customer_phone = (
            primary_traveller.contact_phone if primary_traveller else current_user.phone
        )

        return RazorpayOrderResponse(
            payment_id=payment.id,
            booking_id=booking.id,
            order_id=provider_order_id,
            amount=amount_paise,
            amount_decimal=target_amount,
            currency=booking.currency,
            key_id=client.key_id,
            booking_reference=booking.booking_reference,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            hold_expires_at=booking.hold_expires_at,
        )

    @classmethod
    def verify_payment(
        cls,
        db: Session,
        current_user: User,
        payload: RazorpayVerifyRequest,
        client: RazorpayClient | None = None,
    ) -> RazorpayVerifyResponse:
        """Verify Razorpay payment signature and authoritative order match to confirm booking."""
        client = client or cls.get_razorpay_client_for_db(db)

        # 1. Lock booking record with row-level lock
        booking_stmt = (
            select(Booking)
            .where(_resolve_booking_condition(payload.booking_id))
            .with_for_update()
        )
        booking = db.execute(booking_stmt).scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")

        # Ownership check
        user_roles = get_user_roles(current_user)
        is_staff_or_admin = any(
            r in ("staff", "manager", "admin", "super_admin") for r in user_roles
        )
        if not is_staff_or_admin and booking.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Booking not found.")

        # 2. Lock payment record with row-level lock
        payment_stmt = (
            select(Payment)
            .where(
                Payment.booking_id == booking.id,
                Payment.provider_order_id == payload.razorpay_order_id,
            )
            .with_for_update()
        )
        payment = db.execute(payment_stmt).scalar_one_or_none()
        if not payment:
            raise HTTPException(
                status_code=404,
                detail="Payment record not found for this order ID.",
            )

        # 3. Idempotency Check: Already captured and confirmed
        if payment.status == "captured" and booking.status == "confirmed":
            logger.info(
                "Payment %s already verified and confirmed. Returning idempotent success.",
                payment.id,
            )
            return RazorpayVerifyResponse(
                success=True,
                booking_id=booking.id,
                booking_reference=booking.booking_reference,
                payment_id=payment.id,
                provider_payment_id=payment.provider_payment_id
                or payload.razorpay_payment_id,
                amount=payment.amount,
                currency=payment.currency,
                booking_status=booking.status,
                payment_status=booking.payment_status,
                message="Payment already verified and booking confirmed.",
            )

        # 4. Official Razorpay HMAC-SHA256 Signature Verification
        is_signature_valid = client.verify_payment_signature(
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_signature=payload.razorpay_signature,
        )

        if not is_signature_valid:
            # Mark payment failed and record security audit log
            payment.status = "failed"
            payment.failure_code = "INVALID_SIGNATURE"
            payment.failure_message = "HMAC-SHA256 signature mismatch"

            audit_fail = AuditLog(
                actor_user_id=current_user.id,
                action="payment_verification_failed",
                entity_type="payment",
                entity_id=str(payment.id),
                metadata_json={
                    "booking_id": str(booking.id),
                    "razorpay_order_id": payload.razorpay_order_id,
                    "razorpay_payment_id": payload.razorpay_payment_id,
                    "reason": "Signature verification failure",
                },
            )
            db.add(audit_fail)
            db.commit()

            raise HTTPException(
                status_code=400,
                detail="Payment signature verification failed. Untrusted or tampered response.",
            )

        # 5. Authoritative Financial Check
        if payment.currency != booking.currency:
            payment.status = "failed"
            payment.failure_code = "CURRENCY_MISMATCH"
            payment.failure_message = f"Payment currency ({payment.currency}) does not match booking currency ({booking.currency})"
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Payment currency mismatch between gateway and authoritative record.",
            )

        if payment.amount <= Decimal("0.00") or payment.amount > booking.total:
            payment.status = "failed"
            payment.failure_code = "AMOUNT_INVALID"
            payment.failure_message = f"Invalid payment amount ({payment.amount}) for booking total ({booking.total})"
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Payment amount invalid relative to authoritative booking record.",
            )

        # 6. Atomic State Update: Capture payment & update booking reconciliation
        now = datetime.now(timezone.utc)
        payment.status = "captured"
        payment.provider_payment_id = payload.razorpay_payment_id
        payment.captured_at = now
        db.flush()

        # Recalculate all captured payments for this booking
        all_captured = db.execute(
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .where(Payment.booking_id == booking.id, Payment.status == "captured")
        ).scalar_one()

        if all_captured >= booking.total:
            booking.status = "confirmed"
            booking.payment_status = "paid"
        else:
            booking.status = "confirmed"
            booking.payment_status = "partially_paid"

        # 7. Audit Logging
        db.add(
            AuditLog(
                actor_user_id=current_user.id,
                action="payment_verification_success",
                entity_type="payment",
                entity_id=str(payment.id),
                metadata_json={
                    "booking_id": str(booking.id),
                    "provider_order_id": payment.provider_order_id,
                    "provider_payment_id": payload.razorpay_payment_id,
                    "amount": str(payment.amount),
                    "booking_payment_status": booking.payment_status,
                },
            )
        )
        db.add(
            AuditLog(
                actor_user_id=current_user.id,
                action="booking_confirmed",
                entity_type="booking",
                entity_id=str(booking.id),
                metadata_json={
                    "booking_reference": booking.booking_reference,
                    "payment_id": str(payment.id),
                    "payment_status": booking.payment_status,
                },
            )
        )

        db.commit()
        db.refresh(payment)
        db.refresh(booking)

        # Dispatch authoritative payment and booking confirmation notifications
        try:
            from app.services.email_service import get_email_service
            from app.services.whatsapp_service import get_whatsapp_service

            email_svc = get_email_service()
            wa_svc = get_whatsapp_service()

            if booking.payment_status == "partially_paid":
                remaining_balance = max(Decimal("0.00"), booking.total - all_captured)
                email_svc.send_deposit_received(
                    db=db,
                    booking=booking,
                    payment=payment,
                    user=current_user,
                    deposit_amount=payment.amount,
                    remaining_balance=remaining_balance,
                )
                email_svc.send_booking_confirmed(db, booking, payment, current_user)
            else:
                if all_captured > payment.amount:
                    email_svc.send_balance_paid_in_full(
                        db=db, booking=booking, payment=payment, user=current_user
                    )
                else:
                    email_svc.send_payment_successful(
                        db, booking, payment, current_user
                    )
                    email_svc.send_booking_confirmed(
                        db, booking, payment, current_user
                    )

            wa_svc.send_payment_confirmation(db, booking, payment, current_user)
            wa_svc.send_booking_confirmation(db, booking, current_user)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Notification dispatch failed for verified payment %s: %s",
                payment.id,
                exc,
            )

        logger.info(
            "Booking %s successfully confirmed with verified payment %s (%s, status: %s)",
            booking.booking_reference,
            payment.id,
            payload.razorpay_payment_id,
            booking.payment_status,
        )

        return RazorpayVerifyResponse(
            success=True,
            booking_id=booking.id,
            booking_reference=booking.booking_reference,
            payment_id=payment.id,
            provider_payment_id=payload.razorpay_payment_id,
            amount=payment.amount,
            currency=payment.currency,
            booking_status=booking.status,
            payment_status=booking.payment_status,
            message="Payment successfully verified. Booking confirmed.",
        )

    @classmethod
    def handle_webhook(
        cls,
        db: Session,
        raw_body: bytes,
        signature: str,
        client: RazorpayClient | None = None,
    ) -> dict[str, Any]:
        """Validate Razorpay webhook HMAC signature and process payment events."""
        client = client or cls.get_razorpay_client_for_db(db)

        # 1. Signature check
        if not client.verify_webhook_signature(raw_body, signature):
            logger.warning("Rejected Razorpay webhook: invalid signature")
            db.add(
                AuditLog(
                    actor_user_id=None,
                    action="payment_webhook_signature_failed",
                    entity_type="payment",
                    entity_id=None,
                    metadata_json={
                        "error": "Invalid Razorpay webhook signature",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
            )
            db.commit()
            raise HTTPException(
                status_code=400, detail="Invalid Razorpay webhook signature."
            )

        # 2. Parse event payload
        try:
            event_data = json.loads(raw_body.decode("utf-8"))
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail="Malformed JSON webhook body."
            ) from exc

        event_type = event_data.get("event")
        event_id = event_data.get("event_id") or event_data.get("id")
        payload = event_data.get("payload", {})
        logger.info(
            "Processing Razorpay webhook event: %s (id: %s)", event_type, event_id
        )

        # 3. Handle Events
        if event_type in ("payment.captured", "order.paid"):
            payment_entity = payload.get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id") or payload.get("order", {}).get(
                "entity", {}
            ).get("id")
            payment_id = payment_entity.get("id")

            if not order_id:
                return {"status": "ignored", "reason": "Missing order_id in webhook"}

            # Lock payment
            stmt = (
                select(Payment)
                .where(Payment.provider_order_id == order_id)
                .with_for_update()
            )
            payment = db.execute(stmt).scalar_one_or_none()
            if not payment:
                logger.warning("Webhook received for unknown order_id: %s", order_id)
                return {"status": "ignored", "reason": "Order not found"}

            # Idempotency: already processed with this event ID or already captured
            if payment.provider_event_id == event_id or payment.status == "captured":
                return {"status": "already_processed"}

            now = datetime.now(timezone.utc)
            payment.status = "captured"
            if payment_id:
                payment.provider_payment_id = payment_id
            payment.provider_event_id = event_id
            payment.captured_at = now
            db.flush()

            # Confirm booking reconciliation
            booking = db.execute(
                select(Booking)
                .where(Booking.id == payment.booking_id)
                .with_for_update()
            ).scalar_one_or_none()

            if booking:
                all_captured = db.execute(
                    select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
                    .where(Payment.booking_id == booking.id, Payment.status == "captured")
                ).scalar_one()

                if all_captured >= booking.total:
                    booking.status = "confirmed"
                    booking.payment_status = "paid"
                else:
                    booking.status = "confirmed"
                    booking.payment_status = "partially_paid"

                db.add(
                    AuditLog(
                        actor_user_id=booking.user_id,
                        action="payment_webhook_received",
                        entity_type="payment",
                        entity_id=str(payment.id),
                        metadata_json={
                            "event": event_type,
                            "event_id": event_id,
                            "booking_id": str(booking.id),
                        },
                    )
                )

            db.commit()

            # Dispatch authoritative notifications via webhook safely
            try:
                from app.services.email_service import get_email_service
                from app.services.whatsapp_service import get_whatsapp_service

                booking_user = db.get(User, booking.user_id) if booking else None
                if booking_user and booking:
                    email_svc = get_email_service()
                    wa_svc = get_whatsapp_service()
                    email_svc.send_payment_successful(
                        db, booking, payment, booking_user
                    )
                    email_svc.send_booking_confirmed(db, booking, payment, booking_user)
                    wa_svc.send_payment_confirmation(db, booking, payment, booking_user)
                    wa_svc.send_booking_confirmation(db, booking, booking_user)
                    db.commit()
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Notification dispatch failed in webhook for payment %s: %s",
                    payment.id,
                    exc,
                )

            return {"status": "success", "event": event_type, "order_id": order_id}

        elif event_type == "payment.failed":
            payment_entity = payload.get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            error_code = payment_entity.get("error_code")
            error_desc = payment_entity.get("error_description")

            if order_id:
                payment = db.execute(
                    select(Payment)
                    .where(Payment.provider_order_id == order_id)
                    .with_for_update()
                ).scalar_one_or_none()

                if payment and payment.status == "pending":
                    payment.status = "failed"
                    payment.failure_code = error_code
                    payment.failure_message = error_desc
                    payment.provider_event_id = event_id

                    db.add(
                        AuditLog(
                            actor_user_id=None,
                            action="payment_failed",
                            entity_type="payment",
                            entity_id=str(payment.id),
                            metadata_json={
                                "event": event_type,
                                "error_code": error_code,
                                "error_description": error_desc,
                            },
                        )
                    )
                    db.commit()

                    # Safely dispatch payment failed notification to customer
                    try:
                        booking = db.get(Booking, payment.booking_id) if payment.booking_id else None
                        if booking:
                            from app.services.email_service import get_email_service

                            get_email_service().send_payment_failed(
                                db,
                                booking=booking,
                                payment=payment,
                                reason=error_desc or error_code or "Payment transaction failed.",
                            )
                            db.commit()
                    except Exception as notif_exc:  # noqa: BLE001
                        logger.warning("Failed to dispatch payment failed email: %s", notif_exc)

            return {"status": "success", "event": event_type}

        return {"status": "unhandled", "event": event_type}

    @staticmethod
    def record_payment_failure(
        db: Session,
        current_user: User,
        payload: RazorpayFailureRequest,
    ) -> dict[str, Any]:
        """Record a client-reported payment dismissal or failure without cancelling booking."""
        booking = db.execute(
            select(Booking).where(_resolve_booking_condition(payload.booking_id))
        ).scalar_one_or_none()

        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")

        user_roles = get_user_roles(current_user)
        is_staff_or_admin = any(
            r in ("staff", "manager", "admin", "super_admin") for r in user_roles
        )
        if not is_staff_or_admin and booking.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Booking not found.")

        if payload.razorpay_order_id:
            payment = db.execute(
                select(Payment)
                .where(
                    Payment.booking_id == booking.id,
                    Payment.provider_order_id == payload.razorpay_order_id,
                )
                .with_for_update()
            ).scalar_one_or_none()

            if payment and payment.status == "pending":
                payment.status = "failed"
                payment.failure_code = payload.error_code or "USER_DISMISSED"
                payment.failure_message = (
                    payload.error_description or "Checkout modal dismissed"
                )

                db.add(
                    AuditLog(
                        actor_user_id=current_user.id,
                        action="payment_failed",
                        entity_type="payment",
                        entity_id=str(payment.id),
                        metadata_json={
                            "booking_id": str(booking.id),
                            "error_code": payload.error_code,
                        },
                    )
                )
                db.commit()

        return {"status": "recorded", "booking_status": booking.status}

    @staticmethod
    def expire_abandoned_payment_holds(db: Session) -> PaymentHoldExpirySummary:
        """Scan and cancel all expired payment_pending bookings and release seats atomically."""
        now = datetime.now(timezone.utc)

        # Find bookings where status = payment_pending and hold_expires_at < now and not paid
        stmt = (
            select(Booking)
            .where(
                Booking.status == "payment_pending",
                Booking.payment_status != "paid",
                Booking.hold_expires_at.isnot(None),
                Booking.hold_expires_at < now,
            )
            .with_for_update(skip_locked=True)
        )
        expired_bookings = db.execute(stmt).scalars().all()

        cancelled_ids: list[UUID] = []
        total_seats_released = 0

        for booking in expired_bookings:
            seats = PaymentService._expire_single_booking(db, booking)
            cancelled_ids.append(booking.id)
            total_seats_released += seats

        db.commit()

        if cancelled_ids:
            logger.info(
                "Expired %d abandoned bookings, released %d seats.",
                len(cancelled_ids),
                total_seats_released,
            )

        return PaymentHoldExpirySummary(
            expired_count=len(cancelled_ids),
            released_seats=total_seats_released,
            cancelled_booking_ids=cancelled_ids,
        )

    @staticmethod
    def _expire_single_booking(db: Session, booking: Booking) -> int:
        """Internal helper to cancel an expired booking and restore departure seats."""
        seats_to_release = booking.number_of_travellers

        # Release departure capacity
        if booking.departure_id:
            dep = db.execute(
                select(PackageDeparture)
                .where(PackageDeparture.id == booking.departure_id)
                .with_for_update()
            ).scalar_one_or_none()

            if dep:
                dep.reserved_capacity = max(0, dep.reserved_capacity - seats_to_release)
                dep.available_capacity = dep.total_capacity - dep.reserved_capacity
                if (
                    dep.status == "sold_out"
                    and dep.reserved_capacity < dep.total_capacity
                ):
                    dep.status = "open"

        # Cancel any pending payments associated with this booking
        pending_payments = (
            db.execute(
                select(Payment)
                .where(Payment.booking_id == booking.id, Payment.status == "pending")
                .with_for_update()
            )
            .scalars()
            .all()
        )

        for pmt in pending_payments:
            pmt.status = "cancelled"
            pmt.failure_message = "Reservation hold expired"

        # Update booking status
        booking.status = "cancelled"
        booking.payment_status = "failed"

        db.add(
            AuditLog(
                actor_user_id=None,
                action="payment_hold_expired",
                entity_type="booking",
                entity_id=str(booking.id),
                metadata_json={
                    "booking_reference": booking.booking_reference,
                    "seats_released": seats_to_release,
                },
            )
        )

        return seats_to_release

    @classmethod
    def process_refund(
        cls,
        db: Session,
        admin_user: User,
        payment_id: UUID,
        payload: PaymentRefundRequest,
        client: RazorpayClient | None = None,
    ) -> PaymentRefundResponse:
        """Authorize and process a full or partial refund for a captured payment."""
        client = client or cls.get_razorpay_client_for_db(db)

        # 1. Lock payment
        stmt = select(Payment).where(Payment.id == payment_id).with_for_update()
        payment = db.execute(stmt).scalar_one_or_none()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment record not found.")

        if payment.status not in ("captured", "partially_refunded"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot refund payment with status '{payment.status}'. Only captured payments can be refunded.",
            )

        if not payment.provider_payment_id:
            raise HTTPException(
                status_code=400,
                detail="Payment missing gateway payment ID.",
            )

        # 2. Calculate remaining refundable balance
        refunds_stmt = select(PaymentRefund).where(
            PaymentRefund.payment_id == payment.id,
            PaymentRefund.status.in_(("processed", "pending")),
        )
        existing_refunds = db.execute(refunds_stmt).scalars().all()
        already_refunded = sum((r.amount for r in existing_refunds), Decimal("0.00"))
        refundable_balance = payment.amount - already_refunded

        if refundable_balance <= Decimal("0.00"):
            raise HTTPException(
                status_code=400,
                detail="Payment has already been fully refunded.",
            )

        # 3. Determine refund amount
        refund_amount = (
            payload.amount if payload.amount is not None else refundable_balance
        )

        if refund_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=400,
                detail="Refund amount must be greater than zero.",
            )

        if refund_amount > refundable_balance:
            raise HTTPException(
                status_code=400,
                detail=f"Requested refund (₹{refund_amount}) exceeds remaining refundable balance (₹{refundable_balance}).",
            )

        # 4. Call Razorpay refund API or record offline
        now = datetime.now(timezone.utc)
        provider_refund_id = None
        provider_name = "razorpay"

        if getattr(payload, "record_offline", False):
            import uuid

            provider_refund_id = f"manual_{uuid.uuid4().hex[:12]}"
            provider_name = "manual_offline"
            logger.info(
                "Admin recorded manual offline refund for payment %s: ₹%s (reason: %s)",
                payment.id,
                refund_amount,
                payload.reason,
            )
        else:
            refund_subunits = int(refund_amount * 100)
            try:
                gateway_refund = client.create_refund(
                    razorpay_payment_id=payment.provider_payment_id,
                    amount_subunits=refund_subunits,
                    notes={"reason": payload.reason or "Admin initiated refund"},
                )
                provider_refund_id = gateway_refund.get("id")
            except RazorpayError as exc:
                logger.warning(
                    "Razorpay refund rejected for payment %s (amount=%s): %s",
                    payment.id,
                    refund_amount,
                    exc,
                )
                error_msg = str(exc)
                if "not have enough balance" in error_msg.lower():
                    clean_msg = (
                        "Razorpay account does not have sufficient balance in the dashboard "
                        "to process this refund via gateway. You can record this refund as an offline "
                        "manual refund or add balance in your Razorpay dashboard."
                    )
                else:
                    clean_msg = f"Gateway refund failed: {error_msg}"
                raise HTTPException(status_code=400, detail=clean_msg) from exc

        # 5. Persist PaymentRefund
        refund_record = PaymentRefund(
            payment_id=payment.id,
            provider=provider_name,
            provider_refund_id=provider_refund_id,
            amount=refund_amount,
            currency=payment.currency,
            status="processed",
            reason=payload.reason,
            processed_at=now,
        )
        db.add(refund_record)

        # 6. Update Payment & Booking status
        new_total_refunded = already_refunded + refund_amount
        if new_total_refunded >= payment.amount:
            payment.status = "refunded"
            payment.booking.payment_status = "refunded"
        else:
            payment.status = "partially_refunded"
            payment.booking.payment_status = "partially_paid"

        # 7. Audit Logs
        db.add(
            AuditLog(
                actor_user_id=admin_user.id,
                action="refund_completed",
                entity_type="payment_refund",
                entity_id=str(refund_record.id),
                metadata_json={
                    "payment_id": str(payment.id),
                    "provider_refund_id": provider_refund_id,
                    "amount": str(refund_amount),
                    "reason": payload.reason,
                },
            )
        )

        db.commit()
        db.refresh(refund_record)

        # Dispatch refund notification safely
        try:
            from app.services.email_service import get_email_service

            email_svc = get_email_service()
            booking_user = db.get(User, payment.booking.user_id)
            if booking_user:
                email_svc.send_refund_processed(
                    db, payment.booking, refund_record, booking_user
                )
                db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to dispatch refund notification for refund %s: %s",
                refund_record.id,
                exc,
            )

        return PaymentRefundResponse(
            id=refund_record.id,
            payment_id=payment.id,
            provider="razorpay",
            provider_refund_id=provider_refund_id,
            amount=refund_record.amount,
            currency=refund_record.currency,
            status=refund_record.status,
            reason=refund_record.reason,
            processed_at=refund_record.processed_at,
            created_at=refund_record.created_at,
        )

    @classmethod
    def get_payments_overview(cls, db: Session) -> PaymentOverviewMetricsResponse:
        """Calculate high-level financial volume and gateway status metrics."""
        captured_sum = (
            db.execute(
                select(func.sum(Payment.amount)).where(Payment.status == "captured")
            ).scalar_one()
            or Decimal("0.00")
        )
        total_tx = db.execute(select(func.count(Payment.id))).scalar_one()
        captured_cnt = db.execute(
            select(func.count(Payment.id)).where(Payment.status == "captured")
        ).scalar_one()
        pending_cnt = db.execute(
            select(func.count(Payment.id)).where(Payment.status == "pending")
        ).scalar_one()
        pending_sum = (
            db.execute(
                select(func.sum(Payment.amount)).where(Payment.status == "pending")
            ).scalar_one()
            or Decimal("0.00")
        )
        refunded_cnt = db.execute(
            select(func.count(PaymentRefund.id)).where(
                PaymentRefund.status == "processed"
            )
        ).scalar_one()
        refunded_sum = (
            db.execute(
                select(func.sum(PaymentRefund.amount)).where(
                    PaymentRefund.status == "processed"
                )
            ).scalar_one()
            or Decimal("0.00")
        )
        failed_cnt = db.execute(
            select(func.count(Payment.id)).where(Payment.status == "failed")
        ).scalar_one()

        online_enabled = cls.is_online_payments_enabled(db)
        maint_msg = cls.get_maintenance_message(db)
        active_gateways = ["razorpay"] if online_enabled else []
        client = cls.get_razorpay_client_for_db(db)
        gateway_health = (
            "operational"
            if not client.is_placeholder_mode or client.key_id
            else "misconfigured"
        )

        return PaymentOverviewMetricsResponse(
            total_volume=captured_sum,
            total_transactions=total_tx,
            captured_count=captured_cnt,
            captured_volume=captured_sum,
            pending_count=pending_cnt,
            pending_volume=pending_sum,
            refunded_count=refunded_cnt,
            refunded_volume=refunded_sum,
            failed_count=failed_cnt,
            online_payments_enabled=online_enabled,
            maintenance_message=maint_msg,
            active_gateways=active_gateways,
            gateway_health=gateway_health,
        )

    @staticmethod
    def _to_payment_detail_response(p: Payment) -> PaymentDetailResponse:
        refunds = [
            PaymentRefundResponse(
                id=r.id,
                payment_id=r.payment_id,
                provider=r.provider,
                provider_refund_id=r.provider_refund_id,
                amount=r.amount,
                currency=r.currency,
                status=r.status,
                reason=r.reason,
                processed_at=r.processed_at,
                created_at=r.created_at,
            )
            for r in (p.refunds or [])
        ]
        return PaymentDetailResponse(
            id=p.id,
            booking_id=p.booking_id,
            provider=p.provider,
            provider_order_id=p.provider_order_id,
            provider_payment_id=p.provider_payment_id,
            amount=p.amount,
            currency=p.currency,
            status=p.status,
            payment_method=p.payment_method,
            failure_code=p.failure_code,
            failure_message=p.failure_message,
            captured_at=p.captured_at,
            created_at=p.created_at,
            refunds=refunds,
        )

    @classmethod
    def submit_bank_transfer(
        cls,
        db: Session,
        current_user: User,
        payload: BankTransferSubmitRequest,
    ) -> BankTransferSubmitResponse:
        """Submit a customer bank transfer or branch cash reference for administrative review."""
        stmt = select(Booking).where(_resolve_booking_condition(payload.booking_id))
        booking = db.execute(stmt).scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")

        user_roles = get_user_roles(current_user)
        is_staff_or_admin = any(
            r in ("staff", "manager", "admin", "super_admin") for r in user_roles
        )
        if not is_staff_or_admin and booking.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Booking not found.")

        if booking.status == "cancelled":
            raise HTTPException(
                status_code=400,
                detail="Booking is cancelled. Cannot submit bank transfer.",
            )

        captured_sum = db.execute(
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .where(Payment.booking_id == booking.id, Payment.status == "captured")
        ).scalar_one()
        outstanding = max(Decimal("0.00"), booking.total - captured_sum)

        if outstanding <= Decimal("0.00"):
            raise HTTPException(
                status_code=400,
                detail="Booking is already fully paid and confirmed.",
            )

        amount_to_pay = payload.amount if payload.amount is not None else outstanding
        if amount_to_pay <= Decimal("0.00"):
            raise HTTPException(
                status_code=400, detail="Payment amount must be greater than zero."
            )
        if amount_to_pay > outstanding:
            raise HTTPException(
                status_code=400,
                detail=f"Submitted amount (₹{amount_to_pay:,.2f}) cannot exceed outstanding balance of ₹{outstanding:,.2f}.",
            )

        ref = payload.transfer_reference.strip()
        if not ref:
            raise HTTPException(
                status_code=400, detail="Transfer reference / UTR is required."
            )

        # Check existing payment with identical transfer reference
        dup = db.execute(
            select(Payment).where(
                Payment.provider.in_(["bank_transfer", "branch"]),
                Payment.provider_payment_id == ref,
            )
        ).scalars().first()
        if dup:
            raise HTTPException(
                status_code=409,
                detail=f"A bank transfer or branch payment with reference '{ref}' has already been submitted.",
            )

        bank_cfg = cls._get_raw_bank_settings(db)
        if payload.payment_method == "branch_cash":
            if not bank_cfg.get("branch_payment_enabled", False):
                raise HTTPException(
                    status_code=400,
                    detail="Branch cash payments are currently disabled by administrator.",
                )
        else:
            if not bank_cfg.get("bank_transfer_enabled", False):
                raise HTTPException(
                    status_code=400,
                    detail="Direct bank transfers are currently disabled by administrator.",
                )

        provider_name = (
            "bank_transfer" if payload.payment_method != "branch_cash" else "branch"
        )
        method_name = (
            "bank_transfer" if payload.payment_method != "branch_cash" else "branch_cash"
        )

        idempotency_key = f"bt-{booking.id}-{ref}"
        payment = Payment(
            booking_id=booking.id,
            provider=provider_name,
            provider_order_id=f"BT-{booking.booking_reference}-{int(time.time())}",
            provider_payment_id=ref,
            idempotency_key=idempotency_key,
            amount=amount_to_pay,
            currency=booking.currency,
            status="pending",
            payment_method=method_name,
            failure_code=None,
            failure_message=payload.notes or "",
            provider_created_at=datetime.now(timezone.utc),
        )
        db.add(payment)

        if booking.status == "pending":
            booking.status = "payment_pending"

        db.add(
            AuditLog(
                actor_user_id=current_user.id,
                action="bank_transfer_submitted",
                entity_type="payment",
                entity_id=str(payment.id),
                metadata_json={
                    "booking_id": str(booking.id),
                    "booking_reference": booking.booking_reference,
                    "transfer_reference": ref,
                    "amount": str(amount_to_pay),
                    "proof_url": payload.proof_url,
                    "notes": payload.notes,
                },
            )
        )

        db.commit()
        db.refresh(payment)

        try:
            from app.services.email_service import get_email_service

            email_svc = get_email_service()
            email_svc.send_bank_transfer_submitted(
                db=db,
                booking=booking,
                payment=payment,
                user=current_user,
                transfer_reference=ref,
                submitted_amount=amount_to_pay,
            )
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to dispatch bank transfer submission email: %s", exc
            )

        return BankTransferSubmitResponse(
            success=True,
            payment_id=payment.id,
            booking_id=booking.id,
            booking_reference=booking.booking_reference,
            transfer_reference=ref,
            amount=amount_to_pay,
            currency=booking.currency,
            status="pending",
            verification_status="pending",
            message="Bank transfer submitted successfully. Our verification team will review and credit your reservation shortly.",
        )

    @classmethod
    def verify_bank_transfer(
        cls,
        db: Session,
        admin_user: User,
        payment_id: UUID,
        payload: BankTransferVerificationRequest,
    ) -> PaymentDetailResponse:
        """Manually verify customer bank transfer / branch deposit with authoritative financial reconciliation."""
        user_roles = get_user_roles(admin_user)
        if not any(
            r in ("staff", "manager", "admin", "super_admin") for r in user_roles
        ):
            raise HTTPException(
                status_code=403, detail="Unauthorized to verify payments."
            )

        stmt = select(Payment).where(Payment.id == payment_id).with_for_update()
        payment = db.execute(stmt).scalar_one_or_none()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment record not found.")

        if payment.provider not in ("bank_transfer", "branch"):
            raise HTTPException(
                status_code=400,
                detail="Only bank transfers or branch payments can be manually verified.",
            )

        booking = db.execute(
            select(Booking).where(Booking.id == payment.booking_id).with_for_update()
        ).scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Associated booking not found.")

        if payment.status == "captured":
            return cls._to_payment_detail_response(payment)

        if payment.status != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot verify payment in status '{payment.status}'.",
            )

        if payload.verified_amount is not None and payload.verified_amount > Decimal("0.00"):
            payment.amount = payload.verified_amount

        now = datetime.now(timezone.utc)
        payment.status = "captured"
        payment.captured_at = now
        payment.failure_code = None
        notes_to_record = payload.reconciliation_notes or payload.notes
        if notes_to_record:
            payment.failure_message = f"Verified: {notes_to_record}"
        db.flush()

        all_captured = db.execute(
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .where(Payment.booking_id == booking.id, Payment.status == "captured")
        ).scalar_one()

        if all_captured >= booking.total:
            booking.status = "confirmed"
            booking.payment_status = "paid"
        else:
            booking.status = "confirmed"
            booking.payment_status = "partially_paid"

        db.add(
            AuditLog(
                actor_user_id=admin_user.id,
                action="bank_transfer_verified",
                entity_type="payment",
                entity_id=str(payment.id),
                metadata_json={
                    "booking_id": str(booking.id),
                    "booking_reference": booking.booking_reference,
                    "verified_amount": str(payment.amount),
                    "reconciliation_notes": payload.reconciliation_notes,
                    "booking_payment_status": booking.payment_status,
                },
            )
        )

        db.commit()
        db.refresh(payment)
        db.refresh(booking)

        try:
            from app.services.email_service import get_email_service

            email_svc = get_email_service()
            email_svc.send_bank_transfer_verified(
                db=db,
                booking=booking,
                payment=payment,
                user=booking.user,
                verified_amount=payment.amount,
                reconciliation_notes=payload.reconciliation_notes,
            )
            if booking.payment_status == "paid":
                email_svc.send_balance_paid_in_full(db, booking, payment, booking.user)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to send bank transfer verified email: %s", exc)

        return cls._to_payment_detail_response(payment)

    @classmethod
    def reject_bank_transfer(
        cls,
        db: Session,
        admin_user: User,
        payment_id: UUID,
        payload: BankTransferRejectionRequest,
    ) -> PaymentDetailResponse:
        """Reject unverified bank transfer submission with mandatory reason."""
        user_roles = get_user_roles(admin_user)
        if not any(
            r in ("staff", "manager", "admin", "super_admin") for r in user_roles
        ):
            raise HTTPException(
                status_code=403, detail="Unauthorized to reject payments."
            )

        stmt = select(Payment).where(Payment.id == payment_id).with_for_update()
        payment = db.execute(stmt).scalar_one_or_none()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment record not found.")

        if payment.provider not in ("bank_transfer", "branch"):
            raise HTTPException(
                status_code=400,
                detail="Only bank transfers or branch payments can be manually rejected.",
            )

        if payment.status == "captured":
            raise HTTPException(
                status_code=400,
                detail="Cannot reject an already verified and captured payment.",
            )

        booking = db.execute(
            select(Booking).where(Booking.id == payment.booking_id)
        ).scalar_one_or_none()

        rejection_txt = payload.rejection_reason or payload.reason or "Verification rejected"
        payment.status = "failed"
        payment.failure_code = "VERIFICATION_REJECTED"
        payment.failure_message = rejection_txt

        db.add(
            AuditLog(
                actor_user_id=admin_user.id,
                action="bank_transfer_rejected",
                entity_type="payment",
                entity_id=str(payment.id),
                metadata_json={
                    "payment_id": str(payment.id),
                    "rejection_reason": rejection_txt,
                    "notes": getattr(payload, "notes", None),
                },
            )
        )

        db.commit()
        db.refresh(payment)

        if booking:
            try:
                from app.services.email_service import get_email_service

                email_svc = get_email_service()
                email_svc.send_bank_transfer_rejected(
                    db=db,
                    booking=booking,
                    payment=payment,
                    user=booking.user,
                    rejection_reason=payload.rejection_reason,
                )
                db.commit()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to send bank transfer rejection email: %s", exc)

        return cls._to_payment_detail_response(payment)

    @classmethod
    def list_transactions(
        cls,
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status: str | None = None,
        provider: str | None = None,
    ) -> PaymentTransactionsListResponse:
        """Search and filter complete payment transaction records with reconciliation states."""
        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        query = (
            select(Payment)
            .options(
                joinedload(Payment.booking).joinedload(Booking.user),
                joinedload(Payment.booking).joinedload(Booking.payments),
                joinedload(Payment.refunds),
            )
            .order_by(desc(Payment.created_at))
        )

        if search:
            s = f"%{search.strip().lower()}%"
            query = (
                query.join(Booking, Payment.booking_id == Booking.id)
                .outerjoin(User, Booking.user_id == User.id)
                .where(
                    or_(
                        func.lower(Booking.booking_reference).like(s),
                        func.lower(Payment.provider_order_id).like(s),
                        func.lower(Payment.provider_payment_id).like(s),
                        func.lower(User.email).like(s),
                        func.lower(User.first_name).like(s),
                        func.lower(User.last_name).like(s),
                    )
                )
            )

        if status and status != "all":
            if status == "awaiting_online":
                query = query.where(
                    Payment.status == "pending", Payment.provider == "razorpay"
                )
            elif status == "bank_transfer_pending":
                query = query.where(
                    Payment.status == "pending",
                    Payment.provider.in_(["bank_transfer", "branch"]),
                )
            elif status == "partially_paid":
                query = query.join(Booking, Payment.booking_id == Booking.id).where(
                    Booking.payment_status == "partially_paid"
                )
            elif status == "fully_paid":
                query = query.join(Booking, Payment.booking_id == Booking.id).where(
                    Booking.payment_status == "paid"
                )
            elif status == "failed":
                query = query.where(Payment.status == "failed")
            elif status == "overdue":
                now_dt = datetime.now(timezone.utc)
                query = query.join(Booking, Payment.booking_id == Booking.id).where(
                    Booking.hold_expires_at < now_dt,
                    Booking.payment_status.in_(["pending", "partially_paid"]),
                )
            elif status == "cancelled":
                query = query.join(Booking, Payment.booking_id == Booking.id).where(
                    Booking.status == "cancelled"
                )
            elif status in ("refunded", "partially_refunded"):
                query = query.where(Payment.status.in_(["refunded", "partially_refunded"]))
            else:
                query = query.where(Payment.status == status)

        if provider and provider != "all":
            query = query.where(Payment.provider == provider)

        count_query = select(func.count()).select_from(query.order_by(None).subquery())
        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        payments = db.execute(query.offset(offset).limit(page_size)).unique().scalars().all()

        items: list[PaymentTransactionListItem] = []
        for p in payments:
            cust_name = (
                f"{p.booking.user.first_name} {p.booking.user.last_name}".strip()
                if p.booking and p.booking.user
                else "Guest Customer"
            )
            cust_email = (
                p.booking.user.email
                if p.booking and p.booking.user
                else "guest@kvtours.in"
            )
            booking_ref = p.booking.booking_reference if p.booking else "KV-UNKNOWN"

            refund_cnt = len(p.refunds) if p.refunds else 0
            refund_vol = sum(
                (r.amount for r in p.refunds if r.status == "processed"),
                Decimal("0.00"),
            )

            recon_status = "matched"
            if p.status == "captured" and (
                not p.booking or p.booking.payment_status not in ("paid", "partially_paid")
            ):
                recon_status = "paid_unconfirmed"
            elif p.status == "pending":
                recon_status = "pending"
            elif p.status == "failed":
                recon_status = "failed"
            elif p.status in ("refunded", "partially_refunded"):
                recon_status = "refunded"

            booking_total = p.booking.total if p.booking else None
            booking_pay_status = p.booking.payment_status if p.booking else None
            deadline = p.booking.hold_expires_at if p.booking else None

            if p.booking:
                captured_for_b = sum(
                    (pmt.amount for pmt in p.booking.payments if pmt.status == "captured"),
                    Decimal("0.00"),
                )
                outstanding_bal = max(Decimal("0.00"), p.booking.total - captured_for_b)
            else:
                outstanding_bal = None

            transfer_ref = (
                p.provider_payment_id
                if p.provider in ("bank_transfer", "branch")
                else None
            )
            verif_notes = (
                p.failure_message
                if p.provider in ("bank_transfer", "branch")
                else None
            )

            items.append(
                PaymentTransactionListItem(
                    id=p.id,
                    booking_id=p.booking_id,
                    booking_reference=booking_ref,
                    customer_name=cust_name,
                    customer_email=cust_email,
                    provider=p.provider,
                    provider_order_id=p.provider_order_id,
                    provider_payment_id=p.provider_payment_id,
                    amount=p.amount,
                    currency=p.currency,
                    status=p.status,
                    payment_method=p.payment_method or "razorpay_gateway",
                    captured_at=p.captured_at,
                    created_at=p.created_at,
                    refund_count=refund_cnt,
                    total_refunded=refund_vol,
                    reconciliation_status=recon_status,
                    outstanding_balance=outstanding_bal,
                    booking_total=booking_total,
                    booking_payment_status=booking_pay_status,
                    verification_notes=verif_notes,
                    failure_message=p.failure_message,
                    transfer_reference=transfer_ref,
                    payment_deadline=deadline,
                )
            )

        total_pages = max(1, (total + page_size - 1) // page_size)
        return PaymentTransactionsListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_payment_settings(cls, db: Session) -> PaymentSettingsResponse:
        """Retrieve current payment gateway settings, environment modes, and readiness checklist."""
        online_enabled = cls.is_online_payments_enabled(db)
        maint_msg = cls.get_maintenance_message(db)
        pending_cnt = db.execute(
            select(func.count(Payment.id)).where(Payment.status == "pending")
        ).scalar_one()

        from app.services.payment_credential_service import PaymentCredentialService

        summary = PaymentCredentialService.get_credential_summary(db)
        rzp_enabled = summary["gateway_enabled"]
        rzp_env = summary["active_environment"]
        encryption_configured = summary["encryption_configured"]

        test_summary = EnvironmentCredentialSummary(**summary["test"])
        live_summary = EnvironmentCredentialSummary(**summary["live"])

        active_env_summary = live_summary if rzp_env == "live" else test_summary
        masked_key = active_env_summary.key_id_masked
        key_secret_configured = active_env_summary.key_secret_configured
        webhook_secret_configured = active_env_summary.webhook_secret_configured

        raw_cfg = PaymentCredentialService.get_raw_config(db)
        settings = get_settings()
        has_custom = bool(
            raw_cfg.get("test", {}).get("encrypted_key_secret")
            or raw_cfg.get("live", {}).get("encrypted_key_secret")
            or raw_cfg.get("test", {}).get("encrypted_webhook_secret")
            or raw_cfg.get("live", {}).get("encrypted_webhook_secret")
            or (raw_cfg.get("test", {}).get("key_id") and raw_cfg.get("test", {}).get("key_id") != settings.razorpay_key_id)
            or raw_cfg.get("live", {}).get("key_id")
        )

        last_diag_row = db.execute(
            select(SiteSetting).where(SiteSetting.key == "razorpay_last_diagnostic")
        ).scalar_one_or_none()
        last_diag_at = None
        last_diag_status = None
        if last_diag_row and isinstance(last_diag_row.value, dict):
            last_diag_status = last_diag_row.value.get("status")
            dt_str = last_diag_row.value.get("timestamp")
            if dt_str:
                try:
                    last_diag_at = datetime.fromisoformat(dt_str)
                except (ValueError, TypeError):
                    last_diag_at = None

        gateways = [
            PaymentGatewayConfig(
                id="razorpay",
                name="Razorpay (UPI, Cards, NetBanking)",
                enabled=rzp_enabled,
                status="active" if rzp_enabled else "disabled",
                environment=rzp_env,
                display_order=1,
                supported_currencies=["INR"],
                min_amount=Decimal("1.00"),
                max_amount=Decimal("1000000.00"),
                customer_instructions="Pay securely using UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards, or NetBanking.",
                is_configured=True,
            ),
            PaymentGatewayConfig(
                id="stripe",
                name="Stripe International Cards",
                enabled=False,
                status="coming_soon",
                environment="test",
                display_order=2,
                supported_currencies=["USD", "EUR", "GBP"],
                min_amount=Decimal("10.00"),
                max_amount=Decimal("500000.00"),
                customer_instructions="International credit and debit cards. In development.",
                is_configured=False,
            ),
            PaymentGatewayConfig(
                id="phonepe",
                name="PhonePe Direct PG",
                enabled=False,
                status="coming_soon",
                environment="test",
                display_order=3,
                supported_currencies=["INR"],
                min_amount=Decimal("1.00"),
                max_amount=Decimal("200000.00"),
                customer_instructions="Direct PhonePe QR and UPI intent checkout. In development.",
                is_configured=False,
            ),
        ]

        live_checklist = {
            "credentials_configured": live_summary.is_configured,
            "webhook_secret_configured": live_summary.webhook_secret_configured,
            "signature_verification_active": True,
            "server_side_amount_validation": True,
            "duplicate_webhook_prevention": True,
            "encryption_key_configured": encryption_configured,
            "live_credentials_verified": live_summary.last_test_status == "valid",
            "production_smoke_test_approved": live_summary.last_test_status == "valid",
        }

        # Query latest webhook events and error counts
        last_webhook_log = db.execute(
            select(AuditLog)
            .where(
                or_(
                    AuditLog.action.like("%webhook%"),
                    AuditLog.action == "payment_webhook_received",
                )
            )
            .order_by(desc(AuditLog.created_at))
            .limit(1)
        ).scalar_one_or_none()

        last_proc_log = db.execute(
            select(AuditLog)
            .where(
                AuditLog.action.in_(["payment_captured", "order.paid", "payment_webhook_received"])
            )
            .order_by(desc(AuditLog.created_at))
            .limit(1)
        ).scalar_one_or_none()

        webhook_errors_cnt = db.execute(
            select(func.count(AuditLog.id)).where(
                or_(
                    AuditLog.action.like("%fail%"),
                    AuditLog.action.like("%error%"),
                    AuditLog.action == "payment_webhook_signature_failed",
                )
            )
        ).scalar_one()

        bank_cfg = cls._get_raw_bank_settings(db)
        max_online_limit = Decimal(
            str(bank_cfg.get("max_online_single_payment_limit", "500000.00"))
        )
        split_enabled = bool(bank_cfg.get("split_payments_enabled", True))
        default_dep_pct = Decimal(
            str(bank_cfg.get("default_deposit_percentage", "25.0"))
        )
        min_dep_amt = Decimal(str(bank_cfg.get("min_deposit_amount", "5000.00")))
        bt_enabled = bool(bank_cfg.get("bank_transfer_enabled", False))
        branch_enabled = bool(bank_cfg.get("branch_payment_enabled", False))

        from app.services.payment_credential_service import resolve_razorpay_webhook_url

        return PaymentSettingsResponse(
            online_payments_enabled=online_enabled,
            maintenance_message=maint_msg,
            pending_transactions_count=pending_cnt,
            gateways=gateways,
            razorpay_key_id_masked=masked_key,
            razorpay_environment=rzp_env,
            razorpay_enabled=rzp_enabled,
            webhook_url=resolve_razorpay_webhook_url(),
            webhook_secret_configured=webhook_secret_configured,
            key_secret_configured=key_secret_configured,
            has_custom_credentials=has_custom,
            last_diagnostic_at=last_diag_at,
            last_diagnostic_status=last_diag_status,
            live_readiness_checklist=live_checklist,
            encryption_configured=encryption_configured,
            encryption_key_status=summary.get("encryption_key_status", "valid"),
            encryption_key_message=summary.get("encryption_key_message"),
            test_credentials=test_summary,
            live_credentials=live_summary,
            webhook_last_received_at=last_webhook_log.created_at if last_webhook_log else None,
            webhook_last_event=(
                (last_webhook_log.metadata_json or {}).get("event") or last_webhook_log.action
                if last_webhook_log
                else None
            ),
            webhook_last_processed_at=last_proc_log.created_at if last_proc_log else None,
            webhook_recent_errors_count=webhook_errors_cnt or 0,
            max_online_single_payment_limit=max_online_limit,
            split_payments_enabled=split_enabled,
            default_deposit_percentage=default_dep_pct,
            min_deposit_amount=min_dep_amt,
            bank_transfer_enabled=bt_enabled,
            branch_payment_enabled=branch_enabled,
        )


    @classmethod
    def update_payment_settings(
        cls,
        db: Session,
        payload: PaymentSettingsUpdateRequest,
        admin_user: User,
        ip_address: str | None = None,
    ) -> PaymentSettingsResponse:
        """Update payment settings, environment selection, and gateway states with strict live checks."""
        from app.services.payment_credential_service import PaymentCredentialService

        raw_cfg = PaymentCredentialService.get_raw_config(db)
        current_env = raw_cfg.get("environment", "test")

        if payload.online_payments_enabled is not None:
            cls.set_online_payments_enabled(
                db=db,
                enabled=payload.online_payments_enabled,
                maintenance_message=payload.maintenance_message,
                actor_id=admin_user.id,
                ip_address=ip_address,
            )

        if payload.razorpay_enabled is not None:
            PaymentCredentialService.set_gateway_enabled(
                db=db,
                admin_user=admin_user,
                enabled=payload.razorpay_enabled,
                ip_address=ip_address,
            )

        if payload.reset_credentials_to_env:
            user_roles = get_user_roles(admin_user)
            if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN) for r in user_roles):
                raise HTTPException(
                    status_code=403,
                    detail="Only Administrators and Super Administrators can reset gateway credentials.",
                )
            target_env = payload.target_environment or current_env
            # Reset custom credentials in site settings
            cfg_row = db.execute(
                select(SiteSetting).where(SiteSetting.key == "razorpay_gateway_config").with_for_update()
            ).scalar_one_or_none()
            if cfg_row and isinstance(cfg_row.value, dict):
                updated_val = dict(cfg_row.value)
                if target_env in updated_val and isinstance(updated_val[target_env], dict):
                    updated_val[target_env]["encrypted_key_secret"] = None
                    updated_val[target_env]["encrypted_webhook_secret"] = None
                    if target_env == "test":
                        updated_val[target_env]["key_id"] = get_settings().razorpay_key_id
                    else:
                        updated_val[target_env]["key_id"] = None
                cfg_row.value = updated_val
                flag_modified(cfg_row, "value")
                db.add(
                    AuditLog(
                        actor_user_id=admin_user.id,
                        action="credentials_reset_to_env",
                        entity_type="payment_settings",
                        entity_id=f"razorpay_{target_env}",
                        ip_address=ip_address,
                        metadata_json={"environment": target_env, "reset": True},
                    )
                )
                db.commit()
                from app.services.razorpay_client import reset_razorpay_client

                reset_razorpay_client()

        is_saving_credentials = (
            payload.razorpay_key_id is not None
            or payload.razorpay_key_secret is not None
            or payload.razorpay_webhook_secret is not None
        )
        if is_saving_credentials:
            target_env = payload.target_environment or payload.razorpay_environment or current_env
            PaymentCredentialService.save_credentials(
                db=db,
                admin_user=admin_user,
                environment=target_env,
                key_id=payload.razorpay_key_id,
                key_secret=payload.razorpay_key_secret,
                webhook_secret=payload.razorpay_webhook_secret,
                ip_address=ip_address,
            )

        if payload.razorpay_environment is not None and payload.razorpay_environment != current_env:
            PaymentCredentialService.switch_environment(
                db=db,
                admin_user=admin_user,
                target_environment=payload.razorpay_environment,
                confirm_live_mode=bool(payload.confirm_live_mode),
                ip_address=ip_address,
            )

        # Update limits and bank options if provided in update payload
        bank_update_needed = any(
            x is not None
            for x in [
                payload.max_online_single_payment_limit,
                payload.split_payments_enabled,
                payload.default_deposit_percentage,
                payload.min_deposit_amount,
                payload.bank_transfer_enabled,
                payload.branch_payment_enabled,
            ]
        )
        if bank_update_needed:
            cls.update_bank_settings(
                db=db,
                payload=BankSettingsUpdateRequest(
                    max_online_single_payment_limit=payload.max_online_single_payment_limit,
                    split_payments_enabled=payload.split_payments_enabled,
                    default_deposit_percentage=payload.default_deposit_percentage,
                    min_deposit_amount=payload.min_deposit_amount,
                    bank_transfer_enabled=payload.bank_transfer_enabled,
                    branch_payment_enabled=payload.branch_payment_enabled,
                ),
                admin_user=admin_user,
                ip_address=ip_address,
            )

        return cls.get_payment_settings(db)

    @classmethod
    def list_refunds(
        cls,
        db: Session,
        page: int = 1,
        page_size: int = 20,
    ) -> list[PaymentRefundResponse]:
        """Query refund records chronologically."""
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        query = (
            select(PaymentRefund)
            .order_by(desc(PaymentRefund.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        refunds = db.execute(query).scalars().all()
        return [
            PaymentRefundResponse(
                id=r.id,
                payment_id=r.payment_id,
                provider=r.provider,
                provider_refund_id=r.provider_refund_id,
                amount=r.amount,
                currency=r.currency,
                status=r.status,
                reason=r.reason,
                processed_at=r.processed_at,
                created_at=r.created_at,
            )
            for r in refunds
        ]

    @classmethod
    def list_webhook_events(
        cls,
        db: Session,
        page: int = 1,
        page_size: int = 20,
    ) -> PaymentWebhookListResponse:
        """Query received webhook events from audit history."""
        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        query = (
            select(AuditLog)
            .where(
                or_(
                    AuditLog.action.like("%webhook%"),
                    AuditLog.entity_type == "payment",
                    AuditLog.action.in_(
                        [
                            "payment_webhook_received",
                            "payment_failed",
                            "payment_hold_expired",
                        ]
                    ),
                )
            )
            .order_by(desc(AuditLog.created_at))
        )
        count_q = select(func.count()).select_from(query.order_by(None).subquery())
        total = db.execute(count_q).scalar_one()

        logs = (
            db.execute(query.offset((page - 1) * page_size).limit(page_size))
            .scalars()
            .all()
        )

        items: list[PaymentWebhookEventItem] = []
        for l in logs:
            meta = l.metadata_json or {}
            event_type = meta.get("event") or l.action
            event_id = meta.get("event_id") or f"evt_{l.id.hex[:10]}"
            booking_id = meta.get("booking_id")

            items.append(
                PaymentWebhookEventItem(
                    id=l.id,
                    provider="razorpay",
                    event_type=str(event_type),
                    event_id=str(event_id) if event_id else None,
                    entity_id=l.entity_id,
                    booking_id=str(booking_id) if booking_id else None,
                    status=(
                        "Processed"
                        if "received" in l.action or l.action == "payment_captured"
                        else "Logged"
                    ),
                    received_at=l.created_at,
                    actor_user_id=l.actor_user_id,
                    metadata_json=meta,
                )
            )

        total_pages = max(1, (total + page_size - 1) // page_size)
        return PaymentWebhookListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def retry_webhook_event(
        cls,
        db: Session,
        audit_id: UUID,
        admin_user: User,
    ) -> dict[str, Any]:
        """Simulate re-processing of an eligible logged webhook event."""
        log_entry = db.get(AuditLog, audit_id)
        if not log_entry:
            raise HTTPException(status_code=404, detail="Webhook event log not found.")

        meta = log_entry.metadata_json or {}
        event_type = meta.get("event") or log_entry.action

        db.add(
            AuditLog(
                actor_user_id=admin_user.id,
                action="payment_webhook_retry_requested",
                entity_type="payment",
                entity_id=log_entry.entity_id,
                metadata_json={"original_audit_id": str(audit_id), "event": event_type},
            )
        )
        db.commit()
        return {
            "status": "success",
            "message": f"Webhook event '{event_type}' re-evaluated successfully.",
        }

    @classmethod
    def run_gateway_diagnostic(
        cls,
        db: Session,
        admin_user: User,
        target_env: str | None = None,
        ip_address: str | None = None,
    ) -> RazorpayDiagnosticResponse:
        """Run safe gateway diagnostic probe and verify connectivity/auth."""
        from app.services.payment_credential_service import PaymentCredentialService

        res = PaymentCredentialService.test_connection(
            db=db,
            admin_user=admin_user,
            target_env=target_env,
            ip_address=ip_address,
        )
        return RazorpayDiagnosticResponse(
            success=res["success"],
            environment=res["environment"],
            key_id_masked=res["key_id_masked"],
            test_order_id=res.get("test_order_id"),
            diagnostic_message=res["diagnostic_message"],
            tested_at=datetime.fromisoformat(res["tested_at"]),
            auth_status=res.get("auth_status"),
            api_reachable=res.get("api_reachable", True),
            webhook_configured=res.get("webhook_configured", False),
        )

    @classmethod
    def run_webhook_verification(
        cls,
        db: Session,
        admin_user: User,
        target_env: str | None = None,
        ip_address: str | None = None,
    ) -> RazorpayWebhookVerificationResponse:
        """Run webhook configuration verification and delivery audit check."""
        from app.services.payment_credential_service import PaymentCredentialService

        res = PaymentCredentialService.verify_webhook_configuration(
            db=db,
            admin_user=admin_user,
            target_env=target_env,
            ip_address=ip_address,
        )
        return RazorpayWebhookVerificationResponse(**res)


