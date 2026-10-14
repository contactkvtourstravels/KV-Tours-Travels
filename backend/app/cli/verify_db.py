"""Database connection verification utility."""

import sys

from sqlalchemy import text

from app.db.session import get_engine


def check_connection() -> bool:
    """Attempt connecting to the configured database and query database info."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            if engine.dialect.name == "sqlite":
                res = conn.execute(text("SELECT sqlite_version();")).fetchone()
                version = res[0] if res else "unknown"
                print("[OK] Successfully connected to SQLite database!")
                print("     Type:    SQLite")
                print(f"     Version: {version}")
                print(f"     Target:  {engine.url}")
            else:
                result = conn.execute(
                    text("SELECT current_database(), current_user, version();")
                ).fetchone()
                if result:
                    print("[OK] Successfully connected to PostgreSQL!")
                    print(f"     Database: {result[0]}")
                    print(f"     User:     {result[1]}")
                    print(f"     Version:  {result[2].split(',')[0]}")
            return True
    except Exception as exc:  # noqa: BLE001
        print(f"[ERROR] Database connection failed: {exc}", file=sys.stderr)
        return False


if __name__ == "__main__":
    if not check_connection():
        sys.exit(1)
