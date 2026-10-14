"""In-memory distributed-ready rate limiter and brute-force protection."""

import threading
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import Request

from app.core.config import get_settings
from app.core.errors import ApiError


class RateLimiter:
    """Thread-safe sliding-window rate limiter for sensitive API operations."""

    def __init__(
        self,
        default_max_attempts: int = 10,
        default_window_seconds: int = 60,
        error_message: str = "Too many requests. Please slow down and try again later.",
    ) -> None:
        self._lock = threading.Lock()
        self._attempts: dict[str, list[datetime]] = defaultdict(list)
        self.default_max_attempts = default_max_attempts
        self.default_window_seconds = default_window_seconds
        self.error_message = error_message

    def check(
        self,
        identifier: str,
        max_attempts: int | None = None,
        window_seconds: int | None = None,
        record: bool = True,
    ) -> None:
        """Verify that the key has not exceeded rate limits, optionally incrementing count."""
        now = datetime.now(timezone.utc)
        window = window_seconds or self.default_window_seconds
        limit = max_attempts or self.default_max_attempts
        cutoff = now.timestamp() - window

        with self._lock:
            # Prune expired attempts
            valid_attempts = [
                ts for ts in self._attempts[identifier] if ts.timestamp() > cutoff
            ]
            self._attempts[identifier] = valid_attempts

            if len(valid_attempts) >= limit:
                raise ApiError(
                    status_code=429,
                    code="RATE_LIMIT_EXCEEDED",
                    message=self.error_message,
                )

            if record:
                self._attempts[identifier].append(now)

    def record_attempt(self, identifier: str) -> None:
        """Explicitly record an attempt."""
        now = datetime.now(timezone.utc)
        with self._lock:
            self._attempts[identifier].append(now)

    def reset(self, identifier: str) -> None:
        """Clear attempts for an identifier."""
        with self._lock:
            self._attempts.pop(identifier, None)

    def clear_all(self) -> None:
        """Clear all rate limit entries."""
        with self._lock:
            self._attempts.clear()


class LoginRateLimiter:
    """Thread-safe rate limiter tracking failed authentication attempts."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._attempts: dict[str, list[datetime]] = defaultdict(list)

    def check_rate_limit(self, identifier: str) -> None:
        """Verify that the identifier has not exceeded maximum failed attempts."""
        settings = get_settings()
        now = datetime.now(timezone.utc)
        window = settings.login_rate_limit_window_seconds
        max_attempts = settings.login_rate_limit_max_attempts

        with self._lock:
            cutoff = now.timestamp() - window
            valid_attempts = [
                ts for ts in self._attempts[identifier] if ts.timestamp() > cutoff
            ]
            self._attempts[identifier] = valid_attempts

            if len(valid_attempts) >= max_attempts:
                raise ApiError(
                    status_code=429,
                    code="TOO_MANY_REQUESTS",
                    message="Too many failed login attempts. Please wait 15 minutes before trying again.",
                )

    def record_failure(self, identifier: str) -> None:
        """Record a failed login attempt for an identifier."""
        now = datetime.now(timezone.utc)
        with self._lock:
            self._attempts[identifier].append(now)

    def reset(self, identifier: str) -> None:
        """Clear recorded failures upon successful authentication."""
        with self._lock:
            self._attempts.pop(identifier, None)

    def clear_all(self) -> None:
        """Clear all rate limit state (useful for tests)."""
        with self._lock:
            self._attempts.clear()


# Pre-configured global rate limiters
login_limiter = LoginRateLimiter()

# Register limiter: 10 registrations per 15 minutes per IP
register_limiter = RateLimiter(
    default_max_attempts=10,
    default_window_seconds=900,
    error_message="Too many registration attempts from this network. Please wait before creating another account.",
)

# Password reset limiter: 5 attempts per 15 minutes
password_reset_limiter = RateLimiter(
    default_max_attempts=5,
    default_window_seconds=900,
    error_message="Too many password reset requests. Please wait a few minutes before trying again.",
)

# Public contact/inquiry limiter: 15 inquiries per 30 minutes
inquiry_limiter = RateLimiter(
    default_max_attempts=15,
    default_window_seconds=1800,
    error_message="Too many inquiries submitted from this network. Please wait a few moments.",
)

# Payment order creation limiter: 30 payment orders per 10 minutes per client
payment_order_limiter = RateLimiter(
    default_max_attempts=30,
    default_window_seconds=600,
    error_message="Payment transaction volume exceeded. Please wait a few moments before trying again.",
)

# Payment verification limiter: 30 verification attempts per 10 minutes per client
payment_verify_limiter = RateLimiter(
    default_max_attempts=30,
    default_window_seconds=600,
    error_message="Payment verification volume exceeded. Please wait a few moments before retrying.",
)

# Booking creation limiter: 20 bookings per 15 minutes per client
booking_limiter = RateLimiter(
    default_max_attempts=20,
    default_window_seconds=900,
    error_message="Booking request limit exceeded. Please wait before submitting another reservation.",
)

# Cancellation limiter: 10 cancellation requests per 15 minutes per client
cancellation_limiter = RateLimiter(
    default_max_attempts=10,
    default_window_seconds=900,
    error_message="Cancellation request limit exceeded. Please wait a few moments.",
)

# Admin operations communication limiter: 40 dispatches per 10 minutes per staff user
admin_ops_limiter = RateLimiter(
    default_max_attempts=40,
    default_window_seconds=600,
    error_message="Outbound communication rate limit reached for this session.",
)

ALL_LIMITERS: list[RateLimiter] = [
    register_limiter,
    password_reset_limiter,
    inquiry_limiter,
    payment_order_limiter,
    payment_verify_limiter,
    booking_limiter,
    cancellation_limiter,
    admin_ops_limiter,
]


def clear_all_rate_limiters() -> None:
    """Reset all global rate limiter states (for test teardowns)."""
    login_limiter.clear_all()
    for limiter in ALL_LIMITERS:
        limiter.clear_all()


def get_client_ip(request: Request) -> str:
    """Extract client IP respecting reverse proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"
