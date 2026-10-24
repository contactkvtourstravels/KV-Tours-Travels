"""Service for managing travel package gallery and hero images."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.catalog import Package, PackageImage
from app.schemas.admin import (
    PackageImageCreateRequest,
    PackageImageResponse,
    PackageImageUpdateRequest,
)
from app.services.admin.audit_service import record_audit_log


def serialize_package_image(img: PackageImage) -> PackageImageResponse:
    return PackageImageResponse(
        id=img.id,
        package_id=img.package_id,
        image_url=img.image_url,
        cloudinary_public_id=img.cloudinary_public_id,
        alt_text=img.alt_text,
        sort_order=img.sort_order,
        is_featured=img.is_featured,
        created_at=img.created_at,
    )


def list_package_images(db: Session, package_id: UUID) -> list[PackageImageResponse]:
    pkg = db.execute(
        select(Package).where(Package.id == package_id, Package.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package {package_id} not found.",
        )

    images = (
        db.execute(
            select(PackageImage)
            .where(PackageImage.package_id == package_id)
            .order_by(PackageImage.sort_order, PackageImage.created_at)
        )
        .scalars()
        .all()
    )
    return [serialize_package_image(img) for img in images]


def add_package_image(
    db: Session,
    package_id: UUID,
    payload: PackageImageCreateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageImageResponse:
    pkg = db.execute(
        select(Package).where(Package.id == package_id, Package.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not pkg:
        raise ApiError(
            status_code=404,
            code="PACKAGE_NOT_FOUND",
            message=f"Package {package_id} not found.",
        )

    if payload.is_featured:
        # Unset featured on all other package images
        existing_featured = (
            db.execute(
                select(PackageImage).where(
                    PackageImage.package_id == package_id,
                    PackageImage.is_featured.is_(True),
                )
            )
            .scalars()
            .all()
        )
        for f in existing_featured:
            f.is_featured = False

    image = PackageImage(
        package_id=package_id,
        image_url=payload.image_url.strip(),
        cloudinary_public_id=payload.cloudinary_public_id.strip()
        if payload.cloudinary_public_id
        else None,
        alt_text=payload.alt_text.strip(),
        sort_order=payload.sort_order,
        is_featured=payload.is_featured,
    )
    db.add(image)
    if payload.is_featured or not pkg.cover_image_url:
        pkg.cover_image_url = image.image_url
    db.flush()

    record_audit_log(
        db=db,
        action="image_added",
        entity_type="package_image",
        entity_id=str(image.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "image_url": image.image_url,
            "is_featured": image.is_featured,
        },
    )
    db.commit()
    return serialize_package_image(image)


def update_package_image(
    db: Session,
    package_id: UUID,
    image_id: UUID,
    payload: PackageImageUpdateRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> PackageImageResponse:
    image = db.execute(
        select(PackageImage).where(
            PackageImage.id == image_id,
            PackageImage.package_id == package_id,
        )
    ).scalar_one_or_none()
    if not image:
        raise ApiError(
            status_code=404,
            code="IMAGE_NOT_FOUND",
            message=f"Package image {image_id} not found.",
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
            existing_featured = (
                db.execute(
                    select(PackageImage).where(
                        PackageImage.package_id == package_id,
                        PackageImage.id != image.id,
                        PackageImage.is_featured.is_(True),
                    )
                )
                .scalars()
                .all()
            )
            for f in existing_featured:
                f.is_featured = False
        image.is_featured = payload.is_featured
        changes["is_featured"] = image.is_featured
        if payload.is_featured:
            pkg = db.execute(select(Package).where(Package.id == package_id)).scalar_one_or_none()
            if pkg:
                pkg.cover_image_url = image.image_url

    if "image_url" in changes:
        pkg = db.execute(select(Package).where(Package.id == package_id)).scalar_one_or_none()
        if pkg and image.is_featured:
            pkg.cover_image_url = image.image_url

    record_audit_log(
        db=db,
        action="image_updated",
        entity_type="package_image",
        entity_id=str(image.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={"package_id": str(package_id), "changes": changes},
    )
    db.commit()
    return serialize_package_image(image)


def delete_package_image(
    db: Session,
    package_id: UUID,
    image_id: UUID,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> None:
    image = db.execute(
        select(PackageImage).where(
            PackageImage.id == image_id,
            PackageImage.package_id == package_id,
        )
    ).scalar_one_or_none()
    if not image:
        raise ApiError(
            status_code=404,
            code="IMAGE_NOT_FOUND",
            message=f"Package image {image_id} not found.",
        )

    record_audit_log(
        db=db,
        action="image_removed",
        entity_type="package_image",
        entity_id=str(image.id),
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "package_id": str(package_id),
            "image_url": image.image_url,
        },
    )
    db.delete(image)
    db.commit()
