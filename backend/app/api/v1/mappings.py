from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.core.database import get_db
from app.models.user import User
from app.schemas.mapping import (
    MappingCreate,
    MappingInDB,
    MappingListSummary,
    MappingSummary,
    MappingUpdate,
    MappingVersion,
)
from app.services.mapping_service import MappingService

router = APIRouter(prefix="/mappings", tags=["mappings"])


@router.get("", response_model=MappingListSummary)
async def list_mappings(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    workflow_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor", "viewer"])),
):
    service = MappingService(db)
    items = await service.get_multi(
        skip=skip,
        limit=limit,
        type_filter=type,
        workflow_id=workflow_id,
        search=search,
    )
    total = await service.count(type_filter=type, workflow_id=workflow_id)
    return {"items": items, "total": total}


@router.post("/upload", response_model=MappingInDB, status_code=status.HTTP_201_CREATED)
async def upload_mapping(
    name: str = Form(...),
    type: str = Form(...),
    file: UploadFile = Form(...),
    workflow_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst"])),
):
    service = MappingService(db)
    content = await file.read()

    try:
        mapping = await service.upload(
            name=name,
            type=type,
            content=content,
            filename=file.filename or "unknown",
            uploaded_by_id=current_user.id,
            workflow_id=workflow_id,
        )
        return mapping
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{mapping_id}", response_model=MappingInDB)
async def get_mapping(
    mapping_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor", "viewer"])),
):
    service = MappingService(db)
    mapping = await service.get(mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return mapping


@router.put("/{mapping_id}", response_model=MappingInDB)
async def update_mapping(
    mapping_id: int,
    mapping_in: MappingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor"])),
):
    service = MappingService(db)
    mapping = await service.update(
        mapping_id,
        name=mapping_in.name,
        type=mapping_in.type,
        workflow_id=mapping_in.workflow_id,
    )
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return mapping


@router.delete("/{mapping_id}")
async def delete_mapping(
    mapping_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    service = MappingService(db)
    deleted = await service.delete(mapping_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return {"detail": "Mapping deleted"}


@router.get("/{mapping_id}/versions", response_model=list[MappingVersion])
async def get_mapping_versions(
    mapping_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor", "viewer"])),
):
    service = MappingService(db)
    versions = await service.get_versions(mapping_id)
    return versions
