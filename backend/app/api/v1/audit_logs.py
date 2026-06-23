from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.core.database import get_db
from app.models.user import User
from app.schemas.audit_log import AuditLogListResponse, AuditLogResponse
from app.services.audit_log_service import AuditLogService

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    q: Optional[str] = Query(None, description="Search across action, resource_type, and description"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = AuditLogService(db)
    return await service.search(
        skip=skip, limit=limit, action=action, resource_type=resource_type, q=q
    )


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = AuditLogService(db)
    log_entry = await service.repo.get(log_id)
    if not log_entry:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return service._to_response(log_entry)
