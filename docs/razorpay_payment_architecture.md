# KV Tours & Travels — Razorpay Payment System Architecture

**Document Version:** 1.0.0  
**Phase:** Step 9 — Razorpay Payment System  
**Business:** KV Tours & Travels, Coimbatore  
**Implementation Date:** October 8, 2026  

---

## 1. Executive Summary & Core Payment Principle

The KV Tours & Travels payment system is engineered around a **zero-trust frontend architecture**:
- **The frontend is NEVER trusted** to report that a payment succeeded or determine amounts.
- A booking transitions from `payment_pending` to `confirmed` and `payment_status` from `pending` to `paid` **ONLY after authoritative server-side verification** using official Razorpay cryptographic mechanisms (HMAC-SHA256).
- All financial calculations strictly use Python `Decimal` and PostgreSQL `Numeric(12, 2)` (zero binary floating-point math). Razorpay subunit conversion (`₹10.50` $\rightarrow$ `1050 paise`) is executed using exact integer-safe multiplication.
- Secret credentials (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) are strictly maintained on the server within `SecretStr` configurations and never transmitted to the browser. Only the public `RAZORPAY_KEY_ID` is exposed to the frontend checkout modal.

---

## 2. Payment Architecture & Lifecycle

```
[Customer Creates Booking]
             │
             ▼
      payment_pending (30-min Hold Active)
             │
             ▼
[POST /api/v1/payments/razorpay/order] ──► Authoritative Total from DB ──► Razorpay Order Created
             │
             ▼
   Frontend Checkout Modal (Razorpay SDK)
             │
             ├──────────────────────────┬──────────────────────────┐
             ▼                          ▼                          ▼
   [Payment Success]          [Payment Dismissed]         [Payment Failed]
             │                          │                          │
[POST /payments/razorpay/verify]  [POST /failure]            [POST /failure]
             │                     (Hold remains active)      (Hold remains active)
  HMAC-SHA256 Signature Match
  & Authoritative Amount Check
             │
             ├────────────────────────────────────────────────┐
             ▼                                                ▼
  [Booking Confirmed (Paid)]                      [Webhook Reconciles]
  (Seats permanently confirmed)                   (POST /payments/razorpay/webhook)
                                                  (Idempotent backup confirmation)
```

---

## 3. Authoritative Order Creation

Endpoint: `POST /api/v1/payments/razorpay/order`

### Invariants & Verification Steps:
1. **Authenticated Customer Context:** Identity is derived exclusively from the HTTP session cookie (`CurrentUser`); client-supplied customer IDs are ignored.
2. **Booking Existence & IDOR Protection:** The booking must exist and belong to the authenticated user (or an administrative user with elevated RBAC privileges).
3. **Status Check:** Booking status must be `pending` or `payment_pending`. Cancelled or already paid bookings are immediately rejected.
4. **Active Hold Validation:** If `hold_expires_at` is set, it is verified against `datetime.now(timezone.utc)`. Expired holds trigger immediate atomic cancellation and seat release.
5. **Exact Subunit Calculation:**
   $$\text{amount\_paise} = \text{int}((\text{booking.total} \times 100).\text{to\_integral\_value}())$$
6. **Idempotent Order Reuse:** If a valid pending `Payment` record with an existing active Razorpay order ID already exists for the booking within the hold window, the existing order details are returned, preventing duplicate order generation.

---

## 4. Frontend Checkout & Razorpay Integration

Route: `/booking/payment/[reference]`

1. **Server Detail Lookup:** Resolves booking by either UUID or human-readable reference (`KV-2026-XXXXXX`).
2. **Live Seat Hold Countdown:** Real-time visual countdown timer displaying the remaining hold minutes/seconds.
3. **Razorpay Standard Checkout SDK:** Dynamically loaded via Next.js `Script` (`https://checkout.razorpay.com/v1/checkout.js`).
4. **Modal Configuration:**
   - Public Key: `RAZORPAY_KEY_ID`
   - Order ID: `order_XXXXX` (returned by backend)
   - Prefill: Customer name, email, and phone
   - Gold & obsidian luxury theme styling matching KV Tours & Travels brand
5. **Modal Dismissal & Failure Handling:**
   - `modal.ondismiss`: Calls `/payments/razorpay/failure` to log the event without cancelling the booking. The customer is presented with a retry button while their seat hold remains active.
   - `rzp.on("payment.failed")`: Displays gateway failure explanation and logs diagnostic details safely.

---

## 5. Cryptographic Signature Verification

Endpoint: `POST /api/v1/payments/razorpay/verify`

Razorpay delivers three parameters to the checkout callback:
- `razorpay_order_id`
- `razorpay_payment_id`
- `razorpay_signature`

### Verification Algorithm:
The backend computes an HMAC-SHA256 digest over the message string:
$$\text{message} = \text{razorpay\_order\_id} + "|" + \text{razorpay\_payment\_id}$$
$$\text{expected\_signature} = \text{HMAC-SHA256}(\text{key}=\text{RAZORPAY\_KEY\_SECRET}, \text{msg}=\text{message}).\text{hexdigest}()$$

Verification uses `hmac.compare_digest(generated_signature, received_signature)` to protect against timing attacks. Any mismatch immediately aborts verification, creates an audit log, and rejects confirmation.

### Multi-point Reconciliation Checks:
1. Provider order ID matches internal `Payment.provider_order_id`.
2. Provider order is bound to the target `Booking.id`.
3. Currency matches (`INR`).
4. Amount matches authoritative booking total.
5. In live mode, Razorpay's API (`/v1/payments/{payment_id}`) is fetched to verify `status == "captured"` or `status == "authorized"`.

---

## 6. Transactional Booking Confirmation

Upon successful verification, the database executes an atomic transaction with row-level locking (`SELECT ... FOR UPDATE`):
1. `Booking.status` transitions from `payment_pending` $\rightarrow$ `confirmed`.
2. `Booking.payment_status` transitions from `pending` $\rightarrow$ `paid`.
3. `Payment.status` transitions from `pending` $\rightarrow$ `paid`.
4. `Payment.provider_payment_id` and `captured_at` are persisted.
5. Immutable `AuditLog` entry is written with action `payment_captured` and `booking_confirmed`.
6. **Idempotency Guarantee:** If the verification endpoint is invoked repeatedly (e.g. rapid retries), the existing confirmed booking state is returned cleanly without double-confirming, double-incrementing capacity, or re-executing business logic.

---

## 7. Webhook Ingestion & Idempotency

Endpoint: `POST /api/v1/payments/razorpay/webhook`

- **Webhook Signature Header:** Validates `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` using HMAC-SHA256 over the raw request body.
- **Event Handling:**
  - `payment.captured` / `order.paid`: Locates matching `Payment` by `provider_order_id`. If booking is not yet confirmed, reconciles amount and marks booking confirmed transactionally.
  - `payment.failed`: Locates `Payment` and records `status = 'failed'` and failure error details.
  - `refund.processed`: Reconciles refund records.
- **Idempotency & Replay Protection:** Re-delivered webhook events detect that the payment is already in the terminal state (`paid`, `failed`, or `refunded`) and return HTTP 200 `{"status": "already_processed"}` without altering inventory or financials.

---

## 8. Concurrency-Safe Hold Expiration & Seat Release

Phase 8 established a 30-minute reservation window (`hold_expires_at`). Phase 9 establishes the authoritative expiration engine:

1. **Trigger Mechanisms:**
   - **Lazy Expiration:** During order creation or verification, if `hold_expires_at < current_time`, the booking is expired immediately.
   - **Administrative Sweep API:** `POST /api/v1/admin/payments/expire-holds`.
   - **CLI / Scheduled Cron Worker:** `python -m app.cli.expire_holds` suitable for Render Background Workers or Cron Jobs running every 5–10 minutes.
2. **Concurrency Safety:**
   - Queries `Booking` records where `status == 'payment_pending'`, `hold_expires_at < now`, and `payment_status != 'paid'`.
   - Applies `with_for_update(skip_locked=True)` so concurrent workers never process the same booking.
   - Restores reserved capacity to `PackageDeparture`:
     $$\text{available\_capacity} = \text{available\_capacity} + \text{booking.number\_of\_travellers}$$
     $$\text{reserved\_capacity} = \text{reserved\_capacity} - \text{booking.number\_of\_travellers}$$
   - If departure was `sold_out`, re-opens status to `open`.
   - Transitions `Booking.status` to `cancelled`.
   - Marks temporary `Payment` records as `cancelled`.
   - Logs `payment_hold_expired` in `AuditLog`.

---

## 9. Refund Architecture

Endpoints:
- `POST /api/v1/admin/payments/{payment_id}/refund`
- `GET /api/v1/admin/payments/{payment_id}`

### Refund Controls & Rules:
1. **Role-Based Access Control:** Restricted to `manager`, `admin`, and `super_admin` roles.
2. **Captured Payment Precondition:** Only payments with `status == 'paid'` can be refunded.
3. **Refund Balance Invariant:**
   $$\sum \text{processed\_refunds} + \text{new\_refund\_amount} \le \text{Payment.amount}$$
   Over-refunding is strictly rejected with HTTP 400 Bad Request.
4. **Partial Refund Support:** Supports any partial amount up to the refundable balance.
5. **Gateway Execution:** Calls Razorpay's official API (`POST /v1/payments/{payment_id}/refund`).
6. **State Recording:** Creates a `PaymentRefund` record with `provider_refund_id`, `amount`, `currency`, `status`, and `reason`.
7. **Status Update:** If fully refunded, updates `Booking.payment_status = 'refunded'` and `Payment.status = 'refunded'`. If partially refunded, updates `Payment.status = 'partially_refunded'` and `Booking.payment_status = 'partially_paid'`.

---

## 10. Database Schema Utilization

**No migration revisions were required.** Phase 3's baseline schema in `app/models/commerce.py` already included complete, forward-compatible tables:
- `Payment`: `id`, `booking_id`, `provider`, `provider_order_id`, `provider_payment_id`, `idempotency_key`, `amount`, `currency`, `status`, `payment_method`, `failure_code`, `failure_message`, `captured_at`, `created_at`.
- `PaymentRefund`: `id`, `payment_id`, `provider_refund_id`, `amount`, `currency`, `status`, `reason`, `processed_at`, `created_at`.
- Check constraints `ck_payments_status`, `ck_payments_currency`, and `ck_bookings_payment_status` enforce valid state transitions at the database level.

---

## 11. Testing & Verification Summary

### Backend Automated Test Suite:
`backend/tests/test_razorpay_payments.py` includes 16 specialized security tests:
1. `test_razorpay_order_creation_success`: Valid order creation with exact subunit calculation.
2. `test_razorpay_order_ownership_barrier`: Customer cannot initiate payment for another customer's booking.
3. `test_razorpay_order_rejected_for_cancelled_booking`: Cannot create orders for cancelled bookings.
4. `test_razorpay_order_rejected_for_expired_hold`: Expired hold aborts order creation and releases seats.
5. `test_razorpay_order_creation_idempotency`: Multiple clicks return existing active order without duplicates.
6. `test_razorpay_signature_verification_success`: Valid HMAC-SHA256 signature confirms booking.
7. `test_razorpay_signature_verification_fails_on_tampered_signature`: Tampered signature is rejected and logged.
8. `test_razorpay_verify_fails_on_wrong_order_id`: Mismatched order ID is rejected.
9. `test_razorpay_verify_idempotent_duplicate_call`: Re-verifying confirmed payment returns success idempotently.
10. `test_razorpay_payment_failure_reporting`: Modal dismissal records failure without cancelling booking.
11. `test_razorpay_webhook_signature_verification_and_capture`: Valid webhook captures payment and confirms booking.
12. `test_razorpay_webhook_invalid_signature_rejected`: Fake webhook signature is rejected with HTTP 400.
13. `test_razorpay_webhook_idempotency_repeated_event`: Replay of webhook returns `already_processed`.
14. `test_admin_refund_processing_success`: Authorized partial and full refund through gateway.
15. `test_admin_refund_overpayment_rejected`: Refund exceeding captured payment is rejected.
16. `test_hold_expiry_batch_releases_seats`: Batch hold worker safely restores departure capacity.

### Full Quality Gate Execution:
- **Pytest:** 113 passed, 1 skipped (0 failures).
- **Ruff Check:** Passed (0 errors).
- **Ruff Format:** Passed (89 files).
- **Frontend Typecheck:** `tsc --noEmit` passed (0 errors).
- **Frontend Lint:** `eslint` passed (0 errors, 0 warnings).
- **Frontend Build:** `next build` compiled all 31 static and dynamic routes cleanly.
