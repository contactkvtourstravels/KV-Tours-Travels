"""Administrative internal notes routes for operational entities."""

from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

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
from app.schemas.admin_operations import (
    InternalNoteCreateRequest,
    InternalNoteResponse,
)
from app.services.notes_service import NotesService

router = APIRouter(prefix="/notes", tags=["admin-notes"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]

EntityType = Literal["booking", "customer", "inquiry", "departure"]


@router.get("/{entity_type}/{entity_id}", response_model=list[InternalNoteResponse])
def list_internal_notes(
    entity_type: EntityType,
    entity_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> list[InternalNoteResponse]:
    """Retrieve all internal staff notes for a specific operational entity."""
    return NotesService.list_notes(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id,
    )


@router.post(
    "/{entity_type}/{entity_id}",
    response_model=InternalNoteResponse,
    dependencies=[Depends(verify_csrf_token)],
)
def create_internal_note(
    entity_type: EntityType,
    entity_id: UUID,
    payload: InternalNoteCreateRequest,
    admin_user: StaffOrAbove,
    db: DbSession,
    request: Request,
) -> InternalNoteResponse:
    """Add a new internal staff note to an operational entity."""
    client_ip = request.client.host if request.client else None
    return NotesService.create_note(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id,
        author_user_id=admin_user.id,
        note_text=payload.note,
        ip_address=client_ip,
    )
