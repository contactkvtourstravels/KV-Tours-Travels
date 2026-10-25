"""PostgreSQL engine and request-scoped SQLAlchemy session dependency."""

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine, event
from sqlalchemy.pool import QueuePool
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


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

    # Production-grade PostgreSQL pooling configuration
    connect_args: dict[str, object] = {}
    if "-pooler" in settings.database_url:
        connect_args["prepare_threshold"] = None

    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=30,
        pool_recycle=1800,  # Recycle connection every 30 minutes to mitigate cloud firewall drops
        connect_args=connect_args,
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
