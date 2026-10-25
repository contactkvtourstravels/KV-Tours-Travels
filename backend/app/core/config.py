"""Validated environment-based application settings."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings loaded from environment variables and an optional local .env."""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    log_level: str = "INFO"
    database_url: str = Field(
        default="postgresql+psycopg://postgres:change-me@localhost:5432/travelagency",
        repr=False,
    )
    db_pool_size: int = Field(default=5, ge=1, le=100)
    db_max_overflow: int = Field(default=10, ge=0, le=100)
    secret_key: SecretStr = SecretStr("unsafe-development-secret-change-me")
    frontend_url: str = "http://localhost:3000"
    frontend_origins: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    # Monitoring & Observability
    sentry_dsn: str | None = None
    redis_url: str | None = None

    # Authentication & Session Cookie Settings
    auth_cookie_name: str = "travel_session"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    auth_cookie_domain: str | None = None
    auth_cookie_path: str = "/"
    session_max_age_seconds: int = 60 * 60 * 24 * 7  # 7 days

    # Password Recovery Settings
    password_reset_expiry: int = Field(
        default=15, description="Reset token expiry in minutes"
    )

    # CSRF Settings
    csrf_cookie_name: str = "travel_csrf"
    csrf_header_name: str = "X-CSRF-Token"

    # Rate Limiting
    login_rate_limit_max_attempts: int = 5
    login_rate_limit_window_seconds: int = 900  # 15 minutes

    # Google & Firebase Social Authentication Settings
    google_client_id: str = "786587181693-9m54fg2tp89kafu39f5qpki0p63ovm5q.apps.googleusercontent.com"
    firebase_project_id: str = "travel-agency-31216"

    # Cloudinary Media Settings
    cloudinary_cloud_name: str = "wildroot"
    cloudinary_api_key: str = "wildroot_api_key_dev"
    cloudinary_api_secret: str = "wildroot_api_secret_dev"

    # Public Agency & WhatsApp Configuration
    agency_name: str = "The Wild Root"
    agency_location: str = "Palakkad, Kerala, India"
    whatsapp_number: str = "+919442000000"
    contact_email: str = "contact@wildroot.in"
    contact_phone: str = "+91 94420 00000"

    # Razorpay Payment Gateway Settings (Test / Sandbox defaults)
    razorpay_key_id: str = "rzp_test_placeholder_key"
    razorpay_key_secret: SecretStr = SecretStr("rzp_test_placeholder_secret")
    razorpay_webhook_secret: SecretStr = SecretStr(
        "rzp_test_placeholder_webhook_secret"
    )
    payment_credentials_encryption_key: SecretStr | None = Field(
        default=None,
        description="AES-256-GCM master encryption key for database-stored payment gateway credentials",
    )

    # Email Service Settings
    email_provider: str = "mock"  # 'mock', 'resend', 'smtp'
    resend_api_key: SecretStr = SecretStr("")
    resend_webhook_signing_secret: SecretStr = SecretStr("")
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: SecretStr = SecretStr("")
    email_from: str = "Wild Root <bookings@wildroot.in>"
    email_reply_to: str = "concierge@wildroot.in"

    # WhatsApp Communication Settings
    whatsapp_provider: str = "direct"  # 'direct', 'cloud_api', 'mock'
    whatsapp_business_phone_id: str = ""
    whatsapp_access_token: SecretStr = SecretStr("")
    whatsapp_verify_token: SecretStr = SecretStr("")

    @property
    def is_production(self) -> bool:
        """Indicate whether the application is running in production mode."""
        return self.app_env == "production"

    @property
    def cookie_secure(self) -> bool:
        """Enforce Secure cookies in production even if auth_cookie_secure is not explicitly set."""
        if self.is_production or "onrender.com" in self.backend_url or "https://" in self.backend_url:
            return True
        return self.auth_cookie_secure

    @property
    def cookie_samesite(self) -> Literal["lax", "strict", "none"]:
        """Enforce SameSite=none for cross-domain auth between Vercel and Render."""
        if self.is_production or "vercel.app" in self.frontend_origins or "onrender.com" in self.backend_url:
            return "none"
        return self.auth_cookie_samesite

    @property
    def cors_origins(self) -> list[str]:
        """Return configured, normalized frontend origins for CORS."""
        origins = [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]
        # Always allow production Vercel frontend domain
        vercel_domain = "https://the-wild-root.vercel.app"
        if vercel_domain not in origins:
            origins.append(vercel_domain)

        # In non-production, ensure standard local development origins are permitted
        if not self.is_production:
            dev_defaults = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
            ]
            for dev_origin in dev_defaults:
                if dev_origin not in origins:
                    origins.append(dev_origin)
        # In production, disallow wildcard '*'
        if self.is_production:
            origins = [o for o in origins if o != "*"]
            if not origins:
                origins = [self.frontend_url.strip()]
        return origins

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        """Enforce strict production checks and normalize database connection schemes."""
        url = self.database_url
        if url.startswith("postgres://"):
            self.database_url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            self.database_url = url.replace("postgresql://", "postgresql+psycopg://", 1)

        if self.app_env == "production":
            sec_val = self.secret_key.get_secret_value()
            if sec_val in (
                "unsafe-development-secret-change-me",
                "replace-with-a-long-random-secret",
                "",
            ):
                raise ValueError(
                    "SECRET_KEY must be set to a secure, random string in production."
                )
            if "sqlite" in self.database_url.lower():
                raise ValueError("SQLite is prohibited in production. Use PostgreSQL.")
        return self


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide cached settings instance."""
    return Settings()
