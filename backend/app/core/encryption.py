"""Authenticated encryption service using AES-256-GCM for sensitive gateway credentials."""

from __future__ import annotations

import base64
import binascii
import logging
import os
from typing import TYPE_CHECKING, Any

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


def inspect_encryption_key(settings: Settings | None = None) -> dict[str, Any]:
    """Inspect and validate the server encryption key configuration.

    Returns a dict with:
        - status: "valid", "missing", or "malformed"
        - message: human-readable status explanation
        - key_bytes: decrypted 32-byte key if valid, else None
        - source: where the key was found ("settings", "PAYMENT_CREDENTIALS_ENCRYPTION_KEY", etc.) or None
        - key_length_bytes: length in bytes if decoded, else None
        - format: "base64", "hex", "raw", or None
    """
    raw_key_val: str | None = None
    source_name: str | None = None

    if settings is not None and getattr(settings, "payment_credentials_encryption_key", None):
        secret_val = settings.payment_credentials_encryption_key
        if secret_val:
            candidate = (
                secret_val.get_secret_value()
                if hasattr(secret_val, "get_secret_value")
                else str(secret_val)
            )
            if candidate and candidate.strip():
                raw_key_val = candidate.strip()
                source_name = "settings.payment_credentials_encryption_key"

    if not raw_key_val:
        for env_var in (
            "PAYMENT_CREDENTIALS_ENCRYPTION_KEY",
            "ENCRYPTION_KEY",
            "SETTINGS_ENCRYPTION_KEY",
        ):
            env_val = os.environ.get(env_var)
            if env_val and env_val.strip():
                raw_key_val = env_val.strip()
                source_name = env_var
                break

    if not raw_key_val:
        return {
            "status": "missing",
            "message": (
                "Server encryption key PAYMENT_CREDENTIALS_ENCRYPTION_KEY is missing from environment variables. "
                "Please configure a 32-byte (Base64 or Hex encoded) encryption key in the Render dashboard."
            ),
            "key_bytes": None,
            "source": None,
            "key_length_bytes": None,
            "format": None,
        }

    key_str = raw_key_val.strip()

    # 1. Try base64 decoding
    b64_decoded_bytes: bytes | None = None
    try:
        decoded = base64.b64decode(key_str, validate=True)
        b64_decoded_bytes = decoded
        if len(decoded) == 32:
            return {
                "status": "valid",
                "message": "Encryption key is configured and valid (32 bytes, Base64 encoded).",
                "key_bytes": decoded,
                "source": source_name,
                "key_length_bytes": 32,
                "format": "base64",
            }
    except (binascii.Error, ValueError):
        try:
            padded = key_str + "=" * (-len(key_str) % 4)
            decoded_url = base64.urlsafe_b64decode(padded)
            if len(decoded_url) == 32:
                return {
                    "status": "valid",
                    "message": "Encryption key is configured and valid (32 bytes, URL-safe Base64 encoded).",
                    "key_bytes": decoded_url,
                    "source": source_name,
                    "key_length_bytes": 32,
                    "format": "base64",
                }
        except Exception:
            pass

    # 2. Try hex decoding
    try:
        if len(key_str) == 64:
            decoded_hex = bytes.fromhex(key_str)
            if len(decoded_hex) == 32:
                return {
                    "status": "valid",
                    "message": "Encryption key is configured and valid (32 bytes, Hex encoded).",
                    "key_bytes": decoded_hex,
                    "source": source_name,
                    "key_length_bytes": 32,
                    "format": "hex",
                }
    except ValueError:
        pass

    # 3. Try raw 32-byte UTF-8 string
    raw_bytes = key_str.encode("utf-8")
    if len(raw_bytes) == 32:
        return {
            "status": "valid",
            "message": "Encryption key is configured and valid (32 bytes raw UTF-8).",
            "key_bytes": raw_bytes,
            "source": source_name,
            "key_length_bytes": 32,
            "format": "raw",
        }

    # If reached here, key is provided in environment variables, but is malformed
    if b64_decoded_bytes is not None:
        detail_msg = (
            f"Configured encryption key in {source_name} decoded to {len(b64_decoded_bytes)} bytes "
            f"from Base64, but AES-256-GCM requires exactly 32 bytes (256 bits)."
        )
    elif len(key_str) == 64:
        detail_msg = (
            f"Configured encryption key in {source_name} is 64 characters but contains invalid hexadecimal characters."
        )
    else:
        detail_msg = (
            f"Configured encryption key in {source_name} has invalid format or length ({len(key_str)} characters). "
            f"Expected a 32-byte key (Base64-encoded 44 characters or Hex-encoded 64 characters)."
        )

    return {
        "status": "malformed",
        "message": detail_msg,
        "key_bytes": None,
        "source": source_name,
        "key_length_bytes": len(b64_decoded_bytes) if b64_decoded_bytes is not None else len(raw_bytes),
        "format": None,
    }


def resolve_encryption_key(
    settings: Settings | None = None,
    allow_derived_fallback: bool = False,
) -> bytes | None:
    """Resolve and validate the 32-byte (256-bit) AES-GCM key from environment settings.

    Accepts:
    1. Base64-encoded 32 bytes (44 chars)
    2. Hex-encoded 32 bytes (64 hex characters)
    3. Raw 32-character UTF-8 string
    4. Deterministic derivation from secret_key only if allow_derived_fallback is True
    """
    inspection = inspect_encryption_key(settings)
    if inspection["status"] == "valid" and inspection["key_bytes"]:
        return inspection["key_bytes"]

    if allow_derived_fallback:
        try:
            from app.core.config import get_settings

            active_settings = settings or get_settings()
            secret_key_val = (
                active_settings.secret_key.get_secret_value()
                if hasattr(active_settings.secret_key, "get_secret_value")
                else str(active_settings.secret_key)
            )
            if secret_key_val:
                import hashlib

                return hashlib.sha256(
                    b"the-wild-root-credential-encryption-v1:"
                    + secret_key_val.encode("utf-8")
                ).digest()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not derive fallback encryption key from secret_key: %s", exc)

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
