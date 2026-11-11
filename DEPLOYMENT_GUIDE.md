# KV Tours & Travels: Production Deployment Guide

This guide details the procedure for building, testing, deploying, and maintaining the **KV Tours & Travels** production environment.

---

## 1. System Architecture & Prerequisites

The platform consists of two decoupled services:
- **Frontend:** Next.js 16 with React 19, TypeScript, and Tailwind CSS (Hosted on Vercel or Node.js server).
- **Backend:** FastAPI with SQLAlchemy, Alembic, Pydantic, and Uvicorn (Hosted on Render, AWS, or Docker).
- **Database:** PostgreSQL 15+ (Hosted on Neon, Supabase, or AWS RDS).

### Minimum Environment Requirements
- **Node.js:** v20.x LTS or v22.x LTS
- **Python:** v3.11.x or v3.12.x
- **PostgreSQL:** v15 or higher
- **Package Managers:** `npm` (v10+) and `pip` (v24+)

---

## 2. Local Environment Setup & Verification

Before deploying to production, verify the project locally:

### 2.1 Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Verify Super Admin security lock
python -m app.cli.audit_super_admin

# Run automated test suite
pytest tests

# Launch backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be accessible at: `http://localhost:8000` (API documentation at `/docs`).

### 2.2 Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run TypeScript type verification
npm run typecheck

# Run production build validation
npm run build

# Launch local development server
npm run dev
```

Frontend will be accessible at: `http://localhost:3000`.

---

## 3. Production Deployment Workflows

### 3.1 Deploying the Backend to Render

1. Connect the client GitHub repository (`kv-tours-travels-web`) to Render.
2. Create a new **Web Service**:
   - **Name:** `kv-tours-api`
   - **Root Directory:** `backend`
   - **Environment:** `Python`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt && alembic upgrade head
     ```
   - **Start Command:**
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4
     ```
   - **Health Check Path:** `/api/v1/health`
3. Add environment variables according to `ENVIRONMENT_VARIABLES_TEMPLATE.md`.
4. Ensure `DATABASE_URL` points to your managed PostgreSQL instance.
5. Deploy the service.

### 3.2 Deploying the Frontend to Vercel

1. Connect the GitHub repository to Vercel.
2. Select the repository and configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
3. Set the environment variables:
   - `NEXT_PUBLIC_API_URL`: Public URL of your deployed Render backend (e.g., `https://api.kvtours.in/api/v1`).
   - `NEXT_PUBLIC_SITE_URL`: Official custom domain (e.g., `https://kvtours.in`).
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Client's Razorpay public key ID.
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: Client's Cloudinary cloud name.
4. Click **Deploy**.

---

## 4. Production Database Migrations & Safety

### 4.1 Creating a Pre-Migration Backup
Always generate a database snapshot before running migrations in production:

```bash
# PostgreSQL pg_dump snapshot
pg_dump -U <db_user> -h <db_host> -p 5432 -d <db_name> -F c -b -v -f "kv_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 4.2 Applying Migrations
Alembic automatically runs during the Render build command. To run manually:
```bash
cd backend
alembic upgrade head
```

### 4.3 Migration Rollback Procedure
If an issue occurs, roll back the most recent migration cleanly:
```bash
cd backend
alembic downgrade -1
```

---

## 5. Super Admin Initialization

To initialize or verify the primary Super Admin account on a fresh database:

```bash
cd backend
python -m app.cli.bootstrap_admin \
  --email contact.kvtourstravels@gmail.com \
  --first-name "KV" \
  --last-name "Admin" \
  --password "<SECURE_TEMPORARY_PASSWORD>"
```

Once bootstrapped, run the security audit:
```bash
python -m app.cli.audit_super_admin
```

Expected output:
```
[SECURITY AUDIT] Checking Super Admin accounts in database...
- [OK] Super Admin: contact.kvtourstravels@gmail.com (Active: True, Verified: True)
[RESULT] 1 authorized Super Admin(s) verified. 0 unauthorized accounts found.
```

---

## 6. Post-Deployment Verification Checklist

Complete this checklist after every production release:

- [ ] **System Health:** Visit `https://<api-domain>/api/v1/health` and confirm `status: "healthy"`.
- [ ] **Public Settings:** Visit `https://<api-domain>/api/v1/public/settings` and verify `agency_name: "KV Tours & Travels"`.
- [ ] **CSRF Token:** Send GET to `/api/v1/auth/csrf` and verify token issuance and cookies.
- [ ] **Super Admin Sign-in:** Log in at `/admin/login` using `contact.kvtourstravels@gmail.com`.
- [ ] **Admin Identity Settings:** Verify `/admin/settings?tab=identity` loads and saves without errors.
- [ ] **Public Homepage:** Visit homepage; confirm black-and-gold branding, hero title, and absence of legacy references.
- [ ] **Public Catalog:** Navigate to `/packages` and `/destinations`; confirm images, descriptions, and pricing render properly.
- [ ] **WhatsApp Click-to-Chat:** Click the floating concierge button on mobile and desktop; confirm it opens WhatsApp conversation with the configured phone number and prefilled message.
- [ ] **Booking Flow:** Initiate a test booking on a package; confirm traveler form submission and booking reference generation.
- [ ] **Voucher Generation:** Access an approved booking voucher; confirm PDF downloads with "KV Tours & Travels" header and gold seal.

