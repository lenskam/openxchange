import logging
from typing import Any

from app.adapters.base import BaseAdapter
from app.adapters.dhis2 import DHIS2Adapter
from app.adapters.generic import GenericAdapter
from app.models.connection import Connection
from app.services.vault_service import VaultService

logger = logging.getLogger(__name__)


def get_adapter(
    connection: Connection, vault_service: VaultService
) -> BaseAdapter:
    adapters: dict[str, type[BaseAdapter]] = {
        "dhis2": DHIS2Adapter,
        "fhir": GenericAdapter,
        "hl7": GenericAdapter,
        "openhim": GenericAdapter,
        "openfn": GenericAdapter,
        "generic": GenericAdapter,
    }

    adapter_class = adapters.get(connection.type)
    if not adapter_class:
        raise ValueError(f"Unsupported connection type: {connection.type}")

    adapter = adapter_class(connection, vault_service)
    return adapter
