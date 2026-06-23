import logging
from typing import Any, Optional

import httpx

from app.adapters.base import BaseAdapter

logger = logging.getLogger(__name__)

GENERIC_DEFAULT_TIMEOUT = 30


class GenericAdapter(BaseAdapter):
    async def _get_client(self) -> httpx.AsyncClient:
        base_url = str(self.connection.url).rstrip("/")
        headers = {"Accept": "application/json", "Content-Type": "application/json"}

        auth: Optional[httpx.Auth] = None
        if self.connection.auth_type == "basic":
            username = (self.credentials or {}).get("username", "")
            password = (self.credentials or {}).get("password", "")
            auth = httpx.BasicAuth(username, password)
        elif self.connection.auth_type == "api_key":
            headers["Authorization"] = (
                f"ApiToken {(self.credentials or {}).get('api_key', '')}"
            )
        elif self.connection.auth_type == "oauth2":
            token = (self.credentials or {}).get("access_token", "")
            headers["Authorization"] = f"Bearer {token}"

        return httpx.AsyncClient(
            base_url=base_url,
            auth=auth,
            headers=headers,
            timeout=GENERIC_DEFAULT_TIMEOUT,
        )

    async def test_connection(self) -> bool:
        try:
            async with await self._get_client() as client:
                response = await client.get("/")
                return response.status_code < 500
        except Exception as e:
            logger.error(f"Generic test connection failed: {e}")
            return False

    async def fetch_data(self, params: dict) -> Any:
        endpoint = params.get("endpoint", "/")
        method = params.get("method", "GET").upper()
        query_params = params.get("params", {})

        async with await self._get_client() as client:
            if method == "GET":
                response = await client.get(endpoint, params=query_params)
            elif method == "POST":
                response = await client.post(endpoint, json=params.get("body", {}))
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return response.json()

    async def send_data(self, data: Any, target: Optional[str] = None) -> dict:
        endpoint = target or "/"
        async with await self._get_client() as client:
            response = await client.post(endpoint, json=data)
            response.raise_for_status()
            return {
                "status": "success" if response.status_code < 300 else "failed",
                "http_status": response.status_code,
                "response": response.json(),
            }

    async def handle_request(
        self, request_data: dict, route_config: dict
    ) -> dict:
        method = route_config.get("method", "GET").upper()
        path = route_config.get("path", "/")

        async with await self._get_client() as client:
            if method == "GET":
                response = await client.get(
                    path, params=request_data.get("query", {})
                )
            elif method == "POST":
                response = await client.post(
                    path, json=request_data.get("body", {})
                )
            elif method == "PUT":
                response = await client.put(
                    path, json=request_data.get("body", {})
                )
            elif method == "DELETE":
                response = await client.delete(path)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return {
                "status_code": response.status_code,
                "data": response.json(),
            }
