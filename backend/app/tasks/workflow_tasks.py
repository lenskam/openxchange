import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters import get_adapter
from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.transaction import Transaction
from app.models.workflow import Workflow
from app.services.mapping_engine import MappingEngine
from app.services.vault_service import VaultService
from app.core.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


async def _execute_workflow_async(workflow_id: int) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Workflow)
            .options(
                selectinload(Workflow.source_connection),
                selectinload(Workflow.destination_connection),
            )
            .where(Workflow.id == workflow_id)
        )
        workflow = result.unique().scalar_one_or_none()

    if not workflow:
        logger.error(f"Workflow {workflow_id} not found")
        return {"status": "failed", "error": "Workflow not found"}

    vault_service = VaultService()
    mappings: list[dict] = []

    async with AsyncSessionLocal() as db:
        mappings_result = await db.execute(
            select(Transaction)
            .where(Transaction.workflow_id == workflow_id)
            .limit(1)
        )
        mappings_result.all()

    txn_record = Transaction(
        workflow_id=workflow_id,
        status="processing",
        triggered_by="system",
    )
    async with AsyncSessionLocal() as db:
        db.add(txn_record)
        await db.commit()
        await db.refresh(txn_record)

    txn_id = txn_record.id

    try:
        source_adapter = get_adapter(workflow.source_connection, vault_service)
        await source_adapter.initialize()
        start = datetime.utcnow()

        source_params = {
            "endpoint": "/api/dataValueSets.json",
            "page_size": 1000,
        }
        source_data = await source_adapter.fetch_data(source_params)

        engine = MappingEngine()
        transformed_data = source_data
        for m in mappings:
            transformed_data = engine.apply(
                transformed_data,
                m.get("type", "variable"),
                m.get("definitions", {}),
            )

        dest_adapter = get_adapter(workflow.destination_connection, vault_service)
        await dest_adapter.initialize()
        result = await dest_adapter.send_data(transformed_data)

        duration = (datetime.utcnow() - start).total_seconds()

        async with AsyncSessionLocal() as db:
            txn = await db.get(Transaction, txn_id)
            if txn:
                txn.status = "success"
                txn.processed_count = len(
                    source_data.get("data_values", [])
                ) if isinstance(source_data, dict) else 0
                txn.duration = duration
                txn.completed_at = datetime.utcnow()
                txn.source_data_summary = {
                    "total_count": source_data.get("total_count", 0)
                } if isinstance(source_data, dict) else {}
                txn.destination_response = result
                await db.commit()

        await ws_manager.broadcast("transaction_update", {
            "transaction_id": txn_id,
            "workflow_id": workflow_id,
            "status": "success",
            "duration": duration,
        })

        return {"status": "success", "transaction_id": txn_id}

    except Exception as e:
        logger.error(f"Workflow {workflow_id} execution failed: {e}")

        async with AsyncSessionLocal() as db:
            txn = await db.get(Transaction, txn_id)
            if txn:
                txn.status = "failed"
                txn.error_details = {"message": str(e)}
                txn.completed_at = datetime.utcnow()
                await db.commit()

        await ws_manager.broadcast("transaction_update", {
            "transaction_id": txn_id,
            "workflow_id": workflow_id,
            "status": "failed",
            "error": str(e),
        })

        return {"status": "failed", "error": str(e)}


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def execute_workflow(self, workflow_id: int):
    logger.info(f"Executing workflow {workflow_id}")
    try:
        result = asyncio.run(_execute_workflow_async(workflow_id))
        if result.get("status") == "failed" and "not found" in result.get("error", ""):
            return result
        return result
    except Exception as exc:
        logger.error(f"Workflow {workflow_id} execution error: {exc}")
        raise self.retry(exc=exc)
