from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.workflow import Workflow
from app.repositories.base import BaseRepository


class WorkflowRepository(BaseRepository[Workflow]):
    def __init__(self, db: AsyncSession):
        super().__init__(Workflow, db)

    async def get_by_status(self, status: str) -> List[Workflow]:
        result = await self.db.execute(
            select(Workflow).where(Workflow.status == status)
        )
        return list(result.scalars().all())

    async def get_active_workflows(self) -> List[Workflow]:
        result = await self.db.execute(
            select(Workflow).where(Workflow.status == "active")
        )
        return list(result.scalars().all())

    async def get_by_connection(self, connection_id: int) -> List[Workflow]:
        result = await self.db.execute(
            select(Workflow).where(
                (Workflow.source_connection_id == connection_id)
                | (Workflow.destination_connection_id == connection_id)
            )
        )
        return list(result.scalars().all())

    async def get_workflows_with_relationships(
        self, skip: int = 0, limit: int = 100
    ) -> List[Workflow]:
        result = await self.db.execute(
            select(Workflow)
            .options(
                joinedload(Workflow.source_connection),
                joinedload(Workflow.destination_connection),
                joinedload(Workflow.created_by),
            )
            .offset(skip)
            .limit(limit)
        )
        return list(result.unique().scalars().all())

    async def get_with_relationships(self, id: int) -> Optional[Workflow]:
        result = await self.db.execute(
            select(Workflow)
            .options(
                joinedload(Workflow.source_connection),
                joinedload(Workflow.destination_connection),
                joinedload(Workflow.created_by),
            )
            .where(Workflow.id == id)
        )
        return result.unique().scalar_one_or_none()

    async def update_run_stats(
        self, id: int, success: bool, status: str
    ) -> Optional[Workflow]:
        from sqlalchemy import update

        wf = await self.get(id)
        if not wf:
            return None

        await self.db.execute(
            update(Workflow)
            .where(Workflow.id == id)
            .values(
                last_run_at=__import__("datetime").datetime.utcnow(),
                last_run_status=status,
                total_runs=Workflow.total_runs + 1,
                successful_runs=Workflow.successful_runs + (1 if success else 0),
            )
        )
        await self.db.commit()
        return await self.get(id)
