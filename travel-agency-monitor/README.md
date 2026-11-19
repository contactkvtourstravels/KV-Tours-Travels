# 🚀 Render Keep-Alive & Discord Monitoring System

A production-grade, lightweight, and completely free monitoring and keep-alive system for the **KV Tours & Travels** FastAPI backend hosted on Render Free Tier.

---

## 📋 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Why This System Exists](#-why-this-system-exists)
3. [Repository Structure](#-repository-structure)
4. [Backend Health Endpoint Specifications](#-backend-health-endpoint-specifications)
5. [Setup Instructions](#-setup-instructions)
   - [Step 1: Discord Webhook Creation](#step-1-discord-webhook-creation)
   - [Step 2: GitHub Repository Setup](#step-2-github-repository-setup)
   - [Step 3: Configuring GitHub Secrets](#step-3-configuring-github-secrets)
   - [Step 4: Running Manual Test Verification](#step-4-running-manual-test-verification)
6. [Notification Specifications](#-notification-specifications)
7. [Discord Slash Commands Architecture](#-discord-slash-commands-architecture-ping-status-uptime-help)
8. [Free Tier Constraints & Reliability Realities](#-free-tier-constraints--reliability-realities)
9. [Local Testing Suite](#-local-testing-suite)

---

## 🏗 Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │                   GitHub Actions                      │
 │        Scheduled Cron Trigger (Every 10 mins)          │
 │              or Manual workflow_dispatch               │
 └───────────────────────────┬────────────────────────────┘
                             │
            HTTP GET /health │ (Timeout: 35s, 0 DB queries)
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │           Render Free Tier (FastAPI Web Service)       │
 │   URL: https://travel-agency-kdrs.onrender.com/health  │
 │   - Keeps container awake (resets 15-min idle timer)   │
 │   - Responds HTTP 200 with service name & timestamp    │
 └───────────────────────────┬────────────────────────────┘
                             │
            Inspect Status Code & Latency (ms)
            Compare with Persistent State Cache
                             │
                             ▼
     ┌─────────────────────────────────────────────────┐
     │ Has state changed (e.g. Failure or Recovery)?   │
     └───────┬─────────────────────────────────┬───────┘
             │ YES                             │ NO (Healthy)
             ▼                                 ▼
 ┌─────────────────────────┐       ┌─────────────────────────┐
 │ Send Rich Embed Alert   │       │ Silent Pass             │
 │ to Discord Webhook      │       │ (No alert spam)         │
 └─────────────────────────┘       └─────────────────────────┘
```

---

## 🎯 Why This System Exists

1. **Prevents 15-Minute Inactivity Sleep**: Render free web services spin down after **15 minutes** of no inbound HTTP traffic. This monitor delivers a lightweight HTTP GET probe every **10 minutes**, resetting Render's inactivity countdown.
2. **Alerts DevOps on Outages**: If Render crashes, experiences a deployment issue, or encounters an internal server error (HTTP 500/502/503), you receive an immediate Discord alert.
3. **Automatic Recovery Alerts**: When the backend recovers from a crash, a notification is sent along with the calculated downtime duration.
4. **Zero Database Overhead**: Unlike readiness probes (`/health/ready`), the liveness probe (`/health`) does **not** query Neon PostgreSQL, protecting database connection pools and compute quotas.
5. **No Notification Spam**: Routine success pings every 10 minutes run silently. You only receive Discord notifications when the status changes (Failure or Recovery) or during manual verification runs.

---

## 📁 Repository Structure

```
travel-agency-monitor/
├── .github/
│   └── workflows/
│       └── render-monitor.yml   # Scheduled GitHub Actions workflow (every 10 min)
├── monitor.py                   # Core monitoring logic, state persistence, & Discord dispatcher
├── test_monitor.py              # Automated 7-scenario test suite with mock servers
└── README.md                    # Complete setup, deployment, & architecture guide
```

---

## 🩺 Backend Health Endpoint Specifications

The FastAPI backend exposes a dedicated, lightweight root liveness endpoint:

- **Endpoint**: `GET /health` (also aliased at `GET /api/v1/health`)
- **Database Dependency**: **None** (Zero Neon PostgreSQL queries)
- **Execution Latency**: `< 2ms`
- **Response Status**: `HTTP 200 OK`
- **Response Format**:
```json
{
  "status": "ok",
  "service": "travel-agency-backend",
  "timestamp": "2026-11-19T14:40:00.123456+00:00"
}
```

---

## 🚀 Setup Instructions

### Step 1: Discord Webhook Creation
1. Open your Discord server and navigate to the channel where you want notifications (e.g., `#devops-alerts`).
2. Click the gear icon (**Edit Channel**) next to the channel name.
3. Select **Integrations** from the left sidebar and click **Webhooks** (or **Create Webhook**).
4. Name the webhook `KV Tours Render Monitor` and optionally upload the KV Tours logo (`frontend/public/logo.png`).
5. Click **Copy Webhook URL**. Store it safely.

---

### Step 2: GitHub Repository Setup
You can host this monitoring system in its own dedicated, free GitHub repository:

```bash
# 1. Initialize a new local git repository inside the travel-agency-monitor folder
cd travel-agency-monitor
git init
git add .
git commit -m "feat: initial commit of Render keep-alive and Discord monitor"

# 2. Create a new repository on GitHub named 'travel-agency-monitor' (Public or Private)
# 3. Push your code to GitHub
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/travel-agency-monitor.git
git branch -M main
git push -u origin main
```

---

### Step 3: Configuring GitHub Secrets
Navigate to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:

| Secret Name | Required | Example / Description |
| :--- | :---: | :--- |
| `RENDER_HEALTH_URL` | **Yes** | `https://travel-agency-kdrs.onrender.com/health` |
| `DISCORD_WEBHOOK` | **Yes** | `https://discord.com/api/webhooks/1234567890/abcdef...` |
| `MONITOR_SECRET` | *Optional* | Optional secret passed in `X-Monitor-Secret` header if authentication is enabled |

> 🔒 **Security Notice**: Secrets are automatically masked by GitHub Actions. `monitor.py` further masks the webhook token in all stdout logs (`https://discord.com/api/webhooks/.../***`), ensuring your credentials are never exposed in build artifacts or logs.

---

### Step 4: Running Manual Test Verification
1. Navigate to the **Actions** tab in your GitHub repository.
2. Under **Workflows**, select **Render Backend Keep-Alive & Discord Monitor**.
3. Click the **Run workflow** dropdown button.
4. Leave `Force Discord notification` checked and click **Run workflow**.
5. Within 10–20 seconds, your Discord channel will receive the green **Travel Agency Backend Online** verification embed!

---

## 🔔 Notification Specifications

### 1. Manual Success Verification (🟢 Green: `0x57F287`)
Triggered during manual `workflow_dispatch` testing.
- **Title**: `🟢 Travel Agency Backend Online`
- **Fields**:
  - `HTTP Status`: `200 OK`
  - `Response Time`: e.g. `245ms`
  - `Service`: `travel-agency-backend`
  - `Timestamp`: Full dynamic Discord timestamp (`<t:TIMESTAMP:F>`)

### 2. Outage Detected (🔴 Red: `0xED4245`)
Triggered immediately when the backend transitions from healthy to offline.
- **Title**: `🔴 Travel Agency Backend Offline`
- **Fields**:
  - `Error Type`: `Connection Timeout (>35s)` / `HTTP 502 Bad Gateway` / `Connection Refused`
  - `HTTP Status`: e.g. `502` or `N/A`
  - `Elapsed Time`: e.g. `35012ms`
  - `Target URL`: `https://travel-agency-kdrs.onrender.com/health`
  - `Timestamp`: Full dynamic Discord timestamp

### 3. Backend Recovered (🟡 Yellow/Gold: `0xFEE75C`)
Triggered on the first successful probe following an outage.
- **Title**: `🟡 Travel Agency Backend Recovered`
- **Fields**:
  - `HTTP Status`: `200 OK`
  - `Response Time`: e.g. `312ms`
  - `Downtime Duration`: e.g. `18m 42s` (calculated from persistent state)
  - `Service`: `travel-agency-backend`
  - `Recovery Timestamp`: Full dynamic Discord timestamp

---

## 🤖 Discord Slash Commands Architecture (`/ping`, `/status`, `/uptime`, `/help`)

### Why GitHub Actions CANNOT Receive Live Slash Commands
Discord slash commands require an active HTTPS web service that responds to Discord's Interaction Gateway within **3,000 milliseconds (3 seconds)**. 

GitHub Actions is an asynchronous batch runner. Starting a runner container takes between **15 and 45 seconds**, which exceeds Discord's 3-second deadline by 10x. Therefore, GitHub Actions cannot listen for Discord slash commands.

### The Recommended Zero-Cost Solution: Vercel Serverless Interaction Endpoint
Your project already utilizes **Next.js on Vercel**, which provides free, always-online serverless edge execution with **zero cold starts**.

```
  Discord User types /ping
             │ (Within 50ms)
             ▼
  Discord Interaction Gateway
             │ HTTP POST (Ed25519 signature)
             ▼
  Vercel Edge Route Handler
  (/api/discord/interactions)
             │
      ┌──────┴──────┐
      │             │
  Verify Ed25519   Probe Render /health
  Signature        (Quick 800ms probe)
      │             │
      └──────┬──────┘
             │ HTTP 200 JSON (< 1.5s)
             ▼
  Discord User receives instant status embed
```

#### Advantages of the Vercel Approach:
1. **100% Free**: Operates within Vercel's free 100,000 monthly serverless invocation quota.
2. **Never Sleeps**: Unlike Render, Vercel Serverless Edge routes do not spin down.
3. **No Extra Hosting**: No secondary VPS, Railway, or Fly.io subscription required.

---

## ⚠️ Free Tier Constraints & Reliability Realities

| Service | Free Tier Limitation | Impact on Monitoring |
| :--- | :--- | :--- |
| **Render Free Tier** | Spins down after **15 minutes** of HTTP inactivity. | Probing every 10 minutes keeps Render awake during active days. |
| **Render Instance Hours** | **750 free instance hours/month**. A 31-day month has 744 hours. | If you run more than 1 service on Render Free Tier, instance hours are shared and services suspend when hours expire. |
| **Render Cold Starts** | Waking up a sleeping container takes **35–50 seconds**. | Probes use a 35-second timeout. If Render was asleep, the first probe may report a long response time while spinning up. |
| **GitHub Actions Free Quotas** | **2,000 free minutes/month** on private repositories. | A 10-minute cron runs ~4,320 times/month (~1,500 min). Running this workflow in a **Public repository** provides **unlimited free minutes**. |
| **GitHub Cron Delays** | Scheduled workflows run on shared runners and can be delayed by **10–30 minutes** during peak hours. | Periodic pings keep services warm most of the time, but **do not guarantee 100.00% uptime**. |

---

## 🧪 Local Testing Suite

The repository includes a standalone test suite with a local HTTP mock server that tests all 7 edge cases:

```bash
# Run the test suite
python test_monitor.py
```

### Test Coverage Checklist:
- [x] **Scenario 1: Healthy Backend Probe** — Verifies HTTP 200 response and JSON validation.
- [x] **Scenario 2: Backend Offline Probe** — Simulates offline/unreachable ports and asserts graceful error detection.
- [x] **Scenario 3: Request Timeout Probe** — Simulates delayed backend responses and asserts timeout detection.
- [x] **Scenario 4: HTTP 500/502 Error Probe** — Simulates bad gateway/server crashes.
- [x] **Scenario 5: Outage Recovery Transition** — Verifies that a recovery notification is sent and downtime is calculated.
- [x] **Scenario 6: Discord Webhook Failure Safety** — Confirms that webhook delivery errors do not crash the monitoring probe.
- [x] **Scenario 7: Manual Trigger Mode** — Confirms manual runs dispatch test verifications.
