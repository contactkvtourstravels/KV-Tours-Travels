"""Aggregated administrative API router."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes.admin.activities import router as activities_router
from app.api.v1.routes.admin.add_ons import router as add_ons_router
from app.api.v1.routes.admin.analytics import router as analytics_router
from app.api.v1.routes.admin.audit_logs import router as audit_logs_router
from app.api.v1.routes.admin.bank_accounts import router as bank_accounts_router
from app.api.v1.routes.admin.bookings import router as bookings_router
from app.api.v1.routes.admin.cancellations import router as cancellations_router
from app.api.v1.routes.admin.customers import router as customers_router
from app.api.v1.routes.admin.dashboard import router as dashboard_router
from app.api.v1.routes.admin.departures import router as departures_router
from app.api.v1.routes.admin.destinations import router as destinations_router
from app.api.v1.routes.admin.exports import router as exports_router
from app.api.v1.routes.admin.hotels import router as hotels_router
from app.api.v1.routes.admin.inquiries import router as inquiries_router
from app.api.v1.routes.admin.media import router as media_router
from app.api.v1.routes.admin.notes import router as notes_router
from app.api.v1.routes.admin.notifications import router as notifications_router
from app.api.v1.routes.admin.offers import router as offers_router
from app.api.v1.routes.admin.operations import router as operations_router
from app.api.v1.routes.admin.options import router as options_router
from app.api.v1.routes.admin.packages import router as packages_router
from app.api.v1.routes.admin.payments import router as payments_router
from app.api.v1.routes.admin.content import router as content_router
from app.api.v1.routes.admin.settings import router as settings_router
from app.api.v1.routes.admin.users import router as users_router

admin_router = APIRouter(prefix="/admin")
admin_router.include_router(dashboard_router)
admin_router.include_router(operations_router)
admin_router.include_router(analytics_router)
admin_router.include_router(customers_router)
admin_router.include_router(inquiries_router)
admin_router.include_router(notes_router)
admin_router.include_router(exports_router)
admin_router.include_router(audit_logs_router)
admin_router.include_router(users_router)
admin_router.include_router(destinations_router)
admin_router.include_router(packages_router)
admin_router.include_router(offers_router)
admin_router.include_router(options_router)
admin_router.include_router(hotels_router)
admin_router.include_router(activities_router)
admin_router.include_router(departures_router)
admin_router.include_router(add_ons_router)
admin_router.include_router(bookings_router)
admin_router.include_router(cancellations_router)
admin_router.include_router(notifications_router)
admin_router.include_router(payments_router)
admin_router.include_router(bank_accounts_router)
admin_router.include_router(media_router)
admin_router.include_router(settings_router)
admin_router.include_router(content_router)
