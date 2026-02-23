import logging
import hvac

from app.core.config import settings

logger = logging.getLogger(__name__)

class VaultService:
    def __init__(self):
        self.client = hvac.AsyncClient(
            url=settings.VAULT_URL,
            token=settings.VAULT_TOKEN
        )

    async def write_secret(self, path: str, data: dict):
        """Write a secret to Vault."""
        try:
            # Note: The hvac async implementation can sometimes be tricky.
            # We are using KV v2 engine typically.
            # Assuming kv v2 path is secret/data/<path>
            await self.client.secrets.kv.v2.create_or_update_secret(
                path=path,
                secret=data,
            )
        except Exception as e:
            logger.error(f"Failed to write secret to vault at {path}: {e}")
            raise e

    async def read_secret(self, path: str) -> dict:
        """Read a secret from Vault."""
        try:
            response = await self.client.secrets.kv.v2.read_secret_version(
                path=path,
            )
            return response["data"]["data"]
        except Exception as e:
            logger.error(f"Failed to read secret from vault at {path}: {e}")
            raise e

    async def delete_secret(self, path: str):
        """Delete a secret from Vault."""
        try:
            await self.client.secrets.kv.v2.delete_metadata_and_all_versions(
                path=path,
            )
        except Exception as e:
            logger.error(f"Failed to delete secret from vault at {path}: {e}")
            raise e
