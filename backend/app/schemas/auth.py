"""Pydantic schemas for authentication requests and sanitized responses."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    """Customer registration payload with strict parameter boundary."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., max_length=320, description="Customer email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Raw password meeting complexity rules",
    )
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    phone: str | None = Field(
        default=None, max_length=32, description="Optional contact telephone"
    )


class LoginRequest(BaseModel):
    """Authentication credentials payload."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., max_length=320)
    password: str = Field(..., min_length=1, max_length=128)


class ForgotPasswordRequest(BaseModel):
    """Password recovery initiation payload."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., max_length=320)


class ResetPasswordRequest(BaseModel):
    """Password reset completion payload."""

    model_config = ConfigDict(extra="forbid")

    token: str = Field(..., min_length=1, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=128)


class SocialLoginRequest(BaseModel):
    """Payload for Google and Apple social sign-in verification."""

    model_config = ConfigDict(extra="forbid")

    id_token: str = Field(..., min_length=10, description="Firebase / Identity Provider ID token")
    provider: str = Field(default="google.com", description="Provider ID (google.com or apple.com)")
    first_name: str | None = Field(default=None, max_length=100, description="Optional user first name")
    last_name: str | None = Field(default=None, max_length=100, description="Optional user last name")


class SafeUserResponse(BaseModel):
    """Safe, sanitized user representation for public and authenticated API consumption."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: str | None
    status: str
    roles: list[str]
    is_email_verified: bool = False
    created_at: datetime
    updated_at: datetime


class AuthResponse(BaseModel):
    """Authentication success payload containing sanitized user profile."""

    user: SafeUserResponse
    message: str
    access_token: str | None = None
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str


class CsrfResponse(BaseModel):
    """CSRF token response for client initialization."""

    csrf_token: str
