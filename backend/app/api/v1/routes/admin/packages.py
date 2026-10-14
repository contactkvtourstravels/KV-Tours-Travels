"""Administrative travel package management routes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.core.csrf import verify_csrf_token
from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_MANAGER,
    ROLE_STAFF,
    ROLE_SUPER_ADMIN,
)
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.admin import (
    PackageActivityBindRequest,
    PackageActivityResponse,
    PackageCreateRequest,
    PackageDayAddActivityRequest,
    PackageDayCreateRequest,
    PackageDayReorderRequest,
    PackageDayResponse,
    PackageDayUpdateRequest,
    PackageDepartureCreateRequest,
    PackageDepartureResponse,
    PackageHotelBindRequest,
    PackageHotelResponse,
    PackageImageCreateRequest,
    PackageImageResponse,
    PackageImageUpdateRequest,
    PackageResponse,
    PackageUpdateRequest,
    PaginatedResponse,
)
from app.services.admin.package_service import (
    create_package,
    delete_package,
    get_package_by_id,
    list_packages,
    update_package,
)

router = APIRouter(prefix="/packages", tags=["admin-packages"])

DbSession = Annotated[Session, Depends(get_db_session)]
StaffOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_STAFF, ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]
ManagerOrAbove = Annotated[
    User,
    Depends(require_role(ROLE_MANAGER, ROLE_ADMIN, ROLE_SUPER_ADMIN)),
]


def _extract_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("", response_model=PaginatedResponse[PackageResponse])
def get_packages(
    _admin: StaffOrAbove,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query()] = None,
    destination_id: Annotated[UUID | None, Query()] = None,
    is_published: Annotated[bool | None, Query()] = None,
    is_featured: Annotated[bool | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> PaginatedResponse[PackageResponse]:
    """Query packages with pagination, destination/status filtering, and search."""
    return list_packages(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        destination_id=destination_id,
        is_published=is_published,
        is_featured=is_featured,
        is_active=is_active,
    )


@router.post("", response_model=PackageResponse, status_code=201)
def create_new_package(
    payload: PackageCreateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageResponse:
    """Create a new travel package. Accessible to manager and above. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return create_package(
        db=db,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.get("/{package_id}", response_model=PackageResponse)
def get_package(
    package_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> PackageResponse:
    """Retrieve detailed package information."""
    return get_package_by_id(db=db, package_id=package_id)


@router.patch("/{package_id}", response_model=PackageResponse)
@router.put("/{package_id}", response_model=PackageResponse)
def update_existing_package(
    package_id: UUID,
    payload: PackageUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageResponse:
    """Update package attributes. Accessible to manager and above. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_package(
        db=db,
        package_id=package_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete("/{package_id}", response_model=PackageResponse)
def deactivate_package(
    package_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageResponse:
    """Safe soft-deletion/deactivation of a package. Accessible to manager and above. CSRF protected."""
    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return delete_package(
        db=db,
        package_id=package_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


# ==============================================================================
# Package Images
# ==============================================================================


@router.get("/{package_id}/images", response_model=list[PackageImageResponse])
def get_images(
    package_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> list[PackageImageResponse]:
    """List images for a package."""
    from app.services.admin.package_image_service import list_package_images

    return list_package_images(db=db, package_id=package_id)


@router.post(
    "/{package_id}/images",
    response_model=PackageImageResponse,
    status_code=201,
)
def add_image(
    package_id: UUID,
    payload: PackageImageCreateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageImageResponse:
    """Add a gallery or hero image to a package. CSRF protected."""
    from app.services.admin.package_image_service import add_package_image

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return add_package_image(
        db=db,
        package_id=package_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.patch(
    "/{package_id}/images/{image_id}",
    response_model=PackageImageResponse,
)
def update_image(
    package_id: UUID,
    image_id: UUID,
    payload: PackageImageUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageImageResponse:
    """Update metadata or hero status of a package image. CSRF protected."""
    from app.services.admin.package_image_service import update_package_image

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_package_image(
        db=db,
        package_id=package_id,
        image_id=image_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete(
    "/{package_id}/images/{image_id}",
    status_code=204,
)
def delete_image(
    package_id: UUID,
    image_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> None:
    """Remove an image from a package. CSRF protected."""
    from app.services.admin.package_image_service import delete_package_image

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    delete_package_image(
        db=db,
        package_id=package_id,
        image_id=image_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


# ==============================================================================
# Package Itinerary (PackageDay) & Day Activities
# ==============================================================================


@router.get("/{package_id}/itinerary", response_model=list[PackageDayResponse])
def get_itinerary(
    package_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> list[PackageDayResponse]:
    """List itinerary days for a package ordered by day_number."""
    from app.services.admin.itinerary_service import list_package_itinerary

    return list_package_itinerary(db=db, package_id=package_id)


@router.post(
    "/{package_id}/itinerary",
    response_model=PackageDayResponse,
    status_code=201,
)
def create_day(
    package_id: UUID,
    payload: PackageDayCreateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageDayResponse:
    """Create a new itinerary day for a package. Day number must be unique. CSRF protected."""
    from app.services.admin.itinerary_service import create_package_day

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return create_package_day(
        db=db,
        package_id=package_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.get(
    "/{package_id}/itinerary/{day_id}",
    response_model=PackageDayResponse,
)
def get_day(
    package_id: UUID,
    day_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> PackageDayResponse:
    """Get single itinerary day details with assigned activities."""
    from app.services.admin.itinerary_service import get_package_day

    return get_package_day(db=db, package_id=package_id, day_id=day_id)


@router.patch(
    "/{package_id}/itinerary/{day_id}",
    response_model=PackageDayResponse,
)
def update_day(
    package_id: UUID,
    day_id: UUID,
    payload: PackageDayUpdateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageDayResponse:
    """Update an itinerary day. Enforces unique day numbers. CSRF protected."""
    from app.services.admin.itinerary_service import update_package_day

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return update_package_day(
        db=db,
        package_id=package_id,
        day_id=day_id,
        payload=payload,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete(
    "/{package_id}/itinerary/{day_id}",
    status_code=204,
)
def delete_day(
    package_id: UUID,
    day_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> None:
    """Delete an itinerary day. CSRF protected."""
    from app.services.admin.itinerary_service import delete_package_day

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    delete_package_day(
        db=db,
        package_id=package_id,
        day_id=day_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.post(
    "/{package_id}/itinerary/reorder",
    response_model=list[PackageDayResponse],
)
def reorder_itinerary(
    package_id: UUID,
    payload: PackageDayReorderRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> list[PackageDayResponse]:
    """Reorder package itinerary days safely and atomically. CSRF protected."""
    from app.services.admin.itinerary_service import reorder_package_itinerary

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return reorder_package_itinerary(
        db=db,
        package_id=package_id,
        day_ids=payload.day_ids,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.post(
    "/{package_id}/itinerary/{day_id}/activities",
    response_model=PackageDayResponse,
    status_code=201,
)
def add_activity_to_day(
    package_id: UUID,
    day_id: UUID,
    payload: PackageDayAddActivityRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageDayResponse:
    """Attach an activity to a specific itinerary day. CSRF protected."""
    from app.services.admin.itinerary_service import add_day_activity

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return add_day_activity(
        db=db,
        package_id=package_id,
        day_id=day_id,
        activity_id=payload.activity_id,
        sort_order=payload.sort_order,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete(
    "/{package_id}/itinerary/{day_id}/activities/{activity_id}",
    response_model=PackageDayResponse,
)
def remove_activity_from_day(
    package_id: UUID,
    day_id: UUID,
    activity_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageDayResponse:
    """Unlink an activity from an itinerary day. CSRF protected."""
    from app.services.admin.itinerary_service import remove_day_activity

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return remove_day_activity(
        db=db,
        package_id=package_id,
        day_id=day_id,
        activity_id=activity_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


# ==============================================================================
# Package Hotels
# ==============================================================================


@router.get("/{package_id}/hotels", response_model=list[PackageHotelResponse])
def get_package_hotels(
    package_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> list[PackageHotelResponse]:
    """List associated hotels for a package."""
    from app.services.admin.package_relationship_service import list_package_hotels

    return list_package_hotels(db=db, package_id=package_id)


@router.post(
    "/{package_id}/hotels",
    response_model=PackageHotelResponse,
    status_code=201,
)
def link_hotel_to_package(
    package_id: UUID,
    payload: PackageHotelBindRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageHotelResponse:
    """Associate a hotel with a package. CSRF protected."""
    from app.services.admin.package_relationship_service import bind_package_hotel

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return bind_package_hotel(
        db=db,
        package_id=package_id,
        hotel_id=payload.hotel_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete(
    "/{package_id}/hotels/{hotel_id}",
    status_code=204,
)
def unlink_hotel_from_package(
    package_id: UUID,
    hotel_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> None:
    """Disassociate a hotel from a package. CSRF protected."""
    from app.services.admin.package_relationship_service import unbind_package_hotel

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    unbind_package_hotel(
        db=db,
        package_id=package_id,
        hotel_id=hotel_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


# ==============================================================================
# Package Activities
# ==============================================================================


@router.get("/{package_id}/activities", response_model=list[PackageActivityResponse])
def get_package_activities(
    package_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> list[PackageActivityResponse]:
    """List package-level activities."""
    from app.services.admin.package_relationship_service import (
        list_package_activities,
    )

    return list_package_activities(db=db, package_id=package_id)


@router.post(
    "/{package_id}/activities",
    response_model=PackageActivityResponse,
    status_code=201,
)
def link_activity_to_package(
    package_id: UUID,
    payload: PackageActivityBindRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageActivityResponse:
    """Associate an activity with a package. CSRF protected."""
    from app.services.admin.package_relationship_service import (
        bind_package_activity,
    )

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return bind_package_activity(
        db=db,
        package_id=package_id,
        activity_id=payload.activity_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


@router.delete(
    "/{package_id}/activities/{activity_id}",
    status_code=204,
)
def unlink_activity_from_package(
    package_id: UUID,
    activity_id: UUID,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> None:
    """Disassociate an activity from a package. CSRF protected."""
    from app.services.admin.package_relationship_service import (
        unbind_package_activity,
    )

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    unbind_package_activity(
        db=db,
        package_id=package_id,
        activity_id=activity_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )


# ==============================================================================
# Package Departures
# ==============================================================================


@router.get("/{package_id}/departures", response_model=list[PackageDepartureResponse])
def get_package_departures(
    package_id: UUID,
    _admin: StaffOrAbove,
    db: DbSession,
) -> list[PackageDepartureResponse]:
    """List group departures for a specific package."""
    from app.services.admin.departure_service import list_package_departures

    return list_package_departures(db=db, package_id=package_id)


@router.post(
    "/{package_id}/departures",
    response_model=PackageDepartureResponse,
    status_code=201,
)
def create_package_departure(
    package_id: UUID,
    payload: PackageDepartureCreateRequest,
    request: Request,
    admin: ManagerOrAbove,
    db: DbSession,
) -> PackageDepartureResponse:
    """Create a new departure for this package. CSRF protected."""
    from app.services.admin.departure_service import create_departure

    verify_csrf_token(request)
    ip_address = _extract_ip(request)
    return create_departure(
        db=db,
        payload=payload,
        package_id=package_id,
        current_admin_id=admin.id,
        ip_address=ip_address,
    )
