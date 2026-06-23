import secrets
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.api_key import ApiKey
from app.repositories.base import BaseRepository


class ApiKeyRepository(BaseRepository[ApiKey]):
    def __init__(self, db: AsyncSession):
        super().__init__(ApiKey, db)

    async def get_by_user(self, user_id: int) -> List[ApiKey]:
        result = await self.db.execute(
            select(ApiKey)
            .where(ApiKey.user_id == user_id)
            .order_by(ApiKey.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_key(self, user_id: int, name: str) -> tuple[ApiKey, str]:
        raw_key = f"ix_{secrets.token_hex(24)}"
        key_hash = get_password_hash(raw_key)
        key_prefix = raw_key[:8]
        instance = ApiKey(
            user_id=user_id,
            name=name,
            key_hash=key_hash,
            key_prefix=key_prefix,
        )
        self.db.add(instance)
        await self.db.commit()
        await self.db.refresh(instance)
        return instance, raw_key

    async def revoke(self, key_id: int, user_id: int) -> Optional[ApiKey]:
        instance = await self.get(key_id)
        if not instance or instance.user_id != user_id:
            return None
        instance.is_active = False
        await self.db.commit()
        await self.db.refresh(instance)
        return instance

    async def touch_last_used(self, key_id: int):
        instance = await self.get(key_id)
        if instance:
            instance.last_used_at = datetime.utcnow()
            await self.db.commit()
