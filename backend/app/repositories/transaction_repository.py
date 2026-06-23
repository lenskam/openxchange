from typing import Dict, List, Optional

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.repositories.base import BaseRepository


class TransactionRepository(BaseRepository[Transaction]):
    def __init__(self, db: AsyncSession):
        super().__init__(Transaction, db)

    async def get_by_workflow(
        self, workflow_id: int, skip: int = 0, limit: int = 100
    ) -> List[Transaction]:
        result = await self.db.execute(
            select(Transaction)
            .where(Transaction.workflow_id == workflow_id)
            .order_by(Transaction.started_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_workflow(self, workflow_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Transaction.id)).where(
                Transaction.workflow_id == workflow_id
            )
        )
        return result.scalar() or 0

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        workflow_id: Optional[int] = None,
    ) -> List[Transaction]:
        query = select(Transaction).order_by(Transaction.started_at.desc())
        if status:
            query = query.where(Transaction.status == status)
        if workflow_id is not None:
            query = query.where(Transaction.workflow_id == workflow_id)
        result = await self.db.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    async def count(
        self,
        status: Optional[str] = None,
        workflow_id: Optional[int] = None,
    ) -> int:
        query = select(func.count(Transaction.id))
        if status:
            query = query.where(Transaction.status == status)
        if workflow_id is not None:
            query = query.where(Transaction.workflow_id == workflow_id)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_stats(self) -> Dict[str, object]:
        total = await self.count()
        success = await self.count(status="success")
        failed = await self.count(status="failed")
        processing = await self.count(status="processing")
        pending = await self.count(status="pending")
        success_rate = (success / total * 100) if total > 0 else 0.0
        return {
            "total": total,
            "success": success,
            "failed": failed,
            "processing": processing,
            "pending": pending,
            "success_rate": round(success_rate, 1),
        }

    async def get_volume(self, days: int = 30) -> List[Dict[str, object]]:
        from datetime import datetime, timedelta

        since = datetime.utcnow() - timedelta(days=days)
        result = await self.db.execute(
            select(
                func.date(Transaction.started_at).label("date"),
                func.count(Transaction.id).label("count"),
                func.sum(
                    case((Transaction.status == "success", 1), else_=0)
                ).label("success"),
                func.sum(
                    case((Transaction.status == "failed", 1), else_=0)
                ).label("failed"),
            )
            .where(Transaction.started_at >= since)
            .group_by(func.date(Transaction.started_at))
            .order_by(func.date(Transaction.started_at).asc())
        )
        rows = result.all()
        return [
            {
                "date": str(row.date),
                "count": int(row.count),
                "success": int(row.success or 0),
                "failed": int(row.failed or 0),
            }
            for row in rows
        ]
