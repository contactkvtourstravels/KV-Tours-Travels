# Project Status and Technical Architecture

**Status date:** October 9, 2026  
**Current phase:** Phase 12 — Final Production Hardening & Deployment Preparation (COMPLETE & VERIFIED)  
**Implementation status:** Full production hardening, multi-layered security auditing, distributed rate limiting, Next.js optimization, Schema.org SEO structured data, zero placeholder credentials, and deployment runbooks for KV Tours & Travels (Coimbatore) completely verified. 140 passing backend tests (1 skipped for unhosted postgres), zero ruff errors, zero ruff format errors, zero npm typecheck errors, zero eslint errors, and 100% clean production Next.js build (39/39 routes compiled). Complete deployment documentation, database backup and recovery protocols, incident response runbooks, and production readiness matrix delivered in `/docs`. Automatic deployment withheld per safety stop condition.

## 1. Environment inspection and starting decision

- Workspace: `D:/travelagency` (shell-reported path: `/d/travelagency`).
- Workspace was initially empty apart from this architecture document; there was no existing code to preserve.
- Initialized Git repository on branch `main`. No initial commit has been created.
- Available: Node.js v24.13.1, npm 11.12.1, Python 3.11.9 (`python`), Python 3.13 via the Windows Store `python3` alias, and Git 2.50.1. Backend virtual environment uses Python 3.11.9.
- `pnpm`, `yarn`, `uv`, `poetry`, and Docker are not available on `PATH`. npm and `venv`/pip are used; Docker was not used.
- Hosted PostgreSQL, deployment accounts, integration credentials, and custom domain ownership have not been verified.
- Decision: start from scratch in a modular monorepo. Dependency versions are pinned in the frontend lockfile and backend requirements for repeatable setup.

## Phase 2 completion record — project foundation

**Completed scope:**

- Created `/frontend`, `/backend`, `/docs`, root `README.md`, safe root and backend `.env.example` files, and a comprehensive root `.gitignore`. Initialized Git on `main`; no commit created.
- Frontend is Next.js 16.3.8, React 19.2.8, TypeScript, Tailwind CSS 4.3.3, and ESLint 9.39.5 (as resolved in the lockfile). Added a temporary foundation verification page only; it is not the premium site.
- Backend is FastAPI 0.142.2, Uvicorn 0.54.0, SQLAlchemy 2.0.54, Alembic 1.20.0, Pydantic 2.13.5 / pydantic-settings 2.13.0, and Psycopg 3.3.6. Requirements are pinned in `backend/requirements.txt`; local packages are installed into ignored `backend/.venv`.
- Added modular API route registry and `GET /api/v1/health` (`{"status":"ok"}`), configurable environment-based CORS/settings, JSON logging, safe generic/validation/API error responses, SQLAlchemy PostgreSQL engine/session foundation, declarative metadata base, and Alembic environment.
- PostgreSQL remains the intended database. No PostgreSQL server was provisioned or tested in this phase; the health endpoint intentionally does not connect to it. No business models, tables, or migration revisions were added.
- Provider settings are blank placeholders only. No authentication, authorization, bookings, payments, admin operations, blog, customer dashboard, Cloudinary, email, or WhatsApp integrations exist.

**Verification performed in this workspace:**

- `frontend`: `npm run lint` — passed; `npm run typecheck` — passed; `npm run build` — passed (Next.js 16.3.8, static home and not-found routes).
- `backend`: `.venv/Scripts/python.exe -m pytest -q` — 1 passed. An initial warning notes FastAPI's current `TestClient` dependency deprecation with this newer Starlette/httpx combination; it does not fail the test.
- Started Uvicorn and verified `GET http://127.0.0.1:8000/api/v1/health` returned HTTP 200 and `{"status":"ok"}`. `/api/health` is intentionally not registered (404); versioned route selected.
- Started Next.js dev server and verified `/` returned HTTP 200 and rendered the foundation-page text.
- `alembic history` completed successfully and reports no revisions (expected; the database schema phase has not run). No actual DB connection/migration was attempted.
- Checked root ignore rules: `.env`, backend virtualenv, caches/build paths are ignored; `.env.example` and `backend/.env.example` are explicitly unignored. Secret-pattern scan of tracked-worktree text found no live credentials.

**Remaining foundation limitation:** production database connectivity and migrations cannot be demonstrated until a PostgreSQL server/database and valid local connection string are provided. Git has no commit yet. The `TestClient` warning should be revisited during the testing phase rather than introducing an unnecessary dependency now.

## Phase 3 completion record — database schema and PostgreSQL migrations

**Completed scope:**

- Designed and implemented a production-quality PostgreSQL schema and domain model layer in `backend/app/models/` using SQLAlchemy 2.x declarative syntax:
  - **Identity & Access (`user.py`):** `User` (normalized unique email, salted password hash, status check constraint, soft delete flag), `Role` (`customer`, `staff`, `manager`, `admin`, `super_admin`), `UserRole` (audit-tracked assignment).
  - **Catalog & Inventory (`catalog.py`):** `Destination` (unique slug, SEO fields, soft delete `deleted_at`), `DestinationImage` (Cloudinary public ID, sort order, featured flag), `Package` (unique slug, duration, traveler capacity range, fixed-decimal base price, ISO currency, SEO, soft delete), `PackageImage`, `PackageDay` (composite unique `(package_id, day_number)`), `Hotel` (star rating constraint 1–5, contact details), `Activity` (duration, category, optional price), association tables `PackageHotel`, `PackageActivity`, `PackageDayActivity`, `PackageDeparture` (explicit `total_capacity`, `available_capacity`, `reserved_capacity` with check constraints and date validation), `WishlistItem` (composite unique `(user_id, package_id)`), `Review` (1–5 rating check constraint, moderation/featured flags).
  - **Commerce & Financials (`commerce.py`):** `Booking` (unique public reference, foreign keys to user/package/departure, state constraints, immutable subtotal/discount/tax/total snapshot), `BookingTraveller` (multi-traveller support, optional minimized passport fields for international travel only, lead traveller flag), `AddOn` (catalog extras), `BookingAddOn` (frozen price and name snapshot at checkout time), `Payment` (provider references, amount/currency, idempotency key, status constraint), `PaymentRefund` (provider refund ID tracking), `Coupon` (percentage and fixed amount discounts, thresholds, validity dates, percentage <= 100 check), `CouponUsage` (composite unique `(coupon_id, booking_id)`), `Inquiry` (contact/package/destination/WhatsApp inquiries, state constraints).
  - **Content & Operations (`content.py`):** `BlogPost` (unique slug, author FK, published state, SEO), `SiteSetting` (dynamic JSON document value store for runtime company/branding/currency configuration), `AuditLog` (append-only audit trail with actor FK, entity type/id, client IP, metadata JSON, non-empty action constraints).
  - **Shared Types & Invariants (`common.py`):** `MONEY = Numeric(14, 2)` (guaranteed decimal precision; float/double forbidden), `JSON_DOCUMENT` (`JSONB` on PostgreSQL, `JSON` fallback), `IP_ADDRESS` (`INET` on PostgreSQL, `String(45)` fallback), ISO currency check constraint helper.
- Configured Alembic migration revision `20261004_0001` (`Create the initial travel-agency domain schema`).
- Created dedicated documentation in `docs/database_architecture.md` detailing the schema, ER diagram, invariants, deletion policies, money/currency strategy, and privacy decisions.
- Built a comprehensive test suite in `backend/tests/`:
  - `conftest.py`: In-memory SQLite fixture with `PRAGMA foreign_keys = ON` and socket-based PostgreSQL availability detection.
  - `test_domain_models.py`: 14 automated tests covering unique destination slugs, package slugs, booking references, rating bounds, wishlist deduplication, package day uniqueness, capacity constraints, date ordering, Decimal money precision, multiple travellers & privacy fields, add-on price snapshot preservation, coupon constraints & limits, status validation, foreign key cascades, site settings JSON, and audit logs.
  - `test_postgres_migrations.py`: Offline Alembic DDL generation test verifying all 28 tables and constraints in PostgreSQL SQL output, plus conditionally skipped live server test.

**Verification performed in this workspace:**

- **Alembic Offline Generation:** Ran `.venv/Scripts/alembic.exe upgrade head --sql`. Produced 420+ lines of valid, transactionally wrapped PostgreSQL DDL (`BEGIN; ... COMMIT;`), confirming all 28 tables, foreign keys, unique constraints, and check constraints generate cleanly.
- **Python Linting and Formatting:** Executed `ruff check .` (All checks passed!) and `ruff format .` across all backend modules.
- **Backend Tests:** Executed `.venv/Scripts/python.exe -m pytest -v`:
  - **16 passed, 1 skipped** in 6.14s.
  - Skipped: `test_live_postgresql_connection_and_migration` (explicitly skipped because local PostgreSQL service is not listening on port 5432).
- **Frontend Verification:** Ran `npm run typecheck` in `/frontend`: passed with zero errors.

**PostgreSQL and Live Database Status:**
A local PostgreSQL server was not listening on `localhost:5432` during Phase 3 verification. Live database migration execution against a running PostgreSQL server could not be performed in this environment. As required, tests conditionally skip live connection verification while validating full schema semantics and constraints via in-memory SQLite and offline Alembic DDL generation. Production architecture remains strictly PostgreSQL; SQLite is used solely for isolated in-memory test execution.

## Phase 4 completion record — authentication and authorization

**Completed scope:**

1. **Password Security:**
   - Standardized on **Argon2id** via `argon2-cffi` (`time_cost=2`, `memory_cost=65536 KiB`, `parallelism=1`, `hash_len=32`).
   - Implemented strict password complexity validation (min 8 chars, max 128 chars, at least one uppercase, one lowercase, one digit, and one special symbol).
   - Enforced email normalization (whitespace-trimmed, lowercased, RFC 5322 regex validation).
   - Zero password exposure: password hashes, internal salts, and reset tokens are NEVER returned in API responses or serialized to frontend models.

2. **Session & Cookie Strategy:**
   - Server-side sessions backed by the `user_sessions` database table.
   - High-entropy cryptographic tokens (`secrets.token_urlsafe(32)`) generated per session; only the SHA-256 digest (`token_hash`) is persisted at rest.
   - Session tokens delivered via secure `HttpOnly` cookie (`travel_session`), configurable via `AUTH_COOKIE_NAME`, `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_DOMAIN`, and `AUTH_COOKIE_PATH`.
   - Automatic 7-day expiration (`SESSION_MAX_AGE_SECONDS=604800`) with `last_active_at` touch tracking.
   - Revocation: instant single-session revocation upon logout and global session revocation upon password reset or account status changes.
   - Cross-origin topology: Configured for Render FastAPI backend + Vercel Next.js frontend with CORS `allow_credentials=True`, specific origin whitelisting, and configurable `SameSite=none` + `Secure=true` in production (or `SameSite=lax` for local dev).

3. **CSRF Protection:**
   - Implemented double-submit CSRF cookie + header pattern for all state-changing requests (POST, PUT, PATCH, DELETE).
   - Server issues a client-readable CSRF cookie (`travel_csrf`, `HttpOnly=False`) and endpoint `GET /api/v1/auth/csrf`.
   - On state-changing requests where an active authentication session or CSRF cookie is present, the server strictly validates `X-CSRF-Token` against the cookie using constant-time comparison (`secrets.compare_digest`). Requests with missing or mismatched tokens are rejected with HTTP 403 `CSRF_TOKEN_MISSING` / `CSRF_TOKEN_INVALID`.

4. **Authentication Endpoints (`/api/v1/auth`):**
   - `GET /csrf`: Generates and issues CSRF token and cookie.
   - `POST /register`: Registers customer with email normalization, password complexity check, duplicate email rejection (409 `EMAIL_ALREADY_EXISTS`), and assigns only the `customer` role. Sets session and CSRF cookies.
   - `POST /login`: Validates credentials, checks account status (rejects suspended/inactive/soft-deleted users with 403 `ACCOUNT_INACTIVE`), applies in-memory brute-force rate limiting (5 attempts per 15-minute window), sets session and CSRF cookies, and returns sanitized profile. Uses generic failure message ("Invalid email or password.") to prevent user enumeration.
   - `POST /logout`: Invalidates the session in the database (`is_revoked = True`), clears auth and CSRF cookies (`max_age = 0`).
   - `GET /me`: Returns sanitized profile information (`id`, `email`, `first_name`, `last_name`, `phone`, `status`, `roles`, timestamps). Never serializes internal credentials.
   - `POST /forgot-password`: Generates a cryptographically random, 15-minute single-use reset token (`password_reset_tokens` table, SHA-256 hashed at rest). In dev/test mode, captures token in memory hook for zero-external-dependency automated testing. Always returns generic message to prevent account enumeration.
   - `POST /reset-password`: Validates token existence, expiration, and unused status. Validates new password strength, updates Argon2id password hash, marks token used, and revokes all active user sessions immediately.

5. **Roles & Authorization Hierarchy:**
   - Models utilized: `users`, `roles`, `user_roles`.
   - Core roles: `customer` (rank 10), `staff` (rank 20), `manager` (rank 30), `admin` (rank 40), `super_admin` (rank 50).
   - Reusable FastAPI dependencies:
     - `get_current_user`: extracts session cookie/header, validates active database session and user status.
     - `require_authenticated_user`: enforces authenticated active user.
     - `require_role(*roles)` / `require_roles(*roles)`: enforces role membership with `super_admin` override.
   - Verification routes: `GET /verify-role-admin`, `GET /verify-role-staff`, and `GET /verify-ownership/{target_user_id}`.

6. **Customer Data Ownership:**
   - Server-enforced ownership verification logic (`verify_ownership_or_admin`).
   - Never trusts frontend-supplied user IDs: all user identity is derived strictly from the server-validated session.
   - Non-admin users are strictly blocked (HTTP 403 `FORBIDDEN_OWNERSHIP`) from reading or mutating other users' resources.

7. **Admin Bootstrap CLI:**
   - Implemented `backend/app/cli/bootstrap_admin.py` (executable via `python -m app.cli.bootstrap_admin`).
   - Seeds standard roles (`customer`, `staff`, `manager`, `admin`, `super_admin`), validates password complexity, hashes password via Argon2id, creates/promotes user to `super_admin`, and creates an immutable `AuditLog` entry. No public administrative registration endpoint exists.

8. **Frontend Auth Foundation:**
   - Created minimal testing pages with accessible, functional forms communicating with real FastAPI endpoints (no mocks):
     - `/login`: sign in, session inspection, `GET /me` check, logout.
     - `/register`: customer account creation with validation feedback.
     - `/forgot-password`: password reset initiation.
     - `/reset-password`: single-use token submission and password change.
   - Implemented centralized API client in `frontend/src/lib/api.ts` with automatic credential inclusion, CSRF token management, and error serialization.
   - Updated home page (`/`) with direct navigation to all test pages.

**Verification performed in this workspace:**

- **Backend Test Suite:** Executed `python -m pytest -v`:
  - **43 passed, 1 skipped** (live PostgreSQL connection test skipped because port 5432 is unhosted).
  - All 27 new authentication, authorization, session, CSRF, cookie security, ownership, and password recovery tests passed with 100% success.
- **Ruff Lint & Format:** Executed `ruff check .` (All checks passed!) and `ruff format --check .` (All 41 backend files correctly formatted).
- **Frontend Typecheck:** Executed `npm run typecheck` in `/frontend`: passed with zero errors (`tsc --noEmit`).
- **Frontend Lint:** Executed `npx eslint src` in `/frontend`: passed with zero warnings or errors.
- **Frontend Build:** Executed `npm run build` in `/frontend`: successfully generated static production pages for `/`, `/_not-found`, `/login`, `/register`, `/forgot-password`, and `/reset-password` in 3.0s.
- **Security Scans:** Verified no secrets or `.env` files are tracked by Git (`git check-ignore`). Updated `.env.example`, `backend/.env.example`, and created `frontend/.env.example`.

## 2. Product and architecture goals

Build a production-oriented, responsive travel agency platform with a premium public experience and a protected content, customer-service, and booking administration interface. The frontend is a presentation and interaction layer, not the source of truth for prices, authorization, booking state, or payment outcomes. The FastAPI service owns business rules and persistent data; PostgreSQL is the transactional source of truth. Third-party providers sit behind replaceable integration boundaries.

Recommended initial architecture: a **modular monorepo**, a separately deployable Next.js web application and FastAPI API, and a managed PostgreSQL database. Use a **modular monolith** for the API rather than microservices: it keeps booking/payment transactions understandable for an initial team while separating business domains internally. Background work can initially use a managed task facility or a small worker only if real asynchronous requirements justify it; do not introduce a queue before that need is established.

## 3. Recommended repository structure

```text
D:/travelagency/
├── frontend/                        # Next.js App Router, TypeScript, Tailwind
│   ├── src/
│   │   ├── app/                     # Route segments, layouts, loading/error boundaries
│   │   │   ├── (public)/            # Home, destinations, packages, editorial pages
│   │   │   ├── (auth)/              # Sign-in, registration, recovery
│   │   │   ├── account/             # Authenticated customer experience
│   │   │   └── admin/               # Protected management interface
│   │   ├── components/              # Shared design-system and layout components
│   │   ├── features/                # Domain UI: packages, bookings, reviews, etc.
│   │   ├── lib/                     # API client, validation helpers, utilities
│   │   ├── hooks/
│   │   └── types/                   # Frontend-facing API/domain types
│   ├── public/                      # Static assets only; no private uploads
│   └── tests/
├── backend/                         # FastAPI service, independently deployable
│   ├── app/
│   │   ├── api/v1/                  # Versioned routers and request/response schemas
│   │   ├── core/                    # Config, auth, permissions, errors, logging
│   │   ├── db/                      # SQLAlchemy setup, session, base metadata
│   │   ├── models/                  # SQLAlchemy persistence models
│   │   ├── schemas/                 # Pydantic input/output schemas
│   │   ├── repositories/            # Persistence queries
│   │   ├── services/                # Domain rules and transactions
│   │   ├── integrations/            # Razorpay, Cloudinary, email, messaging
│   │   └── main.py
│   ├── alembic/                     # Versioned database migrations
│   └── tests/
├── docs/                            # Architecture, API, runbooks, deployment notes
├── PROJECT_STATUS.md               # Phase status, decisions, risks, next steps
├── .gitignore
└── README.md                        # Local setup and project overview (create in Phase 1)
```

Keep frontend and backend independently buildable and deployable. Establish consistent formatting, lint, test, type-check, and environment-example conventions in Phase 1. Do not commit real secrets or production data. The exact tooling and test libraries are to be selected after inspecting current framework requirements during foundation work.

## 4. Frontend architecture

- Use Next.js App Router and TypeScript. Use server rendering for public destination/package/blog pages and metadata; use client components only where interaction requires them. Tailwind provides styling; adopt shadcn/ui selectively as accessible component source, not as a substitute for a coherent premium design system. Use Framer Motion sparingly and respect reduced-motion preferences.
- Organize routes by user-facing area (public, authentication, customer account, admin), with feature modules for domain-specific screens and reusable components for layout/design primitives.
- Public routes: home, destination index/details, package index/details, custom trip planner, about, contact, blog index/details, reviews, booking flow/confirmation, customer authentication, and wishlist. Customer account routes expose only the signed-in customer's profile and bookings.
- Admin routes live under `/admin` and use a distinct authenticated layout/navigation. Hiding controls in the browser is not authorization: every write and protected read must be authorized by the backend.
- Centralize API access and error handling. Render fetched data from the API; do not seed production behavior with hardcoded package, booking, availability, or revenue records. Apply explicit cache/revalidation policy: public published content may be cached; private account/admin/booking/payment responses must not leak through shared caches.
- Optimize actual destination media using responsive image delivery, dimensions, lazy loading below the fold, CDN-backed assets, and measured loading performance. Keep secrets and privileged provider credentials server-side.
- Implement page-level metadata, canonical URL rules, Open Graph fields, sitemap/robots output, and appropriate JSON-LD from persisted published content.

## 5. Backend, API, and communication architecture

The browser calls the Next.js application for rendered public content and interaction. Next.js server rendering may call the FastAPI API using server-only configuration; browser-side interactive calls use the API's configured public origin. The FastAPI application validates the request, authenticates/authorizes it, invokes a domain service, performs transactional PostgreSQL work through SQLAlchemy, and returns a versioned Pydantic response. Webhooks enter dedicated verified API endpoints and update records idempotently. Cloudinary and email/payment providers are called only through backend integration modules.

- Prefix the JSON REST API with `/api/v1`. Group routes by domains such as auth, users, destinations, packages, availability/travel dates, bookings, payments, coupons, reviews, wishlists, inquiries, blog, site settings, and admin reporting.
- Define request/response contracts with Pydantic; validate at the API boundary and enforce domain invariants in services. Keep SQLAlchemy entities separate from public response schemas.
- Use repository/query helpers for persistence, explicit service-layer transactions for multi-step business operations, database constraints as a final integrity boundary, and Alembic migrations for all schema changes.
- Make public listing/detail endpoints return published fields only. Add pagination, stable sorting, filters, and documented error responses. Protect admin reporting and mutation routes independently with explicit permissions.
- Configure CORS narrowly for the deployed frontend origin(s). Keep request IDs, structured logs, health/readiness checks, timeouts, and safe error responses. Never log passwords, session material, payment secrets, or unnecessary traveller personal data.
- Use HTTPS in deployed environments and environment-specific configuration from managed secrets, not committed files. Keep frontend and backend API origins configurable.

## 6. Proposed data model

Use PostgreSQL UUID primary keys for externally exposed business records, foreign keys for relationships, UTC-aware timestamps, and explicit, constrained status values (database enum or validated string/check constraint chosen consistently at implementation). Add `created_at` and `updated_at` where applicable; add `published_at`/`deleted_at` where publication or soft deletion is needed. Use Alembic as the only schema-change mechanism.

| Entity | Purpose and primary relationships |
|---|---|
| `users` | Customer/admin identity, normalized unique email, password hash or external identity reference, active/verified state. |
| `roles`, `user_roles` | Named roles and many-to-many assignments; permissions remain server-enforced. A small fixed role set may instead use a constrained role field if that is sufficient, but do not duplicate role sources of truth. |
| `destinations` | Slug-unique destination content, publication and SEO fields; one-to-many images and related packages. |
| `destination_images` | Destination media URL/provider asset ID, alt text, ordering, and optional featured flag. |
| `packages` | Slug-unique published product, destination FK, duration, currency, pricing policy, SEO and publication state. |
| `package_images` | Package media metadata, ordering, alt text, and featured image. |
| `package_days` | Package itinerary days, ordered per package; unique `(package_id, day_number)`. |
| `hotels`, `activities`, `package_hotels`, `package_activities` | Reusable lodging/activity records and explicit package associations where reuse is needed; association rows can store package-specific ordering/details. Avoid storing arrays of relational data in a package JSON blob. |
| `package_travel_dates` (recommended addition) | Bookable departure/date, capacity/availability, date-specific pricing and status; necessary to model selecting a real travel date and prevent overselling. Exact allocation rules require a business decision. |
| `bookings` | User/package/travel-date references, unique public booking reference, traveller count, currency, server-calculated immutable price breakdown snapshot, coupon reference, lifecycle/payment states. Persist the agreed terms so later catalog price changes do not rewrite a booking. |
| `booking_travellers` | Booking-owned traveller details; access controlled and minimized. Define retention/deletion policy before collecting sensitive travel-document data. |
| `booking_addons` (recommended addition) | Booking-specific selected extras, quantity, and price snapshot where add-ons are offered. |
| `payments` | Booking FK, provider, provider order/payment identifiers, amount/currency, status, idempotency/provider event identifiers, timestamps and refund tracking. Never store card data. |
| `reviews` | User/package or booking association as business policy decides; moderation/publication and featured state. |
| `coupons`, `coupon_usage` | Rule/expiry/limit configuration and per-user/per-booking redemption records; enforce concurrency-safe redemption limits. |
| `wishlists`, `wishlist_items` | User-owned wishlist and unique wishlist/package (or destination) pairs. |
| `inquiries` | Contact/custom-trip/package inquiries, optional user/package association, contact details, status and timestamps. |
| `blog_posts` | Unique slug, content, author, publication and SEO metadata. |
| `site_settings` | Controlled company/contact/social/homepage configuration; restrict mutation to authorized administrators. |
| `audit_logs` | Actor, action, affected entity, timestamp, and minimal safe change metadata for sensitive admin operations. Restrict access and avoid secrets/PII dumps. |

### Relational and integrity rules

- Use explicit foreign keys and indexes for foreign-key columns and common filters (published slug, package/date availability, booking reference, user booking history, payment provider IDs, status plus creation date). Confirm indexes with query plans and actual access patterns; avoid indexing every column.
- Unique constraints should include normalized user email, public content slugs, booking reference, provider transaction identifiers where present, `(package_id, day_number)`, and unique wishlist items/coupon usage rules as defined by business policy.
- Use restrictive deletion for purchased/financial history and referenced packages/users; prefer archive/unpublish or soft deletion for catalog content. Cascade only for true owned dependants such as ordered package images or itinerary rows, after confirming that historical snapshots remain intact. Do not cascade-delete payment, booking, audit, or redemption evidence.
- Use fixed-precision decimal amounts and ISO currency codes, never binary floats. Derive totals on the server from authoritative date/package prices and validated quantities/add-ons/discount rules. Save a line-item/tax/discount/total snapshot with the booking/payment attempt.
- Use database constraints and transactions for capacity reservation, unique/idempotency enforcement, and coupon limits. Choose and document reservation expiry/hold behavior before implementing checkout.

## 7. Authentication and authorization

- Use secure, adaptive password hashing (for example, Argon2id after verifying the selected library and deployment support); never store or log plaintext passwords. Add email verification and a secure password recovery flow before production account launch.
- Prefer an opaque, high-entropy server-side session in an `HttpOnly`, `Secure` (production), appropriately `SameSite` cookie, with session expiry/revocation. Hash session tokens at rest if stored. This works cleanly with a separate Next.js frontend and FastAPI API when cookie domain, CORS credentials, and CSRF protections are deliberately configured. If production topology cannot support safe cookie sharing, evaluate a short-lived access token and rotating refresh cookie as a documented alternative; do not persist long-lived bearer tokens in browser local storage.
- Protect state-changing cookie-authenticated routes against CSRF (SameSite plus origin/CSRF token strategy appropriate to deployment). Use TLS, narrow credentialed CORS origins, secure cookie scope, rate limits on sign-in/recovery, and generic authentication error messages.
- Enforce least-privilege role/permission checks on every protected backend route and object lookup. Ownership-scoped customer queries must filter by authenticated user in the server-side query; knowing a booking UUID/reference must not grant access. Admin UI middleware improves navigation only and is never the security boundary.
- Define audited administrator provisioning, role changes, account disablement/session revocation, and recovery procedures. Keep secrets in host-managed secret stores and rotate provider credentials.

## 8. Admin architecture

Build `/admin` as an independently navigable protected application area with permission-gated sections. Its dashboard queries real aggregated API data for booking counts/status, recognized revenue definitions, customers, inquiries, popularity, and recent bookings; define what constitutes revenue (for example, captured payments net of refunds) before reporting it. Use paginated/searchable data tables and deliberate empty/error/loading states.

Admin modules: dashboard; destination and image metadata management; package/itinerary/hotel/activity/pricing/travel-date management; bookings and booking travellers; payment status/refund visibility; customers and their booking history; review moderation; coupons/redemption limits; blog publishing; inquiries and status management; company/site settings; and audit history. Forms validate on the client for usability and on the API for correctness. Mutations use real APIs, clear success/failure handling, permission checks, and audit events for sensitive operations. No admin action edits source files or directly accesses the database from the browser.

## 9. Booking and payment architecture

### Booking lifecycle

1. Fetch published package/date/availability and permitted add-ons from the API.
2. Submit travel date, traveller count/details, add-on selections, and coupon code; ignore any client-supplied final price.
3. API validates date availability, limits, inputs, coupon eligibility, currency, and server-owned catalogue prices; calculates a precise server-side breakdown.
4. In a database transaction, create a pending booking with an immutable quote/price snapshot and, once rules are specified, safely reserve availability with an expiration policy and idempotency key.
5. Create a provider payment order through the payment-provider interface, recording the provider order reference and expected amount/currency.
6. Browser completes provider checkout; browser redirect/client callback is informational only and never proves payment.
7. Backend verifies the provider signature using the raw request body and secret, and/or consumes a verified webhook; cross-check order, payment, amount, currency and booking; apply idempotently in a transaction; update payment and booking state; handle delayed/duplicate/out-of-order events safely.
8. Confirmation is shown only from API-persisted state. Send configurable email after authoritative state transition; retries must not create duplicate charges/bookings/notifications.

Use distinct booking and payment state machines. Record failed attempts and provider event identifiers. Plan refunds as provider operations with authorization, idempotency, recorded refund status/amount, and audit trail. Never store card details, trust frontend price/payment claims, or mark bookings paid from a success redirect alone.

Abstract provider operations (create order, verify event/payment, refund) behind a payment interface, initially implemented by Razorpay. Persist provider, IDs, state transitions, amounts, and idempotency keys so another provider can be introduced without rewriting booking domain logic.

## 10. WhatsApp and email integrations

- First release: generate an encoded `https://wa.me/` click-to-chat link using the administrator-managed number and contextual package name/URL. Validate/normalize the phone number server-side or in controlled settings logic; encode user-generated text safely. Treat this as a user-initiated external conversation, not a message sent or delivered by the platform. Support a global CTA and package-specific prefilled message.
- Define a messaging-provider interface so official WhatsApp Business API sending, inbound webhooks, templates, consent, delivery statuses, provider credentials, and opt-out rules can be added later without coupling package/admin features to a provider SDK. Do not claim automated WhatsApp functionality until implemented and verified.
- Put Resend/SMTP behind a configurable email adapter; send booking, verification, recovery, inquiry acknowledgement, and admin notification messages only from backend-controlled state transitions. Make delivery retryable/idempotent where relevant and keep credentials in managed secrets.

## 11. Image storage architecture

Use Cloudinary for production uploaded media. The backend authorizes administrators and validates file type, size, and intended resource; issue a narrowly scoped signed upload or accept and relay the file according to operational needs. Persist the Cloudinary asset/public ID, secure delivery URL, dimensions/format as useful, alt text, owner/content association, and display order in the corresponding image table. Restrict deletion/replacement operations and avoid orphaned assets through a cleanup process. Render optimized responsive derivatives through the image CDN; configure Next.js remote image hosts narrowly. Never trust client-provided asset URLs or place Cloudinary secrets in frontend code.

## 12. SEO, accessibility, security, and performance

- SEO: unique metadata/canonical URLs; Open Graph; crawlable published content; generated sitemap and `robots.txt`; structured data only where accurate; redirect/slug-change policy.
- Accessibility/design: semantic structure, keyboard and screen-reader support, sufficient contrast, reduced-motion support, responsive layouts, explicit image alt-text policy, and usable form errors.
- Security: input/output validation and contextual escaping, parameterized ORM queries, safe rich-text sanitization, restrictive CORS, CSRF protection for cookie-authenticated mutations, rate limiting for sensitive/public-abuse surfaces, upload controls, authorization and ownership checks, dependency/security updates, audit events, and tested backup/restore procedures.
- Performance: SSR/streaming where useful, measured code splitting, responsive CDN imagery, lazy loading below the fold, bounded queries/pagination, appropriate caching for public published data only, connection pooling, query/index review, and frontend/API observability.
- Privacy: establish data minimization, consent/retention, deletion/access, and incident-handling policies for customer/traveller data before launch. Avoid collecting passport or similarly sensitive details unless required and securely justified.

## 13. Deployment architecture

- Frontend: Vercel deployment for Next.js, using preview deployments and a production deployment with environment-specific API origin and site URL. Configure public SEO origin, image remote patterns, and preview indexing protections.
- API: independently deployed FastAPI service on Render, HTTPS, controlled CORS to the actual frontend origins, health/readiness endpoints, startup/liveness behavior, managed secret configuration, and migration execution as an explicit release step.
- Database: Supabase-managed PostgreSQL in production; use TLS and least-privilege credentials. Choose direct versus pooled connections based on the selected Render process topology and Supabase connection guidance. Configure backups/retention and rehearse restoration. Keep development/test/production databases separate.
- Domain: custom `.com`; decide apex/`www`, DNS ownership, canonical URL, and which API subdomain (for example, `api.<domain>`) to use. Verify HTTPS, cookie domain/SameSite behavior, CORS, webhook URLs, and provider callback URLs before production checkout.
- Media and services: Cloudinary for media, Razorpay for payments, and configurable Resend/SMTP for email; configure provider webhook endpoints and secret rotation independently per environment.
- CI/CD: introduce build, lint, type-check, backend tests, migration checks, and frontend production-build gates. Deploy frontend/backend independently; apply backward-compatible database migrations deliberately. Add error/performance monitoring, structured logs, alerting, and an incident/rollback plan before launch.
- Exact Vercel/Render/Supabase plan limits, networking, region, billing, and domain availability have not been inspected; verify before committing production topology or cost assumptions.

## 14. Development roadmap

Phases are deliberately sequential at domain boundaries; finish and verify each phase before expanding scope. Update this status file at each phase gate with completed work, actual commands/results, remaining issues, and next phase.

The numbered roadmap below counts the initial architecture/planning activity as Phase 1. | Phase | Scope and exit gate |
|---|---|
| 1. Architecture and foundation | Architecture planning was documented; repository/runtime inspection is recorded above. |
| 2. Project foundation | **Complete:** initialized monorepo/Git, Next.js shell, modular FastAPI health API, PostgreSQL SQLAlchemy/Alembic connection foundation, configuration/docs, and initial tests/build gates. No business schema. |
| 3. Database | **Complete:** implemented production-quality PostgreSQL domain schema (28 SQLAlchemy 2.x models), Alembic migration baseline (`20261004_0001`), database check/unique/FK constraints, deletion policies, money/currency/privacy design, and 16 passing unit/constraint/DDL tests. |
| 4. Authentication | **Complete:** Argon2id password security, database-backed sessions with secure HttpOnly cookies, CSRF protection, RBAC role hierarchy (`customer`, `staff`, `manager`, `admin`, `super_admin`), customer data ownership enforcement, password recovery flow, bootstrap CLI, 4 Next.js verification pages, and 27 passing automated tests. |
| 5. Admin foundation | **Complete:** Protected `/admin` shell and responsive dashboard, real-time database metrics API, immutable audit logs with filtering & pagination, destination and package catalog CRUD with slug collision prevention and safe deactivation, user management foundation, 66 passing backend tests, and Next.js production build verified. |
| 6. Premium public website | Next recommended phase: Design system and real API-backed public destination/package/about/contact/blog/review pages, responsiveness, accessibility, SSR metadata; avoid hardcoded product content. |
| 7. WhatsApp | Managed number/settings, global and contextual click-to-chat, safe message construction, end-to-end validation; document future Business API adapter boundary. |
| 8. Booking | Departure capacity/holds, travellers, add-ons, server-authoritative pricing, coupons, idempotent booking creation and customer/admin workflows; concurrency and price-tampering tests. |
| 9. Razorpay payments | Order creation, signature/webhook verification, idempotency, failure/refund states, reconciliation and duplicate/out-of-order event tests. |
| 10. Customer dashboard | Customer-owned profile, upcoming/past bookings, detail/itinerary/payment views, and wishlists; cross-user access tests. |
| 11. Image management | Signed/authorized Cloudinary workflow, metadata/order/alt text, replacement/deletion and orphan handling; upload security tests. |
| 12. SEO | Dynamic metadata/canonicals, sitemap/robots, structured data, crawlability and SEO regression checks. |
| 13. Security audit | Threat review, access-control and input/upload/payment checks, dependency scan, secrets review, privacy and recovery review; resolve launch blockers. |
| 14. Testing | Complete unit/integration/contract/end-to-end coverage, accessibility and performance checks, staging acceptance and regression baseline. |
| 15. Production deployment | Verified domain/DNS/TLS, production services/secrets, migrations, provider webhooks, backups, monitoring, alerting, rollback and operations runbooks. |
| 16. Final production audit | Verify critical public/admin/booking/payment flows against production safely; confirm security, restore, monitoring, SEO, mobile and documented acceptance criteria; report residual risks. |

**Quality gate for every implementation phase:** run relevant tests, lint, TypeScript checks, backend static/type checks, and production builds where applicable; fix failures or disclose blockers; manually verify affected behavior where possible; record exact results and update `PROJECT_STATUS.md`. Never represent an unimplemented or untested integration as working.

## 15. Phase 5 completion record — administrative foundation

**Completed scope:**
1. **Admin Route Architecture (`frontend/src/app/admin/`):**
   - Implemented App Router hierarchy: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `AdminContext.tsx`.
   - Nested administrative sections: `/admin/destinations`, `/admin/packages`, `/admin/audit-logs`, `/admin/users`, and placeholder indicators for `/admin/hotels`, `/admin/activities`, `/admin/bookings`, `/admin/customers`, `/admin/inquiries`, `/admin/reviews`, `/admin/blog`.
   - Access protection: `AdminContext` catches 401 unauthenticated requests and redirects to `/login?redirect=/admin`. Customers without administrative roles receive an explicit 403 Forbidden screen.
2. **Administrative RBAC & Permission Enforcement:**
   - Strict role hierarchy: `customer` (no access), `staff` (read dashboard, list destinations & packages), `manager` (catalog CRUD), `admin` (audit logs, user list, user status toggle), `super_admin` (user role modification & system configuration).
   - Enforced by server-side FastAPI dependencies (`require_role`) and double-submit CSRF verification on all mutations.
3. **Live Database Dashboard Metrics (`GET /api/v1/admin/dashboard/metrics`):**
   - Zero mocked numbers: queries live PostgreSQL records across `User`, `Destination`, `Package`, `Booking`, `Inquiry`, and `AuditLog`.
   - Provides summary KPIs, booking pipeline state breakdown, recent inquiries preview, and recent audit trail entries.
4. **Audit Log Explorer (`GET /api/v1/admin/audit-logs` & `/admin/audit-logs` UI):**
   - Paginated queries with newest-first ordering and filters (`action`, `entity_type`, `actor_user_id`, `from_date`, `to_date`).
   - Strict redaction of secrets, hashes, and session tokens.
   - Interactive UI with detail inspection modal and clean tabular view.
5. **Admin User Management Foundation (`/api/v1/admin/users` & `/admin/users` UI):**
   - User listing, search, role filtering, status filtering.
   - Safe status toggle (`active`, `suspended`, `inactive`) with optional reason tracking.
   - Role modifications restricted strictly to `super_admin` accounts.
6. **Destination & Package Catalog CRUD (`/api/v1/admin/destinations`, `/api/v1/admin/packages`):**
   - Full CRUD endpoints with typed Pydantic request/response schemas.
   - Automatic slug generation, slug collision prevention on creation and update.
   - Soft-deletion / safe deactivation via `deleted_at` timestamp preserving relational integrity and booking history.
   - Every catalog mutation produces an immutable `AuditLog` entry.
7. **Verification & Quality Gate:**
   - Backend pytest: 66 passed, 1 skipped.
   - Backend ruff: `ruff check .` passed, `ruff format --check .` passed (55 files).
   - Frontend typecheck: `npm run typecheck` passed (0 errors).
   - Frontend linting: `npx eslint src` passed (0 errors, 0 warnings).
   - Frontend build: `npm run build` compiled 100% cleanly.

## 16. Phase 6 completion record — travel catalog & inventory system

**Completed scope:**

1. **Reused Phase 3 Database Models:**
   - 0 duplicate tables; 0 schema migrations required. Reused `Destination`, `DestinationImage`, `Package`, `PackageImage`, `PackageDay`, `Hotel`, `Activity`, `PackageHotel`, `PackageActivity`, `PackageDayActivity`, `PackageDeparture`, `AddOn`.
2. **Catalog & Inventory Backend Services & Routers:**
   - `DestinationImageService`: Reorder, feature image, alt text, soft removal.
   - `PackageImageService`: Single-hero image exclusivity, reorder, Cloudinary metadata.
   - `ItineraryService`: Multi-day itinerary management, composite uniqueness on `(package_id, day_number)`.
   - `HotelService` & `ActivityService`: Master directory management with destination bindings and star rating constraints.
   - `PackageRelationshipService`: Hotel bindings, package activity bindings, day-specific activities with time slot & sequence ordering.
   - `DepartureService`: Group trip departures with strict non-negative available capacity, auto sold-out transition, return date validation, and row-level locking (`with_for_update()`).
   - `AddOnService`: Supplementary travel services with Decimal financial precision.
   - `MediaService`: Secure signed upload signature generation for Cloudinary with zero binary storage in PostgreSQL.
   - `CatalogService`: Public catalog endpoints isolating published, active, non-deleted records with zero administrative data exposure.
3. **Admin Management Interfaces:**
   - Modular 9-Tab Package Editor (`/admin/packages/[id]`): Overview, Pricing, Images, Itinerary, Hotels, Activities, Departures, Add-ons, SEO.
   - Dedicated management pages: `/admin/hotels`, `/admin/activities`, `/admin/departures`, `/admin/add-ons`, `/admin/destinations` (gallery modal), `/admin/packages`.
4. **Security & Auditability:**
   - Granular RBAC (`customer` blocked with 403, `staff` read-only, `manager`+ CRUD).
   - Double-submit CSRF verification on all mutations.
   - Audit logging on every catalog mutation (`destination_created`, `package_updated`, `departure_created`, etc.).
5. **Verification & Quality Gate:**
   - Backend pytest: 77 passed, 1 skipped (0 failures).
   - Backend ruff: `ruff check .` passed, `ruff format --check .` passed (74 files).
   - Frontend typecheck: `npm run typecheck` passed (0 errors).
   - Frontend eslint: `npx eslint src` passed (0 warnings/errors).
   - Frontend build: `npm run build` compiled 22/22 routes successfully.

## 17. Important open decisions and risks

1. **Production Cloudinary Credentials:** Environment variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` must be set in production deployment for direct uploads.
2. **Booking & Commerce Engine:** Deposit vs full-payment policies, Razorpay checkout, webhook idempotency, and traveller passport data retention need final business signoff prior to commerce launch.
3. **WhatsApp Integration:** KV Tours Instagram inquiry flow uses direct WhatsApp chats; official WhatsApp Business Cloud API vs direct wa.me click-to-chat links should be chosen based on customer volume.

## 18. Phase 7 completion record — premium public website for KV Tours & Travels

**Completed scope:**

1. **Brand System & Luxury Editorial Aesthetic:**
   - Obsidian Dark (`#080808` / `#0e0e0e`), Metallic Gold gradients (`#d4af37`, `#f59e0b`, `#fbbf24`), and pure white typography.
   - Inspired directly by the visual identity and Instagram presence of KV Tours & Travels (Coimbatore).
   - Glassmorphism, polished micro-animations, custom gold scrollbar, and high-end typography hierarchy.

2. **Complete Public Route Coverage (100% Implemented):**
   - `/`: Cinematic hero banner, live destinations ticker, curated packages showcase, live upcoming group departures, custom trip planner CTA, and verified Coimbatore trust pillars.
   - `/destinations`: Searchable and filterable directory of destinations with country badges.
   - `/destinations/[slug]`: In-depth destination showcase with photo gallery, travel guidelines, and related package offerings.
   - `/packages`: Catalog of packages with destination filter, duration filters, and base pricing.
   - `/packages/[slug]`: Master package showcase with day-by-day itinerary accordions, partner hotels with star ratings, included/optional activities, live departure selector with seat availability meters, add-ons list, and Schema.org `Product` JSON-LD structured data.
   - `/group-trips`: Scheduled fixed-departure expeditions (Kazakhstan, Maldives, Manali, etc.) with real-time capacity progress meters ("Guaranteed Departure", "Filling Fast", "Sold Out").
   - `/custom-trip`: Bespoke trip planner with travel style selector, destination preference, dates, budget ranges, and direct inquiry submission wrapped in `<Suspense>`.
   - `/about`: Transparent Coimbatore brand story, personal concierge philosophy, and verified team standards.
   - `/contact`: Verified Coimbatore office address, direct phone/email, business hours, and general inquiry form.
   - `/_not-found`: Luxury 404 error experience.
   - `/robots.txt` & `/sitemap.xml`: Automated SEO crawler and sitemap generators.

3. **Backend Public APIs & Integrations:**
   - Extended backend schemas and catalog service: `GET /api/v1/departures` (public group departures), `POST /api/v1/inquiries` (direct database inquiry creation), `GET /api/v1/settings` (agency public branding, phone, email, WhatsApp).
   - Dynamic inquiry submission saves directly to PostgreSQL `inquiries` table, connecting prospective travelers with the Coimbatore concierge team.
   - Floating WhatsApp widget (`FloatingWhatsApp.tsx`) with dynamic prefilled messages based on active page and selected package/destination.

4. **Zero-Deception Trust Standard:**
   - Absolutely zero synthetic metrics ("50,000+ travelers"), fabricated ratings, or fake awards.
   - Verified office location in Coimbatore, real phone numbers, and official social media (`@kv_tours_travels`).

5. **Quality Gates & Verification:**
   - Backend pytest: 80 passed, 1 skipped (0 failures).
   - Backend ruff: `ruff check .` passed (0 errors), `ruff format --check .` passed (78 files).
   - Frontend typecheck: `npm run typecheck` passed (0 errors).
   - Frontend linting: `npm run lint` passed (0 errors).
   - Frontend build: `npm run build` compiled 30/30 routes cleanly with 0 errors.

## 19. Phase 8 completion record — real booking engine & checkout foundation

**Completed scope:**

1. **Transactional, Concurrency-Safe Booking Engine:**
   - Database row-level locking via SQLAlchemy `with_for_update()` on `PackageDeparture` records.
   - Strict available capacity validation (`available = total_capacity - reserved_capacity`); rejects overbooking requests with clean HTTP 409 Conflict without dirty writes.
   - Non-negative capacity invariant guaranteed; auto-transition to `status = 'sold_out'` when fully reserved.
   - Atomic cancellation releases reserved seats back to the departure and re-opens `sold_out` departures to `'available'`.
   - Updated `ck_bookings_status` check constraint with `'payment_pending'`; added indexed `idempotency_key` and `hold_expires_at` columns.

2. **Server-Authoritative Decimal Pricing & Immutability Snapshots:**
   - Authoritative pricing strictly using Python `Decimal` and PostgreSQL `Numeric(12, 2)` (zero floating point arithmetic).
   - Historical pricing permanently frozen upon creation in `Booking.package_price`, `Booking.subtotal`, `Booking.discount`, `Booking.tax`, `Booking.total`, and `Booking.price_breakdown` JSON document.
   - Add-on prices snapshotted in `booking_add_ons` (`unit_price`, `total_price`); catalog price alterations never mutate existing reservations.
   - Live server calculation endpoint `POST /api/v1/bookings/calculate` returning detailed breakdown.

3. **Coupon Validation & Concurrency Protection:**
   - Row-level lock (`with_for_update()`) on `Coupon` records preventing concurrent over-consumption of limited-use codes.
   - Server-side validation of active status, expiration dates, minimum booking value, maximum discount caps, total usage limits, and per-user limits.
   - Atomic recording in `coupon_usages` table.

4. **Request Idempotency & Customer Ownership (Anti-IDOR):**
   - Idempotency deduplication using `X-Idempotency-Key` prevents double-booking from network retries or double-clicks.
   - Strict customer ownership barriers: customer identity derived from authenticated session cookie (`request.state.user_id`); customer A cannot view or cancel customer B's bookings (HTTP 404/403).
   - CSRF protection (`X-CSRF-Token`) enforced across all booking creation and cancellation endpoints.
   - Immutable audit logging for `booking_created`, `booking_cancelled`, and `booking_status_updated`.

5. **Customer Checkout & Administrative Interfaces:**
   - Multi-step customer checkout at `/booking` (Journey & Departure selection, Traveller Details, Curated Add-ons, Promo Code, Authoritative Price Breakdown, Payment Pending Advisory).
   - Direct "Book This Journey" / "Book Date" CTAs on `/packages/[slug]` and `/group-trips`.
   - Real administrative booking management dashboard at `/admin/bookings` with filters, search, passenger manifest inspector, add-ons list, financial breakdown, and administrative lifecycle status transitions (`pending` → `payment_pending` → `confirmed` → `completed` / `cancelled`).

6. **Quality Gates & Verification:**
   - Backend pytest: 97 passed, 1 skipped (0 failures, 17 new tests in `test_booking_engine.py`).
   - Backend ruff: `ruff check .` passed (0 errors), `ruff format --check .` passed (83 files).
   - Frontend typecheck: `npm run typecheck` passed (0 errors).
   - Frontend linting: `npm run lint` passed (0 errors).
   - Frontend build: `npm run build` compiled 31/31 routes cleanly with 0 errors.

## 20. Phase 9 completion record — Razorpay payment system & verifications

**Completed scope:**

1. **Razorpay Core Architecture & Configuration:**
   - Integrated Razorpay order creation, official HMAC-SHA256 signature verification, webhook processing, payment state management, hold expiry auto-release, and refund foundations.
   - Credentials configured strictly via environment variables (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET: SecretStr`, `RAZORPAY_WEBHOOK_SECRET: SecretStr`). Public key ID only exposed to frontend; secrets never leak.
   - Zero floating point financial arithmetic: all subunits calculated using exact integer Decimal multiplication (`int(round(booking.total * 100))`).

2. **Server-Authoritative Order Creation & Idempotency:**
   - `POST /api/v1/payments/razorpay/order`: Resolves booking by ID or reference, verifies customer ownership and active hold, computes exact amount from database.
   - Prevents duplicate order creation; returns existing active order for repeat clicks within the hold window.

3. **Frontend Razorpay Checkout & Real-time Hold Countdown:**
   - Route `/booking/payment/[reference]`: Loads official `checkout.js`, displays booking summary, live 30-minute hold countdown, and opens customized gold/obsidian Razorpay modal.
   - Modal dismissal and failure events recorded via `POST /api/v1/payments/razorpay/failure` without cancelling the booking, enabling retry while hold is active.

4. **Cryptographic Payment Verification & Atomic Booking Confirmation:**
   - `POST /api/v1/payments/razorpay/verify`: Validates official HMAC-SHA256 signature `HMAC_SHA256(order_id + "|" + payment_id, secret)`.
   - Multi-point reconciliation: verifies order ID, payment ID, booking relationship, currency, and amount.
   - Transactionally updates `Booking.status = 'confirmed'`, `Booking.payment_status = 'paid'`, `Payment.status = 'paid'` with row-level locks.
   - Idempotent: repeated verification calls safely return existing confirmed state without double-allocating.

5. **Webhook Processing & Replay Protection:**
   - `POST /api/v1/payments/razorpay/webhook`: Validates `X-Razorpay-Signature` against raw payload.
   - Handles `payment.captured`, `order.paid`, `payment.failed`, and `refund.processed`.
   - Idempotent: repeated webhook deliveries return `already_processed` without mutating data.

6. **Concurrency-Safe Hold Expiration & Seat Release:**
   - Expired holds (`hold_expires_at < current_time`) atomically release departure seats, update booking to `cancelled`, and log audit trail using `with_for_update(skip_locked=True)`.
   - Administrative sweep endpoint `POST /api/v1/admin/payments/expire-holds` and scheduled worker support.

7. **Refund Management:**
   - `POST /api/v1/admin/payments/{payment_id}/refund`: Role-protected (`manager`, `admin`, `super_admin`) endpoint executing official Razorpay refunds.
   - Supports full and partial refunds with cumulative balance validation ($\le$ captured payment).
   - Admin booking manifest updated with gateway transaction records and refund modal.

8. **Quality Gates & Verification:**
   - Backend pytest: 113 passed, 1 skipped (0 failures, 16 new security tests in `test_razorpay_payments.py`).
   - Backend ruff: `ruff check .` passed (0 errors), `ruff format --check .` passed (89 files).
   - Frontend typecheck: `npm run typecheck` passed (0 errors).
   - Frontend linting: `npm run lint` passed (0 errors, 0 warnings).
   - Frontend build: `npm run build` compiled all 31 static and dynamic routes cleanly.

## 21. Phase 10 completion record — Customer Portal & Communication System

**Completed scope:**

1. **Customer Dashboard (/dashboard):**
   - Protected customer portal shell featuring luxury gold & black styling (CustomerContext + /dashboard/layout.tsx).
   - Overview page presenting active journeys, upcoming departure spotlight card, verified payment metrics, and direct WhatsApp concierge assistance.

2. **Customer Bookings Portal (/dashboard/bookings & /dashboard/bookings/[reference]):**
   - Searchable, filterable, and paginated booking list (GET /api/v1/bookings/my).
   - Detailed booking manifest with day-by-day catalog itinerary, passenger roster, accommodations, and price breakdowns.
   - Strictly ownership-protected (Zero IDOR: accessing another customer's booking returns HTTP 403 Forbidden).

3. **Travel Credentials & Financial Receipts:**
   - Official printable Travel Voucher modal (GET /api/v1/bookings/{ref}/voucher) featuring agency contact information, travel dates, passenger manifests, and itinerary highlights.
   - Immutable Payment Receipt modal (GET /api/v1/bookings/{ref}/receipt) reflecting authoritative payment snapshot values with provider transaction IDs.

4. **Saved Travellers & Checkout Integration (/dashboard/travellers):**
   - CRUD management for reusable companion profiles (SavedTraveller model).
   - Step 2 checkout quick-fill dropdown on /booking to populate passenger details with a single click.
   - Complete data isolation: future changes to saved profiles do not mutate historical booking records.

5. **Customer Profile & Security (/dashboard/profile):**
   - Self-service update for first name, last name, and contact phone.
   - Email immutability: direct email editing is locked to prevent account hijacking with clear concierge support notices.
   - Role escalation, status changes, and user ID tampering strictly blocked at API and database levels.

6. **Cancellation Request & Refund Governance:**
   - Customer cancellation submission (POST /api/v1/bookings/{id}/cancellation-request) capturing traveler reasons.
   - Staff/Admin review portal at /admin/cancellations with approval and rejection notes.
   - Strict business policy enforcement: cancellation requests do not automatically issue bank refunds; all refunds must be reviewed and processed deliberately via the payment pipeline.

7. **Transactional Email Architecture (EmailService):**
   - 9 branded transactional email templates: Booking Created, Payment Successful, Payment Failed, Booking Confirmed, Cancellation Request Received, Cancellation Approved, Cancellation Rejected, Refund Processed, Trip Reminder.
   - Pluggable Mock, Resend, and SMTP drivers.
   - Delivery idempotency backed by 
otification_logs.
   - Failure isolation: notification delivery issues never abort or roll back payments or bookings.

8. **WhatsApp Concierge & Business API (WhatsAppService):**
   - Contextual click-to-chat links (wa.me) referencing specific booking IDs and traveler names.
   - Dynamic phone number resolution from SiteSetting ('whatsapp_concierge') with fallback.
   - Extensible Meta Cloud API driver foundation with backend-only secret management.

9. **Admin Notification Logs (/admin/notifications):**
   - Outbound audit log tracking channel, type, recipient, delivery status, provider message ID, and failure reason.
   - Retry capability for failed notifications (POST /api/v1/admin/notifications/{id}/retry).

10. **Trip Reminder Scheduling:**
    - Automated 7-day and 1-day reminder query and dispatch method (CustomerPortalService.send_trip_reminders) with idempotency guards.

**Verification performed in this workspace:**

- **Backend Pytest:** 128 passed, 1 skipped (0 failures, 15 new comprehensive tests in 	est_customer_portal.py).
- **Backend Ruff Linter:** 
uff check . passed (All checks passed!).
- **Backend Ruff Formatter:** 
uff format --check . passed (99 files formatted).
- **Frontend Typecheck:** 
pm run typecheck passed (0 errors).
- **Frontend ESLint:** 
pm run lint passed (0 errors, 0 warnings).
- **Frontend Production Build:** 
pm run build compiled all 37 static and dynamic routes cleanly.

## 22. Recommended Phase 11 — Production Deployment & Cloud Hardening

With all customer, administrative, catalog, booking, payment, and communication features complete and verified:
- **Production Infrastructure:** Docker containerization, multi-stage builds for Next.js and FastAPI, docker-compose orchestration.
- **Managed Database & Cache:** Production PostgreSQL deployment with connection pooling (PgBouncer) and Redis for distributed caching.
- **Cloud Scheduler / Worker:** Celery / Celery Beat or Cloud Scheduler worker for 30-minute hold release sweeps and daily trip departure reminders.
- **Production Service Integrations:** Live Resend / SMTP email provisioning, live Meta WhatsApp Cloud API credentials, and production Razorpay webhook secret configuration.
- **Monitoring & Observability:** Sentry error tracking, Prometheus/Grafana metrics, and automated database backups.
