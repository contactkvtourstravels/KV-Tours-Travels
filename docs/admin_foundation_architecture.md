# Administrative Foundation Architecture & Operations Guide (Phase 5)

## 1. Executive Summary

Phase 5 establishes the production-grade administrative foundation for the travel agency platform. Rather than providing a mocked or superficial dashboard, this system implements real database-backed administrative APIs, granular role-based authorization (RBAC), immutable audit logging, and responsive Next.js administrative interfaces for catalog and user operations.

---

## 2. Admin Route Architecture & Layout

### 2.1 Frontend Route Structure (`frontend/src/app/admin/`)

The administrative portal utilizes Next.js App Router route hierarchy:

```
frontend/src/app/admin/
├── AdminContext.tsx         # React Context managing admin user session, role ranks, and permission checks
├── layout.tsx               # Responsive admin shell with desktop sidebar, mobile drawer, and 403 guard
├── page.tsx                 # Operations console & live KPI metrics dashboard
├── loading.tsx              # Skeleton UI state for instant visual feedback
├── error.tsx                # Error boundary with recovery action and audit error logging
├── audit-logs/
│   └── page.tsx             # Audit log explorer UI with pagination, filtering, and JSON inspector
├── users/
│   └── page.tsx             # Administrative user directory, role manager (Super Admin), and status controls
├── destinations/
│   └── page.tsx             # Destination catalog CRUD interface with live slug and status management
├── packages/
│   └── page.tsx             # Travel package CRUD interface with destination bindings and pricing controls
└── [placeholder routes]/   # activities, blog, bookings, customers, hotels, inquiries, reviews (marked for future phases)
```

### 2.2 Access Guard & Forbidden Handling

1. **Authentication Enforcement:** If a visitor has no active session or is unauthenticated, `AdminContext` detects a 401 response and redirects the browser to `/login?redirect=/admin`.
2. **Role Gate:** If an authenticated customer attempts to access `/admin`, `layout.tsx` renders a dedicated **Access Denied (403 Forbidden)** screen informing them of missing administrative permissions and offering a return to homepage or sign-out.
3. **Authoritative Backend Security:** The frontend guard is strictly for user experience; every underlying administrative API endpoint strictly requires valid server-side session authentication and specific role authorization.

---

## 3. Administrative Role Hierarchy & Permissions

The platform supports five roles with strict permission boundaries:

| Role | Hierarchy Level | Capabilities & Access Scope |
| :--- | :--- | :--- |
| **`customer`** | 10 | Public website browsing, booking personal trips, managing own profile and wishlist. **Zero access to `/admin` routes or `/api/v1/admin/*` APIs (403 Forbidden).** |
| **`staff`** | 20 | Operations monitoring: read-only access to `/admin` dashboard metrics, destination catalog listings, travel package listings, inquiry queue foundation. |
| **`manager`** | 30 | Catalog management: all `staff` permissions + full creation, editing, publishing, and soft-deactivation of destinations and packages. |
| **`admin`** | 40 | Agency administration: all `manager` permissions + read access to the system audit logs, user management directory, and user account status updates (active/suspended). |
| **`super_admin`** | 50 | Full system authority: all `admin` permissions + role assignment/elevation (`/api/v1/admin/users/{id}/roles`), system configuration, and root governance. |

---

## 4. API Endpoints Reference

All administrative endpoints are grouped under `/api/v1/admin/` and protected with CSRF verification on state-modifying requests (`POST`, `PATCH`, `DELETE`).

### 4.1 Dashboard Metrics
- `GET /api/v1/admin/dashboard/metrics`: Returns aggregated metrics computed live from database tables:
  - `total_customers`, `total_users`
  - `total_destinations`, `published_destinations`
  - `total_packages`, `published_packages`
  - `total_bookings`, `pending_bookings`, `confirmed_bookings`
  - `total_inquiries`, `unread_inquiries`
  - `recent_bookings` (up to 5 recent bookings with customer & package details)
  - `recent_inquiries` (up to 5 recent inquiries with message preview)
  - `recent_audit_activity` (up to 5 recent audit events)

### 4.2 Audit Logs
- `GET /api/v1/admin/audit-logs`: Paginated search and filtering of immutable audit records.
  - Query parameters: `page`, `page_size`, `actor_user_id`, `action`, `entity_type`, `from_date`, `to_date`.
  - Sensitive metadata fields (passwords, tokens, payment secrets) are strictly redacted.

### 4.3 User Management Foundation
- `GET /api/v1/admin/users`: Paginated list of users with search (`search`), role filtering (`role`), and status filtering (`status`).
- `GET /api/v1/admin/users/{user_id}`: Retrieve detailed user profile.
- `PATCH /api/v1/admin/users/{user_id}/status`: Update user account status (e.g. `active`, `suspended`, `inactive`). Required role: `admin` or `super_admin`.
- `PATCH /api/v1/admin/users/{user_id}/roles`: Update assigned roles for a user. Required role: `super_admin` exclusively.

### 4.4 Destination Catalog CRUD
- `GET /api/v1/admin/destinations`: Paginated list of destinations with search, `is_published`, `is_featured`, and `is_active` filters. Returns computed active `package_count` per destination.
- `POST /api/v1/admin/destinations`: Create destination with automated URL-safe slug generation and collision detection. Requires `manager` or above. Emits `destination_created` audit event.
- `GET /api/v1/admin/destinations/{id}`: Detailed destination view with package counts.
- `PATCH /api/v1/admin/destinations/{id}`: Update destination fields with duplicate slug collision prevention. Requires `manager` or above. Emits `destination_updated` audit event.
- `DELETE /api/v1/admin/destinations/{id}`: Soft-delete/deactivate destination (`deleted_at` timestamp). Preserves relational integrity. Requires `manager` or above. Emits `destination_deactivated` audit event.

### 4.5 Travel Package Catalog CRUD
- `GET /api/v1/admin/packages`: Paginated list of packages with search, `destination_id`, `is_published`, `is_featured`, and `is_active` filters.
- `POST /api/v1/admin/packages`: Create travel package with active destination verification, traveller range validation (`min <= max`), and pricing constraints. Requires `manager` or above. Emits `package_created` audit event.
- `GET /api/v1/admin/packages/{id}`: Detailed package view with destination metadata.
- `PATCH /api/v1/admin/packages/{id}`: Update package fields with slug collision and traveller range validation. Requires `manager` or above. Emits `package_updated` audit event.
- `DELETE /api/v1/admin/packages/{id}`: Safe soft-delete/deactivation (`deleted_at` timestamp). Verifies dependent booking count and preserves financial/historical integrity. Requires `manager` or above. Emits `package_deactivated` audit event.

---

## 5. Security & Governance Invariants

1. **Zero Client Trust:** Identity, roles, and administrative rights are never read from request payloads or headers; they are resolved strictly from verified server-side session cookies (`travel_session`).
2. **Double-Submit CSRF Defense:** Every state-modifying admin mutation (`POST`, `PATCH`, `DELETE`) verifies the `X-CSRF-Token` header against the `travel_csrf` cookie using constant-time comparison.
3. **Privilege Escalation Protection:** Only `super_admin` accounts can modify user roles. Role elevation requests by standard `admin` accounts are rejected with 403 `INSUFFICIENT_PERMISSIONS`.
4. **IDOR & Data Boundary Protection:** Endpoints validate object existence and return generic error codes to prevent identifier enumeration.
5. **Sensitive Field Exclusion:** Neither user management APIs nor audit logs ever serialize password hashes, reset tokens, session tokens, or sensitive traveller secrets.
6. **Bounded Pagination:** All list endpoints enforce strict bounds (`page >= 1`, `1 <= page_size <= 100`) preventing denial-of-service query amplification.

---

## 6. Verification & Quality Gates

All automated quality gates have passed:

- **Backend Unit & Permission Tests:**
  ```bash
  .venv/Scripts/python -m pytest
  # 66 passed, 1 skipped in 14.5s
  ```
- **Backend Linting & Formatting:**
  ```bash
  .venv/Scripts/ruff check .
  .venv/Scripts/ruff format --check .
  # All checks passed! 55 files clean.
  ```
- **Frontend Type Safety:**
  ```bash
  npm run typecheck
  # 0 errors. tsc --noEmit passed cleanly.
  ```
- **Frontend Linting:**
  ```bash
  npx eslint src
  # 0 errors, 0 warnings.
  ```
- **Frontend Production Build:**
  ```bash
  npm run build
  # Next.js 16.3.8 optimized production build compiled successfully.
  ```
