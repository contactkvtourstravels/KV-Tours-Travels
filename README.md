# Travel Agency Platform

Production-oriented travel agency website and management platform. The project is a monorepo with an independently runnable Next.js frontend and FastAPI backend. This foundation phase establishes the application shell and PostgreSQL integration wiring; it does **not** implement travel catalog, authentication, bookings, payments, or admin functionality.

## Architecture

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS 4, and ESLint in `/frontend`.
- **Backend:** modular FastAPI application with Pydantic settings, versioned API routing, SQLAlchemy 2.x, and Alembic in `/backend`.
- **Database:** PostgreSQL through the `psycopg` driver. An engine/session factory and migration environment are configured; no business schema or database migration has been added yet.
- **Integrations:** future provider credentials have blank placeholders in environment examples; no provider integrations are implemented.
- **API:** `/api/v1/health` returns `{"status":"ok"}`. The `/api/health` alternative in the original requirements was not selected.

The frontend is not a source of truth for future prices, permissions, bookings, or payment state. Those rules belong in backend services and PostgreSQL. See [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) for the full architecture, roadmap, and phase status.

## Prerequisites

- Node.js 20.9 or newer (the inspected development environment has Node 24.13.1) and npm.
- Python 3.11+ (the virtual environment in this workspace uses Python 3.11.9).
- PostgreSQL for database connectivity and migrations. Docker is not required or used.
- Git.

The API health check does not require a running database. Database operations and Alembic upgrades do; provision PostgreSQL and configure its URL before using them.

## Initial setup

From the repository root (`D:/travelagency`):

1. Copy `.env.example` to `.env` for local configuration. Never commit `.env`; replace development values locally and use managed secrets in deployment. `backend/.env.example` is also provided for a standalone backend working directory.
2. Install and run the frontend:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

   Open `http://localhost:3000`. The temporary foundation page is for verifying the app shell and will be replaced in a future phase.

3. Create the backend environment, install dependencies, and run the API (PowerShell):

   ```powershell
   cd D:\travelagency\backend
   py -3.11 -m venv .venv
   .venv\Scripts\python.exe -m pip install -r requirements.txt
   Copy-Item .env.example .env
   .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   Bash equivalent for the virtual environment and server:

   ```bash
   cd /d/travelagency/backend
   python -m venv .venv
   .venv/Scripts/python.exe -m pip install -r requirements.txt
   cp .env.example .env
   .venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   Visit `http://localhost:8000/api/v1/health` or `http://localhost:8000/docs`.

## Environment variables

Root `.env.example` documents local configuration and planned integration settings. Important variables:

| Variable | Purpose |
|---|---|
| `APP_ENV` | `development`, `test`, or `production`; controls safe error detail behavior. |
| `LOG_LEVEL` | Python log level. Structured logs omit request bodies and credentials. |
| `DATABASE_URL` | SQLAlchemy PostgreSQL URL, for example `postgresql+psycopg://user:password@host:5432/database`. |
| `DB_POOL_SIZE`, `DB_MAX_OVERFLOW` | SQLAlchemy connection-pool limits. |
| `SECRET_KEY` | Reserved application secret; a placeholder only, not authentication functionality. |
| `FRONTEND_URL`, `FRONTEND_ORIGINS` | Public frontend URL and comma-separated, explicitly allowed CORS origins. |
| `BACKEND_URL` | Backend base URL for future service integration/configuration. |
| `CLOUDINARY_*`, `RAZORPAY_*`, `RESEND_*`, `WHATSAPP_*` | Blank future integration placeholders; no credentials or integration code is included. |

Pydantic settings loads process environment variables and an optional `backend/.env`. Environment variables override file values. Do not use example/default secrets in a deployed environment. Configure only exact trusted frontend origins for production.

## Development and verification commands

Frontend (from `frontend/`):

```bash
npm run dev       # development server
npm run lint      # ESLint
npm run typecheck # TypeScript check
npm run build     # production build
npm start         # serve a built production app
```

Backend (from `backend/`, use the virtual-environment Python executable):

```powershell
.venv\Scripts\python.exe -m pytest
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
.venv\Scripts\python.exe -m alembic current
```

An Alembic environment is configured, but there are currently no revisions or business tables. Do not run database migrations without a valid PostgreSQL URL and an intentionally created revision.

## Project structure

```text
frontend/               Next.js App Router application shell
  src/app/              Root layout, global CSS, temporary verification page
backend/                FastAPI service
  app/api/v1/            Versioned HTTP routers (health implemented)
  app/core/              Settings, logging, and API error primitives
  app/db/                PostgreSQL engine/session and SQLAlchemy metadata base
  app/models/            Future persistence models (none yet)
  app/schemas/           Future API schemas
  app/services/          Future domain services
  app/repositories/      Future persistence queries
  alembic/               Database migration environment; no revisions yet
  tests/                 Backend API tests
docs/                   Architecture and operational documentation
.env.example            Safe root environment template
PROJECT_STATUS.md       Architecture, decisions, risks, roadmap, phase record
```

## Implemented scope and exclusions

#### Implemented (Phases 2–10):
- **Project Foundation (Phase 2):** Runnable frontend shell, FastAPI modular routing, CORS, structured logging, safe error handlers, Alembic migration environment.
- **Database Schema (Phase 3):** Full PostgreSQL schema (28 SQLAlchemy 2.x declarative models) covering identity, catalog, bookings, payments, coupons, content, and audit trails.
- **Authentication & Security (Phase 4):** Argon2id password hashing, database-backed sessions with secure `HttpOnly` cookies, double-submit CSRF defense, role authorization (`customer`, `staff`, `manager`, `admin`, `super_admin`), customer ownership protections, password reset flow, and CLI Super Admin bootstrapper.
- **Administrative Foundation (Phase 5):** Protected `/admin` shell, real metrics, audit logs (`/admin/audit-logs`), user management, and catalog controls.
- **Catalog & Inventory System (Phase 6):** Destinations, Packages, sequential multi-day itineraries, hotels, activities, group departures with capacity management, add-ons, and Cloudinary uploads.
- **Premium Public Website (Phase 7):** Editorial luxury website for KV Tours & Travels (Coimbatore), cinematic homepage, catalog listings, bespoke trip planner, and verified inquiries.
- **Booking Engine & Checkout (Phase 8):** Multi-step checkout (`/booking`), passenger manifests, coupon discounts, GST calculation, atomic seat reservation, 30-minute hold window, and idempotency.
- **Razorpay Payment System (Phase 9):** Server-side order creation, standard checkout, HMAC-SHA256 signature verification, webhooks, hold auto-release, and administrative refund execution.
- **Customer Portal & Communications (Phase 10):**
  - Authenticated customer dashboard (`/dashboard`) with active trip spotlight, upcoming departure countdowns, and verified metrics.
  - Customer bookings portal (`/dashboard/bookings`) with search, status filters, and pagination.
  - Ownership-protected booking detail (`/dashboard/bookings/[reference]`) with day-by-day catalog itinerary, passenger roster, accommodations, and price breakdowns.
  - Official printable Travel Voucher modal and immutable Payment Receipt modal.
  - Saved traveller manager (`/dashboard/travellers`) with Step 2 checkout quick-fill dropdown and strict data isolation.
  - Self-service customer profile updates (`/dashboard/profile`) with locked email anti-hijacking policy.
  - Customer cancellation request flow (`POST /api/v1/bookings/{id}/cancellation-request`) and staff review portal (`/admin/cancellations`) with strict refund governance.
  - Extensible `EmailService` with 9 transactional templates, Mock/Resend/SMTP drivers, and delivery idempotency.
  - Contextual WhatsApp concierge click-to-chat links and Meta Cloud API foundation.
  - Outbound notification logging and retry portal (`/admin/notifications`).
  - 7-day and 1-day trip departure reminder scheduling.

### Not implemented (Strictly deferred to Phase 11+):
- Production containerization & cloud deployment (Phase 11)
- Redis cache & background worker daemon orchestration (Phase 11)
- Marketing automation, CRM pipelines, loyalty programs (strictly excluded)#   t r a v e l _ a g e n c y  
 