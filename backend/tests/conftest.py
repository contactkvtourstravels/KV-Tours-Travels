"""Pytest fixtures for domain model and database migration testing."""

import os
from collections.abc import Generator

import psycopg
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

# Default 32-byte test encryption key for payment credentials test suite
os.environ.setdefault(
    "PAYMENT_CREDENTIALS_ENCRYPTION_KEY", "J9YPeXNbJsGUgnXdamb4pyRiFrZYFxd0EKalxJ5kVAU="
)

import app.models  # noqa: F401 — ensure all domain models are registered
from app.core.config import get_settings
from app.db.base import Base


def is_postgres_available() -> bool:
    """Check if PostgreSQL server is listening and accepts configured credentials."""
    try:
        url = get_settings().database_url
        if "postgresql" not in url:
            return False
        raw_url = url.replace("postgresql+psycopg://", "postgresql://")
        with psycopg.connect(raw_url, connect_timeout=1):
            return True
    except (psycopg.Error, OSError):
        return False


@pytest.fixture(scope="session")
def sqlite_engine():
    """Create an in-memory SQLite engine configured with foreign key enforcement."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(sqlite_engine) -> Generator[Session, None, None]:
    """Yield a transactional session with automatic rollback per test using savepoints."""
    connection = sqlite_engine.connect()
    transaction = connection.begin()
    session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
        autoflush=False,
        expire_on_commit=False,
    )

    yield session

    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()


@pytest.fixture(autouse=True)
def reset_auth_state():
    """Reset rate limiter, dev token storage, and Razorpay client singleton before and after each test."""
    from app.core.rate_limit import clear_all_rate_limiters
    from app.services.auth_service import clear_dev_reset_tokens
    from app.services.razorpay_client import reset_razorpay_client

    clear_all_rate_limiters()
    clear_dev_reset_tokens()
    reset_razorpay_client()
    yield
    clear_all_rate_limiters()
    clear_dev_reset_tokens()
    reset_razorpay_client()


@pytest.fixture
def client(db_session: Session):
    """Provide a FastAPI TestClient wired to the test SQLite database session."""
    from fastapi.testclient import TestClient

    from app.db.session import get_db_session
    from app.main import app

    def _override_db_session():
        yield db_session

    app.dependency_overrides[get_db_session] = _override_db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def pg_available() -> bool:
    """Return whether live PostgreSQL is accessible for test execution."""
    return is_postgres_available()
