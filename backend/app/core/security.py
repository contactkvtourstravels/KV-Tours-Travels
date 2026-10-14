"""Cryptographic security utilities: Argon2id password hashing, validation, and token helpers."""

import hashlib
import re
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.errors import ApiError

# Production-grade Argon2id hasher configuration
# time_cost: 2 passes, memory_cost: 64MB (65536 KiB), parallelism: 1 lane, hash length: 32 bytes
_password_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=1,
    hash_len=32,
)

# Email validation regex conforming to practical RFC 5322 subset
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

# Password requirement regex checks
UPPERCASE_REGEX = re.compile(r"[A-Z]")
LOWERCASE_REGEX = re.compile(r"[a-z]")
DIGIT_REGEX = re.compile(r"\d")
SPECIAL_CHAR_REGEX = re.compile(r"""[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`"'\\]""")


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id with automatic salt generation."""
    return _password_hasher.hash(password)


def verify_password(password: str, hashed_password: str | None) -> bool:
    """Safely verify a plaintext password against an Argon2id hash.

    Returns False if hashed_password is None, malformed, or does not match.
    Never exposes internal error details or logs password material.
    """
    if not hashed_password:
        return False
    try:
        return _password_hasher.verify(hashed_password, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def validate_password_strength(password: str) -> None:
    """Enforce strict password complexity requirements.

    Requirements:
    - 8 to 128 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one decimal digit
    - At least one special symbol
    """
    if len(password) < 8:
        raise ApiError(
            status_code=422,
            code="WEAK_PASSWORD",
            message="Password must be at least 8 characters long.",
        )
    if len(password) > 128:
        raise ApiError(
            status_code=422,
            code="PASSWORD_TOO_LONG",
            message="Password must not exceed 128 characters.",
        )
    if not LOWERCASE_REGEX.search(password):
        raise ApiError(
            status_code=422,
            code="WEAK_PASSWORD",
            message="Password must contain at least one lowercase letter.",
        )
    if not UPPERCASE_REGEX.search(password):
        raise ApiError(
            status_code=422,
            code="WEAK_PASSWORD",
            message="Password must contain at least one uppercase letter.",
        )
    if not DIGIT_REGEX.search(password):
        raise ApiError(
            status_code=422,
            code="WEAK_PASSWORD",
            message="Password must contain at least one digit.",
        )
    if not SPECIAL_CHAR_REGEX.search(password):
        raise ApiError(
            status_code=422,
            code="WEAK_PASSWORD",
            message="Password must contain at least one special character.",
        )


def normalize_email(email: str) -> str:
    """Normalize and validate an email address.

    Trims leading/trailing whitespace, converts to lowercase, and validates structure.
    """
    cleaned = email.strip().lower()
    if not cleaned or not EMAIL_REGEX.match(cleaned):
        raise ApiError(
            status_code=422,
            code="INVALID_EMAIL",
            message="The provided email address format is invalid.",
        )
    return cleaned


def generate_secure_token() -> str:
    """Generate a high-entropy URL-safe cryptographic token (256 bits)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Compute the SHA-256 digest of an opaque token for secure rest storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
