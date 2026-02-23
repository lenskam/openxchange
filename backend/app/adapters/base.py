from abc import ABC, abstractmethod
from typing import Any

from app.models.connection import Connection
from app.services.vault_service import VaultService

class BaseAdapter(ABC):
    def __init__(self, connection: Connection, vault_service: VaultService):
        self.connection = connection
        self.vault_service = vault_service
        self.credentials = None

    async def initialize(self):
        if self.connection.credentials_encrypted:
            self.credentials = await self.vault_service.read_secret(
                self.connection.credentials_encrypted
            )

    @abstractmethod
    async def test_connection(self) -> bool:
        pass

    @abstractmethod
    async def fetch_data(self, params: dict) -> Any:
        pass

    @abstractmethod
    async def send_data(self, data: Any, target: str = None) -> dict:
        pass

    @abstractmethod
    async def handle_request(self, request_data: dict, route_config: dict) -> dict:
        pass
