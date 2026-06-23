from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.core.database import get_db
from app.models.user import User
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowListResponse,
    WorkflowResponse,
    WorkflowTriggerResponse,
    WorkflowUpdate,
)
from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("", response_model=WorkflowListResponse)
async def list_workflows(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = WorkflowService(db)
    items = await service.get_multi(skip=skip, limit=limit, status=status)
    total = await service.count(status=status)
    return {"items": items, "total": total}


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow_in: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor"])),
):
    service = WorkflowService(db)
    return await service.create(
        name=workflow_in.name,
        description=workflow_in.description,
        source_connection_id=workflow_in.source_connection_id,
        destination_connection_id=workflow_in.destination_connection_id,
        schedule=workflow_in.schedule,
        status=workflow_in.status,
        created_by_id=current_user.id,
    )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = WorkflowService(db)
    wf = await service.get(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    workflow_in: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor"])),
):
    service = WorkflowService(db)
    kwargs = workflow_in.model_dump(exclude_none=True)
    if not kwargs:
        existing = await service.get(workflow_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return existing
    result = await service.update(workflow_id, **kwargs)
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return result


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    service = WorkflowService(db)
    deleted = await service.delete(workflow_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"detail": "Workflow deleted"}


@router.post("/{workflow_id}/trigger", response_model=WorkflowTriggerResponse)
async def trigger_workflow(
    workflow_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor"])),
):
    service = WorkflowService(db)
    result = await service.trigger(workflow_id)
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return result


@router.get("/{workflow_id}/history")
async def get_workflow_history(
    workflow_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = WorkflowService(db)
    return await service.get_history(workflow_id)
