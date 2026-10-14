"""Razorpay Client for order creation, signature verification, and refunds."""

import hashlib
import hmac
import logging
from typing import Any

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class RazorpayError(Exception):
    """Exception raised for Razorpay API or verification failures."""

    def __init__(
        self, message: str, status_code: int = 400, error_code: str | None = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class RazorpayClient:
    """Client for Razorpay payment gateway API and HMAC verification."""

    BASE_URL = "https://api.razorpay.com/v1"

    def __init__(
        self,
        settings: Settings | None = None,
        key_id: str | None = None,
        key_secret: str | None = None,
        webhook_secret: str | None = None,
    ):
        self._settings = settings or get_settings()
        self.key_id = (
            key_id.strip()
            if key_id is not None and key_id.strip()
            else self._settings.razorpay_key_id
        )
        self.key_secret = (
            key_secret.strip()
            if key_secret is not None and key_secret.strip()
            else self._settings.razorpay_key_secret.get_secret_value()
        )
        self.webhook_secret = (
            webhook_secret.strip()
            if webhook_secret is not None and webhook_secret.strip()
            else self._settings.razorpay_webhook_secret.get_secret_value()
        )

    @property
    def is_placeholder_mode(self) -> bool:
        """Return True if running in local development with default test placeholders."""
        return (
            self.key_id == "rzp_test_placeholder_key"
            or not self.key_id
            or "placeholder" in self.key_id
        )

    def create_order(
        self,
        amount_subunits: int,
        currency: str = "INR",
        receipt: str = "",
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create a Razorpay payment order.

        Amount must be in smallest currency unit (e.g. paise for INR).
        """
        if self.is_placeholder_mode:
            # Local development simulation mode
            import time
            import uuid

            order_id = f"order_{receipt[-8:].replace('-', '_')}_{int(time.time())}_{uuid.uuid4().hex[:6]}"
            logger.info(
                "Simulated Razorpay order creation for receipt=%s, amount=%d %s (order_id=%s)",
                receipt,
                amount_subunits,
                currency,
                order_id,
            )
            return {
                "id": order_id,
                "entity": "order",
                "amount": amount_subunits,
                "amount_paid": 0,
                "amount_due": amount_subunits,
                "currency": currency,
                "receipt": receipt,
                "status": "created",
                "attempts": 0,
                "notes": notes or {},
            }

        payload = {
            "amount": amount_subunits,
            "currency": currency,
            "receipt": receipt,
            "notes": notes or {},
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.post(
                    f"{self.BASE_URL}/orders",
                    auth=(self.key_id, self.key_secret),
                    json=payload,
                )
                if response.status_code != 200:
                    data = response.json() if response.content else {}
                    error_desc = (
                        data.get("error", {}).get("description")
                        or f"Razorpay API error ({response.status_code})"
                    )
                    raise RazorpayError(error_desc, status_code=response.status_code)
                return response.json()
        except httpx.RequestError as exc:
            logger.error("Razorpay network request failure: %s", exc)
            raise RazorpayError(
                "Payment gateway network error. Please try again.", status_code=502
            ) from exc

    def verify_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """Verify the HMAC-SHA256 signature received from Razorpay Checkout frontend modal."""
        if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
            return False

        message = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
        expected_signature = hmac.new(
            self.key_secret.encode("utf-8"), message, hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_signature, razorpay_signature)

    def generate_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
    ) -> str:
        """Generate official HMAC-SHA256 signature (used in sandbox tests & server verifications)."""
        message = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
        return hmac.new(
            self.key_secret.encode("utf-8"), message, hashlib.sha256
        ).hexdigest()

    def verify_webhook_signature(
        self,
        raw_body: bytes,
        received_signature: str,
    ) -> bool:
        """Verify the HMAC-SHA256 signature from X-Razorpay-Signature webhook header."""
        if not raw_body or not received_signature:
            return False

        expected_signature = hmac.new(
            self.webhook_secret.encode("utf-8"), raw_body, hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_signature, received_signature)

    def generate_webhook_signature(self, raw_body: bytes) -> str:
        """Generate official webhook HMAC-SHA256 signature for test validation."""
        return hmac.new(
            self.webhook_secret.encode("utf-8"), raw_body, hashlib.sha256
        ).hexdigest()

    def create_refund(
        self,
        razorpay_payment_id: str,
        amount_subunits: int,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create a refund for a captured Razorpay payment."""
        if self.is_placeholder_mode:
            import time
            import uuid

            refund_id = f"rfnd_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            logger.info(
                "Simulated Razorpay refund for payment=%s, amount=%d (refund_id=%s)",
                razorpay_payment_id,
                amount_subunits,
                refund_id,
            )
            return {
                "id": refund_id,
                "entity": "refund",
                "amount": amount_subunits,
                "currency": "INR",
                "payment_id": razorpay_payment_id,
                "status": "processed",
                "notes": notes or {},
            }

        import uuid

        payload = {
            "amount": amount_subunits,
            "receipt": f"rcpt_{uuid.uuid4().hex[:12]}",
            "notes": notes or {},
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.post(
                    f"{self.BASE_URL}/payments/{razorpay_payment_id}/refund",
                    auth=(self.key_id, self.key_secret),
                    json=payload,
                )
                if response.status_code not in (200, 201):
                    data = response.json() if response.content else {}
                    error_desc = (
                        data.get("error", {}).get("description")
                        or f"Razorpay Refund API error ({response.status_code})"
                    )
                    raise RazorpayError(error_desc, status_code=response.status_code)
                return response.json()
        except httpx.RequestError as exc:
            logger.error("Razorpay refund network failure: %s", exc)
            raise RazorpayError(
                "Payment gateway refund network error.", status_code=502
            ) from exc


_client_instance: RazorpayClient | None = None


def get_razorpay_client(
    settings: Settings | None = None,
    key_id: str | None = None,
    key_secret: str | None = None,
    webhook_secret: str | None = None,
) -> RazorpayClient:
    """Return singleton or configured RazorpayClient instance."""
    if key_id is not None or key_secret is not None or webhook_secret is not None:
        return RazorpayClient(
            settings=settings,
            key_id=key_id,
            key_secret=key_secret,
            webhook_secret=webhook_secret,
        )
    global _client_instance
    if _client_instance is None:
        _client_instance = RazorpayClient(settings)
    return _client_instance


def reset_razorpay_client() -> None:
    """Clear cached singleton instance so subsequent invocations instantiate freshly with updated credentials."""
    global _client_instance
    _client_instance = None

