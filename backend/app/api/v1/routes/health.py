"""Health and readiness endpoints for container and load balancer probes."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db_session

router = APIRouter()
logger = logging.getLogger(__name__)

DbSession = Annotated[Session, Depends(get_db_session)]


@router.get("/health", summary="API liveness probe")
def health_check() -> dict[str, str]:
    """Report that the API process is responsive; does not assert external dependencies."""
    return {"status": "ok"}


@router.get("/health/ready", summary="API readiness probe")
def readiness_check(db: DbSession) -> JSONResponse:
    """Assert database connectivity for container readiness and zero-downtime traffic routing."""
    try:
        db.execute(text("SELECT 1"))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "ready", "database": "connected"},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Readiness check database probe failed: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "degraded", "database": "unavailable"},
        )
