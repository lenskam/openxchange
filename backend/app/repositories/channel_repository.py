from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import Channel
from app.repositories.base import BaseRepository


class ChannelRepository(BaseRepository[Channel]):
    def __init__(self, db: AsyncSession):
        super().__init__(Channel, db)

    async def get_enabled_channels(self) -> List[Channel]:
        result = await self.db.execute(
            select(Channel).where(Channel.status == True)
        )
        return list(result.scalars().all())

    async def get_by_url_pattern(self, url_pattern: str) -> Optional[Channel]:
        result = await self.db.execute(
            select(Channel).where(Channel.url_pattern == url_pattern)
        )
        return result.scalar_one_or_none()

    async def enable_channel(self, id: int) -> Optional[Channel]:
        return await self.update(id, status=True)

    async def disable_channel(self, id: int) -> Optional[Channel]:
        return await self.update(id, status=False)
