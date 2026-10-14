"""Administrative agency settings, branding, diagnostics, and integrations routes."""

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
from app.schemas.admin import (
    AdminSiteSettingsResponse,
    AdminSiteSettingsUpdateRequest,
    ConfigurationHealthResponse,
    EmailSendTestRequest,
    EmailSendTestResponse,
    EmailTestConnectionResponse,
    ResendWebhookStatsResponse,
    ResendWebhookVerifyRequest,
    ResendWebhookVerifyResponse,
    WhatsAppTestConnectionResponse,
)
from app.services.admin.settings_service import (
    get_admin_settings,
    get_configuration_health,
    get_resend_webhook_stats,
    send_test_email,
    test_resend_connection,
    test_whatsapp_connection,
    update_admin_settings,
    verify_resend_sender,
    verify_resend_webhook_configuration,
)

router = APIRouter(prefix="/settings", tags=["admin-settings"])


DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]
ManagerOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]
AdminOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


def _extract_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("", response_model=AdminSiteSettingsResponse)
def get_settings_endpoint(
    _admin: StaffOrAbove,
    db: DbSession,
) -> AdminSiteSettingsResponse:
    """Retrieve current agency branding, contact, and operational settings."""
    return get_admin_settings(db)


@router.patch("", response_model=AdminSiteSettingsResponse)
@router.put("", response_model=AdminSiteSettingsResponse)
def update_settings_endpoint(
    payload: AdminSiteSettingsUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> AdminSiteSettingsResponse:
    """Update agency branding, WhatsApp concierge, and contact configuration. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_admin_settings(
        db=db,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.get("/health", response_model=ConfigurationHealthResponse)
def get_health_endpoint(
    _admin: StaffOrAbove,
    db: DbSession,
) -> ConfigurationHealthResponse:
    """Analyze and return configuration health summary across all business domains."""
    return get_configuration_health(db)


@router.post("/email/test-connection", response_model=EmailTestConnectionResponse)
def test_email_connection_endpoint(
    _admin: ManagerOrAbove,
    request: Request,
    db: DbSession,
) -> EmailTestConnectionResponse:
    """Test authenticated connectivity to Resend API. CSRF protected."""
    verify_csrf_token(request)
    return test_resend_connection(db)


@router.post("/email/verify-sender", response_model=EmailTestConnectionResponse)
def verify_email_sender_endpoint(
    _admin: ManagerOrAbove,
    request: Request,
    db: DbSession,
) -> EmailTestConnectionResponse:
    """Verify sender domain configuration via Resend API. CSRF protected."""
    verify_csrf_token(request)
    return verify_resend_sender(db)


@router.post("/email/send-test", response_model=EmailSendTestResponse)
def send_test_email_endpoint(
    payload: EmailSendTestRequest,
    admin: AdminOrAbove,
    request: Request,
    db: DbSession,
) -> EmailSendTestResponse:
    """Send an explicit test email to a specified recipient. CSRF protected."""
    verify_csrf_token(request)
    return send_test_email(
        db=db,
        recipient_email=payload.recipient_email,
        subject=payload.subject,
        notes=payload.notes,
        admin_id=admin.id,
    )


@router.post("/whatsapp/test-connection", response_model=WhatsAppTestConnectionResponse)
def test_whatsapp_connection_endpoint(
    _admin: ManagerOrAbove,
    request: Request,
    db: DbSession,
) -> WhatsAppTestConnectionResponse:
    """Test Meta WhatsApp Business Cloud API connectivity. CSRF protected."""
    verify_csrf_token(request)
    return test_whatsapp_connection(db)


@router.post("/email/verify-webhook", response_model=ResendWebhookVerifyResponse)
def verify_resend_webhook_endpoint(
    payload: ResendWebhookVerifyRequest,
    _admin: ManagerOrAbove,
    request: Request,
    db: DbSession,
) -> ResendWebhookVerifyResponse:
    """Verify Resend webhook signing secret and HMAC-SHA256 signature algorithm. CSRF protected."""
    verify_csrf_token(request)
    return verify_resend_webhook_configuration(db, signing_secret=payload.signing_secret)


@router.get("/email/webhook-stats", response_model=ResendWebhookStatsResponse)
def get_resend_webhook_stats_endpoint(
    _admin: StaffOrAbove,
    db: DbSession,
) -> ResendWebhookStatsResponse:
    """Retrieve delivery and bounce statistics from processed Resend webhooks."""
    return get_resend_webhook_stats(db)

