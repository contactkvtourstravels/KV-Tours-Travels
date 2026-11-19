#!/usr/bin/env python3
"""
travel-agency-monitor: Production-grade Render keep-alive and Discord monitoring script.

- Pings Render backend /health endpoint every 10 minutes.
- Measures response time in milliseconds.
- Persists state across runs to prevent notification spam.
- Sends FAILURE notifications on downtime.
- Sends RECOVERY notifications only after a prior failure.
- Sends SUCCESS notifications on manual verification runs (workflow_dispatch).
- Masks secrets from stdout to prevent log leakage.
"""

from __future__ import annotations

import json
import os
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Default configuration
DEFAULT_TIMEOUT_SECONDS = 35.0
DEFAULT_STATE_FILE = ".monitor-state/state.json"
SERVICE_NAME = "travel-agency-backend"

# Discord Embed Color Constants (Decimal)
COLOR_SUCCESS = 5763719   # #57F287 (Bright Green)
COLOR_FAILURE = 15548997  # #ED4245 (Red)
COLOR_RECOVERY = 16705372 # #FEE75C (Yellow/Gold)


def mask_secret(value: str | None, visible_chars: int = 6) -> str:
    """Mask secret tokens in logs to prevent exposure."""
    if not value:
        return "[NOT SET]"
    if len(value) <= visible_chars * 2:
        return "***"
    return f"{value[:visible_chars]}...{value[-visible_chars:]}"


def mask_url_token(url: str | None) -> str:
    """Mask token portion of webhook URLs."""
    if not url:
        return "[NOT SET]"
    parsed = urllib.parse.urlparse(url)
    if "discord.com" in parsed.netloc:
        parts = parsed.path.strip("/").split("/")
        if len(parts) >= 3:
            # Format: /api/webhooks/<id>/<token>
            parts[-1] = "***"
            masked_path = "/" + "/".join(parts)
            return urllib.parse.urlunparse(parsed._replace(path=masked_path))
    return f"{url[:15]}...***"


def load_previous_state(state_file_path: Path) -> dict[str, Any]:
    """Load persistent health state from the state file."""
    if state_file_path.is_file():
        try:
            with open(state_file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as exc:
            print(f"[WARN] Failed to read state file at {state_file_path}: {exc}")
    return {
        "status": "unknown",
        "consecutive_failures": 0,
        "last_check_timestamp": None,
        "last_failure_timestamp": None,
        "last_recovery_timestamp": None,
        "last_status_code": None,
        "last_response_time_ms": None,
    }


def save_state(state_file_path: Path, state: dict[str, Any]) -> None:
    """Save persistent health state to disk for cache restoration."""
    try:
        state_file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(state_file_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        print(f"[INFO] Successfully saved state to {state_file_path}")
    except Exception as exc:
        print(f"[ERROR] Failed to save state file: {exc}")


def format_duration(seconds: float) -> str:
    """Format duration in seconds into human-readable string."""
    seconds = max(0, int(seconds))
    mins, secs = divmod(seconds, 60)
    hours, mins = divmod(mins, 60)
    days, hours = divmod(hours, 24)

    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if mins > 0:
        parts.append(f"{mins}m")
    parts.append(f"{secs}s")
    return " ".join(parts)


def send_discord_notification(webhook_url: str | None, embed: dict[str, Any]) -> bool:
    """Send well-formatted embed notification to Discord webhook."""
    if not webhook_url or not webhook_url.startswith("https://discord.com/api/webhooks/"):
        print(f"[WARN] Invalid or unset DISCORD_WEBHOOK ({mask_url_token(webhook_url)}). Notification skipped.")
        return False

    payload = {
        "username": "KV Tours Render Monitor",
        "avatar_url": "https://kv-tours-travels.vercel.app/logo.png",
        "embeds": [embed],
    }

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "KV-Render-Monitor/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            if resp.status in (200, 204):
                print("[INFO] Discord notification delivered successfully.")
                return True
            print(f"[WARN] Discord webhook returned unexpected status {resp.status}")
            return False
    except urllib.error.HTTPError as exc:
        print(f"[ERROR] Discord webhook HTTP error: {exc.code} - {exc.reason}")
        return False
    except Exception as exc:
        print(f"[ERROR] Discord webhook connection failed: {exc}")
        return False


def probe_health(
    url: str,
    timeout_seconds: float,
    monitor_secret: str | None = None,
) -> tuple[bool, int | None, float, str | None, dict[str, Any] | None]:
    """
    Probe the backend health endpoint.
    Returns: (is_healthy, status_code, elapsed_ms, error_message, response_json)
    """
    headers = {
        "Accept": "application/json",
        "User-Agent": "KV-Render-Monitor/1.0 (Automated Keep-Alive)",
    }
    if monitor_secret:
        headers["X-Monitor-Secret"] = monitor_secret

    req = urllib.request.Request(url, headers=headers, method="GET")
    start_time = time.perf_counter()

    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            status_code = resp.status
            content = resp.read().decode("utf-8")

            try:
                body = json.loads(content)
            except Exception:
                body = {"raw": content[:200]}

            # Operational condition: HTTP 200 and status == "ok"
            is_ok = (status_code == 200) and (
                isinstance(body, dict) and body.get("status") in ("ok", "ready")
            )
            return is_ok, status_code, elapsed_ms, None, body

    except urllib.error.HTTPError as exc:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        err_msg = f"HTTP {exc.code} {exc.reason}"
        return False, exc.code, elapsed_ms, err_msg, None

    except (TimeoutError, socket.timeout) as exc:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return False, None, elapsed_ms, f"Connection Timeout (>{timeout_seconds}s)", None

    except urllib.error.URLError as exc:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        reason = str(exc.reason).lower()
        if "timed out" in reason or "timeout" in reason:
            err_msg = f"Connection Timeout (>{timeout_seconds}s)"
        elif "connection refused" in reason or "10061" in reason or "actively refused" in reason:
            err_msg = "Connection Refused (Container Down)"
        elif "name or service not known" in reason or "getaddrinfo failed" in reason:
            err_msg = "DNS Resolution Failed (Host Not Found)"
        else:
            err_msg = f"Network Error: {exc.reason}"
        return False, None, elapsed_ms, err_msg, None

    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        msg = str(exc)
        if "timed out" in msg.lower() or "timeout" in msg.lower():
            return False, None, elapsed_ms, f"Connection Timeout (>{timeout_seconds}s)", None
        return False, None, elapsed_ms, f"Unexpected Error: {msg}", None


def run_monitor() -> int:
    """Main monitor execution loop."""
    print("=" * 65)
    print("  KV Tours & Travels - Render Keep-Alive & Discord Monitor")
    print("=" * 65)

    # 1. Resolve environment variables
    health_url = os.getenv("RENDER_HEALTH_URL")
    if not health_url:
        health_url = "https://travel-agency-kdrs.onrender.com/health"
        print(f"[INFO] RENDER_HEALTH_URL not provided in env, using fallback: {health_url}")
    else:
        print(f"[INFO] Probing target: {health_url}")

    discord_webhook = os.getenv("DISCORD_WEBHOOK")
    monitor_secret = os.getenv("MONITOR_SECRET")
    is_manual = os.getenv("IS_MANUAL_TRIGGER", "false").lower() in ("true", "1", "yes")
    state_file = Path(os.getenv("STATE_FILE_PATH", DEFAULT_STATE_FILE))

    try:
        timeout_sec = float(os.getenv("TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS))
    except ValueError:
        timeout_sec = DEFAULT_TIMEOUT_SECONDS

    print(f"[INFO] Configuration: Timeout={timeout_sec}s | Manual={is_manual}")
    print(f"[INFO] Webhook: {mask_url_token(discord_webhook)}")
    if monitor_secret:
        print(f"[INFO] Auth Header: X-Monitor-Secret ({mask_secret(monitor_secret)})")

    # 2. Load previous state
    prev_state = load_previous_state(state_file)
    prev_status = prev_state.get("status", "unknown")
    now_iso = datetime.now(timezone.utc).isoformat()

    print(f"[INFO] Previous recorded state: {prev_status.upper()}")

    # 3. Probe Render backend
    is_healthy, status_code, elapsed_ms, error_msg, response_body = probe_health(
        url=health_url,
        timeout_seconds=timeout_sec,
        monitor_secret=monitor_secret,
    )

    print(f"[INFO] Probe result: Healthy={is_healthy} | Code={status_code} | Elapsed={elapsed_ms}ms")
    if error_msg:
        print(f"[WARN] Error details: {error_msg}")

    # 4. State transition and Discord notifications
    new_state = dict(prev_state)
    new_state["last_check_timestamp"] = now_iso
    new_state["last_status_code"] = status_code
    new_state["last_response_time_ms"] = elapsed_ms

    exit_code = 0

    if is_healthy:
        # Case A: Backend is Healthy
        new_state["status"] = "healthy"
        new_state["consecutive_failures"] = 0

        if prev_status == "unhealthy":
            # RECOVERY: Prior run failed, now back online!
            print("[ALERT] Backend has RECOVERED from previous failure!")
            failure_time_iso = prev_state.get("last_failure_timestamp")
            downtime_text = "Unknown"
            if failure_time_iso:
                try:
                    fail_dt = datetime.fromisoformat(failure_time_iso)
                    down_sec = (datetime.now(timezone.utc) - fail_dt).total_seconds()
                    downtime_text = format_duration(down_sec)
                except Exception:
                    pass

            embed = {
                "title": "🟡 Travel Agency Backend Recovered",
                "description": "Render backend has successfully resumed responding to health checks.",
                "color": COLOR_RECOVERY,
                "fields": [
                    {"name": "HTTP Status", "value": f"`{status_code} OK`", "inline": True},
                    {"name": "Response Time", "value": f"`{elapsed_ms}ms`", "inline": True},
                    {"name": "Downtime Duration", "value": f"`{downtime_text}`", "inline": True},
                    {"name": "Service", "value": f"`{SERVICE_NAME}`", "inline": True},
                    {"name": "Recovery Timestamp", "value": f"<t:{int(time.time())}:F>", "inline": False},
                ],
                "footer": {"text": "KV Tours DevOps Keep-Alive • Automated Recovery"},
                "timestamp": now_iso,
            }
            send_discord_notification(discord_webhook, embed)
            new_state["last_recovery_timestamp"] = now_iso

        elif is_manual:
            # Manual execution test confirmation
            print("[INFO] Manual trigger: sending Discord test confirmation.")
            embed = {
                "title": "🟢 Travel Agency Backend Online",
                "description": "Manual keep-alive check completed successfully. Backend is operational.",
                "color": COLOR_SUCCESS,
                "fields": [
                    {"name": "HTTP Status", "value": f"`{status_code} OK`", "inline": True},
                    {"name": "Response Time", "value": f"`{elapsed_ms}ms`", "inline": True},
                    {"name": "Service", "value": f"`{SERVICE_NAME}`", "inline": True},
                    {"name": "Timestamp", "value": f"<t:{int(time.time())}:F>", "inline": False},
                ],
                "footer": {"text": "KV Tours DevOps Keep-Alive • Manual Verification"},
                "timestamp": now_iso,
            }
            send_discord_notification(discord_webhook, embed)

        else:
            # Routine 10-minute pass: silent keep-alive, no notification spam
            print("[INFO] Routine keep-alive check passed. Notification suppressed to prevent channel spam.")

    else:
        # Case B: Backend is Unhealthy
        exit_code = 1
        failures = int(prev_state.get("consecutive_failures", 0)) + 1
        new_state["status"] = "unhealthy"
        new_state["consecutive_failures"] = failures

        if prev_status != "unhealthy":
            # FIRST FAILURE: Transition from healthy -> unhealthy
            print(f"[ALERT] Backend transition to OFFLINE detected! Sending Discord failure notification.")
            new_state["last_failure_timestamp"] = now_iso

            embed = {
                "title": "🔴 Travel Agency Backend Offline",
                "description": "Render backend failed health probe. The cloud container may have spun down or encountered an error.",
                "color": COLOR_FAILURE,
                "fields": [
                    {"name": "Error Type", "value": f"`{error_msg or 'Unresponsive'}`", "inline": True},
                    {"name": "HTTP Status", "value": f"`{status_code if status_code else 'N/A'}`", "inline": True},
                    {"name": "Elapsed Time", "value": f"`{elapsed_ms}ms`", "inline": True},
                    {"name": "Target URL", "value": f"`{health_url}`", "inline": False},
                    {"name": "Timestamp", "value": f"<t:{int(time.time())}:F>", "inline": False},
                ],
                "footer": {"text": "KV Tours DevOps Keep-Alive • Outage Detected"},
                "timestamp": now_iso,
            }
            send_discord_notification(discord_webhook, embed)

        else:
            # Already alerted on previous run: suppress spam
            print(f"[WARN] Backend remains OFFLINE (consecutive failure #{failures}). Discord alert already sent.")

    # 5. Persist updated state
    save_state(state_file, new_state)

    print("=" * 65)
    print(f"  Monitoring run complete. Exit code: {exit_code}")
    print("=" * 65)
    return exit_code


if __name__ == "__main__":
    sys.exit(run_monitor())
