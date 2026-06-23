from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.settings import (
    ApiKeyCreate,
    OrganizationSettingsUpdate,
    NotificationSettingsUpdate,
    SystemSettingsUpdate,
)
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/organization")
async def get_org_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SettingsService(db)
    return await service.get_org()


@router.put("/organization")
async def update_org_settings(
    data: OrganizationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SettingsService(db)
    return await service.update_org(data.model_dump(), current_user.id)


@router.get("/notifications")
async def get_notification_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SettingsService(db)
    return await service.get_notifications()


@router.put("/notifications")
async def update_notification_settings(
    data: NotificationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SettingsService(db)
    return await service.update_notifications(data.model_dump(), current_user.id)


@router.get("/system")
async def get_system_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    service = SettingsService(db)
    return await service.get_system()


@router.put("/system")
async def update_system_settings(
    data: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    service = SettingsService(db)
    return await service.update_system(data.model_dump(), current_user.id)


@router.get("/api-keys")
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SettingsService(db)
    return await service.get_api_keys(current_user.id)


@router.post("/api-keys", status_code=201)
async def create_api_key(
    data: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SettingsService(db)
    return await service.create_api_key(current_user.id, data.name)


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SettingsService(db)
    result = await service.revoke_api_key(key_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="API key not found")
    return result
