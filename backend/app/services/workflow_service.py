from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import Workflow
from app.repositories.workflow_repository import WorkflowRepository


class WorkflowService:
    def __init__(self, db: AsyncSession):
        self.repo = WorkflowRepository(db)

    async def get_multi(
        self, skip: int = 0, limit: int = 100, status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if status:
            items = await self.repo.get_by_status(status)
        else:
            items = await self.repo.get_workflows_with_relationships(
                skip=skip, limit=limit
            )
        return [self._to_response(w) for w in items]

    async def count(self, status: Optional[str] = None) -> int:
        if status:
            return len(await self.repo.get_by_status(status))
        return await self.repo.count()

    async def get(self, workflow_id: int) -> Optional[Dict[str, Any]]:
        wf = await self.repo.get_with_relationships(workflow_id)
        return self._to_response(wf) if wf else None

    async def create(
        self,
        name: str,
        source_connection_id: int,
        destination_connection_id: int,
        created_by_id: int,
        description: Optional[str] = None,
        schedule: Optional[str] = None,
        status: str = "draft",
    ) -> Dict[str, Any]:
        wf = await self.repo.create(
            name=name,
            description=description,
            source_connection_id=source_connection_id,
            destination_connection_id=destination_connection_id,
            schedule=schedule,
            status=status,
            created_by_id=created_by_id,
        )
        return await self.get(wf.id)

    async def update(
        self, workflow_id: int, **kwargs
    ) -> Optional[Dict[str, Any]]:
        existing = await self.repo.get(workflow_id)
        if not existing:
            return None
        await self.repo.update(workflow_id, **kwargs)
        return await self.get(workflow_id)

    async def delete(self, workflow_id: int) -> bool:
        return await self.repo.delete(workflow_id)

    async def trigger(self, workflow_id: int) -> Optional[Dict[str, Any]]:
        wf = await self.repo.get(workflow_id)
        if not wf:
            return None
        return {
            "message": f"Workflow '{wf.name}' triggered successfully",
            "workflow_id": workflow_id,
            "triggered_at": __import__("datetime").datetime.utcnow().isoformat(),
        }

    async def get_history(self, workflow_id: int) -> Dict[str, Any]:
        return {"items": [], "total": 0}

    def _to_response(self, wf: Workflow) -> Dict[str, Any]:
        source_name = (
            wf.source_connection.name if wf.source_connection else None
        )
        dest_name = (
            wf.destination_connection.name
            if wf.destination_connection
            else None
        )
        created_by_name = wf.created_by.full_name if wf.created_by else None
        return {
            "id": wf.id,
            "name": wf.name,
            "description": wf.description,
            "source_connection_id": wf.source_connection_id,
            "destination_connection_id": wf.destination_connection_id,
            "source_connection_name": source_name,
            "destination_connection_name": dest_name,
            "schedule": wf.schedule,
            "status": wf.status,
            "created_by_id": wf.created_by_id,
            "created_by_name": created_by_name,
            "last_run_at": wf.last_run_at.isoformat() if wf.last_run_at else None,
            "last_run_status": wf.last_run_status,
            "total_runs": wf.total_runs or 0,
            "successful_runs": wf.successful_runs or 0,
            "created_at": wf.created_at.isoformat() if wf.created_at else None,
            "updated_at": wf.updated_at.isoformat() if wf.updated_at else None,
        }
