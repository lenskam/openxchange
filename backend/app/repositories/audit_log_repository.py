from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self, db: AsyncSession):
        super().__init__(AuditLog, db)

    async def search(
        self,
        skip: int = 0,
        limit: int = 100,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        user_id: Optional[int] = None,
        q: Optional[str] = None,
    ) -> List[AuditLog]:
        query = select(AuditLog).order_by(AuditLog.timestamp.desc())
        if action:
            query = query.where(AuditLog.action == action)
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
        if user_id is not None:
            query = query.where(AuditLog.user_id == user_id)
        if q:
            pattern = f"%{q}%"
            query = query.where(
                AuditLog.action.ilike(pattern)
                | AuditLog.resource_type.ilike(pattern)
                | AuditLog.description.ilike(pattern)
            )
        result = await self.db.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    async def count_filtered(
        self,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        user_id: Optional[int] = None,
        q: Optional[str] = None,
    ) -> int:
        query = select(func.count(AuditLog.id))
        if action:
            query = query.where(AuditLog.action == action)
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
        if user_id is not None:
            query = query.where(AuditLog.user_id == user_id)
        if q:
            pattern = f"%{q}%"
            query = query.where(
                AuditLog.action.ilike(pattern)
                | AuditLog.resource_type.ilike(pattern)
                | AuditLog.description.ilike(pattern)
            )
        result = await self.db.execute(query)
        return result.scalar() or 0
