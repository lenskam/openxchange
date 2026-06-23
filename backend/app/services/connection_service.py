from typing import Any, Dict, List, Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.adapters import get_adapter
from app.core.exceptions import NotFoundException
from app.models.connection import Connection
from app.schemas.connection import ConnectionCreate, ConnectionUpdate
from app.services.vault_service import VaultService

logger = logging.getLogger(__name__)

class ConnectionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.vault_service = VaultService()

    async def get(self, connection_id: int) -> Optional[Connection]:
        result = await self.db.execute(select(Connection).where(Connection.id == connection_id))
        return result.scalar_one_or_none()

    async def get_multi(self, skip: int = 0, limit: int = 100) -> List[Connection]:
        result = await self.db.execute(select(Connection).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, obj_in: ConnectionCreate) -> Connection:
        db_obj = Connection(
            name=obj_in.name,
            type=obj_in.type,
            url=str(obj_in.url),
            auth_type=obj_in.auth_type,
            status="inactive",
        )
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)

        if obj_in.credentials:
            vault_path = f"secret/data/connections/{db_obj.id}"
            await self.vault_service.write_secret(vault_path, obj_in.credentials)
            db_obj.credentials_encrypted = vault_path
            self.db.add(db_obj)
            await self.db.commit()
            await self.db.refresh(db_obj)

        return db_obj

    async def update(self, connection_id: int, obj_in: ConnectionUpdate) -> Connection:
        db_obj = await self.get(connection_id)
        if not db_obj:
            raise NotFoundException(detail="Connection not found")

        update_data = obj_in.model_dump(exclude_unset=True)
        credentials = update_data.pop("credentials", None)

        for field, value in update_data.items():
            if field == "url":
                value = str(value)
            setattr(db_obj, field, value)

        if credentials is not None:
            vault_path = db_obj.credentials_encrypted or f"secret/data/connections/{db_obj.id}"
            await self.vault_service.write_secret(vault_path, credentials)
            db_obj.credentials_encrypted = vault_path

        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete(self, connection_id: int) -> Connection:
        db_obj = await self.get(connection_id)
        if not db_obj:
            raise NotFoundException(detail="Connection not found")

        if db_obj.credentials_encrypted:
            try:
                await self.vault_service.delete_secret(db_obj.credentials_encrypted)
            except Exception as e:
                logger.error(f"Failed to delete credentials for connection {connection_id}: {e}")

        await self.db.delete(db_obj)
        await self.db.commit()
        return db_obj

    async def test_connection(self, connection_id: int) -> bool:
        connection = await self.get(connection_id)
        if not connection:
            raise NotFoundException(detail="Connection not found")

        try:
            adapter = get_adapter(connection, self.vault_service)
            await adapter.initialize()
            return await adapter.test_connection()
        except ValueError as e:
            logger.warning(f"No adapter for type {connection.type}: {e}")
            return True
