"""Service for managing destination gallery images."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.catalog import Destination, DestinationImage
from app.schemas.admin import (
    DestinationImageCreateRequest,
    DestinationImageResponse,
    DestinationImageUpdateRequest,
)
from app.services.admin.audit_service import record_audit_log


def serialize_destination_image(img: DestinationImage) -> DestinationImageResponse:
    return DestinationImageResponse(
        id=img.id,
        destination_id=img.destination_id,
        image_url=img.image_url,
        cloudinary_public_id=img.cloudinary_public_id,
        alt_text=img.alt_text,
        sort_order=img.sort_order,
        is_featured=img.is_featured,
        created_at=img.created_at,
    )


def list_destination_images(
    db: Session, destination_id: UUID
) -> list[DestinationImageResponse]:
    dest = db.execute(
        select(Destination).where(
            Destination.id == destination_id, Destination.deleted_at.is_(None)
        )
    ).scalar_one_or_none()
    if not dest:
        raise ApiError(
            status_code=404,
            code="DESTINATION_NOT_FOUND",
            message=f"Destination {destination_id} not found.",
        )

    images = (
        db.execute(
            select(DestinationImage)
            .where(DestinationImage.destination_id == destination_id)
            .order_by(DestinationImage.sort_order, DestinationImage.created_at)
        )
        .scalars()
        .all()
    )
    return [serialize_destination_image(img) for img in images]


def add_destination_image(
    db: Session,
    destination_id: UUID,
    payload: DestinationImageCreateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> DestinationImageResponse:
    dest = db.execute(
        select(Destination).where(
            Destination.id == destination_id, Destination.deleted_at.is_(None)
        )
    ).scalar_one_or_none()
    if not dest:
        raise ApiError(
            status_code=404,
            code="DESTINATION_NOT_FOUND",
            message=f"Destination {destination_id} not found.",
        )

    if payload.is_featured:
        # Unset featured on all other destination images
        existing_featured = (
            db.execute(
                select(DestinationImage).where(
                    DestinationImage.destination_id == destination_id,
                    DestinationImage.is_featured.is_(True),
                )
            )
            .scalars()
            .all()
        )
        for f in existing_featured:
            f.is_featured = False

    image = DestinationImage(
        destination_id=destination_id,
        image_url=payload.image_url.strip(),
        cloudinary_public_id=payload.cloudinary_public_id.strip()
        if payload.cloudinary_public_id
        else None,
        alt_text=payload.alt_text.strip(),
        sort_order=payload.sort_order,
        is_featured=payload.is_featured,
    )
    db.add(image)
    db.flush()

    record_audit_log(
        db=db,
        action="image_added",
        entity_type="destination_image",
        entity_id=str(image.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "destination_id": str(destination_id),
            "image_url": image.image_url,
            "is_featured": image.is_featured,
        },
    )
    db.commit()
    return serialize_destination_image(image)


def update_destination_image(
    db: Session,
    destination_id: UUID,
    image_id: UUID,
    payload: DestinationImageUpdateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> DestinationImageResponse:
    image = db.execute(
        select(DestinationImage).where(
            DestinationImage.id == image_id,
            DestinationImage.destination_id == destination_id,
        )
    ).scalar_one_or_none()
    if not image:
        raise ApiError(
            status_code=404,
            code="IMAGE_NOT_FOUND",
            message=f"Destination image {image_id} not found.",
        )

    changes: dict[str, object] = {}
    if payload.image_url is not None:
        image.image_url = payload.image_url.strip()
        changes["image_url"] = image.image_url
    if payload.cloudinary_public_id is not None:
        image.cloudinary_public_id = payload.cloudinary_public_id.strip() or None
        changes["cloudinary_public_id"] = image.cloudinary_public_id
    if payload.alt_text is not None:
        image.alt_text = payload.alt_text.strip()
        changes["alt_text"] = image.alt_text
    if payload.sort_order is not None:
        image.sort_order = payload.sort_order
        changes["sort_order"] = image.sort_order
    if payload.is_featured is not None:
        if payload.is_featured:
            # Unset featured on other images
            existing_featured = (
                db.execute(
                    select(DestinationImage).where(
                        DestinationImage.destination_id == destination_id,
                        DestinationImage.id != image.id,
                        DestinationImage.is_featured.is_(True),
                    )
                )
                .scalars()
                .all()
            )
            for f in existing_featured:
                f.is_featured = False
        image.is_featured = payload.is_featured
        changes["is_featured"] = image.is_featured

    record_audit_log(
        db=db,
        action="image_updated",
        entity_type="destination_image",
        entity_id=str(image.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"destination_id": str(destination_id), "changes": changes},
    )
    db.commit()
    return serialize_destination_image(image)


def delete_destination_image(
    db: Session,
    destination_id: UUID,
    image_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> None:
    image = db.execute(
        select(DestinationImage).where(
            DestinationImage.id == image_id,
            DestinationImage.destination_id == destination_id,
        )
    ).scalar_one_or_none()
    if not image:
        raise ApiError(
            status_code=404,
            code="IMAGE_NOT_FOUND",
            message=f"Destination image {image_id} not found.",
        )

    record_audit_log(
        db=db,
        action="image_removed",
        entity_type="destination_image",
        entity_id=str(image.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "destination_id": str(destination_id),
            "image_url": image.image_url,
        },
    )
    db.delete(image)
    db.commit()
