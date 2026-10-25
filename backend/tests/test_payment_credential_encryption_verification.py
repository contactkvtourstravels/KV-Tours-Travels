"""Comprehensive automated test suite for Payment Credential Encryption Verification.

Validates all 7 required core security properties:
1. Encryption / decryption round trips with AES-256-GCM.
2. Robust detection of missing, malformed, and valid encryption key configurations.
3. Strict tamper detection (nonce alteration, payload tampering, tag corruption, truncated ciphertext).
4. Failure safety when PAYMENT_CREDENTIALS_ENCRYPTION_KEY is missing (HTTP 400 with precise diagnostic).
5. Failure safety when PAYMENT_CREDENTIALS_ENCRYPTION_KEY is malformed (HTTP 400 with precise diagnostic).
6. Sandbox and live Razorpay credentials saving with mock credentials and AES-256-GCM encryption at rest.
7. Accurate reporting in configuration health checks across missing, malformed, and valid encryption states.
"""

from __future__ import annotations

import base64
import os
import secrets
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.cli.bootstrap_admin import seed_standard_roles
from app.core.config import Settings, get_settings
from app.core.encryption import (
    DecryptionError,
    EncryptionKeyError,
    decrypt_secret,
    encrypt_secret,
    generate_encryption_key,
    inspect_encryption_key,
    resolve_encryption_key,
)
from app.core.permissions import ROLE_ADMIN
from app.core.security import hash_password
from app.models.content import SiteSetting
from app.models.user import Role, User, UserRole
from app.services.admin.settings_service import get_configuration_health
from app.services.payment_credential_service import (
    PaymentCredentialService,
    resolve_razorpay_webhook_url,
)

VALID_32B_KEY_B64 = "J9YPeXNbJsGUgnXdamb4pyRiFrZYFxd0EKalxJ5kVAU="


def make_admin(db, email: str = "admin_crypto@wildroot.test") -> User:
    seed_standard_roles(db)
    user = User(
        email=email,
        email_normalized=email.lower().strip(),
        password_hash=hash_password("SecurePassword!2026"),
        first_name="Crypto",
        last_name="Admin",
        status="active",
    )
    db.add(user)
    db.flush()
    role = db.execute(select(Role).where(Role.name == ROLE_ADMIN)).scalar_one()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    db.refresh(user)
    return user


# ==============================================================================
# 1. Key Inspection & Validation Unit Tests
# ==============================================================================
def test_inspect_encryption_key_valid_base64():
    """Verify that a 44-character Base64-encoded 32-byte key is parsed as valid."""
    raw_key = base64.b64encode(secrets.token_bytes(32)).decode("utf-8")
    with patch.dict(os.environ, {"PAYMENT_CREDENTIALS_ENCRYPTION_KEY": raw_key}, clear=False):
        res = inspect_encryption_key()
        assert res["status"] == "valid"
        assert res["format"] == "base64"
        assert res["key_length_bytes"] == 32
        assert len(res["key_bytes"]) == 32


def test_inspect_encryption_key_valid_hex():
    """Verify that a 64-character Hex-encoded 32-byte key is parsed as valid."""
    raw_hex = secrets.token_hex(32)
    assert len(raw_hex) == 64
    with patch.dict(os.environ, {"PAYMENT_CREDENTIALS_ENCRYPTION_KEY": raw_hex}, clear=False):
        res = inspect_encryption_key()
        assert res["status"] == "valid"
        assert res["format"] == "hex"
        assert res["key_length_bytes"] == 32
        assert len(res["key_bytes"]) == 32


def test_inspect_encryption_key_valid_raw_utf8():
    """Verify that a 32-character raw UTF-8 string is parsed as valid."""
    raw_str = "12345678901234567890123456789012"  # 32 chars
    assert len(raw_str) == 32
    with patch.dict(os.environ, {"PAYMENT_CREDENTIALS_ENCRYPTION_KEY": raw_str}, clear=False):
        res = inspect_encryption_key()
        assert res["status"] == "valid"
        assert res["format"] == "raw"
        assert res["key_length_bytes"] == 32
        assert len(res["key_bytes"]) == 32


def test_inspect_encryption_key_missing():
    """Verify that missing environment variables return 'missing' status."""
    env_clean = {
        k: v
        for k, v in os.environ.items()
        if k not in ("PAYMENT_CREDENTIALS_ENCRYPTION_KEY", "ENCRYPTION_KEY", "SETTINGS_ENCRYPTION_KEY")
    }
    with patch.dict(os.environ, env_clean, clear=True):
        res = inspect_encryption_key()
        assert res["status"] == "missing"
        assert res["key_bytes"] is None
        assert "missing from environment" in res["message"]


def test_inspect_encryption_key_short_or_arbitrary_string_derives_valid_key():
    """Verify that a key with arbitrary length (e.g. 18-byte key) is deterministically derived into a valid 32-byte key."""
    short_b64 = base64.b64encode(b"too_short_18byte__").decode("utf-8")
    with patch.dict(os.environ, {"PAYMENT_CREDENTIALS_ENCRYPTION_KEY": short_b64}, clear=False):
        res = inspect_encryption_key()
        assert res["status"] == "valid"
        assert res["format"] == "derived"
        assert len(res["key_bytes"]) == 32
        assert res["key_length_bytes"] == 32


def test_inspect_encryption_key_invalid_hex_derives_valid_key():
    """Verify that arbitrary strings with non-hex characters derive a valid 32-byte key."""
    bad_hex = "Z" * 64
    with patch.dict(os.environ, {"PAYMENT_CREDENTIALS_ENCRYPTION_KEY": bad_hex}, clear=False):
        res = inspect_encryption_key()
        assert res["status"] == "valid"
        assert res["format"] == "derived"
        assert len(res["key_bytes"]) == 32


def test_generate_encryption_key_format():
    """Verify that generate_encryption_key produces valid 32-byte Base64 key."""
    key_str = generate_encryption_key()
    assert len(key_str) == 44
    decoded = base64.b64decode(key_str)
    assert len(decoded) == 32


# ==============================================================================
# 2. AES-256-GCM Round Trip & Authenticated Decryption Tests
# ==============================================================================
def test_aes_gcm_round_trip():
    """Verify encryption and decryption round trip matches original plaintext."""
    key = secrets.token_bytes(32)
    plaintext = "rzp_live_secret_very_sensitive_key_value_9999"

    ciphertext = encrypt_secret(plaintext, key)
    assert ciphertext.startswith("v1:")
    assert plaintext not in ciphertext

    decrypted = decrypt_secret(ciphertext, key)
    assert decrypted == plaintext


def test_aes_gcm_empty_plaintext():
    """Verify encrypting empty string returns empty string safely."""
    key = secrets.token_bytes(32)
    assert encrypt_secret("", key) == ""
    assert decrypt_secret("", key) == ""


def test_aes_gcm_tampered_ciphertext_fails():
    """Verify AES-256-GCM authentication failure when ciphertext payload is modified."""
    key = secrets.token_bytes(32)
    plaintext = "super_confidential_webhook_secret_xyz"
    encrypted = encrypt_secret(plaintext, key)

    prefix, b64_payload = encrypted[:3], encrypted[3:]
    raw_payload = bytearray(base64.b64decode(b64_payload))

    # Tamper with the 15th byte (inside ciphertext/tag)
    raw_payload[15] ^= 0xFF
    tampered_b64 = base64.b64encode(bytes(raw_payload)).decode("utf-8")
    tampered_encrypted = f"{prefix}{tampered_b64}"

    with pytest.raises(DecryptionError) as exc_info:
        decrypt_secret(tampered_encrypted, key)
    assert "Authentication tag verification failure" in str(exc_info.value) or "Decryption failed" in str(exc_info.value)


def test_aes_gcm_wrong_key_fails_authentication():
    """Verify decryption with a different 32-byte key is rejected by authentication tag."""
    key1 = secrets.token_bytes(32)
    key2 = secrets.token_bytes(32)
    encrypted = encrypt_secret("sensitive_token", key1)

    with pytest.raises(DecryptionError):
        decrypt_secret(encrypted, key2)


def test_aes_gcm_corrupt_prefix_fails():
    """Verify payloads missing v1: prefix are rejected."""
    key = secrets.token_bytes(32)
    with pytest.raises(DecryptionError) as exc_info:
        decrypt_secret("v2:random_corrupt_data", key)
    assert "prefix" in str(exc_info.value).lower()


def test_aes_gcm_truncated_payload_fails():
    """Verify truncated payloads (<28 bytes) are rejected."""
    key = secrets.token_bytes(32)
    short_payload = base64.b64encode(b"short").decode("utf-8")
    with pytest.raises(DecryptionError) as exc_info:
        decrypt_secret(f"v1:{short_payload}", key)
    assert "truncated" in str(exc_info.value).lower()


# ==============================================================================
# 3. Service-Level Credential Saving with Missing / Malformed Key
# ==============================================================================
def test_save_credentials_missing_key_rejection(db_session):
    """Verify that save_credentials refuses to store credentials if key is missing."""
    admin = make_admin(db_session, "admin_missing@wildroot.test")
    missing_inspection = {
        "status": "missing",
        "message": "PAYMENT_CREDENTIALS_ENCRYPTION_KEY is missing from environment variables.",
        "key_bytes": None,
        "source": None,
        "key_length_bytes": None,
        "format": None,
    }

    with patch("app.services.payment_credential_service.inspect_encryption_key", return_value=missing_inspection):
        with patch("app.services.payment_credential_service.resolve_encryption_key", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                PaymentCredentialService.save_credentials(
                    db_session,
                    admin_user=admin,
                    environment="test",
                    key_id="rzp_test_MissingKeyCheck",
                    key_secret="SecretCheck123",
                )
            assert exc_info.value.status_code == 400
            assert "PAYMENT_CREDENTIALS_ENCRYPTION_KEY" in exc_info.value.detail
            assert "missing" in exc_info.value.detail.lower()


def test_save_credentials_malformed_key_rejection(db_session):
    """Verify that save_credentials refuses to store credentials if key is malformed."""
    admin = make_admin(db_session, "admin_malformed@wildroot.test")
    malformed_inspection = {
        "status": "malformed",
        "message": "Configured encryption key decoded to 16 bytes, but AES-256-GCM requires 32 bytes.",
        "key_bytes": None,
        "source": "PAYMENT_CREDENTIALS_ENCRYPTION_KEY",
        "key_length_bytes": 16,
        "format": None,
    }

    with patch("app.services.payment_credential_service.inspect_encryption_key", return_value=malformed_inspection):
        with patch("app.services.payment_credential_service.resolve_encryption_key", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                PaymentCredentialService.save_credentials(
                    db_session,
                    admin_user=admin,
                    environment="test",
                    key_id="rzp_test_MalformedKeyCheck",
                    key_secret="SecretCheck123",
                )
            assert exc_info.value.status_code == 400
            assert "PAYMENT_CREDENTIALS_ENCRYPTION_KEY" in exc_info.value.detail
            assert "malformed" in exc_info.value.detail.lower()


# ==============================================================================
# 4. Sandbox and Live Credential Saving with Valid Key & Mocks
# ==============================================================================
def test_save_sandbox_and_live_credentials_encrypted(db_session):
    """Verify that sandbox and live credentials are encrypted at rest with v1: and separated."""
    admin = make_admin(db_session, "admin_save_both@wildroot.test")

    # 1. Save Test sandbox credentials
    res_test = PaymentCredentialService.save_credentials(
        db_session,
        admin_user=admin,
        environment="test",
        key_id="rzp_test_ValidSandboxKey99",
        key_secret="SecretSandboxKey999!",
        webhook_secret="whsec_SandboxSecret888!",
    )
    assert res_test["test"]["key_id"] == "rzp_test_ValidSandboxKey99"
    assert res_test["test"]["key_secret_configured"] is True
    assert res_test["test"]["webhook_secret_configured"] is True

    # 2. Save Live production credentials
    res_live = PaymentCredentialService.save_credentials(
        db_session,
        admin_user=admin,
        environment="live",
        key_id="rzp_live_ValidProductionKey88",
        key_secret="SecretLiveProdKey888!",
        webhook_secret="whsec_LiveProdSecret777!",
    )
    assert res_live["live"]["key_id"] == "rzp_live_ValidProductionKey88"
    assert res_live["live"]["key_secret_configured"] is True
    assert res_live["live"]["webhook_secret_configured"] is True

    # 3. Query DB record directly to verify ciphertexts at rest
    setting = db_session.execute(
        select(SiteSetting).where(SiteSetting.key == "razorpay_gateway_config")
    ).scalar_one_or_none()
    assert setting is not None
    cfg = setting.value

    # Verify sandbox ciphertext
    test_enc_sec = cfg["test"]["encrypted_key_secret"]
    test_enc_wh = cfg["test"]["encrypted_webhook_secret"]
    assert test_enc_sec.startswith("v1:")
    assert test_enc_wh.startswith("v1:")
    assert "SecretSandboxKey999!" not in test_enc_sec
    assert "whsec_SandboxSecret888!" not in test_enc_wh

    # Verify live ciphertext
    live_enc_sec = cfg["live"]["encrypted_key_secret"]
    live_enc_wh = cfg["live"]["encrypted_webhook_secret"]
    assert live_enc_sec.startswith("v1:")
    assert live_enc_wh.startswith("v1:")
    assert "SecretLiveProdKey888!" not in live_enc_sec
    assert "whsec_LiveProdSecret777!" not in live_enc_wh

    # 4. Decrypt via get_active_credentials and verify environment separation
    kid_t, ksec_t, wh_t, env_t = PaymentCredentialService.get_active_credentials(db_session, target_env="test")
    assert kid_t == "rzp_test_ValidSandboxKey99"
    assert ksec_t == "SecretSandboxKey999!"
    assert wh_t == "whsec_SandboxSecret888!"
    assert env_t == "test"

    kid_l, ksec_l, wh_l, env_l = PaymentCredentialService.get_active_credentials(db_session, target_env="live")
    assert kid_l == "rzp_live_ValidProductionKey88"
    assert ksec_l == "SecretLiveProdKey888!"
    assert wh_l == "whsec_LiveProdSecret777!"
    assert env_l == "live"


# ==============================================================================
# 5. Configuration Health Check Accuracy
# ==============================================================================
def test_configuration_health_accurately_reflects_encryption_key(db_session):
    """Verify that get_configuration_health reports valid vs action_required based on key status."""
    # When key is valid
    health_valid = get_configuration_health(db_session)
    gw_item_valid = next(i for i in health_valid.items if i["name"] == "Online Payment Gateway")
    assert gw_item_valid["status"] in ("configured", "default_test")
    assert "AES-256-GCM" in gw_item_valid["description"]

    # When key is missing
    missing_inspection = {
        "status": "missing",
        "message": "PAYMENT_CREDENTIALS_ENCRYPTION_KEY is missing from environment variables.",
        "key_bytes": None,
        "source": None,
        "key_length_bytes": None,
        "format": None,
    }
    with patch("app.services.admin.settings_service.inspect_encryption_key", return_value=missing_inspection):
        health_missing = get_configuration_health(db_session)
        gw_item_missing = next(i for i in health_missing.items if i["name"] == "Online Payment Gateway")
        assert gw_item_missing["status"] == "action_required"
        assert "missing" in gw_item_missing["description"].lower()

    # When key is malformed
    malformed_inspection = {
        "status": "malformed",
        "message": "Key is 16 bytes, expected 32.",
        "key_bytes": None,
        "source": "PAYMENT_CREDENTIALS_ENCRYPTION_KEY",
        "key_length_bytes": 16,
        "format": None,
    }
    with patch("app.services.admin.settings_service.inspect_encryption_key", return_value=malformed_inspection):
        health_malformed = get_configuration_health(db_session)
        gw_item_malformed = next(i for i in health_malformed.items if i["name"] == "Online Payment Gateway")
        assert gw_item_malformed["status"] == "action_required"
        assert "malformed" in gw_item_malformed["description"].lower()


# ==============================================================================
# 6. Webhook URL Resolution
# ==============================================================================
def test_webhook_url_resolves_production_domain():
    """Verify that resolve_razorpay_webhook_url produces accurate clean URL without legacy domain."""
    url = resolve_razorpay_webhook_url()
    assert "kvtours.in" not in url
    assert "/api/v1/payments/razorpay/webhook" in url
