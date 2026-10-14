"""Versioned API router registry."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import auth, health
from app.api.v1.routes.add_ons import router as add_ons_router
from app.api.v1.routes.admin import admin_router
from app.api.v1.routes.bookings import router as bookings_router
from app.api.v1.routes.customer import router as customer_router
from app.api.v1.routes.departures import router as departures_router
from app.api.v1.routes.destinations import router as destinations_router
from app.api.v1.routes.inquiries import router as inquiries_router
from app.api.v1.routes.content import router as content_router
from app.api.v1.routes.offers import router as offers_router
from app.api.v1.routes.packages import router as packages_router
from app.api.v1.routes.payments import router as payments_router
from app.api.v1.routes.settings import router as settings_router
from app.api.v1.routes.webhooks import router as webhooks_router

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router)
api_router.include_router(customer_router)
api_router.include_router(destinations_router)
api_router.include_router(packages_router)
api_router.include_router(departures_router)
api_router.include_router(add_ons_router)
api_router.include_router(bookings_router)
api_router.include_router(payments_router)
api_router.include_router(webhooks_router)
api_router.include_router(inquiries_router)
api_router.include_router(settings_router)
api_router.include_router(content_router)
api_router.include_router(offers_router)
api_router.include_router(admin_router)
