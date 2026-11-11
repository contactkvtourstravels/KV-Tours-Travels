# External Services Migration & Client Ownership Guide

This document provides step-by-step instructions for transferring and establishing client-owned accounts across all cloud hosting, database, authentication, payment, and communications providers powering **KV Tours & Travels**.

---

## 1. Principles of Account Ownership & Security

1. **Client Control:** All production cloud accounts must be registered under client-owned corporate email addresses (e.g., `contact.kvtourstravels@gmail.com` or `admin@kvtours.in`).
2. **Two-Factor Authentication (2FA):** Mandatory 2FA using hardware keys or authenticator apps (e.g., Google Authenticator, 1Password) must be enabled on every account.
3. **Billing Responsibility:** The client company must maintain its own payment cards and billing profiles. Never share credit card details with contractors.
4. **Zero Shared Secrets:** Passwords and API secrets must be transmitted exclusively via encrypted vaults (e.g., Bitwarden, 1Password), never via unencrypted chat or email.

---

## 2. Service Migration Workflows

### 2.1 GitHub (Source Code Repository)
**Current State:** Developer Git workspace.  
**Target State:** Client-owned GitHub Organization or private repository.

**Migration Steps:**
1. Create or sign in to the client's official GitHub account (`kvtourstravels` or company name).
2. Create a new private repository: `kv-tours-travels-web`.
3. In the project workspace, update the Git remote:
   ```bash
   git remote remove origin
   git remote add origin https://github.com/<client-org>/kv-tours-travels-web.git
   git branch -M main
   git push -u origin main
   ```
4. Configure Branch Protection Rules on `main`:
   - Require pull request reviews before merging.
   - Require status checks (typecheck, tests) to pass before merging.

---

### 2.2 Vercel (Frontend Next.js Hosting)
**Current State:** Hosted on developer Vercel account (`the-wild-root.vercel.app`).  
**Target State:** Client-owned Vercel Team account with production custom domain.

**Migration Steps:**
1. Create a Vercel account at [vercel.com](https://vercel.com) using `contact.kvtourstravels@gmail.com`.
2. Connect your client GitHub account to Vercel.
3. Click **Import Project** and select `kv-tours-travels-web`.
4. Configure project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. Populate Environment Variables from `ENVIRONMENT_VARIABLES_TEMPLATE.md` (specifically `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, etc.).
6. Click **Deploy**.
7. In **Project Settings &rarr; Domains**, add the official client domain (e.g., `www.kvtours.in` and `kvtours.in`).
8. Add the CNAME/A records provided by Vercel into your domain registrar's DNS panel.

---

### 2.3 Render (Backend FastAPI Service)
**Current State:** Hosted on developer Render instance (`travel-agency-kdrs.onrender.com`).  
**Target State:** Client-owned Render team workspace.

**Migration Steps:**
1. Sign up at [render.com](https://render.com) using `contact.kvtourstravels@gmail.com`.
2. Select **New &rarr; Web Service**.
3. Connect the `kv-tours-travels-web` GitHub repository.
4. Configure service parameters:
   - **Name:** `kv-tours-api`
   - **Environment:** `Python`
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt && alembic upgrade head`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Starter or Standard (Persistent CPU recommended for fast booking responses).
5. In the **Environment** tab, add all backend environment variables listed in `ENVIRONMENT_VARIABLES_TEMPLATE.md`.
6. Attach a Persistent Disk or connect to the managed PostgreSQL database (see section 2.4).

---

### 2.4 Neon / Supabase (Managed PostgreSQL Database)
**Current State:** Staging SQLite / developer PostgreSQL instance.  
**Target State:** Client-owned managed PostgreSQL cluster with automated daily backups.

**Migration Steps:**
1. Sign up at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
2. Create a new PostgreSQL database project: `kv-tours-production`.
3. Note the provided pooled connection string:
   `postgresql+psycopg://<user>:<password>@<host>/kv_tours?sslmode=require`
4. Set `DATABASE_URL` in your Render Web Service environment variables to this new connection string.
5. Apply database migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```
6. Bootstrap the initial Super Admin:
   ```bash
   python -m app.cli.bootstrap_admin --email contact.kvtourstravels@gmail.com --first-name "KV" --last-name "Admin"
   ```

---

### 2.5 Resend (Transactional Email Delivery)
**Current State:** Configured with developer test account.  
**Target State:** Dedicated client-owned Resend organization with verified corporate domain.

**Migration Steps:**
1. Register at [resend.com](https://resend.com) using `contact.kvtourstravels@gmail.com`.
2. Navigate to **Domains &rarr; Add Domain** (e.g., `mail.kvtours.in` or `kvtours.in`).
3. Add the three required DNS records in your domain registrar:
   - **SPF TXT Record:** Proves Resend is authorized to send email for your domain.
   - **DKIM CNAME Records:** Cryptographically signs outbound booking vouchers.
   - **DMARC TXT Record:** Protects against brand spoofing (`v=DMARC1; p=quarantine;`).
4. Once verified (green checkmark in Resend dashboard), navigate to **API Keys &rarr; Create API Key**.
5. Copy the generated key (`re_...`).
6. Set `RESEND_API_KEY` in Render environment variables or update via Admin Panel at `/admin/settings?tab=email`.
7. Configure Inbound / Status Webhook:
   - In Resend dashboard &rarr; Webhooks, add endpoint: `https://<backend-domain>/api/v1/webhooks/resend`.
   - Copy the Signing Secret (`whsec_...`) and store as `RESEND_WEBHOOK_SIGNING_SECRET`.

---

### 2.6 Razorpay (Payment Gateway)
**Current State:** Staging Test Credentials.  
**Target State:** Client KYC-verified Razorpay Merchant Account.

**Migration Steps:**
1. Register at [razorpay.com](https://razorpay.com) under the legal business entity of KV Tours & Travels.
2. Complete merchant KYC verification (business PAN, GST certificate, bank account details for settlement payouts).
3. Access **Settings &rarr; API Keys**:
   - Generate **Test Keys** for staging validation.
   - Generate **Live Keys** for production checkout.
4. Access **Settings &rarr; Webhooks**:
   - Add Webhook URL: `https://<backend-domain>/api/v1/payments/razorpay/webhook`
   - Select events:
     - `payment.authorized`
     - `payment.captured`
     - `payment.failed`
     - `order.paid`
   - Set a strong random Webhook Secret and store in your vault.
5. In backend environment variables, update:
   - `RAZORPAY_KEY_ID=rzp_live_...`
   - `RAZORPAY_KEY_SECRET=...`
   - `RAZORPAY_WEBHOOK_SECRET=...`
6. In frontend environment variables, update:
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...`
7. Perform one live transaction of ₹1 to verify successful settlement to the client's corporate bank account.

---

### 2.7 Firebase / Google Cloud Platform (Social Authentication)
**Current State:** Staging Firebase project (`travel-agency-31216`).  
**Target State:** Client Google Cloud Organization.

**Migration Steps:**
1. Navigate to [console.firebase.google.com](https://console.firebase.google.com) with `contact.kvtourstravels@gmail.com`.
2. Create project: `kv-tours-travels`.
3. Enable **Authentication &rarr; Sign-in method &rarr; Google**.
4. Configure Authorized Domains: Add your Vercel URL and official custom domain (`kvtours.in`).
5. In Project Settings &rarr; Web Apps, obtain client credentials:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
6. In Project Settings &rarr; Service Accounts, click **Generate new private key** (JSON).
7. Save the JSON credentials file securely on the backend server for token verification.

---

### 2.8 Cloudinary (Media & Image Delivery)
**Current State:** Developer media cloud (`kvtours-travels` fallback).  
**Target State:** Client Cloudinary media cloud.

**Migration Steps:**
1. Sign up at [cloudinary.com](https://cloudinary.com) using `contact.kvtourstravels@gmail.com`.
2. Note your **Cloud Name**, **API Key**, and **API Secret**.
3. Set the following backend variables:
   - `CLOUDINARY_CLOUD_NAME=<client_cloud_name>`
   - `CLOUDINARY_API_KEY=<client_api_key>`
   - `CLOUDINARY_API_SECRET=<client_api_secret>`
4. Set the frontend variable:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<client_cloud_name>`

---

## 3. Account Ownership Checklist for Handover

| Service | Owner Email | 2FA Active | Billing Card Added | Status |
| :--- | :--- | :---: | :---: | :--- |
| **GitHub** | `contact.kvtourstravels@gmail.com` | [ ] | N/A (Free) | Ready for transfer |
| **Vercel** | `contact.kvtourstravels@gmail.com` | [ ] | [ ] | Ready for account creation |
| **Render** | `contact.kvtourstravels@gmail.com` | [ ] | [ ] | Ready for account creation |
| **PostgreSQL** | `contact.kvtourstravels@gmail.com` | [ ] | [ ] | Ready for database provisioning |
| **Domain Registrar** | `contact.kvtourstravels@gmail.com` | [ ] | [ ] | Awaiting domain purchase/delegation |
| **Resend** | `contact.kvtourstravels@gmail.com` | [ ] | [ ] | Awaiting DNS verification |
| **Razorpay** | `contact.kvtourstravels@gmail.com` | [ ] | [ ] | Awaiting merchant KYC completion |
| **Firebase** | `contact.kvtourstravels@gmail.com` | [ ] | N/A (Free) | Ready for project creation |
| **Cloudinary** | `contact.kvtourstravels@gmail.com` | [ ] | N/A (Free) | Ready for account creation |

