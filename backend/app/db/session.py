"""PostgreSQL engine and request-scoped SQLAlchemy session dependency."""

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


@lru_cache
def get_engine():
    """Create a lazily initialized database engine from configured settings."""
    settings = get_settings()
    is_sqlite = "sqlite" in settings.database_url.lower()

    if is_sqlite:
        return create_engine(
            settings.database_url,
            connect_args={"check_same_thread": False},
        )

    # Production-grade PostgreSQL pooling configuration
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=30,
        pool_recycle=1800,  # Recycle connection every 30 minutes to mitigate cloud firewall drops
    )


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    """Return a reusable session factory without opening a database connection."""
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db_session() -> Generator[Session, None, None]:
    """Yield a request-scoped session and always close it afterward."""
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
