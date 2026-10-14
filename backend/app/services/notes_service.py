"""Service for managing staff-only internal notes on operational entities."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.orm import Session, joinedload

from app.models.commerce import InternalNote
from app.schemas.admin_operations import InternalNoteResponse
from app.services.admin.audit_service import record_audit_log


class NotesService:
    """Operations for internal staff and manager notes."""

    @staticmethod
    def list_notes(
        db: Session,
        entity_type: str,
        entity_id: UUID,
    ) -> list[InternalNoteResponse]:
        """Fetch all internal notes for an entity (booking, customer, inquiry, departure)."""
        stmt = (
            select(InternalNote)
            .options(joinedload(InternalNote.author))
            .where(
                InternalNote.entity_type == entity_type,
                InternalNote.entity_id == entity_id,
            )
            .order_by(desc(InternalNote.created_at))
        )
        notes = db.execute(stmt).unique().scalars().all()

        return [
            InternalNoteResponse(
                id=n.id,
                entity_type=n.entity_type,
                entity_id=n.entity_id,
                author_id=n.author_user_id,
                author_name=(
                    f"{n.author.first_name} {n.author.last_name}".strip()
                    if n.author
                    else "Staff"
                ),
                author_email=n.author.email if n.author else "staff@kvtours.com",
                note=n.note,
                created_at=n.created_at,
            )
            for n in notes
        ]

    @staticmethod
    def create_note(
        db: Session,
        entity_type: str,
        entity_id: UUID,
        author_user_id: UUID,
        note_text: str,
        ip_address: str | None = None,
    ) -> InternalNoteResponse:
        """Create an immutable staff internal note and record audit trail."""
        note = InternalNote(
            entity_type=entity_type,
            entity_id=entity_id,
            author_user_id=author_user_id,
            note=note_text.strip(),
        )
        db.add(note)
        db.flush()
        db.refresh(note)

        # Record audit log
        record_audit_log(
            db=db,
            action="create_internal_note",
            entity_type=f"{entity_type}_note",
            entity_id=str(entity_id),
            actor_user_id=author_user_id,
            ip_address=ip_address,
            metadata={"entity_type": entity_type, "note_id": str(note.id)},
        )

        return InternalNoteResponse(
            id=note.id,
            entity_type=note.entity_type,
            entity_id=note.entity_id,
            author_id=note.author_user_id,
            author_name=(
                f"{note.author.first_name} {note.author.last_name}".strip()
                if note.author
                else "Staff"
            ),
            author_email=note.author.email if note.author else "staff@kvtours.com",
            note=note.note,
            created_at=note.created_at,
        )
