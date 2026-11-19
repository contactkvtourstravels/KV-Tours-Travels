#!/usr/bin/env python3
"""
Test suite for travel-agency-monitor:
Validates all 7 failure, recovery, timeout, and notification scenarios:
1. Healthy backend (200 OK)
2. Render backend unavailable (Connection Refused)
3. Request timeout simulation
4. HTTP 500 / 502 server error response
5. Backend recovery after prior failure
6. Discord webhook failure handling
7. Manual execution trigger (IS_MANUAL_TRIGGER=true)
"""

import json
import os
import shutil
import socket
import sys
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

# Add script directory to sys.path
sys.path.insert(0, str(Path(__file__).parent))
import monitor


class MockServerHandler(BaseHTTPRequestHandler):
    mode = "healthy"
    delay = 0.0
    received_webhooks = []

    def do_GET(self):
        if self.delay > 0:
            time.sleep(self.delay)

        if self.mode == "healthy":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(
                json.dumps({
                    "status": "ok",
                    "service": "travel-agency-backend",
                    "timestamp": "2026-11-19T14:40:00Z",
                }).encode("utf-8")
            )
        elif self.mode == "server_error":
            self.send_response(502)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Bad Gateway: Container Crashed")
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        # Discord webhook mock
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8")
        try:
            data = json.loads(body)
            MockServerHandler.received_webhooks.append(data)
        except Exception:
            pass

        if self.mode == "webhook_fail":
            self.send_response(500)
            self.end_headers()
        else:
            self.send_response(204)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress server access logs during tests


class TestRenderMonitor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start a local HTTP server on a random port
        cls.server = HTTPServer(("127.0.0.1", 0), MockServerHandler)
        cls.port = cls.server.server_port
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.test_state_dir = Path(".test-monitor-state")
        if self.test_state_dir.exists():
            shutil.rmtree(self.test_state_dir)
        self.test_state_dir.mkdir(parents=True)
        self.state_file = self.test_state_dir / "state.json"

        MockServerHandler.mode = "healthy"
        MockServerHandler.delay = 0.0
        MockServerHandler.received_webhooks = []

        # Configure environment variables
        os.environ["RENDER_HEALTH_URL"] = f"{self.base_url}/health"
        # Dummy URL that passes the mask/prefix validation
        os.environ["DISCORD_WEBHOOK"] = f"https://discord.com/api/webhooks/12345/test-token"
        os.environ["STATE_FILE_PATH"] = str(self.state_file)
        os.environ["TIMEOUT_SECONDS"] = "2"
        os.environ["IS_MANUAL_TRIGGER"] = "false"

    def tearDown(self):
        if self.test_state_dir.exists():
            shutil.rmtree(self.test_state_dir)

    def test_1_healthy_backend(self):
        """Scenario 1: Healthy backend returns 200 OK and status ok."""
        MockServerHandler.mode = "healthy"
        is_healthy, code, elapsed, err, body = monitor.probe_health(
            f"{self.base_url}/health", timeout_seconds=2.0
        )
        self.assertTrue(is_healthy)
        self.assertEqual(code, 200)
        self.assertIsNone(err)
        self.assertEqual(body.get("status"), "ok")
        self.assertGreater(elapsed, 0)

    def test_2_backend_unavailable_connection_refused(self):
        """Scenario 2: Backend server is unavailable / offline."""
        s = socket.socket()
        s.bind(("127.0.0.1", 0))
        unused_port = s.getsockname()[1]
        s.close()

        dead_url = f"http://127.0.0.1:{unused_port}/health"
        is_healthy, code, elapsed, err, body = monitor.probe_health(
            dead_url, timeout_seconds=1.0
        )
        self.assertFalse(is_healthy)
        self.assertTrue(
            "Connection Refused" in str(err)
            or "Timeout" in str(err)
            or "Network Error" in str(err)
            or "actively refused" in str(err).lower()
        )

    def test_3_request_timeout(self):
        """Scenario 3: Backend connection or response times out."""
        MockServerHandler.mode = "healthy"
        MockServerHandler.delay = 0.6  # Server delays response

        is_healthy, code, elapsed, err, body = monitor.probe_health(
            f"{self.base_url}/health", timeout_seconds=0.2  # Probe times out at 0.2s
        )
        self.assertFalse(is_healthy)
        self.assertIn("Timeout", str(err))

    def test_4_http_500_response(self):
        """Scenario 4: Backend returns HTTP 502 / 500 error."""
        MockServerHandler.mode = "server_error"
        is_healthy, code, elapsed, err, body = monitor.probe_health(
            f"{self.base_url}/health", timeout_seconds=2.0
        )
        self.assertFalse(is_healthy)
        self.assertEqual(code, 502)
        self.assertIn("502", str(err))

    def test_5_backend_recovery_after_prior_failure(self):
        """Scenario 5: Backend transitions from unhealthy -> healthy (Recovery alert sent)."""
        # Step 1: Simulate previous failure state
        monitor.save_state(self.state_file, {
            "status": "unhealthy",
            "consecutive_failures": 3,
            "last_failure_timestamp": "2026-11-19T14:00:00+00:00",
        })

        # Step 2: Run monitor with backend now healthy
        MockServerHandler.mode = "healthy"
        exit_code = monitor.run_monitor()

        self.assertEqual(exit_code, 0)
        saved_state = monitor.load_previous_state(self.state_file)
        self.assertEqual(saved_state.get("status"), "healthy")
        self.assertEqual(saved_state.get("consecutive_failures"), 0)
        self.assertIsNotNone(saved_state.get("last_recovery_timestamp"))

    def test_6_discord_webhook_failure_handling(self):
        """Scenario 6: Webhook endpoint failure is caught gracefully without unhandled exceptions."""
        # Point webhook to a bad endpoint
        bad_webhook = f"{self.base_url}/bad-webhook"
        success = monitor.send_discord_notification(bad_webhook, {"title": "Test"})
        # Should return False safely without crashing
        self.assertFalse(success)

    def test_7_manual_github_actions_execution(self):
        """Scenario 7: Manual execution with IS_MANUAL_TRIGGER=true."""
        os.environ["IS_MANUAL_TRIGGER"] = "true"
        MockServerHandler.mode = "healthy"
        exit_code = monitor.run_monitor()

        self.assertEqual(exit_code, 0)
        saved_state = monitor.load_previous_state(self.state_file)
        self.assertEqual(saved_state.get("status"), "healthy")


if __name__ == "__main__":
    unittest.main(verbosity=2)
