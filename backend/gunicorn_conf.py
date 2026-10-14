"""Production Gunicorn configuration for FastAPI deployment on Render / Docker."""

import multiprocessing
import os

# Server socket
port = os.getenv("PORT", "8000")
bind = f"0.0.0.0:{port}"

# Worker processes
# Uses WEB_CONCURRENCY environment variable if set, otherwise computes based on CPU cores
web_concurrency = os.getenv("WEB_CONCURRENCY")
if web_concurrency and web_concurrency.isdigit():
    workers = int(web_concurrency)
else:
    workers = max(2, min(4, multiprocessing.cpu_count() * 2))

worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 60
keepalive = 5
graceful_timeout = 30

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info").lower()

# Process naming
proc_name = "kvtours-backend"


def on_starting(server):
    """Log startup information."""
    server.log.info(
        "Starting KV Tours & Travels backend on %s with %d workers", bind, workers
    )


def worker_int(worker):
    """Handle worker interrupt signal."""
    worker.log.info("Worker received SIGINT/SIGQUIT; shutting down gracefully.")
