# KV TOURS & TRAVELS — INCIDENT RESPONSE PROTOCOLS

## 1. Incident Severity Definitions

- **SEV-1 (Critical)**: Production database outage, payment capture failure loop, or confirmed security breach. Escalation: Immediate response within 15 minutes.
- **SEV-2 (High)**: Third-party webhook outage, email delivery failure, or payment status reconciliation mismatch. Escalation: Response within 1 hour.
- **SEV-3 (Medium)**: Single-user report, degraded latency, minor admin UI glitch. Escalation: Response within 4 hours.

---

## 2. Standard Operating Procedures (SOPs)

### SOP-1: Payment Failure / Checkout Issues
- **Symptoms**: Customer reports payment debited by bank but booking shows `pending` or failed.
- **Procedure**:
  1. Check Razorpay Dashboard for the Payment ID (`pay_...`).
  2. In Admin Portal (`/admin/payments`), check the **Reconciliation** tab.
  3. If payment is `captured` in Razorpay but booking is `pending`:
     - Run backend reconciliation endpoint: `POST /api/v1/admin/operations/reconcile-payment/{payment_id}`.
     - The backend will fetch authoritative status from Razorpay, transition booking to `confirmed`, issue invoice number, and trigger email confirmation.
  4. If Razorpay shows `failed` or refunded:
     - Advise customer the bank will reverse the transaction within 5-7 business days.

### SOP-2: Payment Mismatch / Amount Variance
- **Symptoms**: Discrepancy between order amount and captured amount.
- **Procedure**:
  1. **Strict Financial Rule**: Never manually alter financial records in SQL without authoritative bank/Razorpay ledger evidence.
  2. Inspect audit logs for the booking and payment record.
  3. If discrepancy was caused by currency conversion or manual discount adjustment, issue an authoritative adjustment credit note via admin panel.

### SOP-3: Production Database Outage
- **Symptoms**: Backend logs show `psycopg.OperationalError: connection to server lost` or 500 error spikes on `/api/v1/health`.
- **Procedure**:
  1. Check Supabase status page and infrastructure health in AWS ap-south-1.
  2. Check if connection pooler exceeded `max_connections`.
  3. If database instance is unresponsive, initiate failover or restore from Point-In-Time Recovery snapshot (refer to `docs/DATABASE_BACKUP_AND_RECOVERY.md`).
  4. Enable Vercel maintenance banner while failover resolves.

### SOP-4: Email Dispatch Outage (Resend / SMTP)
- **Symptoms**: Notifications queue in `NotificationLog` table with status `failed`.
- **Procedure**:
  1. Check Resend status page and API key quota.
  2. Check DNS DKIM/SPF health for `kvtours.in`.
  3. Once upstream service recovers, navigate to Admin Panel -> **Notifications** (`/admin/notifications`).
  4. Filter by status `failed` and click **Retry Notification**. The backend uses unique `idempotency_key` to prevent duplicate emails.

### SOP-5: WhatsApp Outage
- **Symptoms**: Meta Cloud API returns 400/500 errors or token expired.
- **Procedure**:
  1. Backend automatically falls back to logging without crashing customer checkout.
  2. Customer frontend retains direct WhatsApp Click-to-Chat buttons linking to `+91 94420 00000`.
  3. In Meta Business Manager, refresh the System User Permanent Access Token and update `WHATSAPP_ACCESS_TOKEN` in Render.

### SOP-6: Security Incident / Suspected Vulnerability
- **Symptoms**: Suspicious spike in rate-limited endpoints, unauthorized administrative activity detected in `audit_logs`.
- **Procedure**:
  1. Identify offending IP addresses in Render access logs.
  2. Add IP blocking rules in Cloudflare / Vercel Edge Firewall.
  3. Force session invalidation across all admin users:
     ```sql
     UPDATE users SET status = 'suspended' WHERE id IN (...);
     ```
  4. Rotate JWT / cookie secret `SECRET_KEY` in Render (immediately invalidating all active sessions).

### SOP-7: Credential Leak Protocol
- **Symptoms**: API key or database credential exposed in logs or repository commit.
- **Procedure**:
  1. **Immediately revoke the leaked key**:
     - Razorpay: Regenerate API Key & Secret in Razorpay Dashboard.
     - Resend: Delete compromised key and generate a new key.
     - Database: Rotate PostgreSQL password in Supabase.
  2. Update environment variables in Render and Vercel.
  3. Trigger zero-downtime redeploy.
  4. Audit access logs for unauthorized use during the window of exposure.

### SOP-8: Failed Deployment / Bad Release
- **Symptoms**: Health check fails post-deployment or error rate exceeds 1%.
- **Procedure**:
  1. Execute Instant Rollback on Vercel / Render.
  2. Verify `/api/v1/health` returns HTTP 200 OK.
  3. Review release diff and Sentry issue logs to diagnose root cause.
