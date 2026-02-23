import logging
from typing import Any

import requests

from app.adapters.base import BaseAdapter

logger = logging.getLogger(__name__)

class DHIS2Adapter(BaseAdapter):
    async def test_connection(self) -> bool:
        """
        Placeholder for Phase 1: test DHIS2 connectivity.
        Uses synchronous requests. Later should use httpx.
        """
        if not self.credentials:
            return False
            
        url = str(self.connection.url).rstrip("/") + "/api/system/info.json"
        
        # Determine authentication
        auth = None
        headers = {"Accept": "application/json"}
        if self.connection.auth_type == "basic":
            auth = (self.credentials.get("username", ""), self.credentials.get("password", ""))
        elif self.connection.auth_type == "api_key":
            headers["Authorization"] = f"ApiToken {self.credentials.get('api_key', '')}"
            
        try:
            # Synchronous request in an async function (blocking) - suitable as MVP placeholder
            response = requests.get(url, auth=auth, headers=headers, timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"DHIS2 test connection failed: {e}")
            return False

    async def fetch_data(self, params: dict) -> Any:
        # Not required for Phase 1
        raise NotImplementedError()

    async def send_data(self, data: Any, target: str = None) -> dict:
        # Not required for Phase 1
        raise NotImplementedError()

    async def handle_request(self, request_data: dict, route_config: dict) -> dict:
        # Not required for Phase 1
        raise NotImplementedError()
