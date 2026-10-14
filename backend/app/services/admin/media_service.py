"""Service for secure Cloudinary signed uploads, direct uploads, and media governance."""

from __future__ import annotations

import base64
import binascii
import hashlib
import logging
import time
from pathlib import Path
from uuid import UUID, uuid4

import httpx
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.config import get_settings
from app.core.errors import ApiError
from app.schemas.admin import (
    MediaUploadRequest,
    MediaUploadResponse,
    SignedUploadRequest,
    SignedUploadResponse,
)
from app.services.admin.audit_service import record_audit_log
from app.services.admin.utils import slugify

ALLOWED_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "image/svg+xml": ".svg",
}


def generate_signed_upload(
    payload: SignedUploadRequest,
    current_admin_id: UUID,
) -> SignedUploadResponse:
    """Generate authenticated parameters for direct-to-Cloudinary signed uploads."""
    settings = get_settings()
    timestamp = int(time.time())
    folder = payload.folder.strip() or "travelagency/catalog"

    cloud_name = settings.cloudinary_cloud_name or "kvtours-travels"
    api_key = settings.cloudinary_api_key or "kvtours_api_key_dev"
    api_secret = settings.cloudinary_api_secret or "kvtours_api_secret_dev"

    string_to_sign = f"folder={folder}&timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(string_to_sign.encode("utf-8")).hexdigest()

    upload_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"

    return SignedUploadResponse(
        cloud_name=cloud_name,
        api_key=api_key,
        timestamp=timestamp,
        signature=signature,
        folder=folder,
        upload_url=upload_url,
    )


def upload_media(
    db: Session,
    payload: MediaUploadRequest,
    current_admin_id: UUID,
    ip_address: str | None = None,
) -> MediaUploadResponse:
    """Validate and upload media file to Cloudinary if configured, or local static storage as fallback."""
    settings = get_settings()

    # 1. Parse base64 data and validate content type
    raw_data = payload.file_data.strip()
    content_type = payload.content_type.strip().lower()

    if content_type not in ALLOWED_EXTENSIONS:
        raise ApiError(
            status_code=400,
            code="UNSUPPORTED_MEDIA_TYPE",
            message=f"File type '{content_type}' is not supported. Allowed formats: JPEG, PNG, WebP, GIF, AVIF, SVG.",
        )

    if raw_data.startswith("data:") and ";base64," in raw_data:
        header, b64_str = raw_data.split(";base64,", 1)
        mime = header[5:].strip().lower()
        if mime:
            if mime not in ALLOWED_EXTENSIONS:
                raise ApiError(
                    status_code=400,
                    code="UNSUPPORTED_MEDIA_TYPE",
                    message=f"Data URI file type '{mime}' is not supported.",
                )
            content_type = mime
    else:
        b64_str = raw_data

    try:
        file_bytes = base64.b64decode(b64_str)
    except (binascii.Error, ValueError):
        raise ApiError(
            status_code=400,
            code="INVALID_FILE_DATA",
            message="Unable to decode file payload. Ensure file data is valid base64.",
        )

    size_bytes = len(file_bytes)
    max_size = 10 * 1024 * 1024  # 10MB
    if size_bytes > max_size:
        raise ApiError(
            status_code=400,
            code="FILE_TOO_LARGE",
            message=f"File size ({round(size_bytes / (1024 * 1024), 2)}MB) exceeds maximum limit of 10MB.",
        )

    ext = ALLOWED_EXTENSIONS[content_type]
    clean_stem = slugify(Path(payload.filename).stem or "image")[:60]
    unique_filename = f"{clean_stem}_{uuid4().hex[:12]}{ext}"

    # 2. Try Cloudinary if API key & secret are configured
    cloud_name = settings.cloudinary_cloud_name
    api_key = settings.cloudinary_api_key
    api_secret = settings.cloudinary_api_secret

    if cloud_name and api_key and api_secret:
        timestamp = int(time.time())
        folder = payload.folder.strip() or "travelagency/catalog"
        string_to_sign = f"folder={folder}&timestamp={timestamp}{api_secret}"
        signature = hashlib.sha1(string_to_sign.encode("utf-8")).hexdigest()
        cloudinary_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"

        try:
            with httpx.Client(timeout=30.0) as http_client:
                files = {"file": (unique_filename, file_bytes, content_type)}
                data = {
                    "api_key": api_key,
                    "timestamp": str(timestamp),
                    "signature": signature,
                    "folder": folder,
                }
                c_resp = http_client.post(cloudinary_url, data=data, files=files)
                if c_resp.status_code in (200, 201):
                    res_json = c_resp.json()
                    sec_url = res_json.get("secure_url") or res_json.get("url")
                    pub_id = res_json.get("public_id")
                    record_audit_log(
                        db=db,
                        action="media_uploaded",
                        entity_type="media",
                        entity_id=pub_id,
                        actor_user_id=current_admin_id,
                        ip_address=ip_address,
                        metadata={
                            "provider": "cloudinary",
                            "url": sec_url,
                            "size_bytes": size_bytes,
                        },
                    )
                    db.commit()
                    return MediaUploadResponse(
                        url=sec_url,
                        public_id=pub_id,
                        filename=unique_filename,
                        content_type=content_type,
                        size_bytes=size_bytes,
                        storage_type="cloudinary",
                    )
        except (httpx.HTTPError, OSError) as exc:
            logger.warning(
                "Cloudinary upload failed (%s); using local static storage.", exc
            )

    # 3. Fallback: Local static storage
    uploads_dir = (
        Path(__file__).resolve().parent.parent.parent.parent / "static" / "uploads"
    )
    uploads_dir.mkdir(parents=True, exist_ok=True)
    target_path = uploads_dir / unique_filename

    target_path.write_bytes(file_bytes)

    # Full or relative URL
    file_url = f"/uploads/{unique_filename}"
    record_audit_log(
        db=db,
        action="media_uploaded",
        entity_type="media",
        entity_id=unique_filename,
        actor_user_id=current_admin_id,
        ip_address=ip_address,
        metadata={
            "provider": "local_storage",
            "url": file_url,
            "size_bytes": size_bytes,
        },
    )
    db.commit()

    return MediaUploadResponse(
        url=file_url,
        public_id=unique_filename,
        filename=unique_filename,
        content_type=content_type,
        size_bytes=size_bytes,
    )
