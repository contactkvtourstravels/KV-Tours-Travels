# Environment Variables Configuration Template

This document provides a complete reference of all environment variables required to run the **KV Tours & Travels** platform in development, staging, and production environments.

> [!CAUTION]
> **Strict Security Principle:** Never commit active production `.env` files, API secret keys, or database passwords to public or private Git repositories. Keep all production secrets inside your hosting provider's encrypted environment manager (e.g., Render Environment Settings, Vercel Project Environment Variables).

---

## 1. Backend Environment Variables (`backend/.env`)

### 1.1 Application Core & Security
| Variable Name | Required | Classification | Default / Example | Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `PROJECT_NAME` | No | Public | `KV Tours & Travels API` | Display name of the backend service. |
| `ENVIRONMENT` | Yes | Public | `production` (`development` for local) | Controls error disclosure, logging format, and CORS enforcement. |
| `SECRET_KEY` | Yes | **CRITICAL SECRET** | *(Generate 64-char hex string)* | Signs JWT session tokens and user state cookies. |
| `ALGORITHM` | No | Internal | `HS256` | JWT cryptographic algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Internal | `10080` (7 days) | Session expiration window. |
| `CREDENTIAL_ENCRYPTION_KEY` | Yes | **CRITICAL SECRET** | *(Generate 32-byte URL-safe base64 string)* | Used by Fernet to encrypt third-party credentials (e.g. payment API keys) at rest in the database. |
| `AUTHORIZED_SUPER_ADMIN_EMAIL` | Yes | High Security | `contact.kvtourstravels@gmail.com` | Hardcoded email identity authorized to hold and execute the Super Admin role. |

### 1.2 Database Connectivity
| Variable Name | Required | Classification | Default / Example | Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | **SECRET** | `postgresql+psycopg://user:pass@host:5432/kv_db?sslmode=require` | Authoritative PostgreSQL database connection string. (Use `sqlite:///./travelagency.db` for local dev). |
| `DB_POOL_SIZE` | No | Internal | `10` | SQLAlchemy connection pool size. |
| `DB_MAX_OVERFLOW` | No | Internal | `20` | Maximum temporary overflow connections. |

### 1.3 CORS & Network Routing
| Variable Name | Required | Classification | Default / Example | Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `FRONTEND_URL` | Yes | Public | `https://kvtours.in` | Trusted frontend domain for CORS origins and cookie domain. |
| `BACKEND_URL` | Yes | Public | `https://api.kvtours.in` | Public URL of the FastAPI backend for webhooks and redirects. |
| `ALLOWED_ORIGINS` | No | Internal | `https://kvtours.in,https://www.kvtours.in` | Comma-delimited list of permitted CORS origins. |
| `AUTH_COOKIE_DOMAIN` | No | Internal | `.kvtours.in` (Omit for localhost) | Domain scope for secure HTTP-only session cookies. |
| `AUTH_COOKIE_SAMESITE` | No | Internal | `lax` | Browser CSRF protection policy (`lax` or `none` for cross-site). |

### 1.4 Payment Gateway (Razorpay)
| Variable Name | Required | Classification | Default / Example | Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `RAZORPAY_KEY_ID` | Yes | Public/Protected | `rzp_live_...` | Public Key ID from Razorpay Merchant Dashboard. |
| `RAZORPAY_KEY_SECRET` | Yes | **SECRET** | `live_secret_...` | Secret Key used on backend to verify payment signatures. |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | **SECRET** | `whsec_...` | HMAC-SHA256 signature key for inbound payment webhooks. |

### 1.5 Transactional Email (Resend)
| Variable Name | Required | Classification | Default / Example | Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `RESEND_API_KEY` | Yes | **SECRET** | `re_1234567890abcdef...` | API Key authorized to send transactional emails via Resend. |
| `RESEND_WEBHOOK_SIGNING_SECRET` | No | **SECRET** | `whsec_...` | Validates delivery receipts and bounce webhooks from Resend. |
| `EMAIL_FROM` | Yes | Public | `KV Tours & Travels <bookings@kvtours.in>` | Sender name and address for booking confirmations. |
| `EMAIL_REPLY_TO` | Yes | Public | `contact.kvtourstravels@gmail.com` | Customer reply-to address. |

### 1.6 Cloud Media Storage (Cloudinary)
| Variable Name | Required | Classification | Default / Example | Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `CLOUDINARY_CLOUD_NAME` | Yes | Public | `kvtours-travels` | Cloudinary media bucket name. |
| `CLOUDINARY_API_KEY` | Yes | Protected | `123456789012345` | API Key for media management. |
| `CLOUDINARY_API_SECRET` | Yes | **SECRET** | `abcdef123456...` | Secret key for signed image uploads and transformations. |

---

## 2. Frontend Environment Variables (`frontend/.env.local`)

All frontend variables intended for client-side JavaScript execution must be prefixed with `NEXT_PUBLIC_`.

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | `https://api.kvtours.in/api/v1` | Base URL of the backend REST API. |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://kvtours.in` | Canonical website domain for SEO metadata, sitemap, and Open Graph. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes | `rzp_live_...` | Client-side Razorpay Key ID for loading the Checkout modal. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`| Yes | `kvtours-travels` | Cloudinary cloud identifier for responsive image optimization. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Optional | `AIzaSy...` | Firebase Web API key for Google Social Login. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Optional | `kv-tours-travels.firebaseapp.com` | Firebase Authentication domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Optional | `kv-tours-travels` | Firebase Project identifier. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Optional | `1:123456789:web:abcdef` | Firebase Web Application identifier. |

---

## 3. Cryptographic Key Generation Guide

Use the following commands on your secure terminal to generate production keys:

### Generate `SECRET_KEY` (64-byte hex string):
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Generate `CREDENTIAL_ENCRYPTION_KEY` (32-byte URL-safe base64 key):
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Key Rotation Instructions
1. When rotating `SECRET_KEY`, all existing user login sessions and JWT tokens will immediately expire, requiring users to log in again.
2. When rotating `CREDENTIAL_ENCRYPTION_KEY`, run the migration utility script to decrypt existing credentials with the old key and re-encrypt with the new key before deleting the old key.

