# Phase 10 — KV Tours & Travels Customer Portal & Communication System

**Project:** KV Tours & Travels (Coimbatore)  
**Implementation Date:** October 8, 2026  
**Status:** Implemented, verified, and complete.

---

## 1. Executive Summary

Phase 10 delivers a secure, self-service Customer Portal and a comprehensive, fault-isolated Communication Architecture for KV Tours & Travels. Authenticated travelers can view upcoming trips, manage saved traveller profiles, review day-by-day itineraries and immutable vouchers/receipts, request booking cancellations under strict administrative review, and access contextual WhatsApp concierge assistance.

Outbound communications are driven by an extensible `EmailService` supporting Mock, Resend, and SMTP drivers, coupled with a `WhatsAppService` supporting contextual click-to-chat links and Meta Cloud API foundations. All notifications feature database-backed idempotency, strict secret masking, and failure isolation ensuring transactional safety.

---

## 2. Customer Dashboard (`/dashboard`)

- **Security & Session Authentication:** Guarded by `CustomerContext`, validating session cookies via `GET /api/v1/auth/me`. Unauthenticated visitors are redirected to `/login?redirect=/dashboard`.
- **Metrics Display:** Real-time counters for active bookings, upcoming departures, completed trips, and saved traveler rosters.
- **Next Departure Spotlight:** Prominently highlights the traveler's next confirmed departure with countdown dates, booking reference, passenger counts, and quick-action links.
- **Recent Bookings:** Overview cards featuring booking reference, package title, departure date, total amount, payment status, and direct manifest links.
- **Visual Design:** Black (`#0A0A0A`, `#141414`), gold (`#D4AF37`, amber-400), and crisp white accents conforming to KV Tours & Travels Coimbatore luxury branding. Fully responsive across 320px, 375px, 390px, 430px, 768px, and desktop displays.

---

## 3. Customer Bookings & Detail Manifest (`/dashboard/bookings`)

- **List View (`/dashboard/bookings`):**
  - Powered by `GET /api/v1/bookings/my` with server-side filtering, keyword search, pagination, and status filters (`all`, `confirmed`, `pending`, `cancelled`, `completed`).
  - Clear status badges: Confirmed (emerald), Payment Pending (amber), Cancelled (red), Completed (blue).
- **Detail View (`/dashboard/bookings/[reference]`):**
  - **Ownership Protection (Zero IDOR):** Strictly isolated to the authenticated user owning the booking. Requests for another customer's booking return HTTP 403 Forbidden.
  - **Day-by-Day Itinerary:** Full catalog itinerary breakdown (Day 1, Day 2, Day 3...) with activity tags, descriptions, and duration summaries.
  - **Passenger Roster:** Complete passenger manifest detailing lead traveler, companions, nationality, and gender.
  - **Accommodations:** Room types, nights, and partner hotel information.
  - **Price Breakdown:** Immutable breakdown of package base rates, add-on additions, coupon discounts, GST taxes, and total paid.

---

## 4. Travel Voucher & Payment Receipt

- **Travel Voucher Modal (`GET /api/v1/bookings/{ref}/voucher`):**
  - Generates official travel credentials including KV Tours & Travels Coimbatore branding, office address, emergency contact numbers, WhatsApp concierge links, passenger manifest, and itinerary highlights.
  - Features dedicated in-browser printable styling (`window.print()`).
- **Payment Receipt Modal (`GET /api/v1/bookings/{ref}/receipt`):**
  - Generates immutable financial receipts derived directly from authoritative transaction snapshots.
  - Exposes transaction ID, Razorpay provider reference, itemized subtotal, tax breakdown, discounts, and total paid.
  - Secrets (webhook secrets, API keys, internal hashes) are strictly excluded.

---

## 5. Saved Travellers & Checkout Quick-Fill (`/dashboard/travellers`)

- **Management Portal:**
  - Create, read, update, and delete saved traveller profiles (`SavedTraveller` model).
  - Captures fields genuinely required for travel booking: `first_name`, `last_name`, `gender`, `date_of_birth`, `contact_phone`, `contact_email`, and `relationship_label` (Self, Spouse, Child, Parent, Sibling, Friend, Companion).
- **Checkout Step 2 Integration:**
  - Authenticated customers on `/booking` can quick-fill passenger slots from saved traveler profiles via a dropdown selector.
- **Data Isolation & Immutability:**
  - Booking records take immutable snapshots into `booking_travellers` at the time of checkout. Updating or deleting a saved traveler profile does not alter or corrupt historical booking records.

---

## 6. Customer Profile & Account Security (`/dashboard/profile`)

- **Self-Service Updates:**
  - Allows travelers to update first name, last name, and phone number.
  - Rejects attempts to modify user IDs, system roles, or account statuses.
- **Email Immutability & Anti-Hijacking Policy:**
  - Direct customer email updates are disabled to prevent account takeover. An explanatory security notice instructs users to contact KV Tours concierge support for verified email changes.

---

## 7. Cancellation Request & Refund Governance

- **Submission Endpoint:**
  - `POST /api/v1/bookings/{id}/cancellation-request` allows travelers to submit cancellation reasons.
  - Statuses: `pending`, `approved`, `rejected`.
  - Duplicate pending requests on the same booking are rejected (HTTP 400).
- **Administrative Review:**
  - Staff and admins review requests at `/admin/cancellations` (`POST /api/v1/admin/cancellations/{id}/review`).
- **Refund Policy Enforcement:**
  - Customer cancellation requests do NOT trigger automatic bank refunds.
  - The UI explicitly clarifies: *"Cancellation request submitted. Our team will review your request."*
  - Any financial refund must be processed deliberately by staff through the authoritative Razorpay refund pipeline.

---

## 8. Communication Architecture

### Email Service (`EmailService`)
- **Configurable Drivers:** Mock driver (default in dev/testing), Resend API driver, and standard SMTP driver.
- **Transactional Templates:**
  1. `Booking Created`
  2. `Payment Successful`
  3. `Payment Failed`
  4. `Booking Confirmed`
  5. `Cancellation Request Received`
  6. `Cancellation Request Approved`
  7. `Cancellation Request Rejected`
  8. `Payment Refund Processed`
  9. `Trip Departure Reminder`
- **Idempotency Mechanism:**
  - Every notification check records an idempotency key (e.g. `email:booking_confirmed:{booking_id}`) in `notification_logs`. Duplicate delivery attempts are safely skipped.
- **Fault Isolation:**
  - Notification dispatches run within protected `try...catch` blocks. Dispatch failures are logged as `status="failed"` and NEVER abort or roll back database transactions or payments.

### WhatsApp Concierge Service (`WhatsAppService`)
- **Direct Click-to-Chat Concierge:**
  - Generates prefilled `https://wa.me/{phone}?text=...` links contextual to user inquiries, specific booking references, or payment support.
  - Dynamically retrieves the support phone number from `SiteSetting` ("whatsapp_concierge") with fallback to environment configuration.
- **WhatsApp Business API Foundation:**
  - Prepared for Meta Cloud API integration via configurable environment variables (`WHATSAPP_PROVIDER`, `WHATSAPP_BUSINESS_PHONE_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`).
  - Tokens and webhook verify secrets remain backend-only.

### Admin Notification Logs (`/admin/notifications`)
- Logs channel, notification type, recipient, delivery status (`sent`, `mocked`, `failed`), provider message ID, and failure reason.
- Authorized staff can retry failed notifications via `POST /api/v1/admin/notifications/{id}/retry`.

### Scheduled Trip Reminders Architecture
- Implemented `CustomerPortalService.send_trip_reminders(db, days_ahead)` for 7-day and 1-day departure reminders.
- Uses idempotent logging to prevent duplicate reminders.
- In production, can be triggered via Celery Beat, Cloud Scheduler, or a cron worker executing `python -m app.scripts.send_reminders`.

---

## 9. Quality Gate Verification

| Metric | Target | Result |
| :--- | :--- | :--- |
| **Backend Tests** | All passing | **128 passed, 1 skipped, 0 failed** in 63.12s |
| **Backend Ruff Linter** | Zero errors | **All checks passed!** |
| **Backend Ruff Formatter** | Zero format issues | **99 files formatted** |
| **Frontend TypeScript** | Zero type errors | **0 errors (`tsc --noEmit`)** |
| **Frontend ESLint** | Zero warnings/errors | **0 errors, 0 warnings (`eslint`)** |
| **Frontend Next.js Build** | Production ready | **37/37 static and dynamic routes compiled** |
