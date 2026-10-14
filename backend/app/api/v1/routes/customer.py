"""Customer portal API routes: profile, saved travellers, and dashboard metrics."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.core.csrf import verify_csrf_token
from app.db.session import get_db_session
from app.schemas.customer import (
    CustomerDashboardSummary,
    CustomerProfileResponse,
    CustomerProfileUpdate,
    SavedTravellerCreate,
    SavedTravellerResponse,
    SavedTravellerUpdate,
    WhatsAppConciergeAction,
)
from app.services.customer_portal_service import get_customer_portal_service
from app.services.whatsapp_service import get_whatsapp_service

router = APIRouter(prefix="/customer", tags=["customer"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get("/dashboard", response_model=CustomerDashboardSummary)
def get_customer_dashboard(
    current_user: CurrentUser,
    db: DbSession,
) -> CustomerDashboardSummary:
    """Retrieve personal customer dashboard overview, upcoming trips, and metrics."""
    service = get_customer_portal_service()
    return service.get_dashboard_summary(db=db, user=current_user)


@router.get("/profile", response_model=CustomerProfileResponse)
def get_customer_profile(
    current_user: CurrentUser,
) -> CustomerProfileResponse:
    """Retrieve customer profile information."""
    service = get_customer_portal_service()
    return service.get_profile(user=current_user)


@router.put("/profile", response_model=CustomerProfileResponse)
def update_customer_profile(
    payload: CustomerProfileUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> CustomerProfileResponse:
    """Update editable customer profile details (first_name, last_name, phone). CSRF protected."""
    verify_csrf_token(request)
    service = get_customer_portal_service()
    updated = service.update_profile(db=db, user=current_user, payload=payload)
    db.commit()
    return updated


@router.get("/travellers", response_model=list[SavedTravellerResponse])
def list_saved_travellers(
    current_user: CurrentUser,
    db: DbSession,
) -> list[SavedTravellerResponse]:
    """List reusable saved traveller profiles belonging to the authenticated customer."""
    service = get_customer_portal_service()
    return service.list_saved_travellers(db=db, user_id=current_user.id)


@router.post(
    "/travellers",
    response_model=SavedTravellerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_saved_traveller(
    payload: SavedTravellerCreate,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> SavedTravellerResponse:
    """Create a new reusable saved traveller profile for faster checkout. CSRF protected."""
    verify_csrf_token(request)
    service = get_customer_portal_service()
    created = service.create_saved_traveller(
        db=db, user_id=current_user.id, payload=payload
    )
    db.commit()
    return created


@router.put("/travellers/{traveller_id}", response_model=SavedTravellerResponse)
def update_saved_traveller(
    traveller_id: UUID,
    payload: SavedTravellerUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> SavedTravellerResponse:
    """Update an existing saved traveller profile. CSRF protected."""
    verify_csrf_token(request)
    service = get_customer_portal_service()
    updated = service.update_saved_traveller(
        db=db, user_id=current_user.id, traveller_id=traveller_id, payload=payload
    )
    db.commit()
    return updated


@router.delete(
    "/travellers/{traveller_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_saved_traveller(
    traveller_id: UUID,
    request: Request,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Delete a saved traveller profile. Does not modify past booking snapshots. CSRF protected."""
    verify_csrf_token(request)
    service = get_customer_portal_service()
    service.delete_saved_traveller(
        db=db, user_id=current_user.id, traveller_id=traveller_id
    )
    db.commit()


@router.get("/whatsapp-concierge", response_model=list[WhatsAppConciergeAction])
def get_whatsapp_concierge_actions(
    db: DbSession,
) -> list[WhatsAppConciergeAction]:
    """Retrieve preconfigured WhatsApp concierge quick-action links and numbers."""
    wa_service = get_whatsapp_service()
    phone = wa_service.get_configured_phone(db)

    return [
        WhatsAppConciergeAction(
            action_type="general_support",
            label="Chat with Concierge",
            prefilled_message="Hi KV Tours & Travels, I would like to inquire about your curated travel packages.",
            click_to_chat_url=wa_service.build_general_support_url(db),
            display_phone=phone,
        ),
        WhatsAppConciergeAction(
            action_type="payment_help",
            label="Payment Assistance",
            prefilled_message="Hi KV Tours & Travels, I need assistance regarding my payment.",
            click_to_chat_url=wa_service.generate_click_to_chat_url(
                "Hi KV Tours & Travels, I need assistance regarding my payment.", db
            ),
            display_phone=phone,
        ),
    ]
