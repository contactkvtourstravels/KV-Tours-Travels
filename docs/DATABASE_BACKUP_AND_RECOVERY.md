# KV TOURS & TRAVELS — DATABASE BACKUP & DISASTER RECOVERY SPECIFICATION

## 1. Executive Summary & Policy

This document defines the operational procedures for PostgreSQL database backup, retention policy, restoration verification, and disaster recovery for **KV TOURS & TRAVELS**.

- **Database Engine**: PostgreSQL 15+ (Hosted on Supabase Managed Cloud)
- **Driver**: `psycopg3` via SQLAlchemy 2.0 ORM
- **Target RPO (Recovery Point Objective)**: < 15 minutes (using Write-Ahead Logging / PITR)
- **Target RTO (Recovery Time Objective)**: < 60 minutes for full snapshot restoration

> **Honesty & Readiness Note**: Automated PITR and off-site cold storage must be explicitly enabled in the cloud provider's project billing and retention settings prior to launch. Backups do NOT exist by default on free-tier sandboxes without configuring daily snapshot schedules or external pg_dump crons.

---

## 2. Backup Architecture & Layers

We employ a 3-tier backup strategy to guarantee zero data loss:

### Tier 1: Supabase Managed Continuous WAL Archiving & Daily Physical Backups
- **Continuous Archiving**: Continuous Write-Ahead Logs (WAL) streamed to multi-region cloud object storage.
- **Physical Snapshots**: Daily automated physical base backups taken at 02:00 AM IST (low-traffic window).
- **Point-in-Time Recovery (PITR)**: Enables rolling back the database to any exact second within the last 7 to 30 days (depending on plan tier).

### Tier 2: Logical Backups via Scheduled Cloud Worker (`pg_dump`)
- Run an automated nightly cron job (via GitHub Actions / Render Cron) executing `pg_dump`:
```bash
# Automated logical export script
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="kvtours_db_${TIMESTAMP}.dump"

pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --file="/tmp/${BACKUP_FILENAME}"

# Gzip and push to secure AWS S3 / Cloudflare R2 bucket with KMS encryption
aws s3 cp "/tmp/${BACKUP_FILENAME}" "s3://kvtours-db-backups-secure/daily/${BACKUP_FILENAME}" \
  --sse aws:kms \
  --sse-kms-key-id "alias/kvtours-backup-key"
```

### Tier 3: Pre-Deployment Migration Snapshots
- Before every production schema migration (`alembic upgrade head`), the deployment pipeline triggers an automated logical snapshot tagged with the migration hash:
```bash
# Pre-migration safety snapshot
PRE_MIG_NAME="pre_migration_$(alembic current | tr -d ' ')"
pg_dump "$DATABASE_URL" --format=custom --file="/backups/${PRE_MIG_NAME}.dump"
```

---

## 3. Retention & Lifecycle Policy

| Backup Type | Frequency | Retention Window | Storage Tier | Encryption |
| :--- | :--- | :--- | :--- | :--- |
| **PITR WAL Streams** | Real-time | 7–14 Days | Supabase Hot Storage | AES-256 |
| **Nightly Snapshots** | Daily (02:00 IST) | 30 Days | AWS S3 Standard / R2 | AWS KMS SSE |
| **Weekly Snapshots** | Every Sunday | 90 Days | S3 Infrequent Access | AWS KMS SSE |
| **Monthly Snapshots** | 1st of every month | 365 Days (1 Year) | S3 Glacier Flexible | AWS KMS SSE |
| **Financial Audit Archives**| End of Fiscal Year | 7 Years (statutory) | S3 Glacier Deep Archive | AWS KMS SSE |

---

## 4. Point-In-Time Recovery (PITR) Execution Procedure

When a catastrophic corruption, fatal human error, or data anomaly occurs (e.g., unintended bulk deletion):

1. **Halt Incoming Writes Immediately**:
   - Put Next.js frontend into maintenance mode:
     ```bash
     vercel env add NEXT_PUBLIC_MAINTENANCE_MODE true
     ```
   - Scale Render backend instances to 0 to prevent state divergence:
     ```bash
     render services suspend <service-id>
     ```
2. **Determine Exact Target Recovery Timestamp**:
   - Query the `audit_logs` table or application logs to pinpoint the exact UTC timestamp 1 minute prior to the incident:
     ```sql
     SELECT timestamp, action, entity_type, user_id FROM audit_logs
     ORDER BY timestamp DESC LIMIT 20;
     ```
3. **Trigger Restore in Supabase**:
   - Navigate to **Project Settings** -> **Database** -> **Backups** -> **Point in Time**.
   - Select the target timestamp (e.g., `2026-10-09 14:15:00 UTC`).
   - Launch recovery to a new branch/instance or restore in-place.
4. **Run Verification Queries**:
   - Confirm booking counts, payment ledger totals, and user counts match expectations before routing traffic.
5. **Re-attach Connection String & Re-activate Traffic**:
   - Update `DATABASE_URL` if a new instance was provisioned.
   - Resume Render backend service and lift Vercel maintenance mode.

---

## 5. Logical Restoration Procedure (`pg_restore`)

To restore from a nightly `.dump` file to a fresh PostgreSQL instance:

```bash
# 1. Terminate active client connections on target database
psql "$DATABASE_URL" -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = 'postgres' AND pid <> pg_backend_pid();
"

# 2. Run pg_restore with single-transaction guarantee
pg_restore \
  --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --verbose \
  /backups/kvtours_db_20261009_020000.dump

# 3. Verify Alembic schema migration version
alembic current
# Output must match head revision: 20261008_0003 (head)
```

---

## 6. Scheduled Restore Testing (Disaster Drill)

To avoid discovering backup corruption during a live crisis:
- **Bi-Monthly Automated Drill**: On the 1st and 15th of every month, an automated CI runner spins up an ephemeral Docker PostgreSQL container, downloads the latest nightly S3 dump, executes `pg_restore`, and runs the read-only test suite:
  ```bash
  python -m pytest tests/test_database_integrity.py
  ```
- Any restore failure immediately pages engineering via PagerDuty / Sentry alerting.
