"""Schemas for notification logging, inspection, and administration."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class NotificationLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    channel: str
    notification_type: str
    recipient: str
    recipient_user_id: UUID | None = None
    booking_id: UUID | None = None
    subject: str | None = None
    provider: str
    provider_message_id: str | None = None
    status: str
    error_message: str | None = None
    sent_at: datetime | None = None
    retry_count: int
    created_at: datetime


class NotificationLogListResponse(BaseModel):
    items: list[NotificationLogResponse]
    total: int
    page: int
    page_size: int


class NotificationRetryRequest(BaseModel):
    reason: str | None = Field(None, max_length=255)
