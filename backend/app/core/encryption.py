"""Authenticated encryption service using AES-256-GCM for sensitive gateway credentials."""

from __future__ import annotations

import base64
import binascii
import logging
import os
from typing import TYPE_CHECKING

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

if TYPE_CHECKING:
    from app.core.config import Settings

logger = logging.getLogger(__name__)

# Version prefix to support future cipher rotation
CIPHER_PREFIX_V1 = "v1:"


class EncryptionKeyError(RuntimeError):
    """Raised when the server encryption key is missing, invalid, or malformed."""


class DecryptionError(ValueError):
    """Raised when encrypted ciphertext cannot be authenticated or decrypted."""


def resolve_encryption_key(settings: Settings | None = None) -> bytes | None:
    """Resolve and validate the 32-byte (256-bit) AES-GCM key from environment settings.

    Accepts:
    1. Base64-encoded 32 bytes (44 chars)
    2. Hex-encoded 32 bytes (64 hex characters)
    3. Raw 32-character UTF-8 string
    """
    raw_key_val: str | None = None

    if settings is not None and getattr(settings, "payment_credentials_encryption_key", None):
        secret_val = settings.payment_credentials_encryption_key
        if secret_val:
            raw_key_val = (
                secret_val.get_secret_value()
                if hasattr(secret_val, "get_secret_value")
                else str(secret_val)
            )

    if not raw_key_val:
        env_val = os.environ.get("PAYMENT_CREDENTIALS_ENCRYPTION_KEY")
        if env_val:
            raw_key_val = env_val.strip()

    if not raw_key_val:
        return None

    key_str = raw_key_val.strip()

    # 1. Try base64 decoding
    try:
        decoded = base64.b64decode(key_str, validate=True)
        if len(decoded) == 32:
            return decoded
    except (binascii.Error, ValueError):
        logger.debug("Candidate key string is not valid base64.")

    # 2. Try hex decoding
    try:
        if len(key_str) == 64:
            decoded = bytes.fromhex(key_str)
            if len(decoded) == 32:
                return decoded
    except ValueError:
        logger.debug("Candidate key string is not valid hex.")

    # 3. Try raw 32-byte UTF-8 string
    raw_bytes = key_str.encode("utf-8")
    if len(raw_bytes) == 32:
        return raw_bytes

    logger.warning(
        "PAYMENT_CREDENTIALS_ENCRYPTION_KEY is configured but does not resolve to 32 bytes (256 bits)."
    )
    return None


def generate_encryption_key() -> str:
    """Generate a cryptographically secure 256-bit (32-byte) key formatted as base64."""
    random_bytes = os.urandom(32)
    return base64.b64encode(random_bytes).decode("utf-8")


def encrypt_secret(plaintext: str, key_bytes: bytes, associated_data: bytes | None = None) -> str:
    """Encrypt sensitive plaintext using AES-256-GCM with authenticated tags.

    Output format: 'v1:<base64(12_byte_nonce + ciphertext_with_tag)>'
    """
    if not isinstance(key_bytes, bytes) or len(key_bytes) != 32:
        raise EncryptionKeyError(
            "Encryption key must be exactly 32 bytes (256 bits) for AES-256-GCM."
        )

    if not plaintext:
        return ""

    nonce = os.urandom(12)  # Standard 96-bit nonce for GCM
    aesgcm = AESGCM(key_bytes)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), associated_data)
    combined = nonce + ciphertext
    b64_payload = base64.b64encode(combined).decode("utf-8")
    return f"{CIPHER_PREFIX_V1}{b64_payload}"


def decrypt_secret(
    encrypted_payload: str, key_bytes: bytes, associated_data: bytes | None = None
) -> str:
    """Decrypt and authenticate AES-256-GCM ciphertext payload.

    Raises DecryptionError if the ciphertext has been tampered with or key is incorrect.
    """
    if not encrypted_payload:
        return ""

    if not isinstance(key_bytes, bytes) or len(key_bytes) != 32:
        raise EncryptionKeyError(
            "Encryption key must be exactly 32 bytes (256 bits) for AES-256-GCM."
        )

    if not encrypted_payload.startswith(CIPHER_PREFIX_V1):
        raise DecryptionError("Unsupported or corrupt encryption format prefix.")

    b64_part = encrypted_payload[len(CIPHER_PREFIX_V1):]
    try:
        combined = base64.b64decode(b64_part)
    except Exception as exc:
        raise DecryptionError("Malformed base64 ciphertext payload.") from exc

    if len(combined) < 28:  # 12 nonce + at least 16 auth tag
        raise DecryptionError("Ciphertext payload is truncated or invalid.")

    nonce = combined[:12]
    ciphertext = combined[12:]

    aesgcm = AESGCM(key_bytes)
    try:
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, associated_data)
        return decrypted_bytes.decode("utf-8")
    except InvalidTag as exc:
        raise DecryptionError(
            "Decryption failed: Authentication tag verification failure. Ciphertext or key mismatch."
        ) from exc
    except Exception as exc:
        raise DecryptionError(f"Decryption error: {exc}") from exc
