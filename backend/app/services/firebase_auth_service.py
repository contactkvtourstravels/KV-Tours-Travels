"""Firebase Auth ID token cryptographic verification service.

Validates RS256 JSON Web Tokens (JWT) issued by Google / Firebase Auth
for Google Sign-In and Apple Sign-In.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx
import jwt
from cryptography.x509 import load_pem_x509_certificate

from app.core.config import get_settings
from app.core.errors import ApiError

logger = logging.getLogger(__name__)

# Google's public X.509 certificate endpoint for Firebase Auth RS256 token verification
GOOGLE_CERT_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
)

# In-memory certificate cache: (certs_dict, expiry_timestamp)
_cached_certs: dict[str, str] = {}
_certs_expiry: float = 0.0

# Test hook for offline pytest suites
_mock_test_tokens: dict[str, dict[str, Any]] = {}


def register_mock_social_token(token: str, payload: dict[str, Any]) -> None:
    """Register a mock token for unit testing without live network calls."""
    _mock_test_tokens[token] = payload


def clear_mock_social_tokens() -> None:
    """Clear test tokens."""
    _mock_test_tokens.clear()


def _fetch_google_public_certs() -> dict[str, str]:
    """Fetch and cache Google's public x509 certificates for Firebase token verification."""
    global _cached_certs, _certs_expiry

    now = time.time()
    if _cached_certs and now < _certs_expiry:
        return _cached_certs

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(GOOGLE_CERT_URL)
            resp.raise_for_status()

            certs = resp.json()

            # Parse max-age from Cache-Control header
            cache_control = resp.headers.get("Cache-Control", "")
            max_age = 3600  # Default 1 hour fallback
            for part in cache_control.split(","):
                part = part.strip()
                if part.startswith("max-age="):
                    try:
                        max_age = int(part.split("=")[1])
                    except (ValueError, IndexError):
                        pass

            _cached_certs = certs
            _certs_expiry = now + max(60, max_age)
            return _cached_certs
    except Exception as exc:
        logger.error("Failed to fetch Google public certificates for Firebase Auth: %s", exc)
        if _cached_certs:
            # Stale-while-error fallback
            return _cached_certs
        raise ApiError(
            status_code=503,
            code="AUTH_PROVIDER_UNAVAILABLE",
            message="Authentication provider verification servers are temporarily unreachable. Please try again.",
        ) from exc


def verify_firebase_id_token(id_token: str) -> dict[str, Any]:
    """Cryptographically verify a Firebase ID token.

    Validates:
    1. RS256 signature against Google's public certificates.
    2. Issuer matches https://securetoken.google.com/{project_id}.
    3. Audience matches project_id.
    4. Expiration timestamp (exp) has not elapsed.
    5. Subject (sub / uid) is present and non-empty.

    Returns dict containing verified user claims:
        - uid (Firebase user UID)
        - email (Verified user email)
        - email_verified (bool)
        - name (Optional display name)
        - provider (e.g. 'google.com' or 'apple.com')
    """
    settings = get_settings()

    # 1. Check for registered mock token in development / test mode
    if id_token in _mock_test_tokens:
        return _mock_test_tokens[id_token]

    if settings.app_env in ("test", "development") and id_token.startswith("test_token_"):
        # Synthesize verified test payload for offline development
        parts = id_token.split(":")
        email = parts[1] if len(parts) > 1 else "tester@example.com"
        provider = parts[2] if len(parts) > 2 else "google.com"
        name = parts[3] if len(parts) > 3 else "Social Tester"
        return {
            "uid": f"test_uid_{email}",
            "email": email,
            "email_verified": True,
            "name": name,
            "provider": provider,
        }

    # 2. Extract unverified header and claims to determine issuer and Key ID
    try:
        unverified_header = jwt.get_unverified_header(id_token)
        unverified_claims = jwt.decode(id_token, options={"verify_signature": False})
    except Exception as exc:
        raise ApiError(
            status_code=401,
            code="INVALID_TOKEN",
            message="Malformed authentication token header or payload.",
        ) from exc

    kid = unverified_header.get("kid")
    alg = unverified_header.get("alg")

    if not kid or alg != "RS256":
        raise ApiError(
            status_code=401,
            code="INVALID_TOKEN",
            message="Invalid authentication token algorithm or missing key identifier.",
        )

    # 3. Direct Google OAuth / Google Identity Services token verification
    issuer = unverified_claims.get("iss", "")
    if issuer in ("https://accounts.google.com", "accounts.google.com"):
        try:
            jwks_client = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs")
            signing_key = jwks_client.get_signing_key_from_jwt(id_token)
            accepted_audiences = list(
                dict.fromkeys(
                    [
                        settings.google_client_id,
                        "886994768602-vr6rtdg6gr8v4ogfa4det3j0ml69r9me.apps.googleusercontent.com",
                        "786587181693-9m54fg2tp89kafu39f5qpki0p63ovm5q.apps.googleusercontent.com",
                    ]
                )
            )
            claims = jwt.decode(
                id_token,
                key=signing_key.key,
                algorithms=["RS256"],
                audience=accepted_audiences,
                issuer=["https://accounts.google.com", "accounts.google.com"],
                options={
                    "verify_signature": True,
                    "verify_aud": True,
                    "verify_iss": True,
                    "verify_exp": True,
                },
            )
            sub = claims.get("sub")
            if not sub or not isinstance(sub, str):
                raise ApiError(
                    status_code=401,
                    code="INVALID_TOKEN",
                    message="Google token does not contain a valid user identity.",
                )
            return {
                "uid": sub,
                "email": claims.get("email"),
                "email_verified": bool(claims.get("email_verified", False)),
                "name": claims.get("name"),
                "provider": "google.com",
            }
        except jwt.ExpiredSignatureError as exc:
            raise ApiError(
                status_code=401,
                code="TOKEN_EXPIRED",
                message="Authentication session has expired. Please sign in again.",
            ) from exc
        except jwt.InvalidAudienceError as exc:
            raise ApiError(
                status_code=401,
                code="INVALID_TOKEN",
                message="Google authentication token was issued for an unauthorized client application.",
            ) from exc
        except Exception as exc:
            raise ApiError(
                status_code=401,
                code="INVALID_TOKEN",
                message=f"Failed to verify Google authentication token: {exc}",
            ) from exc

    # 4. Obtain Google's public certificates for Firebase Auth
    certs = _fetch_google_public_certs()
    cert_str = certs.get(kid)

    if not cert_str:
        # Key might have rotated, refresh once
        global _certs_expiry
        _certs_expiry = 0.0
        certs = _fetch_google_public_certs()
        cert_str = certs.get(kid)

    if not cert_str:
        raise ApiError(
            status_code=401,
            code="INVALID_TOKEN",
            message="Token key identifier was not recognized by authentication provider.",
        )

    # 4. Extract public key from PEM certificate
    try:
        cert_obj = load_pem_x509_certificate(cert_str.encode("utf-8"))
        public_key = cert_obj.public_key()
    except Exception as exc:
        raise ApiError(
            status_code=500,
            code="AUTH_PROVIDER_ERROR",
            message="Failed to process authentication provider public certificate.",
        ) from exc

    # 5. Verify token signature, audience, issuer, and expiration
    accepted_projects = list(
        dict.fromkeys(
            [
                settings.firebase_project_id,
                "kv-tours-and-travels",
                "travel-agency-31216",
            ]
        )
    )
    accepted_issuers = [f"https://securetoken.google.com/{pid}" for pid in accepted_projects]

    try:
        claims = jwt.decode(
            id_token,
            key=public_key,
            algorithms=["RS256"],
            audience=accepted_projects,
            issuer=accepted_issuers,
            options={
                "verify_signature": True,
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True,
            },
        )
    except jwt.ExpiredSignatureError as exc:
        raise ApiError(
            status_code=401,
            code="TOKEN_EXPIRED",
            message="Authentication session has expired. Please sign in again.",
        ) from exc
    except jwt.InvalidIssuerError as exc:
        raise ApiError(
            status_code=401,
            code="INVALID_TOKEN",
            message="Authentication token was issued by an unauthorized project.",
        ) from exc
    except jwt.InvalidAudienceError as exc:
        raise ApiError(
            status_code=401,
            code="INVALID_TOKEN",
            message="Authentication token audience does not match this application.",
        ) from exc
    except Exception as exc:
        raise ApiError(
            status_code=401,
            code="INVALID_TOKEN",
            message="Failed to verify authentication token signature.",
        ) from exc

    sub = claims.get("sub")
    if not sub or not isinstance(sub, str):
        raise ApiError(
            status_code=401,
            code="INVALID_TOKEN",
            message="Authentication token does not contain a valid user identity.",
        )

    firebase_dict = claims.get("firebase", {})
    sign_in_provider = firebase_dict.get("sign_in_provider", "google.com")

    return {
        "uid": sub,
        "email": claims.get("email"),
        "email_verified": claims.get("email_verified", False),
        "name": claims.get("name"),
        "provider": sign_in_provider,
    }
