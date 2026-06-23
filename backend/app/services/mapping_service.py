from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mapping import Mapping
from app.repositories.mapping_repository import MappingRepository
from app.services.mapping_engine import MappingEngine


class MappingService:
    def __init__(self, db: AsyncSession):
        self.repo = MappingRepository(db)
        self.engine = MappingEngine()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        type_filter: Optional[str] = None,
        workflow_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        items = await self.repo.get_multi(
            skip=skip,
            limit=limit,
            type_filter=type_filter,
            workflow_id=workflow_id,
            search=search,
        )
        return [self._to_summary(m) for m in items]

    async def count(
        self,
        type_filter: Optional[str] = None,
        workflow_id: Optional[int] = None,
    ) -> int:
        return await self.repo.count(type_filter=type_filter, workflow_id=workflow_id)

    async def get(self, mapping_id: int) -> Optional[Mapping]:
        return await self.repo.get(mapping_id)

    async def upload(
        self,
        name: str,
        type: str,
        content: bytes,
        filename: str,
        uploaded_by_id: int,
        workflow_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Mapping:
        parsed = self.engine.parse_file(content, filename)
        row_count = parsed.get("row_count", 0)
        merged_metadata = {
            "original_filename": filename,
            "record_count": row_count,
            **(metadata or {}),
        }
        new_version = await self.repo.create(
            name=name,
            type=type,
            workflow_id=workflow_id,
            file_data=parsed,
            extra_meta=merged_metadata,
            version=1,
            uploaded_by_id=uploaded_by_id,
            is_latest=True,
        )
        return new_version

    async def update(
        self,
        mapping_id: int,
        name: Optional[str] = None,
        type: Optional[str] = None,
        workflow_id: Optional[int] = None,
    ) -> Optional[Mapping]:
        mapping = await self.repo.get(mapping_id)
        if not mapping:
            return None

        kwargs: Dict[str, Any] = {}
        if name is not None:
            kwargs["name"] = name
        if type is not None:
            kwargs["type"] = type
        if workflow_id is not None:
            kwargs["workflow_id"] = workflow_id

        return await self.repo.update(mapping_id, **kwargs)

    async def delete(self, mapping_id: int) -> bool:
        return await self.repo.delete(mapping_id)

    async def get_versions(self, mapping_id: int) -> List[Mapping]:
        return await self.repo.get_versions(mapping_id)

    def _to_summary(self, mapping: Mapping) -> Dict[str, Any]:
        type_display = {
            "variable": "Variable",
            "org_unit": "Org Unit",
            "options": "Option",
            "date_format": "Date Format",
        }
        display_type = type_display.get(mapping.type, mapping.type)

        type_config = {
            "variable": {
                "color": "bg-primary-fixed",
                "icon": "attachment",
                "iconColor": "text-primary",
            },
            "org_unit": {
                "color": "bg-tertiary-fixed",
                "icon": "apartment",
                "iconColor": "text-tertiary",
            },
            "options": {
                "color": "bg-secondary-fixed",
                "icon": "rule",
                "iconColor": "text-secondary",
            },
            "date_format": {
                "color": "bg-surface-container",
                "icon": "calendar_month",
                "iconColor": "text-outline",
            },
        }
        config = type_config.get(mapping.type, type_config["variable"])

        meta = mapping.extra_meta or {}
        record_count = meta.get("record_count", 0)
        uploaded_by_name = f"User #{mapping.uploaded_by_id}"

        name_parts = uploaded_by_name.split()
        initials = "".join(p[0].upper() for p in name_parts if p)[:2] or "U"

        return {
            "id": mapping.id,
            "name": mapping.name,
            "type": display_type,
            "workflow": str(mapping.workflow_id) if mapping.workflow_id else "Global",
            "records": record_count,
            "last_updated": mapping.last_updated.isoformat() if mapping.last_updated else "",
            "uploaded_by": uploaded_by_name,
            "initials": initials,
            "color": config["color"],
            "icon": config["icon"],
            "iconColor": config["iconColor"],
        }
