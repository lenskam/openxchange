from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.core.database import get_db
from app.models.user import User
from app.schemas.connection import (
    ConnectionCreate,
    ConnectionInDB,
    ConnectionList,
    ConnectionTest,
    ConnectionUpdate,
)
from app.services.connection_service import ConnectionService

router = APIRouter(prefix="/connections", tags=["connections"])

@router.get("", response_model=ConnectionList)
async def list_connections(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor", "viewer"]))
):
    service = ConnectionService(db)
    items = await service.get_multi(skip=skip, limit=limit)
    return {"items": items, "total": len(items)}

@router.post("", response_model=ConnectionInDB, status_code=status.HTTP_201_CREATED)
async def create_connection(
    connection_in: ConnectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst"]))
):
    service = ConnectionService(db)
    return await service.create(connection_in)

@router.get("/{connection_id}", response_model=ConnectionInDB)
async def get_connection(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor", "viewer"]))
):
    service = ConnectionService(db)
    connection = await service.get(connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    return connection

@router.put("/{connection_id}", response_model=ConnectionInDB)
async def update_connection(
    connection_id: int,
    connection_in: ConnectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor"]))
):
    service = ConnectionService(db)
    return await service.update(connection_id, connection_in)

@router.delete("/{connection_id}")
async def delete_connection(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    service = ConnectionService(db)
    await service.delete(connection_id)
    return {"detail": "Connection deleted"}

@router.post("/{connection_id}/test", response_model=ConnectionTest)
async def test_connection(
    connection_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst", "editor"]))
):
    service = ConnectionService(db)
    success = await service.test_connection(connection_id)
    if success:
        return {"status": "success", "message": "Connection tested successfully."}
    else:
        return {"status": "failed", "message": "Connection test failed. Check credentials."}
