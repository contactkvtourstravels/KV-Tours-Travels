# KV TOURS & TRAVELS — PRODUCTION DEPLOYMENT RUNBOOK

## 1. System Architecture Overview

KV TOURS & TRAVELS uses a modern cloud architecture designed for high availability, transactional consistency, and data security:

```
[ Customer / Admin Browser ]
             │
             ├── (HTTPS: https://kvtours.in) ──► [ Vercel Next.js 15 App ]
             │                                              │ (API Calls with HttpOnly Cookies)
             └── (HTTPS: https://api.kvtours.in) ◄──────────┘
                         │
                         ▼
             [ Render FastAPI Application (Gunicorn + Uvicorn Workers) ]
                         │
        ┌────────────────┼────────────────┬────────────────┬───────────────┐
        ▼                ▼                ▼                ▼               ▼
  [ Supabase PG ]  [ Cloudinary ]   [ Razorpay ]       [ Resend ]    [ Meta WhatsApp ]
  (PostgreSQL 15)  (Media Assets)  (Payments/Webhooks)  (Emails)     (Cloud API / C2C)
```

---

## 2. Infrastructure Setup Walkthrough

### Step 1: Supabase Managed PostgreSQL Setup
1. Create a new Supabase project in the **AWS ap-south-1 (Mumbai)** region to ensure minimum latency for Indian customers.
2. Under **Project Settings** -> **Database**:
   - Note the **Transaction Pooler Connection String** (Port 6543) for application traffic:
     `postgresql+psycopg://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require`
   - Note the **Session Direct Connection String** (Port 5432) for running migrations (`alembic upgrade head`).
3. Enable **Point-in-Time Recovery (PITR)** under Database Backups.
4. Set default pool size to 15 connections with 30s timeout.

### Step 2: Render Backend Web Service Setup
1. Create a new **Web Service** on Render connected to the repository.
2. Service Settings:
   - **Environment**: Python 3.11+
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**:
     ```bash
     gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --access-logfile - --error-logfile -
     ```
   - **Health Check Path**: `/api/v1/health`
3. Attach Custom Domain: `api.kvtours.in`
4. Configure Environment Variables (from `.env.production.example`):
   - `APP_ENV=production`
   - `DATABASE_URL=<Supabase pooler URL>`
   - `SECRET_KEY=<64-char cryptographically secure secret>`
   - `FRONTEND_URL=https://kvtours.in`
   - `FRONTEND_ORIGINS=https://kvtours.in,https://www.kvtours.in`
   - `AUTH_COOKIE_SECURE=true`
   - `AUTH_COOKIE_SAMESITE=lax`
   - `AUTH_COOKIE_DOMAIN=.kvtours.in`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL=concierge@kvtours.in`
   - `WHATSAPP_PHONE_NUMBER=919442000000`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `SENTRY_DSN`

### Step 3: Vercel Frontend Deployment
1. Import repository on Vercel with **Root Directory** set to `frontend`.
2. Framework Preset: Next.js.
3. Configure Build Command: `next build`.
4. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://api.kvtours.in/api/v1`
   - `NEXT_PUBLIC_SITE_URL=https://kvtours.in`
   - `NEXT_PUBLIC_BUSINESS_PHONE=+91 94420 00000`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER=+919442000000`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...`
   - `NEXT_PUBLIC_SENTRY_DSN=https://...`
5. Attach Custom Domains: `kvtours.in` (Apex) and `www.kvtours.in` (Redirect to Apex).

### Step 4: Cloudinary Media Storage
1. Log in to Cloudinary and create an upload preset restricted to authenticated uploads.
2. Store `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Render.
3. Upload initial destination and hero images. All images will be served with auto-format (`f_auto`) and auto-quality (`q_auto`).

### Step 5: Razorpay Live Configuration
1. Activate Razorpay Live Account and generate **Live API Key & Secret** (`rzp_live_...`).
2. Set up Webhook Endpoint:
   - **URL**: `https://api.kvtours.in/api/v1/payments/razorpay/webhook`
   - **Secret**: Generate a high-entropy signing secret and set in Render as `RAZORPAY_WEBHOOK_SECRET`.
   - **Active Events**:
     - `payment.captured`
     - `payment.failed`
     - `refund.processed`
     - `refund.failed`
3. Verify TLS 1.3 is enabled on Render domain.

### Step 6: Resend Email Architecture
1. Add custom domain `kvtours.in` to Resend.
2. Add DNS verification records (DKIM, SPF, and DMARC) in your domain registrar.
3. Once verified, configure `RESEND_FROM_EMAIL=concierge@kvtours.in`.

### Step 7: WhatsApp Setup
1. Standard / Staging Mode: Safe Click-to-Chat fallback is active and bound to `+91 94420 00000`.
2. When Meta Cloud API credentials are ready:
   - Populate `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, and `WHATSAPP_ACCESS_TOKEN`.
   - Verify incoming webhook at `https://api.kvtours.in/api/v1/webhooks/whatsapp`.

---

## 3. DNS Configuration Matrix

| Type | Host / Name | Value / Target | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (kvtours.in) | `76.76.21.21` | 300 | Vercel Apex Frontend |
| **CNAME** | `www` | `cname.vercel-dns.com.` | 300 | Vercel WWW Redirect |
| **CNAME** | `api` | `kvtours-backend.onrender.com.` | 300 | Render Backend API |
| **TXT** | `@` | `v=spf1 include:resend.com ~all` | 3600 | Resend SPF Record |
| **TXT** | `resend._domainkey` | `<dkim-value-from-resend>` | 3600 | Resend DKIM Key |
| **TXT** | `_dmarc` | `v=DMARC1; p=reject; rua=mailto:dmarc@kvtours.in` | 3600 | DMARC Policy |

---

## 4. Database Migration Execution

Always run migrations via the direct session port before routing live traffic:

```bash
# 1. Verify current database revision
alembic current

# 2. Generate offline SQL script for audit review
alembic upgrade head --sql > release_migration.sql

# 3. Apply migration to production
alembic upgrade head

# 4. Verify head status
alembic heads
# Expected: 20261008_0003 (head)
```

---

## 5. Background Schedulers & Workers

KV TOURS & TRAVELS requires two asynchronous cron tasks:
1. **Hold Expiry Sweep (Every 30 minutes)**:
   - Command: `python -m app.worker sweep-holds`
   - Platform: Render Cron Job (Schedule: `*/30 * * * *`)
   - Behavior: Concurrency-safe seat release for unpaid orders older than 30 minutes (`with_for_update(skip_locked=True)`). Confirmed bookings are untouched.
2. **Trip Reminders (Daily at 08:00 AM IST / 02:30 AM UTC)**:
   - Command: `python -m app.worker send-reminders`
   - Platform: Render Cron Job (Schedule: `30 2 * * *`)
   - Behavior: Dispatches 7-day and 1-day departure reminders. Fully idempotent using `idempotency_key` in notification logs.

---

## 6. Zero-Downtime Rollback Procedure

### Frontend Rollback (Vercel)
- In Vercel Project Dashboard -> **Deployments**, locate the last healthy production build.
- Click **Instant Rollback**. Traffic switches immediately without rebuilding.

### Backend Rollback (Render)
- In Render Dashboard, click **Rollback to Previous Deploy**.
- If reverting a configuration change, revert the environment variables and Render redeploys within 2 minutes.

### Database Migration Rollback Strategy
- **Golden Rule**: Never run destructive SQL downgrades (`alembic downgrade -1`) on a live database with financial records.
- If a new column or table introduced an issue:
  1. Roll back the backend code to ignore the new column.
  2. Write an additive forward migration (`alembic revision --message "fix_schema_forward"`) to deprecate or safely adjust constraints.
