import re
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RazorpayOrderCreateRequest(BaseModel):
    """Request payload to initiate a Razorpay payment order for a booking."""

    booking_id: UUID | str
    amount: Decimal | None = Field(
        None,
        gt=0,
        description="Optional custom payment amount in INR (for split/deposit or balance payment). If omitted, defaults to authoritative remaining balance.",
    )
    payment_type: str | None = Field(
        default="full",
        description="Type of payment: 'full', 'deposit', or 'balance'",
    )
    idempotency_key: str | None = Field(
        None, max_length=128, description="Optional client idempotency key"
    )


class RazorpayOrderResponse(BaseModel):
    """Response payload containing checkout initialization parameters for Razorpay."""

    payment_id: UUID
    booking_id: UUID
    order_id: str = Field(description="Razorpay order ID (e.g. order_XXXXX)")
    amount: int = Field(description="Amount in smallest currency unit (paise for INR)")
    amount_decimal: Decimal = Field(description="Authoritative Decimal amount in INR")
    currency: str = Field(default="INR", max_length=3)
    key_id: str = Field(description="Public Razorpay key ID for frontend checkout")
    booking_reference: str
    customer_name: str
    customer_email: str
    customer_phone: str | None = None
    hold_expires_at: datetime | None = None


class RazorpayVerifyRequest(BaseModel):
    """Payment verification request sent from frontend after Razorpay modal completes."""

    booking_id: UUID | str
    razorpay_order_id: str = Field(min_length=5, max_length=150)
    razorpay_payment_id: str = Field(min_length=5, max_length=150)
    razorpay_signature: str = Field(min_length=10, max_length=256)


class RazorpayVerifyResponse(BaseModel):
    """Authoritative verification result confirming booking."""

    success: bool
    booking_id: UUID
    booking_reference: str
    payment_id: UUID
    provider_payment_id: str
    amount: Decimal
    currency: str
    booking_status: str
    payment_status: str
    message: str


class RazorpayFailureRequest(BaseModel):
    """Client notification of modal dismissal or failed payment attempt."""

    booking_id: UUID | str
    razorpay_order_id: str | None = None
    error_code: str | None = Field(None, max_length=100)
    error_description: str | None = Field(None, max_length=500)


class BankTransferSubmitRequest(BaseModel):
    """Customer-submitted bank transfer or branch payment receipt."""

    booking_id: UUID | str
    payment_method: str = Field(
        default="bank_transfer",
        description="'bank_transfer' or 'branch_payment'",
    )
    transfer_reference: str = Field(
        min_length=3,
        max_length=150,
        description="Bank UTR number, IMPS reference, UPI reference, or receipt number",
    )
    amount: Decimal = Field(
        gt=0,
        description="Authoritative amount transferred in INR",
    )
    payment_type: str = Field(
        default="full",
        description="'full', 'deposit', or 'balance'",
    )
    notes: str | None = Field(
        None, max_length=500, description="Optional customer narration or bank branch name"
    )
    proof_url: str | None = Field(
        None, max_length=500, description="Optional payment screenshot or receipt URL"
    )
    idempotency_key: str | None = Field(
        None, max_length=128, description="Client idempotency key"
    )


class BankTransferSubmitResponse(BaseModel):
    """Response returned upon submission of a bank transfer reference."""

    success: bool
    payment_id: UUID
    booking_id: UUID
    booking_reference: str
    transfer_reference: str
    amount: Decimal
    currency: str
    status: str = "pending"
    verification_status: str = "pending"
    message: str


class BankTransferVerificationRequest(BaseModel):
    """Staff action to verify and confirm a bank transfer / branch payment."""

    verified_amount: Decimal | None = Field(
        None,
        gt=0,
        description="Confirmed amount received in bank account (defaults to pending payment amount)",
    )
    reconciliation_reference: str | None = Field(
        None,
        max_length=150,
        description="Bank statement transaction ID or reference",
    )
    reconciliation_notes: str | None = Field(
        None, max_length=500, description="Optional reconciliation remarks"
    )
    notes: str | None = Field(
        None, max_length=500, description="Optional internal verification remarks"
    )


class BankTransferRejectionRequest(BaseModel):
    """Staff action to reject an unverified or fraudulent bank transfer reference."""

    reason: str | None = Field(
        None,
        min_length=3,
        max_length=500,
        description="Explanation of rejection for the customer",
    )
    rejection_reason: str | None = Field(
        None,
        min_length=3,
        max_length=500,
        description="Explanation of rejection for the customer",
    )


class PaymentRefundRequest(BaseModel):
    """Administrative refund request for a captured payment."""

    amount: Decimal | None = Field(
        None,
        gt=0,
        description="Refund amount. If omitted, full remaining refundable amount.",
    )
    reason: str | None = Field(None, max_length=500, description="Reason for refund")
    record_offline: bool = Field(
        default=False,
        description="Record refund administratively when gateway balance is insufficient or processed offline via NEFT/RTGS.",
    )


class PaymentRefundResponse(BaseModel):
    """Refund detail response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    payment_id: UUID
    provider: str
    provider_refund_id: str | None
    amount: Decimal
    currency: str
    status: str
    reason: str | None
    processed_at: datetime | None
    created_at: datetime


class PaymentDetailResponse(BaseModel):
    """Authoritative payment record detail."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID

    booking_id: UUID
    provider: str
    provider_order_id: str | None
    provider_payment_id: str | None
    amount: Decimal
    currency: str
    status: str
    payment_method: str | None
    failure_code: str | None
    failure_message: str | None
    captured_at: datetime | None
    created_at: datetime
    refunds: list[PaymentRefundResponse] = Field(default_factory=list)


class PaymentHoldExpirySummary(BaseModel):
    """Summary of batch expired payment holds release."""

    expired_count: int
    released_seats: int
    cancelled_booking_ids: list[UUID]


# ==============================================================================
# Admin Payment Control Center Schemas
# ==============================================================================


class PaymentGatewayConfig(BaseModel):
    """Configuration metadata for an individual payment gateway."""

    id: str
    name: str
    enabled: bool
    status: str  # "active", "disabled", "coming_soon"
    environment: str  # "test", "live"
    display_order: int
    supported_currencies: list[str]
    min_amount: Decimal
    max_amount: Decimal
    customer_instructions: str
    is_configured: bool


class EnvironmentCredentialSummary(BaseModel):
    """Safe, non-sensitive summary of credentials and validation status for a specific environment."""

    environment: str  # "test" or "live"
    key_id: str | None = None
    key_id_masked: str = "None"
    key_secret_configured: bool = False
    webhook_secret_configured: bool = False
    is_configured: bool = False
    last_test_status: str = "untested"  # "valid", "invalid", "untested"
    last_tested_at: datetime | None = None
    last_test_message: str | None = None


class BankSettingsPublicResponse(BaseModel):
    """Customer-facing bank details and payment instructions."""

    bank_transfer_enabled: bool
    branch_payment_enabled: bool
    account_name: str
    bank_name: str
    account_number: str
    ifsc_code: str
    branch_name: str
    account_type: str
    upi_id: str | None = None
    payment_instructions: str
    required_reference_format: str
    payment_contact_phone: str
    payment_contact_email: str
    max_online_single_payment_limit: Decimal
    split_payments_enabled: bool
    default_deposit_percentage: Decimal
    min_deposit_amount: Decimal


class BankSettingsAdminResponse(BaseModel):
    """Admin-facing bank settings with masked or unmasked sensitive details."""

    bank_transfer_enabled: bool
    branch_payment_enabled: bool
    account_name: str
    bank_name: str
    account_number_masked: str
    account_number: str
    ifsc_code: str
    branch_name: str
    account_type: str
    upi_id: str | None = None
    payment_instructions: str
    required_reference_format: str
    proof_upload_setting: str = "optional"
    payment_contact_phone: str
    payment_contact_email: str
    scope: str = "all_packages"
    selected_package_ids: list[str] = Field(default_factory=list)
    max_online_single_payment_limit: Decimal
    split_payments_enabled: bool
    default_deposit_percentage: Decimal
    min_deposit_amount: Decimal
    updated_at: datetime | None = None


class BankSettingsUpdateRequest(BaseModel):
    """Update payload for administrative bank account and payment limit settings."""

    bank_transfer_enabled: bool | None = None
    branch_payment_enabled: bool | None = None
    account_name: str | None = None
    bank_name: str | None = None
    account_number: str | None = None
    confirm_account_number: str | None = None
    ifsc_code: str | None = None
    branch_name: str | None = None
    account_type: str | None = None
    upi_id: str | None = None
    payment_instructions: str | None = None
    required_reference_format: str | None = None
    proof_upload_setting: str | None = None
    payment_contact_phone: str | None = None
    payment_contact_email: str | None = None
    scope: str | None = None
    selected_package_ids: list[str] | None = None
    max_online_single_payment_limit: Decimal | None = None
    split_payments_enabled: bool | None = None
    default_deposit_percentage: Decimal | None = None
    min_deposit_amount: Decimal | None = None


class BankAccountResponse(BaseModel):
    """Admin-facing summary of a bank account with masked account number."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_holder_name: str
    bank_name: str
    account_number_masked: str
    ifsc_code: str
    branch_name: str
    account_type: str
    upi_id: str | None = None
    swift_code: str | None = None
    bank_address: str | None = None
    currency: str = "INR"
    status: str = "active"
    is_default: bool = False
    is_public: bool = True
    transfer_instructions: str | None = None
    branch_cash_instructions: str | None = None
    effective_date: date | None = None
    created_at: datetime
    updated_at: datetime


class BankAccountListResponse(BaseModel):
    items: list[BankAccountResponse]
    total: int
    page: int
    page_size: int


class BankAccountDetailResponse(BankAccountResponse):
    """Detailed bank account info with reveal capabilities."""

    account_number: str | None = None
    is_revealed: bool = False


class BankAccountCreateRequest(BaseModel):
    account_holder_name: str = Field(..., min_length=2, max_length=120)
    bank_name: str = Field(..., min_length=2, max_length=100)
    account_number: str = Field(..., min_length=9, max_length=50)
    confirm_account_number: str = Field(..., min_length=9, max_length=50)
    ifsc_code: str = Field(..., min_length=11, max_length=11)
    branch_name: str = Field(..., min_length=2, max_length=100)
    account_type: str = Field("Current", max_length=30)
    upi_id: str | None = Field(None, max_length=100)
    swift_code: str | None = Field(None, max_length=20)
    bank_address: str | None = Field(None, max_length=255)
    currency: str = Field("INR", min_length=3, max_length=3)
    status: str = Field("active")
    is_default: bool = False
    is_public: bool = True
    transfer_instructions: str | None = None
    branch_cash_instructions: str | None = None
    effective_date: date | None = None

    @field_validator("confirm_account_number")
    @classmethod
    def validate_confirm_acc(cls, v: str, info) -> str:
        if "account_number" in info.data and v != info.data["account_number"]:
            raise ValueError("Confirm account number does not match account number.")
        return v

    @field_validator("ifsc_code")
    @classmethod
    def validate_ifsc(cls, v: str) -> str:
        val = v.strip().upper()
        if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", val):
            raise ValueError("Invalid IFSC code format (e.g. HDFC0001234).")
        return val

    @field_validator("account_number")
    @classmethod
    def validate_acc_number(cls, v: str) -> str:
        val = v.strip()
        if not re.match(r"^\d{9,24}$", val):
            raise ValueError("Account number must contain between 9 and 24 digits.")
        return val

    @field_validator("upi_id")
    @classmethod
    def validate_upi(cls, v: str | None) -> str | None:
        if not v or not v.strip():
            return None
        val = v.strip()
        if "@" not in val:
            raise ValueError("Invalid UPI ID format (must include @bank).")
        return val


class BankAccountUpdateRequest(BaseModel):
    account_holder_name: str | None = Field(None, min_length=2, max_length=120)
    bank_name: str | None = Field(None, min_length=2, max_length=100)
    account_number: str | None = Field(None, min_length=9, max_length=50)
    confirm_account_number: str | None = Field(None, min_length=9, max_length=50)
    ifsc_code: str | None = None
    branch_name: str | None = Field(None, min_length=2, max_length=100)
    account_type: str | None = None
    upi_id: str | None = None
    swift_code: str | None = None
    bank_address: str | None = None
    currency: str | None = None
    status: str | None = None
    is_default: bool | None = None
    is_public: bool | None = None
    transfer_instructions: str | None = None
    branch_cash_instructions: str | None = None
    effective_date: date | None = None

    @field_validator("confirm_account_number")
    @classmethod
    def validate_confirm_acc(cls, v: str | None, info) -> str | None:
        if (
            v
            and "account_number" in info.data
            and info.data["account_number"]
            and v != info.data["account_number"]
        ):
            raise ValueError("Confirm account number does not match account number.")
        return v

    @field_validator("ifsc_code")
    @classmethod
    def validate_ifsc(cls, v: str | None) -> str | None:
        if not v:
            return None
        val = v.strip().upper()
        if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", val):
            raise ValueError("Invalid IFSC code format (e.g. HDFC0001234).")
        return val

    @field_validator("account_number")
    @classmethod
    def validate_acc_number(cls, v: str | None) -> str | None:
        if not v:
            return None
        val = v.strip()
        if not re.match(r"^\d{9,24}$", val):
            raise ValueError("Account number must contain between 9 and 24 digits.")
        return val


class BankAccountRevealResponse(BaseModel):
    id: UUID
    account_holder_name: str
    bank_name: str
    account_number: str
    ifsc_code: str
    revealed_at: datetime


class PaymentSettingsResponse(BaseModel):
    """Global payment management settings and gateway states."""

    online_payments_enabled: bool
    maintenance_message: str | None
    pending_transactions_count: int
    gateways: list[PaymentGatewayConfig]
    razorpay_key_id_masked: str
    razorpay_environment: str  # "test" or "live"
    razorpay_enabled: bool
    webhook_url: str
    webhook_secret_configured: bool
    key_secret_configured: bool = True
    has_custom_credentials: bool = False
    last_diagnostic_at: datetime | None = None
    last_diagnostic_status: str | None = None
    live_readiness_checklist: dict[str, bool]
    encryption_configured: bool = True
    test_credentials: EnvironmentCredentialSummary | None = None
    live_credentials: EnvironmentCredentialSummary | None = None
    webhook_last_received_at: datetime | None = None
    webhook_last_event: str | None = None
    webhook_last_processed_at: datetime | None = None
    webhook_recent_errors_count: int = 0
    max_online_single_payment_limit: Decimal = Decimal("500000.00")
    split_payments_enabled: bool = True
    default_deposit_percentage: Decimal = Decimal("25.0")
    min_deposit_amount: Decimal = Decimal("5000.00")
    bank_transfer_enabled: bool = True
    branch_payment_enabled: bool = True


class PaymentSettingsUpdateRequest(BaseModel):
    """Update payload for global payment settings."""

    online_payments_enabled: bool | None = None
    maintenance_message: str | None = None
    razorpay_enabled: bool | None = None
    razorpay_environment: str | None = None  # "test" or "live"
    target_environment: str | None = None  # Explicit environment to configure ("test" or "live")
    confirm_live_mode: bool | None = None
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    razorpay_webhook_secret: str | None = None
    reset_credentials_to_env: bool | None = None
    max_online_single_payment_limit: Decimal | None = None
    split_payments_enabled: bool | None = None
    default_deposit_percentage: Decimal | None = None
    min_deposit_amount: Decimal | None = None
    bank_transfer_enabled: bool | None = None
    branch_payment_enabled: bool | None = None



class PaymentOverviewMetricsResponse(BaseModel):
    """High-level metrics for the Payment Overview dashboard."""

    total_volume: Decimal
    total_transactions: int
    captured_count: int
    captured_volume: Decimal
    pending_count: int
    pending_volume: Decimal
    refunded_count: int
    refunded_volume: Decimal
    failed_count: int
    online_payments_enabled: bool
    maintenance_message: str | None
    active_gateways: list[str]
    gateway_health: str


class PaymentTransactionListItem(BaseModel):
    """Summary of an individual transaction for the admin transactions list."""

    id: UUID
    booking_id: UUID
    booking_reference: str
    customer_name: str
    customer_email: str
    provider: str
    provider_order_id: str | None
    provider_payment_id: str | None
    amount: Decimal
    currency: str
    status: str
    payment_method: str | None
    captured_at: datetime | None
    created_at: datetime
    refund_count: int = 0
    total_refunded: Decimal = Decimal("0.00")
    reconciliation_status: str
    outstanding_balance: Decimal | None = None
    booking_total: Decimal | None = None
    booking_payment_status: str | None = None
    verification_notes: str | None = None
    failure_message: str | None = None
    transfer_reference: str | None = None
    payment_deadline: datetime | None = None


class PaymentTransactionsListResponse(BaseModel):
    """Paginated transactions list response."""

    items: list[PaymentTransactionListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaymentWebhookEventItem(BaseModel):
    """Audit log entry for an incoming payment webhook event."""

    id: UUID
    provider: str
    event_type: str
    event_id: str | None
    entity_id: str | None
    booking_id: str | None
    status: str
    received_at: datetime
    actor_user_id: UUID | None = None
    metadata_json: dict[str, object] | None = None


class PaymentWebhookListResponse(BaseModel):
    """Paginated webhook events response."""

    items: list[PaymentWebhookEventItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class RazorpayDiagnosticRequest(BaseModel):
    """Payload to request connection diagnostic for a specific environment."""

    environment: str | None = Field(default=None, description="Optional target environment ('test' or 'live')")


class RazorpayDiagnosticResponse(BaseModel):
    """Result of gateway diagnostic probe."""

    success: bool
    environment: str
    key_id_masked: str
    test_order_id: str | None = None
    diagnostic_message: str
    tested_at: datetime
    auth_status: str | None = None
    api_reachable: bool = True
    webhook_configured: bool = False


class RazorpayWebhookVerifyRequest(BaseModel):
    """Payload to request webhook configuration verification for a specific environment."""

    environment: str | None = Field(default=None, description="Optional target environment ('test' or 'live')")


class RazorpayWebhookVerificationResponse(BaseModel):
    """Result of webhook configuration verification."""

    configured: bool
    environment: str
    webhook_url: str
    signature_verification_active: bool
    last_webhook_received_at: datetime | None = None
    last_webhook_event: str | None = None
    last_processed_at: datetime | None = None
    last_processed_event: str | None = None
    recent_errors_count: int = 0
    recent_errors: list[dict[str, object]] = Field(default_factory=list)
    verification_message: str
    tested_at: datetime


