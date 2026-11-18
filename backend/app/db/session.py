"""PostgreSQL engine and request-scoped SQLAlchemy session dependency."""

import logging
import time
from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import DBAPIError, OperationalError
from sqlalchemy.pool import QueuePool
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def get_engine():
    """Create a lazily initialized database engine from configured settings."""
    settings = get_settings()
    is_sqlite = "sqlite" in settings.database_url.lower()

    if is_sqlite:
        engine = create_engine(
            settings.database_url,
            poolclass=QueuePool,
            pool_size=settings.db_pool_size or 20,
            max_overflow=settings.db_max_overflow or 30,
            pool_timeout=30,
            pool_pre_ping=True,
            connect_args={"check_same_thread": False, "timeout": 30.0},
        )

        @event.listens_for(engine, "connect")
        def configure_sqlite_connection(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA busy_timeout=30000;")
            cursor.execute("PRAGMA cache_size=-64000;")
            cursor.execute("PRAGMA temp_store=MEMORY;")
            cursor.close()

        return engine

    # Production-grade PostgreSQL pooling configuration with Neon Free compute-suspension resilience
    connect_args: dict[str, object] = {
        "connect_timeout": 15,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }
    if "-pooler" in settings.database_url:
        connect_args["prepare_threshold"] = None

    return create_engine(
        settings.database_url,
        pool_pre_ping=True,  # Discards stale connections when Neon compute suspends
        pool_size=settings.db_pool_size or 10,
        max_overflow=settings.db_max_overflow or 20,
        pool_timeout=30,  # Allow up to 30s for suspended Neon compute to resume
        pool_recycle=240,  # Recycle every 4 mins (strictly under Neon's 5-minute inactivity suspension)
        connect_args=connect_args,
    )


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    """Return a reusable session factory without opening a database connection."""
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db_session() -> Generator[Session, None, None]:
    """Yield a request-scoped session and always close it afterward.

    Includes graceful resilience for Neon Free compute resumption if connection drops.
    """
    factory = get_session_factory()
    session = None
    try:
        session = factory()
        yield session
    except (OperationalError, DBAPIError) as exc:
        if session:
            try:
                session.close()
            except Exception:
                pass
        logger.warning("Database connection dropped or resuming from sleep (%s). Re-attempting checkout...", exc)
        time.sleep(1.2)  # Give Neon compute 1.2s to resume
        session = factory()
        yield session
    finally:
        if session:
            try:
                session.close()
            except Exception:
                pass


def check_db_health() -> bool:
    """Fast non-blocking database ping for readiness and wake-up verification."""
    try:
        factory = get_session_factory()
        with factory() as session:
            session.execute(text("SELECT 1"))
            return True
    except Exception as exc:
        logger.warning("Database health check ping failed: %s", exc)
        return False
