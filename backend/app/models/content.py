"""Editorial content, runtime site configuration, and audit records."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.common import IP_ADDRESS, JSON_DOCUMENT


class BlogPost(TimestampMixin, Base):
    __tablename__ = "blog_posts"
    __table_args__ = (
        Index("ix_blog_posts_published_at", "is_published", "published_at"),
        Index("ix_blog_posts_author_id", "author_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    slug: Mapped[str] = mapped_column(String(260), nullable=False, unique=True)
    excerpt: Mapped[str | None] = mapped_column(String(600))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    featured_image_url: Mapped[str | None] = mapped_column(Text)
    featured_image_public_id: Mapped[str | None] = mapped_column(
        String(255), unique=True
    )
    author_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    is_published: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    seo_title: Mapped[str | None] = mapped_column(String(180))
    seo_description: Mapped[str | None] = mapped_column(String(320))
    author: Mapped[User | None] = relationship(back_populates="blog_posts")


class SiteSetting(TimestampMixin, Base):
    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value: Mapped[dict[str, object] | list[object] | str | int | bool | None] = (
        mapped_column(JSON_DOCUMENT, nullable=True)
    )
    description: Mapped[str | None] = mapped_column(String(300))
    is_public: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        CheckConstraint("action <> ''", name="ck_audit_logs_action_nonempty"),
        CheckConstraint("entity_type <> ''", name="ck_audit_logs_entity_type_nonempty"),
        Index("ix_audit_logs_entity_created", "entity_type", "entity_id", "created_at"),
        Index("ix_audit_logs_actor_created", "actor_user_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    actor_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(100))
    ip_address: Mapped[str | None] = mapped_column(IP_ADDRESS)
    metadata_json: Mapped[dict[str, object] | None] = mapped_column(JSON_DOCUMENT)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    actor: Mapped[User | None] = relationship(back_populates="audit_logs")


class NotificationLog(TimestampMixin, Base):
    """Audit and idempotency record for all outbound notifications (email, WhatsApp)."""

    __tablename__ = "notification_logs"
    __table_args__ = (
        CheckConstraint(
            "channel IN ('email', 'whatsapp', 'sms')",
            name="ck_notification_logs_channel",
        ),
        CheckConstraint(
            "status IN ('pending', 'sent', 'failed', 'delivered')",
            name="ck_notification_logs_status",
        ),
        Index("ix_notification_logs_recipient", "recipient"),
        Index("ix_notification_logs_status_created", "status", "created_at"),
        Index("ix_notification_logs_booking_id", "booking_id"),
        Index("ix_notification_logs_idempotency_key", "idempotency_key", unique=True),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    channel: Mapped[str] = mapped_column(String(24), nullable=False)
    notification_type: Mapped[str] = mapped_column(String(64), nullable=False)
    recipient: Mapped[str] = mapped_column(String(320), nullable=False)
    recipient_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    booking_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL")
    )
    idempotency_key: Mapped[str | None] = mapped_column(String(160), unique=True)
    subject: Mapped[str | None] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    provider_message_id: Mapped[str | None] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="pending"
    )
    error_message: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    retry_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )

    recipient_user: Mapped[User | None] = relationship(foreign_keys=[recipient_user_id])


from app.models.user import User
