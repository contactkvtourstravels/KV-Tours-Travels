"""Background worker and scheduled operations for KV Tours & Travels.

Supports standalone execution for:
- 30-minute hold expiry sweep (releases abandoned reservations)
- Daily trip reminders (7-day and 1-day departure reminders)
- Long-running async daemon mode

Usage:
    python -m app.worker sweep-holds
    python -m app.worker send-reminders
    python -m app.worker run-scheduler
"""

import argparse
import asyncio
import logging
from datetime import datetime, timezone

from app.core.logging import configure_logging
from app.db.session import get_session_factory
from app.services.customer_portal_service import get_customer_portal_service
from app.services.payment_service import PaymentService

configure_logging()
logger = logging.getLogger("kvtours.worker")


def sweep_expired_holds() -> int:
    """Scan database and atomically release abandoned payment holds older than 30 minutes."""
    logger.info("Executing hold expiration sweep...")
    session_factory = get_session_factory()
    with session_factory() as db:
        try:
            summary = PaymentService.expire_abandoned_payment_holds(db=db)
            logger.info(
                "Hold expiration completed: %d bookings expired, %d seats released.",
                summary.expired_count,
                summary.released_seats,
            )
            return summary.expired_count
        except Exception as exc:
            logger.error("Failed to execute hold expiration sweep: %s", exc)
            raise


def send_trip_reminders() -> tuple[int, int]:
    """Dispatch idempotent 7-day and 1-day trip reminders to confirmed travellers."""
    logger.info("Dispatching scheduled departure reminders...")
    portal_service = get_customer_portal_service()
    session_factory = get_session_factory()

    with session_factory() as db:
        try:
            # 7-day reminder
            count_7d = portal_service.dispatch_trip_reminders(
                db=db, target_days_ahead=7
            )
            # 1-day reminder
            count_1d = portal_service.dispatch_trip_reminders(
                db=db, target_days_ahead=1
            )

            logger.info(
                "Trip reminders completed: %d (7-day) and %d (1-day) notifications sent.",
                count_7d,
                count_1d,
            )
            return count_7d, count_1d
        except Exception as exc:
            logger.error("Failed to dispatch trip reminders: %s", exc)
            raise


async def run_scheduler_daemon() -> None:
    """Continuous background scheduler daemon suitable for container or worker processes."""
    logger.info("Starting KV Tours & Travels background scheduler daemon...")
    hold_sweep_interval_seconds = 60 * 15  # Every 15 minutes
    last_reminder_date = None

    while True:
        try:
            # 1. Sweep expired holds
            sweep_expired_holds()

            # 2. Check if daily reminders should run (around 09:00 UTC / 14:30 IST)
            today_utc = datetime.now(timezone.utc).date()
            current_hour = datetime.now(timezone.utc).hour

            if current_hour >= 4 and last_reminder_date != today_utc:
                send_trip_reminders()
                last_reminder_date = today_utc

        except Exception as exc:  # noqa: BLE001
            logger.error("Error during scheduled worker cycle: %s", exc)

        await asyncio.sleep(hold_sweep_interval_seconds)


def main() -> None:
    """CLI entrypoint for worker commands."""
    parser = argparse.ArgumentParser(
        description="KV Tours & Travels Production Background Worker"
    )
    parser.add_argument(
        "action",
        choices=["sweep-holds", "send-reminders", "run-scheduler"],
        help="Scheduled action to execute",
    )

    args = parser.parse_args()

    if args.action == "sweep-holds":
        sweep_expired_holds()
    elif args.action == "send-reminders":
        send_trip_reminders()
    elif args.action == "run-scheduler":
        asyncio.run(run_scheduler_daemon())


if __name__ == "__main__":
    main()
