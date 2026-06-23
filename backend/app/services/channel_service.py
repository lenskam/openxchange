from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import Channel
from app.repositories.channel_repository import ChannelRepository


class ChannelService:
    def __init__(self, db: AsyncSession):
        self.repo = ChannelRepository(db)

    async def get_multi(
        self, skip: int = 0, limit: int = 100
    ) -> List[Dict[str, Any]]:
        items = await self.repo.get_multi(skip=skip, limit=limit)
        return [self._to_response(c) for c in items]

    async def count(self) -> int:
        return await self.repo.count()

    async def get(self, channel_id: int) -> Optional[Dict[str, Any]]:
        channel = await self.repo.get(channel_id)
        return self._to_response(channel) if channel else None

    async def create(
        self,
        name: str,
        url_pattern: str,
        method: str = "GET",
        protocol: str = "http",
        description: Optional[str] = None,
        routes: Optional[List[Dict[str, Any]]] = None,
        auth_required: bool = True,
        rate_limit: Optional[int] = None,
        timeout: int = 30,
        retry_count: int = 3,
        trigger_workflow_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        channel = await self.repo.create(
            name=name,
            description=description,
            url_pattern=url_pattern,
            method=method,
            protocol=protocol,
            routes=routes or [],
            auth_required=auth_required,
            rate_limit=rate_limit,
            timeout=timeout,
            retry_count=retry_count,
            trigger_workflow_id=trigger_workflow_id,
        )
        return self._to_response(channel)

    async def update(
        self, channel_id: int, **kwargs
    ) -> Optional[Dict[str, Any]]:
        existing = await self.repo.get(channel_id)
        if not existing:
            return None
        await self.repo.update(channel_id, **kwargs)
        return await self.get(channel_id)

    async def delete(self, channel_id: int) -> bool:
        return await self.repo.delete(channel_id)

    async def enable(self, channel_id: int) -> Optional[Dict[str, Any]]:
        channel = await self.repo.enable_channel(channel_id)
        if not channel:
            return None
        return {
            "id": channel.id,
            "name": channel.name,
            "status": True,
            "message": "Channel enabled successfully",
        }

    async def disable(self, channel_id: int) -> Optional[Dict[str, Any]]:
        channel = await self.repo.disable_channel(channel_id)
        if not channel:
            return None
        return {
            "id": channel.id,
            "name": channel.name,
            "status": False,
            "message": "Channel disabled successfully",
        }

    def _to_response(self, channel: Channel) -> Dict[str, Any]:
        return {
            "id": channel.id,
            "name": channel.name,
            "description": channel.description,
            "url_pattern": channel.url_pattern,
            "method": channel.method,
            "protocol": channel.protocol,
            "routes": channel.routes or [],
            "status": channel.status,
            "auth_required": channel.auth_required,
            "rate_limit": channel.rate_limit,
            "timeout": channel.timeout,
            "retry_count": channel.retry_count,
            "trigger_workflow_id": channel.trigger_workflow_id,
            "created_at": channel.created_at.isoformat() if channel.created_at else None,
            "updated_at": channel.updated_at.isoformat() if channel.updated_at else None,
        }
