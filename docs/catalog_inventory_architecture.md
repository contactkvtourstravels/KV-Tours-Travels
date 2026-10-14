# Catalog & Inventory System Architecture — KV Tours & Travels

## 1. Overview
Phase 6 implements the complete, production-grade travel catalog backend, inventory management engine, 9-tab admin package editor, Cloudinary media architecture, and read-only public catalog API foundation for **KV Tours & Travels (Coimbatore)**.

The system is designed around real travel agency operations: multi-day itineraries, reusable hotel and activity entities, group tour fixed departures with concurrency-safe seat capacity, modular add-on services, and strict isolation between draft/administrative data and public catalog endpoints.

---

## 2. Reused Database Models & Schemas
Zero database schema modifications were necessary; all 12 core catalog and inventory models from the Phase 3 schema were reused directly:

1. `Destination` — Travel destinations (country, region, city, SEO title/description, publishing status).
2. `DestinationImage` — Destination gallery images (Cloudinary URL, public ID, caption, sort order, featured flag).
3. `Package` — Main travel packages (pricing, duration, traveller thresholds, featured/published status, SEO metadata, soft delete).
4. `PackageImage` — Package gallery with single-hero enforcement per package.
5. `PackageDay` — Structured day-by-day itineraries with unique day numbers per package, accommodations, meals, transport notes.
6. `Hotel` — Reusable accommodation directory with destination references, star rating, address, contact details.
7. `Activity` — Reusable activity catalog with category, duration minutes, destination binding.
8. `PackageHotel` — Many-to-many relationship linking hotels to packages with optional room type and meal plan.
9. `PackageActivity` — Association between packages and general included/optional activities.
10. `PackageDayActivity` — Day-specific activity associations linking itinerary days directly to activities with time and sequence ordering.
11. `PackageDeparture` — Group trip departure batches with departure date, return date, seat capacities, special pricing, and status.
12. `AddOn` — Optional supplementary travel services (transfers, insurance, room upgrades) with exact Decimal pricing.

---

## 3. Package Editor Architecture (9 Modular Tabs)
Rather than a monolithic form prone to state loss and high cognitive load, the Package Editor (`/admin/packages/[id]`) organizes management into 9 specialized sections:

1. **Overview**: Core identity, destination association, short & full rich descriptions, duration (days/nights), group size thresholds (min/max travellers), and featured/published flags.
2. **Pricing**: Authoritative `base_price` and ISO 4217 `currency` (INR standard) with Decimal preservation.
3. **Images**: Media gallery management with Cloudinary metadata, sort order ordering, and hero image selector.
4. **Itinerary**: Day-by-day sequential schedule with unique day numbers, day titles, narrative descriptions, accommodations, meals, and transport notes.
5. **Hotels**: Hotel binding selector linking curated destination hotels to the package with room types and meal plans.
6. **Activities**: Package-level activity associations indicating included vs optional experiences.
7. **Departures**: Group tour batch scheduler with date pickers, capacity allocation, special price overrides, and availability status.
8. **Add-Ons**: Supplementary services available for booking enhancement.
9. **SEO**: Search engine meta title, meta description, and canonical slug configuration.

---

## 4. Itinerary & Activity Architecture
- **Sequential Integrity**: Unique constraint (`uq_package_days_package_day`) prevents duplicate day numbers within a package.
- **Nested Day Activities**: `PackageDayActivity` bridges itinerary days with reusable `Activity` items. Each day-activity association records time of day (e.g., "09:00 AM", "Morning", "Afternoon") and sequential sorting.
- **Reusable Directory**: An activity like "Snorkeling at Agatti Reef" or "Solang Valley Paragliding" exists as an independent entity in the master activity catalog, allowing multiple packages and itinerary days to reference it without data duplication.

---

## 5. Group Departures & Concurrency-Safe Capacity Rules
Departures are critical for KV Tours' group trip business model (e.g., fixed-date group tours to Lakshadweep, Maldives, Kazakhstan, Manali):

- **Capacity Integrity**:
  $$\text{available\_capacity} = \text{total\_capacity} - \text{reserved\_capacity}$$
  - Enforces `total_capacity >= 1`.
  - Enforces `reserved_capacity >= 0`.
  - Enforces $\text{available\_capacity} \ge 0$ at all times; attempts to reduce total capacity below already-reserved seats are rejected with `CAPACITY_BELOW_RESERVED` (`400 Bad Request`).
  - Automatically transitions departure status to `sold_out` when available capacity reaches 0.
- **Date Range Validation**: Returns `400 Bad Request` with `INVALID_RETURN_DATE` if `return_date < departure_date`.
- **Concurrency Locking**: Updates to capacity execute inside database transactions utilizing `with_for_update()` row-level locks on the departure record, preventing race conditions during concurrent bookings.

---

## 6. Media & Cloudinary Architecture
- **Zero Binary Storage**: PostgreSQL never stores raw image binaries.
- **Environment Isolation**: Configured via `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- **Signed Direct Upload**:
  - The frontend requests an upload signature via `POST /api/v1/admin/media/sign-upload`.
  - The backend computes a SHA-256 HMAC signature using the API secret.
  - The browser uploads the asset directly to Cloudinary's secure upload API using the signature, timestamp, and folder.
  - The backend verifies file size limits, allowable MIME types (`image/jpeg`, `image/png`, `image/webp`), and records only the resulting HTTPS URL and public ID.
  - Cloudinary credentials are never exposed in client bundles or public endpoints.

---

## 7. Public Read-Only Catalog API Foundation
Public endpoints provide read-only data for the future consumer-facing web application:

- `GET /api/v1/destinations`: Lists destinations where `is_published == True` and `deleted_at IS NULL`.
- `GET /api/v1/destinations/{slug}`: Fetches destination details and active images by slug.
- `GET /api/v1/packages`: Lists packages where `is_published == True` and `deleted_at IS NULL`, with destination and search filters.
- `GET /api/v1/packages/{slug}`: Fetches package overview, destination details, active images, and linked hotels.
- `GET /api/v1/packages/{slug}/itinerary`: Retrieves public itinerary days and associated activities sorted by day number.
- `GET /api/v1/packages/{slug}/departures`: Retrieves active group departures (`status == 'open'`, `departure_date >= today`, `deleted_at IS NULL`).

**Security & Privacy**:
- Internal audit logs, soft-deleted packages, draft/unpublished records, and administrative metadata are strictly filtered out.
- Financial figures are formatted cleanly without exposing pricing internals.

---

## 8. Role-Based Access Control & Audit Logging
- **RBAC**:
  - `customer`: Blocked from all `/admin/*` catalog and inventory endpoints with `403 Forbidden`.
  - `staff`: Read-only access to catalog items; write/mutation attempts are rejected with `403 Forbidden`.
  - `manager`, `admin`, `super_admin`: Full CRUD access to destinations, packages, itineraries, hotels, activities, departures, and add-ons.
- **CSRF Defense**: All state-mutating requests (`POST`, `PATCH`, `DELETE`) require the `X-CSRF-Token` header matching the secure `travel_csrf` cookie.
- **Audit Logging**: Every mutation emits an immutable `AuditLog` entry detailing:
  - `actor_user_id`: ID of the authenticated user making the change.
  - `action`: Specific event name (`destination_created`, `package_updated`, `departure_created`, etc.).
  - `entity_type`: Target entity (`destination`, `package`, `departure`, `hotel`, `activity`, etc.).
  - `entity_id`: UUID of the affected entity.
  - `changes`: JSON diff showing before/after attribute state.
  - `ip_address`: Client remote IP.

---

## 9. Remaining Limitations & Boundaries
In strict compliance with Phase 6 instructions:
1. **Public Consumer Pages**: Final public homepage, consumer destination explore page, and consumer package detail view are not built yet; public catalog API foundation is ready for them.
2. **Booking Checkout & Payments**: Razorpay integration, online checkout workflows, and payment gateway callbacks are deferred to the dedicated booking/commerce phase.
3. **Automated WhatsApp Integrations**: WhatsApp Cloud API webhooks and automated messaging are deferred to future integration phases (inquiries remain captured in the admin DB).
