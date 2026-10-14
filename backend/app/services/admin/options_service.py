"""Service for retrieving and managing flexible catalog dropdown categories."""

from __future__ import annotations

from sqlalchemy import distinct, select
from sqlalchemy.orm import Session

from app.models.catalog import Activity, Destination, Package
from app.models.content import SiteSetting
from app.schemas.options import CatalogCategoriesResponse

MANAGED_CATEGORIES_SETTING_KEY = "managed_catalog_categories"

DEFAULT_DESTINATION_CATEGORIES = [
    "Hill Station",
    "Beach & Coastal",
    "Cultural & Heritage",
    "Wildlife & Nature",
    "Pilgrimage & Spiritual",
    "Adventure & Trekking",
    "Island & Tropical",
    "Desert & Dunes",
    "Urban & City Break",
    "Ayurveda & Wellness",
]

DEFAULT_DESTINATION_TRAVEL_TYPES = [
    "Family Holidays",
    "Honeymoon & Romance",
    "Solo Exploration",
    "Luxury Escapes",
    "Weekend Getaway",
    "Group Tours",
    "Adventure Expeditions",
]

DEFAULT_PACKAGE_CATEGORIES = [
    "Family Vacation",
    "Honeymoon Specials",
    "Hill Station Getaway",
    "Heritage & Temple Tour",
    "Wildlife & Nature Safari",
    "Adventure & Trekking",
    "Weekend Quick Tour",
    "Luxury Escapes",
    "Group Pilgrimage",
    "Beach & Coastal",
    "Cultural & Heritage",
    "Island & Tropical",
    "Desert & Dunes",
    "Urban & City Break",
    "Ayurveda & Wellness",
]

DEFAULT_PACKAGE_TRAVEL_TYPES = [
    "Private Guided Tour",
    "Small Group Tour",
    "Custom Self-Drive",
    "Luxury Train / Resort",
    "Fixed Departure Group",
    "Bespoke Itinerary",
    "Family Holidays",
    "Honeymoon & Romance",
    "Solo Exploration",
    "Luxury Escapes",
    "Weekend Getaway",
    "Group Tours",
    "Adventure Expeditions",
]

DEFAULT_PACKAGE_DIFFICULTY_LEVELS = [
    "Easy",
    "Easy / Relaxed",
    "Moderate",
    "Challenging",
    "Challenging / Active",
    "All Ages Friendly",
    "Strenuous",
    "Expert",
]

DEFAULT_ACTIVITY_CATEGORIES = [
    "Water Sports",
    "Adventure & Trekking",
    "Sightseeing & Heritage",
    "Cultural & Local Life",
    "Wildlife & Nature",
    "Culinary & Dining",
    "Wellness & Spa",
    "Cruises & Sailing",
    "Photography & Scenic",
]


def _merge_and_deduplicate(
    presets: list[str],
    custom_saved: list[str],
    db_values: list[str | None],
) -> list[str]:
    """Merge presets, persistent custom values, and DB values without duplicates.

    Avoids duplicate category values caused by differences in capitalization
    or unnecessary whitespace while preserving canonical display casing.
    """
    seen: dict[str, str] = {}

    for item in presets:
        cleaned = " ".join(item.strip().split())
        if cleaned:
            seen[cleaned.lower()] = cleaned

    for item in custom_saved:
        cleaned = " ".join(item.strip().split())
        if cleaned and cleaned.lower() not in seen:
            seen[cleaned.lower()] = cleaned

    for item in db_values:
        if not item:
            continue
        cleaned = " ".join(item.strip().split())
        if cleaned and cleaned.lower() not in seen:
            seen[cleaned.lower()] = cleaned

    return sorted(seen.values(), key=lambda s: s.lower())


def get_catalog_categories(db: Session) -> CatalogCategoriesResponse:
    """Retrieve all available categories and options across catalog modules."""
    # Read persistent custom categories from SiteSetting
    setting = db.execute(
        select(SiteSetting).where(SiteSetting.key == MANAGED_CATEGORIES_SETTING_KEY)
    ).scalar_one_or_none()

    custom_data: dict[str, list[str]] = (
        setting.value if (setting and isinstance(setting.value, dict)) else {}
    )

    # Query distinct values from active database tables
    dest_cats_db = list(
        db.scalars(
            select(distinct(Destination.category)).where(
                Destination.category.is_not(None)
            )
        ).all()
    )
    dest_types_db = list(
        db.scalars(
            select(distinct(Destination.travel_type)).where(
                Destination.travel_type.is_not(None)
            )
        ).all()
    )
    pkg_cats_db = list(
        db.scalars(
            select(distinct(Package.category)).where(Package.category.is_not(None))
        ).all()
    )
    pkg_types_db = list(
        db.scalars(
            select(distinct(Package.travel_type)).where(
                Package.travel_type.is_not(None)
            )
        ).all()
    )
    pkg_diff_db = list(
        db.scalars(
            select(distinct(Package.difficulty_level)).where(
                Package.difficulty_level.is_not(None)
            )
        ).all()
    )
    act_cats_db = list(
        db.scalars(
            select(distinct(Activity.category)).where(Activity.category.is_not(None))
        ).all()
    )

    return CatalogCategoriesResponse(
        destination_categories=_merge_and_deduplicate(
            DEFAULT_DESTINATION_CATEGORIES,
            custom_data.get("destination_categories", []),
            dest_cats_db,
        ),
        destination_travel_types=_merge_and_deduplicate(
            DEFAULT_DESTINATION_TRAVEL_TYPES,
            custom_data.get("destination_travel_types", []),
            dest_types_db,
        ),
        package_categories=_merge_and_deduplicate(
            DEFAULT_PACKAGE_CATEGORIES,
            custom_data.get("package_categories", []),
            pkg_cats_db,
        ),
        package_travel_types=_merge_and_deduplicate(
            DEFAULT_PACKAGE_TRAVEL_TYPES,
            custom_data.get("package_travel_types", []),
            pkg_types_db,
        ),
        package_difficulty_levels=_merge_and_deduplicate(
            DEFAULT_PACKAGE_DIFFICULTY_LEVELS,
            custom_data.get("package_difficulty_levels", []),
            pkg_diff_db,
        ),
        activity_categories=_merge_and_deduplicate(
            DEFAULT_ACTIVITY_CATEGORIES,
            custom_data.get("activity_categories", []),
            act_cats_db,
        ),
    )


def add_catalog_category(
    db: Session,
    field: str,
    value: str,
) -> CatalogCategoriesResponse:
    """Register and persist a new reusable custom category option."""
    cleaned = " ".join(value.strip().split())
    if not cleaned:
        return get_catalog_categories(db)

    setting = db.execute(
        select(SiteSetting).where(SiteSetting.key == MANAGED_CATEGORIES_SETTING_KEY)
    ).scalar_one_or_none()

    current_data: dict[str, list[str]] = (
        dict(setting.value) if (setting and isinstance(setting.value, dict)) else {}
    )

    field_list = list(current_data.get(field, []))
    # Deduplicate case-insensitively
    if not any(item.lower() == cleaned.lower() for item in field_list):
        field_list.append(cleaned)
        current_data[field] = field_list

    if setting is None:
        setting = SiteSetting(
            key=MANAGED_CATEGORIES_SETTING_KEY,
            value=current_data,
        )
        db.add(setting)
    else:
        setting.value = current_data

    db.commit()
    return get_catalog_categories(db)
