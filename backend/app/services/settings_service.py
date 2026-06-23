from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.api_key_repository import ApiKeyRepository
from app.repositories.settings_repository import SettingsRepository


class SettingsService:
    def __init__(self, db: AsyncSession):
        self.settings_repo = SettingsRepository(db)
        self.api_key_repo = ApiKeyRepository(db)

    async def get_org(self) -> Dict[str, Any]:
        instance = await self.settings_repo.get_org()
        return self._org_to_response(instance)

    async def update_org(self, data: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        instance = await self.settings_repo.update_org(data, user_id)
        return self._org_to_response(instance)

    async def get_notifications(self) -> Dict[str, Any]:
        instance = await self.settings_repo.get_notifications()
        return self._notif_to_response(instance)

    async def update_notifications(self, data: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        instance = await self.settings_repo.update_notifications(data, user_id)
        return self._notif_to_response(instance)

    async def get_system(self) -> Dict[str, Any]:
        instance = await self.settings_repo.get_system()
        return self._system_to_response(instance)

    async def update_system(self, data: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        instance = await self.settings_repo.update_system(data, user_id)
        return self._system_to_response(instance)

    async def get_api_keys(self, user_id: int) -> List[Dict[str, Any]]:
        keys = await self.api_key_repo.get_by_user(user_id)
        return [self._api_key_to_response(k) for k in keys]

    async def create_api_key(self, user_id: int, name: str) -> Dict[str, Any]:
        instance, raw_key = await self.api_key_repo.create_key(user_id, name)
        result = self._api_key_to_response(instance)
        result["full_key"] = raw_key
        return result

    async def revoke_api_key(self, key_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        instance = await self.api_key_repo.revoke(key_id, user_id)
        return self._api_key_to_response(instance) if instance else None

    def _org_to_response(self, obj) -> Dict[str, Any]:
        return {
            "id": obj.id,
            "org_name": obj.org_name,
            "country": obj.country,
            "primary_contact_email": obj.primary_contact_email,
            "support_email": obj.support_email,
            "platform_name": obj.platform_name,
            "primary_color": obj.primary_color,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
            "updated_by_id": obj.updated_by_id,
        }

    def _notif_to_response(self, obj) -> Dict[str, Any]:
        return {
            "id": obj.id,
            "email_notifications": obj.email_notifications,
            "slack_webhook_url": obj.slack_webhook_url,
            "workflow_failure_alerts": obj.workflow_failure_alerts,
            "daily_digest": obj.daily_digest,
            "digest_time": obj.digest_time,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
            "updated_by_id": obj.updated_by_id,
        }

    def _system_to_response(self, obj) -> Dict[str, Any]:
        return {
            "id": obj.id,
            "default_date_format": obj.default_date_format,
            "log_retention_days": obj.log_retention_days,
            "default_timezone": obj.default_timezone,
            "max_concurrent_workflows": obj.max_concurrent_workflows,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
            "updated_by_id": obj.updated_by_id,
        }

    def _api_key_to_response(self, obj) -> Dict[str, Any]:
        return {
            "id": obj.id,
            "name": obj.name,
            "key_prefix": obj.key_prefix,
            "is_active": obj.is_active,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "last_used_at": obj.last_used_at.isoformat() if obj.last_used_at else None,
        }
