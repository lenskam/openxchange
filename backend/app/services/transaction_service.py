from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.repositories.transaction_repository import TransactionRepository


class TransactionService:
    def __init__(self, db: AsyncSession):
        self.repo = TransactionRepository(db)

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        workflow_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        items = await self.repo.get_multi(
            skip=skip, limit=limit, status=status, workflow_id=workflow_id
        )
        total = await self.repo.count(status=status, workflow_id=workflow_id)
        return {
            "items": [self._to_response(t) for t in items],
            "total": total,
        }

    async def get(self, transaction_id: int) -> Optional[Dict[str, Any]]:
        txn = await self.repo.get(transaction_id)
        return self._to_response(txn) if txn else None

    async def get_by_workflow(
        self, workflow_id: int, skip: int = 0, limit: int = 100
    ) -> Dict[str, Any]:
        items = await self.repo.get_by_workflow(
            workflow_id, skip=skip, limit=limit
        )
        total = await self.repo.count_by_workflow(workflow_id)
        return {
            "items": [self._to_response(t) for t in items],
            "total": total,
        }

    async def create(
        self,
        workflow_id: int,
        triggered_by: str = "system",
        status: str = "pending",
    ) -> Dict[str, Any]:
        txn = await self.repo.create(
            workflow_id=workflow_id,
            triggered_by=triggered_by,
            status=status,
        )
        return self._to_response(txn)

    async def update_status(
        self,
        transaction_id: int,
        status: str,
        processed_count: Optional[int] = None,
        failed_count: Optional[int] = None,
        error_details: Optional[Dict[str, Any]] = None,
        source_data_summary: Optional[Dict[str, Any]] = None,
        destination_response: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        txn = await self.repo.get(transaction_id)
        if not txn:
            return None

        kwargs: Dict[str, Any] = {"status": status}
        if processed_count is not None:
            kwargs["processed_count"] = processed_count
        if failed_count is not None:
            kwargs["failed_count"] = failed_count
        if error_details is not None:
            kwargs["error_details"] = error_details
        if source_data_summary is not None:
            kwargs["source_data_summary"] = source_data_summary
        if destination_response is not None:
            kwargs["destination_response"] = destination_response
        if status in ("success", "failed", "cancelled"):
            kwargs["completed_at"] = datetime.utcnow()

        await self.repo.update(transaction_id, **kwargs)
        return await self.get(transaction_id)

    async def get_stats(self) -> Dict[str, Any]:
        return await self.repo.get_stats()

    async def get_volume(self, days: int = 30) -> List[Dict[str, Any]]:
        return await self.repo.get_volume(days=days)

    def _to_response(self, txn: Transaction) -> Dict[str, Any]:
        return {
            "id": txn.id,
            "txn_id": txn.txn_id,
            "workflow_id": txn.workflow_id,
            "workflow_name": None,
            "status": txn.status,
            "processed_count": txn.processed_count or 0,
            "failed_count": txn.failed_count or 0,
            "duration": txn.duration,
            "started_at": txn.started_at.isoformat() if txn.started_at else None,
            "completed_at": txn.completed_at.isoformat() if txn.completed_at else None,
            "error_details": txn.error_details,
            "triggered_by": txn.triggered_by,
            "source_data_summary": txn.source_data_summary,
        }
