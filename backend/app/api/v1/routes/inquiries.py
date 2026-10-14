"""Public customer travel inquiries routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.rate_limit import inquiry_limiter
from app.db.session import get_db_session
from app.schemas.catalog import PublicInquiryCreate, PublicInquiryResponse
from app.services.catalog_service import create_public_inquiry

router = APIRouter(prefix="/inquiries", tags=["public-inquiries"])

DbSession = Annotated[Session, Depends(get_db_session)]


@router.post(
    "", response_model=PublicInquiryResponse, status_code=status.HTTP_201_CREATED
)
def submit_inquiry(
    payload: PublicInquiryCreate, request: Request, db: DbSession
) -> PublicInquiryResponse:
    """Submit a customer travel inquiry or custom trip request with rate limiting."""
    forwarded = request.headers.get("X-Forwarded-For")
    client_ip = (
        forwarded.split(",")[0].strip()
        if forwarded
        else (request.client.host if request.client else "127.0.0.1")
    )
    inquiry_limiter.check(client_ip)
    return create_public_inquiry(db=db, payload=payload)
