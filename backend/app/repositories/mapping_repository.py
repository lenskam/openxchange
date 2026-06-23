from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mapping import Mapping
from app.repositories.base import BaseRepository


class MappingRepository(BaseRepository[Mapping]):
    def __init__(self, db: AsyncSession):
        super().__init__(Mapping, db)

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        type_filter: Optional[str] = None,
        workflow_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> List[Mapping]:
        query = select(Mapping).where(Mapping.is_latest == True)

        if type_filter:
            query = query.where(Mapping.type == type_filter)
        if workflow_id is not None:
            query = query.where(Mapping.workflow_id == workflow_id)
        if search:
            query = query.where(Mapping.name.ilike(f"%{search}%"))

        query = query.order_by(Mapping.last_updated.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(
        self,
        type_filter: Optional[str] = None,
        workflow_id: Optional[int] = None,
    ) -> int:
        query = select(Mapping).where(Mapping.is_latest == True)

        if type_filter:
            query = query.where(Mapping.type == type_filter)
        if workflow_id is not None:
            query = query.where(Mapping.workflow_id == workflow_id)

        result = await self.db.execute(query)
        return len(result.scalars().all())

    async def get_versions(self, mapping_id: int) -> List[Mapping]:
        result = await self.db.execute(
            select(Mapping)
            .where(Mapping.id == mapping_id)
            .order_by(Mapping.version.desc())
        )
        return list(result.scalars().all())

    async def get_by_name_and_type(self, name: str, type: str) -> Optional[Mapping]:
        result = await self.db.execute(
            select(Mapping).where(
                Mapping.name == name,
                Mapping.type == type,
                Mapping.is_latest == True,
            )
        )
        return result.scalar_one_or_none()
