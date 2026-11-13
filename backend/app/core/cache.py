"""Thread-safe bounded in-memory cache for public catalog responses with tag-based invalidation."""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

logger = logging.getLogger(__name__)


class CachedItem:
    """Wrapper storing value, expiration timestamp, and associated invalidation tags."""

    __slots__ = ("value", "expires_at", "tags")

    def __init__(self, value: Any, expires_at: float, tags: set[str]):
        self.value = value
        self.expires_at = expires_at
        self.tags = tags


class InMemoryCache:
    """Thread-safe TTL in-memory cache designed for public read-only catalog queries.

    Avoids external infrastructure dependencies like Redis while delivering sub-millisecond
    responses under high concurrent load. Supports instant tag-based invalidation upon admin edits.
    """

    def __init__(self, default_ttl_seconds: int = 60, max_entries: int = 2000):
        self._default_ttl = default_ttl_seconds
        self._max_entries = max_entries
        self._store: dict[str, CachedItem] = {}
        self._lock = threading.RLock()

    def get(self, key: str) -> Any | None:
        """Retrieve unexpired value from cache, or return None if missing or expired."""
        with self._lock:
            item = self._store.get(key)
            if item is None:
                return None
            if time.time() > item.expires_at:
                del self._store[key]
                return None
            return item.value

    def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: int | None = None,
        tags: list[str] | set[str] | None = None,
    ) -> None:
        """Store value with specified TTL and invalidation tags."""
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        expires_at = time.time() + ttl
        tag_set = set(tags or [])

        with self._lock:
            if len(self._store) >= self._max_entries:
                now = time.time()
                expired_keys = [k for k, v in self._store.items() if now > v.expires_at]
                for k in expired_keys:
                    del self._store[k]
                if len(self._store) >= self._max_entries:
                    keys_to_remove = list(self._store.keys())[: max(1, self._max_entries // 10)]
                    for k in keys_to_remove:
                        self._store.pop(k, None)

            self._store[key] = CachedItem(value=value, expires_at=expires_at, tags=tag_set)

    def invalidate(self, tags: list[str] | set[str] | str) -> int:
        """Invalidate all cached items matching any of the specified tags.

        Returns the number of invalidated cache entries.
        """
        if isinstance(tags, str):
            tags = [tags]
        target_tags = set(tags)

        with self._lock:
            keys_to_delete = [
                k for k, item in self._store.items()
                if item.tags.intersection(target_tags)
            ]
            for k in keys_to_delete:
                del self._store[k]

            if keys_to_delete:
                logger.info(
                    "Catalog cache invalidated %d entries for tags: %s",
                    len(keys_to_delete),
                    target_tags,
                )
            return len(keys_to_delete)

    def clear(self) -> None:
        """Flush entire cache."""
        with self._lock:
            self._store.clear()


# Process-wide singleton cache instance for public catalog exploration
catalog_cache = InMemoryCache(default_ttl_seconds=60, max_entries=2000)


def trigger_nextjs_revalidation(tag: str = "catalog") -> None:
    """Asynchronously notify Next.js on Vercel to purge its Edge and Data cache.

    Runs in a non-blocking background daemon thread to ensure database transactions
    complete with zero delay.
    """
    def _ping():
        import urllib.request
        from app.core.config import get_settings
        try:
            settings = get_settings()
            secret = "kv-tours-secret-revalidate-token"
            frontend_base = settings.frontend_url.rstrip("/")
            targets = [f"{frontend_base}/api/revalidate?tag={tag}&secret={secret}"]
            if "kv-tours" not in frontend_base:
                targets.append(
                    f"https://kv-tours-travels.vercel.app/api/revalidate?tag={tag}&secret={secret}"
                )
            for url in targets:
                try:
                    req = urllib.request.Request(url, method="POST")
                    with urllib.request.urlopen(req, timeout=4.0):
                        pass
                except Exception:
                    pass
        except Exception:
            pass

    t = threading.Thread(target=_ping, daemon=True)
    t.start()


def attach_cache_invalidation_listeners() -> None:
    """Attach SQLAlchemy event listeners to automatically invalidate relevant public catalog cache entries."""
    try:
        from sqlalchemy import event
        from app.models.catalog import BestOffer, Destination, Package, PackageDeparture
        from app.models.content import SiteSetting

        @event.listens_for(Destination, "after_insert")
        @event.listens_for(Destination, "after_update")
        @event.listens_for(Destination, "after_delete")
        def _on_destination_mutation(_mapper, _conn, _target):
            catalog_cache.invalidate(["destinations", "packages", "home_feed"])
            trigger_nextjs_revalidation("destinations")

        @event.listens_for(Package, "after_insert")
        @event.listens_for(Package, "after_update")
        @event.listens_for(Package, "after_delete")
        def _on_package_mutation(_mapper, _conn, _target):
            catalog_cache.invalidate(["packages", "destinations", "departures", "offers", "home_feed"])
            trigger_nextjs_revalidation("packages")

        @event.listens_for(PackageDeparture, "after_insert")
        @event.listens_for(PackageDeparture, "after_update")
        @event.listens_for(PackageDeparture, "after_delete")
        def _on_departure_mutation(_mapper, _conn, _target):
            catalog_cache.invalidate(["departures", "packages", "home_feed"])
            trigger_nextjs_revalidation("departures")

        @event.listens_for(BestOffer, "after_insert")
        @event.listens_for(BestOffer, "after_update")
        @event.listens_for(BestOffer, "after_delete")
        def _on_offer_mutation(_mapper, _conn, _target):
            catalog_cache.invalidate(["offers", "home_feed"])
            trigger_nextjs_revalidation("offers")

        @event.listens_for(SiteSetting, "after_insert")
        @event.listens_for(SiteSetting, "after_update")
        @event.listens_for(SiteSetting, "after_delete")
        def _on_setting_mutation(_mapper, _conn, _target):
            catalog_cache.invalidate(["settings", "offers", "home_feed"])
            trigger_nextjs_revalidation("settings")

        logger.info("Catalog cache auto-invalidation event listeners attached successfully.")
    except Exception as e:
        logger.warning("Could not attach SQLAlchemy cache listeners: %s", e)


