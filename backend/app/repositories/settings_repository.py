from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization_settings import OrganizationSettings
from app.models.notification_settings import NotificationSettings
from app.models.system_settings import SystemSettings
from app.repositories.base import BaseRepository


class SettingsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create(
        self, model_cls, defaults: Optional[Dict[str, Any]] = None
    ):
        result = await self.db.execute(select(model_cls).where(model_cls.id == 1))
        instance = result.scalar_one_or_none()
        if not instance:
            instance = model_cls(id=1, **(defaults or {}))
            self.db.add(instance)
            await self.db.commit()
            await self.db.refresh(instance)
        return instance

    async def update(self, model_cls, data: Dict[str, Any], user_id: Optional[int] = None):
        instance = await self.get_or_create(model_cls)
        for key, value in data.items():
            setattr(instance, key, value)
        if user_id is not None:
            instance.updated_by_id = user_id
        await self.db.commit()
        await self.db.refresh(instance)
        return instance

    async def get_org(self) -> OrganizationSettings:
        return await self.get_or_create(OrganizationSettings)

    async def update_org(self, data: Dict[str, Any], user_id: int) -> OrganizationSettings:
        return await self.update(OrganizationSettings, data, user_id)

    async def get_notifications(self) -> NotificationSettings:
        return await self.get_or_create(NotificationSettings)

    async def update_notifications(self, data: Dict[str, Any], user_id: int) -> NotificationSettings:
        return await self.update(NotificationSettings, data, user_id)

    async def get_system(self) -> SystemSettings:
        return await self.get_or_create(SystemSettings)

    async def update_system(self, data: Dict[str, Any], user_id: int) -> SystemSettings:
        return await self.update(SystemSettings, data, user_id)
