"""Alerts API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from pydantic import BaseModel, Field

from app.dependencies import get_db_session
from app.repositories.alert_repository import AlertRepository

router = APIRouter()


class AlertCreate(BaseModel):
    """Schema for creating alert."""
    alert_type: str = Field(..., min_length=3, max_length=50)
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    title: str = Field(..., min_length=5, max_length=255)
    message: str = Field(..., min_length=10)
    entity_type: Optional[str] = Field(None, max_length=50)
    entity_id: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "alert_type": "stock_low",
                "severity": "high",
                "title": "Low Stock Alert",
                "message": "Product XYZ is below reorder threshold"
            }
        }


@router.post("/", status_code=201)
async def create_alert(
    alert_data: AlertCreate,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Create a new alert.

    Alert types: stock_low, fraud_detected, system_error, etc.
    Severity: low, medium, high, critical
    """
    repo = AlertRepository(db)
    alert = await repo.create(
        alert_type=alert_data.alert_type,
        severity=alert_data.severity,
        title=alert_data.title,
        message=alert_data.message,
        entity_type=alert_data.entity_type,
        entity_id=alert_data.entity_id
    )
    await db.commit()

    return {
        "success": True,
        "data": {
            "id": alert.id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "created_at": alert.created_at.isoformat()
        },
        "error": None
    }


@router.get("/")
async def get_alerts(
    is_resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    alert_type: Optional[str] = Query(None, description="Filter by type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get alerts with optional filters.

    Filters:
    - is_resolved: True/False/None (all)
    - severity: low, medium, high, critical
    - alert_type: stock_low, fraud_detected, etc.

    Multiple filters can be combined.
    """
    repo = AlertRepository(db)

    # Use the new combined filter method
    alerts = await repo.get_with_filters(
        is_resolved=is_resolved,
        severity=severity,
        alert_type=alert_type,
        skip=skip,
        limit=limit
    )

    results = []
    for alert in alerts:
        results.append({
            "id": alert.id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "title": alert.title,
            "message": alert.message,
            "is_resolved": alert.is_resolved,
            "created_at": alert.created_at.isoformat(),
            "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None
        })

    return {
        "success": True,
        "data": results,
        "metadata": {"count": len(results), "skip": skip, "limit": limit},
        "error": None
    }


@router.get("/unresolved/count")
async def get_unresolved_count(
    db: AsyncSession = Depends(get_db_session)
):
    """Get count of unresolved alerts."""
    repo = AlertRepository(db)
    count = await repo.get_unresolved_count()

    return {
        "success": True,
        "data": {"count": count},
        "error": None
    }


@router.patch("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Mark alert as resolved."""
    repo = AlertRepository(db)
    success = await repo.resolve_alert(alert_id)

    if not success:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

    await db.commit()

    return {
        "success": True,
        "data": {"message": f"Alert {alert_id} resolved"},
        "error": None
    }
