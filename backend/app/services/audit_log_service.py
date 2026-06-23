from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.audit_log_repository import AuditLogRepository


class AuditLogService:
    def __init__(self, db: AsyncSession):
        self.repo = AuditLogRepository(db)

    async def search(
        self,
        skip: int = 0,
        limit: int = 100,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        user_id: Optional[int] = None,
        q: Optional[str] = None,
    ) -> Dict[str, Any]:
        items = await self.repo.search(
            skip=skip,
            limit=limit,
            action=action,
            resource_type=resource_type,
            user_id=user_id,
            q=q,
        )
        total = await self.repo.count_filtered(
            action=action, resource_type=resource_type, user_id=user_id, q=q
        )
        return {
            "items": [self._to_response(a) for a in items],
            "total": total,
        }

    async def log(
        self,
        action: str,
        resource_type: str,
        user_id: Optional[int] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Dict[str, Any]:
        entry = await self.repo.create(
            action=action,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            description=description,
        )
        return self._to_response(entry)

    def _to_response(self, entry: AuditLog) -> Dict[str, Any]:
        return {
            "id": entry.id,
            "action": entry.action,
            "user_id": entry.user_id,
            "user_name": None,
            "resource_type": entry.resource_type,
            "resource_id": entry.resource_id,
            "details": entry.details,
            "ip_address": entry.ip_address,
            "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
            "description": entry.description,
        }
