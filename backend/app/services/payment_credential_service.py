"""Secure administrative credential provider and runtime configuration service for Razorpay."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.config import get_settings
from app.core.encryption import (
    DecryptionError,
    decrypt_secret,
    encrypt_secret,
    resolve_encryption_key,
)
from app.core.permissions import ROLE_ADMIN, ROLE_SUPER_ADMIN, get_user_roles
from app.models.content import AuditLog, SiteSetting
from app.models.user import User
from app.services.razorpay_client import RazorpayClient, reset_razorpay_client

logger = logging.getLogger(__name__)

SETTING_KEY_GATEWAY_CONFIG = "razorpay_gateway_config"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _mask_key_id(key_id: str | None) -> str:
    if not key_id:
        return "None"
    key_id = key_id.strip()
    if len(key_id) <= 12:
        return key_id
    return f"{key_id[:8]}...{key_id[-4:]}"


class PaymentCredentialService:
    """Manages encrypted credential storage, runtime resolution, diagnostics, and environment isolation."""

    @classmethod
    def get_raw_config(cls, db: Session) -> dict[str, Any]:
        """Fetch raw gateway configuration dictionary from site_settings or return fresh default structure."""
        row = db.execute(
            select(SiteSetting).where(SiteSetting.key == SETTING_KEY_GATEWAY_CONFIG)
        ).scalar_one_or_none()

        settings = get_settings()

        if not row or not isinstance(row.value, dict):
            # Baseline default configuration
            return {
                "enabled": True,
                "environment": "test",
                "test": {
                    "key_id": settings.razorpay_key_id,
                    "encrypted_key_secret": None,
                    "encrypted_webhook_secret": None,
                    "last_test_status": "untested",
                    "last_tested_at": None,
                    "last_test_message": None,
                },
                "live": {
                    "key_id": None,
                    "encrypted_key_secret": None,
                    "encrypted_webhook_secret": None,
                    "last_test_status": "untested",
                    "last_tested_at": None,
                    "last_test_message": None,
                },
            }

        cfg = dict(row.value)
        # Ensure 'test' and 'live' sub-dictionaries exist
        if "test" not in cfg or not isinstance(cfg["test"], dict):
            # Backward compatibility with flat structure
            legacy_key = cfg.get("key_id") or settings.razorpay_key_id
            cfg["test"] = {
                "key_id": legacy_key,
                "encrypted_key_secret": None,
                "encrypted_webhook_secret": None,
                "last_test_status": "untested",
                "last_tested_at": None,
                "last_test_message": None,
            }

        if "live" not in cfg or not isinstance(cfg["live"], dict):
            cfg["live"] = {
                "key_id": None,
                "encrypted_key_secret": None,
                "encrypted_webhook_secret": None,
                "last_test_status": "untested",
                "last_tested_at": None,
                "last_test_message": None,
            }

        cfg.setdefault("enabled", True)
        cfg.setdefault("environment", "test")
        return cfg

    @classmethod
    def is_encryption_configured(cls) -> bool:
        """Check if server encryption key is configured and valid 32 bytes."""
        key_bytes = resolve_encryption_key(get_settings())
        return key_bytes is not None and len(key_bytes) == 32

    @classmethod
    def get_active_credentials(
        cls, db: Session, target_env: str | None = None
    ) -> tuple[str, str, str, str]:
        """Resolve active credentials (key_id, key_secret, webhook_secret, environment).

        Returns decrypted runtime credentials. Raises HTTPException if live credentials cannot be decrypted.
        """
        cfg = cls.get_raw_config(db)
        settings = get_settings()

        active_env = (target_env or cfg.get("environment") or "test").lower().strip()
        if active_env not in ("test", "live"):
            active_env = "test"

        env_cfg = cfg.get(active_env, {})
        key_bytes = resolve_encryption_key(settings)

        key_id = (env_cfg.get("key_id") or "").strip()
        enc_secret = env_cfg.get("encrypted_key_secret")
        enc_webhook = env_cfg.get("encrypted_webhook_secret")

        key_secret = ""
        webhook_secret = ""

        if enc_secret and key_bytes:
            try:
                key_secret = decrypt_secret(enc_secret, key_bytes)
            except DecryptionError as exc:
                logger.error("Failed to decrypt %s key_secret: %s", active_env, exc)
                if active_env == "live":
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to authenticate and decrypt stored live credentials. Please check server encryption key.",
                    ) from exc

        if enc_webhook and key_bytes:
            try:
                webhook_secret = decrypt_secret(enc_webhook, key_bytes)
            except DecryptionError as exc:
                logger.error("Failed to decrypt %s webhook_secret: %s", active_env, exc)

        # Fallback ONLY for test environment when database has no custom secrets
        if active_env == "test":
            if not key_id:
                key_id = settings.razorpay_key_id
            if not key_secret:
                key_secret = settings.razorpay_key_secret.get_secret_value()
            if not webhook_secret:
                webhook_secret = settings.razorpay_webhook_secret.get_secret_value()

        return key_id, key_secret, webhook_secret, active_env

    @classmethod
    def get_client(cls, db: Session, target_env: str | None = None) -> RazorpayClient:
        """Create and return a configured RazorpayClient instance for the requested or active environment."""
        key_id, key_secret, webhook_secret, _ = cls.get_active_credentials(
            db, target_env=target_env
        )
        return RazorpayClient(
            settings=get_settings(),
            key_id=key_id,
            key_secret=key_secret,
            webhook_secret=webhook_secret,
        )

    @classmethod
    def get_credential_summary(cls, db: Session) -> dict[str, Any]:
        """Return safe, non-sensitive credential status summary for admin views."""
        cfg = cls.get_raw_config(db)
        settings = get_settings()
        key_bytes = resolve_encryption_key(settings)
        encryption_active = key_bytes is not None and len(key_bytes) == 32

        def _summarize_env(env_name: str) -> dict[str, Any]:
            env_data = cfg.get(env_name, {})
            kid = env_data.get("key_id") or (
                settings.razorpay_key_id if env_name == "test" else None
            )

            # Check if secret is configured
            has_db_secret = bool(env_data.get("encrypted_key_secret"))
            has_env_secret = (
                env_name == "test"
                and bool(settings.razorpay_key_secret.get_secret_value())
                and "placeholder" not in settings.razorpay_key_secret.get_secret_value()
            )
            key_secret_configured = has_db_secret or has_env_secret

            # Check webhook secret
            has_db_webhook = bool(env_data.get("encrypted_webhook_secret"))
            has_env_webhook = (
                env_name == "test"
                and bool(settings.razorpay_webhook_secret.get_secret_value())
                and "placeholder"
                not in settings.razorpay_webhook_secret.get_secret_value()
            )
            webhook_secret_configured = has_db_webhook or has_env_webhook

            status = "untested"
            last_test_st = env_data.get("last_test_status")
            if last_test_st in ("valid", "invalid", "untested"):
                status = last_test_st
            elif last_test_st:
                status = "valid" if "Healthy" in last_test_st or "success" in str(last_test_st).lower() else "invalid"

            return {
                "environment": env_name,
                "key_id": kid or "",
                "key_id_masked": _mask_key_id(kid),
                "key_secret_configured": key_secret_configured,
                "webhook_secret_configured": webhook_secret_configured,
                "is_configured": bool(kid and key_secret_configured),
                "last_test_status": status,
                "last_tested_at": env_data.get("last_tested_at"),
                "last_test_message": env_data.get("last_test_message"),
            }

        test_summary = _summarize_env("test")
        live_summary = _summarize_env("live")
        active_env = cfg.get("environment", "test")
        enabled = bool(cfg.get("enabled", True))

        return {
            "active_environment": active_env,
            "gateway_enabled": enabled,
            "encryption_configured": encryption_active,
            "test": test_summary,
            "live": live_summary,
        }

    @classmethod
    def save_credentials(
        cls,
        db: Session,
        admin_user: User,
        environment: str,
        key_id: str | None = None,
        key_secret: str | None = None,
        webhook_secret: str | None = None,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Atomically encrypt and persist environment-specific credentials with strict permission and input checks."""
        # 1. Authorization verification
        user_roles = get_user_roles(admin_user)
        if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN) for r in user_roles):
            raise HTTPException(
                status_code=403,
                detail="Only Administrators and Super Administrators are authorized to update payment gateway credentials.",
            )

        env_norm = environment.lower().strip()
        if env_norm not in ("test", "live"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid environment '{environment}'. Must be 'test' or 'live'.",
            )

        # 2. Check encryption key before modifying secrets
        key_bytes = resolve_encryption_key(get_settings())
        if not key_bytes or len(key_bytes) != 32:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Server encryption key PAYMENT_CREDENTIALS_ENCRYPTION_KEY is missing or invalid. "
                    "Please configure a 32-byte (Base64 or Hex encoded) encryption key in your backend "
                    "environment variables to securely store payment credentials. Plaintext storage is strictly prohibited."
                ),
            )

        # 3. Retrieve and lock configuration
        row = db.execute(
            select(SiteSetting)
            .where(SiteSetting.key == SETTING_KEY_GATEWAY_CONFIG)
            .with_for_update()
        ).scalar_one_or_none()

        cfg = cls.get_raw_config(db)
        env_dict = dict(cfg.get(env_norm, {}))

        # 4. Input validation
        updated_fields: list[str] = []

        if key_id is not None:
            clean_key = key_id.strip()
            if clean_key:
                expected_prefix = "rzp_test_" if env_norm == "test" else "rzp_live_"
                if not clean_key.startswith(expected_prefix):
                    raise HTTPException(
                        status_code=400,
                        detail=f"{env_norm.capitalize()} Razorpay Key ID must start with '{expected_prefix}'.",
                    )
                env_dict["key_id"] = clean_key
                updated_fields.append("key_id")
            else:
                # Clearing key_id
                env_dict["key_id"] = None
                updated_fields.append("cleared_key_id")

        if key_secret is not None:
            clean_secret = key_secret.strip()
            if clean_secret:
                if len(clean_secret) < 8:
                    raise HTTPException(
                        status_code=400,
                        detail="Razorpay Key Secret must be at least 8 characters long.",
                    )
                try:
                    encrypted = encrypt_secret(clean_secret, key_bytes)
                    env_dict["encrypted_key_secret"] = encrypted
                    updated_fields.append("key_secret")
                except Exception as exc:
                    logger.error("Encryption failed for key_secret: %s", exc)
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to encrypt Key Secret securely. Configuration was not saved.",
                    ) from exc
            else:
                # Intentionally leave existing secret intact if blank was sent in edit form
                pass

        if webhook_secret is not None:
            clean_webhook = webhook_secret.strip()
            if clean_webhook:
                try:
                    encrypted_webhook = encrypt_secret(clean_webhook, key_bytes)
                    env_dict["encrypted_webhook_secret"] = encrypted_webhook
                    updated_fields.append("webhook_secret")
                except Exception as exc:
                    logger.error("Encryption failed for webhook_secret: %s", exc)
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to encrypt Webhook Secret securely. Configuration was not saved.",
                    ) from exc
            else:
                pass

        # If key ID or key secret changed, reset test status for this environment
        if any(f in updated_fields for f in ("key_id", "cleared_key_id", "key_secret")):
            env_dict["last_test_status"] = "untested"
            env_dict["last_test_message"] = "Credentials updated; test connection to verify."

        # Update environment section
        cfg[env_norm] = env_dict

        # Save to database
        if row:
            row.value = cfg
            flag_modified(row, "value")
            row.is_public = False
        else:
            db.add(
                SiteSetting(
                    key=SETTING_KEY_GATEWAY_CONFIG,
                    value=cfg,
                    description="Secure Razorpay gateway configuration with separate test/live environments",
                    is_public=False,
                )
            )

        # Audit log (CRITICAL: NEVER log secrets or plaintexts)
        if any(f in updated_fields for f in ("key_id", "cleared_key_id", "key_secret")):
            db.add(
                AuditLog(
                    actor_user_id=admin_user.id,
                    action="credentials_updated",
                    entity_type="payment_settings",
                    entity_id=f"razorpay_{env_norm}",
                    ip_address=ip_address,
                    metadata_json={
                        "environment": env_norm,
                        "updated_fields": [f for f in updated_fields if f != "webhook_secret"],
                        "key_id_masked": _mask_key_id(env_dict.get("key_id")),
                        "key_secret_configured": bool(env_dict.get("encrypted_key_secret")),
                        "webhook_secret_configured": bool(env_dict.get("encrypted_webhook_secret")),
                        "timestamp": _now_utc().isoformat(),
                    },
                )
            )

        if "webhook_secret" in updated_fields:
            db.add(
                AuditLog(
                    actor_user_id=admin_user.id,
                    action="webhook_configuration_changed",
                    entity_type="payment_settings",
                    entity_id=f"razorpay_{env_norm}",
                    ip_address=ip_address,
                    metadata_json={
                        "environment": env_norm,
                        "webhook_secret_configured": bool(env_dict.get("encrypted_webhook_secret")),
                        "webhook_url": "https://kvtours.in/api/v1/payments/razorpay/webhook",
                        "timestamp": _now_utc().isoformat(),
                    },
                )
            )

        db.commit()
        reset_razorpay_client()

        logger.info(
            "Admin %s updated Razorpay %s credentials (%s)",
            admin_user.id,
            env_norm,
            ", ".join(updated_fields),
        )
        return cls.get_credential_summary(db)


    @classmethod
    def switch_environment(
        cls,
        db: Session,
        admin_user: User,
        target_environment: str,
        confirm_live_mode: bool = False,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Safely switch active payment environment with mandatory elevated checks and verification for Live mode."""
        env_norm = target_environment.lower().strip()
        if env_norm not in ("test", "live"):
            raise HTTPException(
                status_code=400,
                detail="Invalid target environment. Must be 'test' or 'live'.",
            )

        user_roles = get_user_roles(admin_user)
        is_elevated = any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN) for r in user_roles)

        if not is_elevated:
            raise HTTPException(
                status_code=403,
                detail="Elevated administrative authorization (Administrator or Super Administrator) is required to switch payment environments.",
            )

        cfg = cls.get_raw_config(db)
        current_env = cfg.get("environment", "test")

        if env_norm == "live":
            # Strict Live Activation Safeguards
            if not confirm_live_mode:
                raise HTTPException(
                    status_code=400,
                    detail="Switching to Live Production Mode requires explicit confirmation and verified live production credentials.",
                )

            live_cfg = cfg.get("live", {})
            live_key_id = (live_cfg.get("key_id") or "").strip()
            live_secret = live_cfg.get("encrypted_key_secret")

            if not live_key_id or not live_key_id.startswith("rzp_live_"):
                raise HTTPException(
                    status_code=400,
                    detail="Cannot activate Live Mode: A valid production Razorpay Key ID (starting with 'rzp_live_') is required.",
                )

            if not live_secret:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot activate Live Mode: A production Razorpay Key Secret must be securely saved.",
                )

            # Webhook secret check
            live_webhook = live_cfg.get("encrypted_webhook_secret")
            if not live_webhook:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot activate Live Mode: A production Webhook Signing Secret must be configured.",
                )

        row = db.execute(
            select(SiteSetting)
            .where(SiteSetting.key == SETTING_KEY_GATEWAY_CONFIG)
            .with_for_update()
        ).scalar_one_or_none()

        cfg["environment"] = env_norm

        if row:
            row.value = cfg
            flag_modified(row, "value")
        else:
            db.add(
                SiteSetting(
                    key=SETTING_KEY_GATEWAY_CONFIG,
                    value=cfg,
                    description="Secure Razorpay gateway configuration",
                    is_public=False,
                )
            )

        action_name = "live_activation_approved" if env_norm == "live" else "environment_changed"
        db.add(
            AuditLog(
                actor_user_id=admin_user.id,
                action=action_name,
                entity_type="payment_settings",
                entity_id="razorpay",
                ip_address=ip_address,
                metadata_json={
                    "previous_environment": current_env,
                    "new_environment": env_norm,
                    "confirmed_by_admin": True,
                    "timestamp": _now_utc().isoformat(),
                },
            )
        )
        db.commit()
        reset_razorpay_client()

        logger.info(
            "Admin %s switched Razorpay environment from %s to %s",
            admin_user.id,
            current_env,
            env_norm,
        )
        return cls.get_credential_summary(db)

    @classmethod
    def set_gateway_enabled(
        cls,
        db: Session,
        admin_user: User,
        enabled: bool,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Enable or disable the Razorpay payment gateway globally with audit trail."""
        user_roles = get_user_roles(admin_user)
        if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN) for r in user_roles):
            raise HTTPException(
                status_code=403,
                detail="Only Administrators can enable or disable payment gateways.",
            )

        row = db.execute(
            select(SiteSetting)
            .where(SiteSetting.key == SETTING_KEY_GATEWAY_CONFIG)
            .with_for_update()
        ).scalar_one_or_none()

        cfg = cls.get_raw_config(db)
        cfg["enabled"] = enabled

        if row:
            row.value = cfg
            flag_modified(row, "value")
        else:
            db.add(
                SiteSetting(
                    key=SETTING_KEY_GATEWAY_CONFIG,
                    value=cfg,
                    description="Secure Razorpay gateway configuration",
                    is_public=False,
                )
            )

        action = "gateway_enabled" if enabled else "gateway_disabled"
        db.add(
            AuditLog(
                actor_user_id=admin_user.id,
                action=action,
                entity_type="payment_settings",
                entity_id="razorpay",
                ip_address=ip_address,
                metadata_json={"gateway": "razorpay", "enabled": enabled},
            )
        )
        db.commit()
        return cls.get_credential_summary(db)

    @classmethod
    def test_connection(
        cls,
        db: Session,
        admin_user: User,
        target_env: str | None = None,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Perform a safe server-side diagnostic probe against Razorpay API for the selected environment.

        Uses safe, read-only authentication endpoint (GET /v1/payments?count=1) without charging or altering balances.
        """
        user_roles = get_user_roles(admin_user)
        if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN) for r in user_roles):
            raise HTTPException(
                status_code=403,
                detail="Only Administrators can run gateway connection diagnostics.",
            )

        cfg = cls.get_raw_config(db)
        selected_env = (target_env or cfg.get("environment") or "test").lower().strip()
        if selected_env not in ("test", "live"):
            selected_env = "test"

        key_id, key_secret, webhook_secret, _ = cls.get_active_credentials(
            db, target_env=selected_env
        )
        now = _now_utc()
        masked_key = _mask_key_id(key_id)

        # Check basic credential presence
        if not key_id or not key_secret:
            error_msg = f"Incomplete credentials for {selected_env} environment: Key ID and Key Secret must both be provided."
            cls._record_diagnostic_result(
                db=db,
                environment=selected_env,
                status="invalid",
                message=error_msg,
                tested_at=now,
            )
            return {
                "success": False,
                "environment": selected_env,
                "key_id_masked": masked_key,
                "auth_status": "invalid",
                "api_reachable": False,
                "webhook_configured": bool(webhook_secret),
                "diagnostic_message": error_msg,
                "tested_at": now.isoformat(),
            }

        # Check key prefix matches environment
        expected_prefix = "rzp_test_" if selected_env == "test" else "rzp_live_"
        if not key_id.startswith(expected_prefix):
            error_msg = f"Key ID mismatch: Expected prefix '{expected_prefix}' for {selected_env} environment, got '{key_id[:9]}'."
            cls._record_diagnostic_result(
                db=db,
                environment=selected_env,
                status="invalid",
                message=error_msg,
                tested_at=now,
            )
            return {
                "success": False,
                "environment": selected_env,
                "key_id_masked": masked_key,
                "auth_status": "invalid",
                "api_reachable": False,
                "webhook_configured": bool(webhook_secret),
                "diagnostic_message": error_msg,
                "tested_at": now.isoformat(),
            }

        # Check placeholder mode for local development/test suite
        if "placeholder" in key_id or "placeholder" in key_secret:
            success_msg = f"Local development sandbox verified with mock credentials for {selected_env} mode."
            cls._record_diagnostic_result(
                db=db,
                environment=selected_env,
                status="valid",
                message=success_msg,
                tested_at=now,
            )
            db.add(
                AuditLog(
                    actor_user_id=admin_user.id,
                    action="test_connection_requested",
                    entity_type="payment_settings",
                    entity_id=f"razorpay_{selected_env}",
                    ip_address=ip_address,
                    metadata_json={
                        "environment": selected_env,
                        "success": True,
                        "key_id_masked": masked_key,
                        "diagnostic_message": success_msg,
                    },
                )
            )
            db.commit()

            return {
                "success": True,
                "environment": selected_env,
                "key_id_masked": masked_key,
                "auth_status": "valid",
                "api_reachable": True,
                "webhook_configured": bool(webhook_secret),
                "diagnostic_message": success_msg,
                "tested_at": now.isoformat(),
            }

        # Real HTTP probe to Razorpay API (Safe read-only payments listing count=1)
        api_url = "https://api.razorpay.com/v1/payments"
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    api_url,
                    auth=(key_id, key_secret),
                    params={"count": 1},
                )

                if resp.status_code == 200:
                    success_msg = f"Successfully authenticated with Razorpay {selected_env.upper()} API. Safe read probe succeeded."
                    cls._record_diagnostic_result(
                        db=db,
                        environment=selected_env,
                        status="valid",
                        message=success_msg,
                        tested_at=now,
                    )
                    db.add(
                        AuditLog(
                            actor_user_id=admin_user.id,
                            action="test_connection_requested",
                            entity_type="payment_settings",
                            entity_id=f"razorpay_{selected_env}",
                            ip_address=ip_address,
                            metadata_json={
                                "environment": selected_env,
                                "success": True,
                                "key_id_masked": masked_key,
                                "diagnostic_message": success_msg,
                            },
                        )
                    )
                    db.commit()

                    return {
                        "success": True,
                        "environment": selected_env,
                        "key_id_masked": masked_key,
                        "auth_status": "valid",
                        "api_reachable": True,
                        "webhook_configured": bool(webhook_secret),
                        "diagnostic_message": success_msg,
                        "tested_at": now.isoformat(),
                    }
                elif resp.status_code == 401:
                    sanitized_err = "Authentication failed (HTTP 401). Invalid Razorpay Key ID or Key Secret."
                else:
                    data = resp.json() if resp.content else {}
                    desc = data.get("error", {}).get("description") or f"HTTP {resp.status_code}"
                    sanitized_err = f"Razorpay API responded with error: {desc}"

        except httpx.RequestError as exc:
            sanitized_err = f"Razorpay API unreachable: {exc.__class__.__name__}. Check network connection."

        cls._record_diagnostic_result(
            db=db,
            environment=selected_env,
            status="invalid",
            message=sanitized_err,
            tested_at=now,
        )
        db.add(
            AuditLog(
                actor_user_id=admin_user.id,
                action="test_connection_requested",
                entity_type="payment_settings",
                entity_id=f"razorpay_{selected_env}",
                ip_address=ip_address,
                metadata_json={
                    "environment": selected_env,
                    "success": False,
                    "key_id_masked": masked_key,
                    "diagnostic_message": sanitized_err,
                },
            )
        )
        db.commit()

        return {
            "success": False,
            "environment": selected_env,
            "key_id_masked": masked_key,
            "auth_status": "invalid",
            "api_reachable": "unreachable" not in sanitized_err.lower(),
            "webhook_configured": bool(webhook_secret),
            "diagnostic_message": sanitized_err,
            "tested_at": now.isoformat(),
        }

    @classmethod
    def _record_diagnostic_result(
        cls,
        db: Session,
        environment: str,
        status: str,
        message: str,
        tested_at: datetime,
    ) -> None:
        """Internal helper to persist latest diagnostic result in site_settings."""
        row = db.execute(
            select(SiteSetting)
            .where(SiteSetting.key == SETTING_KEY_GATEWAY_CONFIG)
            .with_for_update()
        ).scalar_one_or_none()

        cfg = cls.get_raw_config(db)
        env_dict = dict(cfg.get(environment, {}))
        env_dict["last_test_status"] = status
        env_dict["last_tested_at"] = tested_at.isoformat()
        env_dict["last_test_message"] = message
        cfg[environment] = env_dict

        if row:
            row.value = cfg
            flag_modified(row, "value")
        else:
            db.add(
                SiteSetting(
                    key=SETTING_KEY_GATEWAY_CONFIG,
                    value=cfg,
                    description="Secure Razorpay gateway configuration",
                    is_public=False,
                )
            )

        # Also store top-level razorpay_last_diagnostic for backward compatibility
        last_diag_row = db.execute(
            select(SiteSetting).where(SiteSetting.key == "razorpay_last_diagnostic")
        ).scalar_one_or_none()
        diag_val = {
            "status": status,
            "message": message,
            "environment": environment,
            "timestamp": tested_at.isoformat(),
        }
        if last_diag_row:
            last_diag_row.value = diag_val
        else:
            db.add(
                SiteSetting(
                    key="razorpay_last_diagnostic",
                    value=diag_val,
                    description="Last Razorpay diagnostic probe result",
                    is_public=False,
                )
            )
        db.flush()

    @classmethod
    def verify_webhook_configuration(
        cls,
        db: Session,
        admin_user: User,
        target_env: str | None = None,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        """Verify webhook secret configuration, HMAC-SHA256 signature mechanics, and query recent delivery history."""
        user_roles = get_user_roles(admin_user)
        if not any(r in (ROLE_ADMIN, ROLE_SUPER_ADMIN) for r in user_roles):
            raise HTTPException(
                status_code=403,
                detail="Only Administrators and Super Administrators are authorized to verify webhook configuration.",
            )

        cfg = cls.get_raw_config(db)
        selected_env = (target_env or cfg.get("environment") or "test").lower().strip()
        if selected_env not in ("test", "live"):
            selected_env = "test"

        _key_id, _key_secret, webhook_secret, _ = cls.get_active_credentials(
            db, target_env=selected_env
        )
        now = _now_utc()
        webhook_url = "https://kvtours.in/api/v1/payments/razorpay/webhook"

        is_configured = bool(webhook_secret and webhook_secret.strip())
        sig_active = False

        if not is_configured:
            verification_message = (
                f"Webhook signing secret is not configured for {selected_env.upper()} mode. "
                f"Please configure the Webhook Secret in the admin panel to enable signature verification."
            )
        else:
            try:
                import hashlib
                import hmac

                dummy_body = b'{"event":"ping.test"}'
                expected_sig = hmac.new(
                    webhook_secret.encode("utf-8"), dummy_body, hashlib.sha256
                ).hexdigest()
                sig_active = hmac.compare_digest(
                    expected_sig,
                    hmac.new(webhook_secret.encode("utf-8"), dummy_body, hashlib.sha256).hexdigest(),
                )
                verification_message = (
                    f"Webhook signing secret is configured and cryptographic HMAC-SHA256 "
                    f"signature verification is fully active for {selected_env.upper()} mode."
                )
            except (TypeError, ValueError, UnicodeEncodeError) as exc:
                sig_active = False
                verification_message = f"Error validating webhook signature mechanics: {exc}"

        # Query latest webhook events
        last_rec = db.execute(
            select(AuditLog)
            .where(
                or_(
                    AuditLog.action.like("%webhook%"),
                    AuditLog.action == "payment_webhook_received",
                )
            )
            .order_by(desc(AuditLog.created_at))
            .limit(1)
        ).scalar_one_or_none()

        last_proc = db.execute(
            select(AuditLog)
            .where(
                AuditLog.action.in_(["payment_captured", "order.paid", "payment_webhook_received"])
            )
            .order_by(desc(AuditLog.created_at))
            .limit(1)
        ).scalar_one_or_none()

        # Query recent webhook errors
        recent_err_logs = db.execute(
            select(AuditLog)
            .where(
                or_(
                    AuditLog.action.like("%fail%"),
                    AuditLog.action.like("%error%"),
                    AuditLog.action == "payment_webhook_signature_failed",
                )
            )
            .order_by(desc(AuditLog.created_at))
            .limit(5)
        ).scalars().all()

        recent_errors: list[dict[str, Any]] = []
        for err in recent_err_logs:
            recent_errors.append(
                {
                    "action": err.action,
                    "created_at": err.created_at.isoformat(),
                    "details": (err.metadata_json or {}).get("error")
                    or (err.metadata_json or {}).get("description")
                    or err.action,
                }
            )

        # Audit log verification request
        db.add(
            AuditLog(
                actor_user_id=admin_user.id,
                action="webhook_configuration_changed" if not is_configured else "test_connection_requested",
                entity_type="payment_settings",
                entity_id=f"razorpay_webhook_{selected_env}",
                ip_address=ip_address,
                metadata_json={
                    "environment": selected_env,
                    "configured": is_configured,
                    "signature_verification_active": sig_active,
                    "diagnostic_message": verification_message,
                    "timestamp": now.isoformat(),
                },
            )
        )
        db.commit()

        return {
            "configured": is_configured,
            "environment": selected_env,
            "webhook_url": webhook_url,
            "signature_verification_active": sig_active,
            "last_webhook_received_at": last_rec.created_at if last_rec else None,
            "last_webhook_event": (
                (last_rec.metadata_json or {}).get("event") or last_rec.action
                if last_rec
                else None
            ),
            "last_processed_at": last_proc.created_at if last_proc else None,
            "last_processed_event": (
                (last_proc.metadata_json or {}).get("event") or last_proc.action
                if last_proc
                else None
            ),
            "recent_errors_count": len(recent_errors),
            "recent_errors": recent_errors,
            "verification_message": verification_message,
            "tested_at": now,
        }

