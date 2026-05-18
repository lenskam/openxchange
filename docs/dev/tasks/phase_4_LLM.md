# Phase 4 Implementation Prompt for Gemini

Based on the **Interxchange GEMINI.md** development guide, here is a comprehensive prompt for the Gemini AI agent to execute **Phase 4: Execution Engine & Transactions**.

---

## PROMPT: Implement Interxchange Phase 4 - Execution Engine & Transactions

You are the **Gemini AI agent** tasked with implementing **Phase 4: Execution Engine & Transactions** of the Interxchange interoperability platform according to the specifications in the `GEMINI.md` development guide.

### Phase 4 Scope (5 days)

- Workflow executor (Celery tasks with mapping engine integration)
- Transaction logging and tracking
- WebSocket real-time updates
- Frontend Transactions page with real-time updates
- Dashboard widgets (transaction charts, stats)

### Timeline Expectations

- Day 1: Transaction database model, repository, and API endpoints
- Day 2: Workflow executor Celery task (fetch data → apply mappings → send data)
- Day 3: WebSocket manager for real-time transaction updates
- Day 4: Frontend Transactions page (table, detail drawer, real-time updates)
- Day 5: Dashboard widgets (stat cards, transaction volume chart, recent transactions)

---

## TASK 1: Transaction Database Model & Repository

### Transaction Model (backend/app/models/transaction.py)

```python
from sqlalchemy import Column, String, Enum, Integer, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum
from datetime import datetime

class TransactionStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Transaction(BaseModel):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: f"txn_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}")
    workflow_id = Column(String(36), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    processed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    duration = Column(Float, nullable=True)  # seconds
    started_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_details = Column(JSON, nullable=True)  # Store error messages per batch/record
    triggered_by = Column(String(255), nullable=False)  # 'system' or user email
    source_data_summary = Column(JSON, nullable=True)  # Summary of fetched data
    destination_response = Column(JSON, nullable=True)  # Response from destination

    # Relationships
    workflow = relationship("Workflow", back_populates="transactions")

    def complete(self, status: TransactionStatus, processed_count: int, failed_count: int, error_details: dict = None):
        self.status = status
        self.processed_count = processed_count
        self.failed_count = failed_count
        self.completed_at = datetime.utcnow()
        self.duration = (self.completed_at - self.started_at).total_seconds()
        if error_details:
            self.error_details = error_details
```

### Update Workflow Model (add relationship)

```python
# In backend/app/models/workflow.py, add:
transactions = relationship("Transaction", back_populates="workflow")
```

### Transaction Repository (backend/app/repositories/transaction_repository.py)

```python
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.models.transaction import Transaction, TransactionStatus
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID

class TransactionRepository(BaseRepository[Transaction]):
    def __init__(self, db):
        super().__init__(Transaction, db)

    async def get_by_workflow(self, workflow_id: str, skip: int = 0, limit: int = 100) -> List[Transaction]:
        query = select(Transaction).where(
            Transaction.workflow_id == workflow_id
        ).order_by(desc(Transaction.started_at)).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_status(self, status: TransactionStatus, skip: int = 0, limit: int = 100) -> List[Transaction]:
        query = select(Transaction).where(Transaction.status == status).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_recent_transactions(self, limit: int = 50) -> List[Transaction]:
        query = select(Transaction).order_by(desc(Transaction.started_at)).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_transactions_with_workflow(self, skip: int = 0, limit: int = 100, **filters) -> List[Dict[str, Any]]:
        query = select(Transaction).options(
            selectinload(Transaction.workflow)
        ).order_by(desc(Transaction.started_at))

        for key, value in filters.items():
            if hasattr(Transaction, key) and value is not None:
                query = query.where(getattr(Transaction, key) == value)

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        transactions = result.scalars().all()

        return [
            {
                "id": t.id,
                "workflow_id": t.workflow_id,
                "workflow_name": t.workflow.name if t.workflow else None,
                "status": t.status,
                "processed_count": t.processed_count,
                "failed_count": t.failed_count,
                "duration": t.duration,
                "started_at": t.started_at,
                "completed_at": t.completed_at,
                "triggered_by": t.triggered_by
            }
            for t in transactions
        ]

    async def get_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get transaction statistics for dashboard"""
        since_date = datetime.utcnow() - timedelta(days=days)

        # Total counts
        total_query = select(func.count()).select_from(Transaction).where(Transaction.started_at >= since_date)
        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0

        # Success counts
        success_query = select(func.count()).select_from(Transaction).where(
            and_(Transaction.status == TransactionStatus.SUCCESS, Transaction.started_at >= since_date)
        )
        success_result = await self.db.execute(success_query)
        success = success_result.scalar() or 0

        # Failed counts
        failed_query = select(func.count()).select_from(Transaction).where(
            and_(Transaction.status == TransactionStatus.FAILED, Transaction.started_at >= since_date)
        )
        failed_result = await self.db.execute(failed_query)
        failed = failed_result.scalar() or 0

        # In progress
        processing_query = select(func.count()).select_from(Transaction).where(
            and_(Transaction.status == TransactionStatus.PROCESSING, Transaction.started_at >= since_date)
        )
        processing_result = await self.db.execute(processing_query)
        processing = processing_result.scalar() or 0

        # Average duration for successful transactions
        avg_duration_query = select(func.avg(Transaction.duration)).where(
            and_(Transaction.status == TransactionStatus.SUCCESS, Transaction.started_at >= since_date)
        )
        avg_duration_result = await self.db.execute(avg_duration_query)
        avg_duration = avg_duration_result.scalar() or 0

        # Total records processed
        records_query = select(func.sum(Transaction.processed_count)).where(Transaction.started_at >= since_date)
        records_result = await self.db.execute(records_query)
        total_records = records_result.scalar() or 0

        return {
            "total_transactions": total,
            "successful_transactions": success,
            "failed_transactions": failed,
            "processing_transactions": processing,
            "success_rate": round((success / total * 100) if total > 0 else 0, 1),
            "average_duration_seconds": round(avg_duration, 2),
            "total_records_processed": total_records
        }

    async def get_volume_by_month(self, months: int = 6) -> List[Dict[str, Any]]:
        """Get transaction volume grouped by month for charts"""
        from sqlalchemy import extract

        results = []
        for i in range(months):
            month_date = datetime.utcnow() - timedelta(days=30 * (months - i - 1))
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            if i < months - 1:
                next_month = month_date.replace(day=28) + timedelta(days=4)
                month_end = next_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(microseconds=1)
            else:
                month_end = datetime.utcnow()

            # Success count for month
            success_query = select(func.count()).select_from(Transaction).where(
                and_(
                    Transaction.status == TransactionStatus.SUCCESS,
                    Transaction.completed_at >= month_start,
                    Transaction.completed_at <= month_end
                )
            )
            success_result = await self.db.execute(success_query)
            success = success_result.scalar() or 0

            # Failed count for month
            failed_query = select(func.count()).select_from(Transaction).where(
                and_(
                    Transaction.status == TransactionStatus.FAILED,
                    Transaction.completed_at >= month_start,
                    Transaction.completed_at <= month_end
                )
            )
            failed_result = await self.db.execute(failed_query)
            failed = failed_result.scalar() or 0

            results.append({
                "month": month_date.strftime("%b"),
                "success": success,
                "failed": failed
            })

        return results
```

### Transaction Schemas (backend/app/schemas/transaction.py)

```python
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models.transaction import TransactionStatus

class TransactionBase(BaseModel):
    workflow_id: UUID
    triggered_by: str

class TransactionCreate(TransactionBase):
    pass

class TransactionInDB(TransactionBase):
    id: str
    status: TransactionStatus
    processed_count: int = 0
    failed_count: int = 0
    duration: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_details: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class TransactionResponse(TransactionInDB):
    workflow_name: Optional[str] = None

class TransactionDetailResponse(TransactionResponse):
    source_data_summary: Optional[Dict[str, Any]] = None
    destination_response: Optional[Dict[str, Any]] = None

class TransactionStatsResponse(BaseModel):
    total_transactions: int
    successful_transactions: int
    failed_transactions: int
    processing_transactions: int
    success_rate: float
    average_duration_seconds: float
    total_records_processed: int

class TransactionVolumeResponse(BaseModel):
    month: str
    success: int
    failed: int
```

---

## TASK 2: Transaction Service & API Endpoints

### Transaction Service (backend/app/services/transaction_service.py)

```python
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.transaction import TransactionCreate
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional, List, Dict, Any
from datetime import datetime

class TransactionService:
    def __init__(self, db: AsyncSession):
        self.repo = TransactionRepository(db)

    async def create_transaction(self, workflow_id: UUID, triggered_by: str) -> Dict[str, Any]:
        """Create a new transaction record"""
        transaction = await self.repo.create(
            workflow_id=str(workflow_id),
            triggered_by=triggered_by,
            status="pending",
            started_at=datetime.utcnow()
        )

        return {
            "id": transaction.id,
            "workflow_id": transaction.workflow_id,
            "status": transaction.status,
            "started_at": transaction.started_at
        }

    async def update_transaction_status(
        self,
        transaction_id: str,
        status: str,
        processed_count: int = None,
        failed_count: int = None,
        error_details: dict = None,
        source_data_summary: dict = None,
        destination_response: dict = None
    ):
        """Update transaction status and metrics"""
        update_data = {"status": status}

        if processed_count is not None:
            update_data["processed_count"] = processed_count
        if failed_count is not None:
            update_data["failed_count"] = failed_count
        if error_details is not None:
            update_data["error_details"] = error_details
        if source_data_summary is not None:
            update_data["source_data_summary"] = source_data_summary
        if destination_response is not None:
            update_data["destination_response"] = destination_response

        if status in ["success", "failed", "cancelled"]:
            update_data["completed_at"] = datetime.utcnow()
            if processed_count is not None and failed_count is not None:
                update_data["duration"] = (
                    datetime.utcnow() - (await self.get_transaction(transaction_id))["started_at"]
                ).total_seconds()

        return await self.repo.update(transaction_id, **update_data)

    async def get_transaction(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """Get transaction by ID"""
        transaction = await self.repo.get_by_id(transaction_id)
        if not transaction:
            return None

        return {
            "id": transaction.id,
            "workflow_id": transaction.workflow_id,
            "status": transaction.status,
            "processed_count": transaction.processed_count,
            "failed_count": transaction.failed_count,
            "duration": transaction.duration,
            "started_at": transaction.started_at,
            "completed_at": transaction.completed_at,
            "error_details": transaction.error_details,
            "triggered_by": transaction.triggered_by,
            "source_data_summary": transaction.source_data_summary,
            "destination_response": transaction.destination_response
        }

    async def get_all_transactions(
        self,
        skip: int = 0,
        limit: int = 100,
        workflow_id: Optional[UUID] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all transactions with filters"""
        filters = {}
        if workflow_id:
            filters["workflow_id"] = str(workflow_id)
        if status:
            filters["status"] = status

        return await self.repo.get_transactions_with_workflow(skip=skip, limit=limit, **filters)

    async def get_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get transaction statistics"""
        return await self.repo.get_stats(days=days)

    async def get_volume_by_month(self, months: int = 6) -> List[Dict[str, Any]]:
        """Get transaction volume by month"""
        return await self.repo.get_volume_by_month(months=months)
```

### Transaction Endpoints (backend/app/api/api_v1/endpoints/transactions.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.transaction import (
    TransactionResponse, TransactionDetailResponse,
    TransactionStatsResponse, TransactionVolumeResponse
)
from app.services.transaction_service import TransactionService
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    workflow_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all transactions with optional filters"""
    transaction_service = TransactionService(db)
    transactions = await transaction_service.get_all_transactions(
        skip=skip, limit=limit, workflow_id=workflow_id, status=status
    )
    return transactions

@router.get("/{transaction_id}", response_model=TransactionDetailResponse)
async def get_transaction(
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get transaction details by ID"""
    transaction_service = TransactionService(db)
    transaction = await transaction_service.get_transaction(transaction_id)

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return transaction

@router.get("/stats/overview", response_model=TransactionStatsResponse)
async def get_transaction_stats(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get transaction statistics for dashboard"""
    transaction_service = TransactionService(db)
    stats = await transaction_service.get_stats(days=days)
    return stats

@router.get("/stats/volume", response_model=List[TransactionVolumeResponse])
async def get_transaction_volume(
    months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get transaction volume by month for charts"""
    transaction_service = TransactionService(db)
    volume = await transaction_service.get_volume_by_month(months=months)
    return volume
```

### Update API Router (backend/app/api/api_v1/api.py)

```python
from app.api.api_v1.endpoints import transactions

api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
```

---

## TASK 3: Workflow Executor (Celery Task)

### Workflow Executor Task (backend/app/tasks/workflow_tasks.py)

```python
import asyncio
import logging
from celery import shared_task
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.services.workflow_service import WorkflowService
from app.services.transaction_service import TransactionService
from app.services.mapping_engine import MappingEngine
from app.services.connection_service import ConnectionService
from app.core.database import get_db
from app.models.workflow import WorkflowStatus
from app.models.transaction import TransactionStatus
from datetime import datetime
from typing import Dict, Any, List
import hvac
import traceback

logger = logging.getLogger(__name__)

# Initialize Vault client
vault_client = hvac.Client(
    url=settings.VAULT_ADDR,
    token=settings.VAULT_TOKEN
)

@shared_task(name="execute_workflow", bind=True, max_retries=3, default_retry_delay=60)
def execute_workflow(self, workflow_id: str, transaction_id: str):
    """
    Execute a workflow:
    1. Fetch workflow details
    2. Get source connection adapter
    3. Fetch data from source
    4. Apply mappings
    5. Send transformed data to destination
    6. Update transaction record
    """
    # Run async function synchronously
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(_execute_workflow_async(workflow_id, transaction_id))
        return result
    except Exception as e:
        logger.error(f"Workflow execution failed: {str(e)}")
        loop.run_until_complete(_mark_transaction_failed(transaction_id, str(e), traceback.format_exc()))
        raise self.retry(exc=e)
    finally:
        loop.close()

async def _execute_workflow_async(workflow_id: str, transaction_id: str) -> Dict[str, Any]:
    """Async implementation of workflow execution"""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        try:
            # Update transaction status to processing
            transaction_service = TransactionService(db)
            await transaction_service.update_transaction_status(
                transaction_id,
                TransactionStatus.PROCESSING.value
            )
            await db.commit()

            # Get workflow details
            workflow_service = WorkflowService(db)
            workflow = await workflow_service.get_workflow(workflow_id, include_details=True)

            if not workflow:
                raise ValueError(f"Workflow {workflow_id} not found")

            if workflow['status'] != WorkflowStatus.ACTIVE.value:
                raise ValueError(f"Workflow {workflow_id} is not active (status: {workflow['status']})")

            logger.info(f"Executing workflow: {workflow['name']} (ID: {workflow_id})")

            # Get source and destination connections
            connection_service = ConnectionService(db, vault_client)

            source_connection = await connection_service.get_connection(workflow['source_connection_id'])
            dest_connection = await connection_service.get_connection(workflow['destination_connection_id'])

            if not source_connection or not dest_connection:
                raise ValueError("Source or destination connection not found")

            # Load mappings
            mapping_engine = await MappingEngine.load_from_db(db, workflow_id)

            # Get source adapter and fetch data
            from app.adapters import get_adapter
            source_adapter = get_adapter(source_connection, vault_client)
            dest_adapter = get_adapter(dest_connection, vault_client)

            # Fetch data from source
            logger.info(f"Fetching data from source: {source_connection['name']}")
            source_data = await source_adapter.fetch_data({})

            if not source_data:
                logger.warning("No data fetched from source")
                await transaction_service.update_transaction_status(
                    transaction_id,
                    TransactionStatus.SUCCESS.value,
                    processed_count=0,
                    failed_count=0,
                    source_data_summary={"records_fetched": 0}
                )
                await db.commit()
                return {"workflow_id": workflow_id, "processed": 0, "failed": 0}

            # Handle different data formats
            if isinstance(source_data, dict) and 'records' in source_data:
                records = source_data['records']
            elif isinstance(source_data, list):
                records = source_data
            else:
                records = [source_data]

            logger.info(f"Fetched {len(records)} records from source")

            # Apply mappings to each record
            transformed_records = []
            failed_records = []

            for idx, record in enumerate(records):
                try:
                    transformed = mapping_engine.apply(record)
                    transformed_records.append(transformed)
                except Exception as e:
                    logger.error(f"Failed to transform record {idx}: {str(e)}")
                    failed_records.append({"index": idx, "error": str(e), "record": record})

            logger.info(f"Transformed {len(transformed_records)} records, {len(failed_records)} failed")

            # Send transformed data to destination
            destination_response = None
            if transformed_records:
                try:
                    # Send in batches if large dataset
                    batch_size = 100
                    all_responses = []

                    for i in range(0, len(transformed_records), batch_size):
                        batch = transformed_records[i:i+batch_size]
                        batch_response = await dest_adapter.send_data(
                            batch if len(batch) > 1 else batch[0]
                        )
                        all_responses.append(batch_response)

                    destination_response = {"batches_sent": len(all_responses), "responses": all_responses}
                    logger.info(f"Successfully sent {len(transformed_records)} records to destination")

                except Exception as e:
                    logger.error(f"Failed to send data to destination: {str(e)}")
                    raise ValueError(f"Destination send failed: {str(e)}")

            # Update transaction with success
            await transaction_service.update_transaction_status(
                transaction_id,
                TransactionStatus.SUCCESS.value,
                processed_count=len(transformed_records),
                failed_count=len(failed_records),
                source_data_summary={
                    "records_fetched": len(records),
                    "records_transformed": len(transformed_records)
                },
                destination_response=destination_response,
                error_details={"failed_records": failed_records} if failed_records else None
            )

            # Update workflow statistics
            await workflow_service.update_workflow_stats(
                workflow_id,
                success=True,
                run_time=datetime.utcnow()
            )

            await db.commit()

            logger.info(f"Workflow {workflow_id} completed successfully. Processed: {len(transformed_records)}, Failed: {len(failed_records)}")

            return {
                "workflow_id": workflow_id,
                "transaction_id": transaction_id,
                "processed": len(transformed_records),
                "failed": len(failed_records),
                "status": "success"
            }

        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}")
            await _mark_transaction_failed(transaction_id, str(e), traceback.format_exc())
            raise

    await engine.dispose()

async def _mark_transaction_failed(transaction_id: str, error: str, traceback_str: str):
    """Mark transaction as failed"""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        transaction_service = TransactionService(db)
        await transaction_service.update_transaction_status(
            transaction_id,
            TransactionStatus.FAILED.value,
            error_details={"error": error, "traceback": traceback_str}
        )
        await db.commit()

    await engine.dispose()
```

### Workflow Service Update (add stats update method)

Add to `backend/app/services/workflow_service.py`:

```python
async def update_workflow_stats(self, workflow_id: str, success: bool, run_time: datetime):
    """Update workflow run statistics"""
    return await self.repo.update_run_stats(workflow_id, success, run_time)
```

---

## TASK 4: WebSocket Manager for Real-time Updates

### WebSocket Manager (backend/app/core/websocket.py)

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, Any
import json
import logging

logger = logging.getLogger(__name__)

class WebSocketManager:
    """Manages WebSocket connections and broadcasts"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept WebSocket connection and store it"""
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        self.user_connections[user_id] = websocket

        logger.info(f"WebSocket connected for user {user_id}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove WebSocket connection"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                del self.user_connections[user_id]

        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        """Send message to a specific user"""
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {str(e)}")
                self.disconnect(self.user_connections[user_id], user_id)

    async def broadcast_transaction_update(self, transaction_data: dict, workflow_id: str = None):
        """Broadcast transaction update to relevant users"""
        message = {
            "type": "transaction_update",
            "data": transaction_data
        }

        # For now, broadcast to all connected users
        # In production, you might want to filter by workflow permissions
        for user_id, websocket in self.user_connections.items():
            await self.send_personal_message(message, user_id)

    async def broadcast_system_alert(self, alert_data: dict):
        """Broadcast system alert to all connected users"""
        message = {
            "type": "system_alert",
            "data": alert_data
        }

        for user_id, websocket in self.user_connections.items():
            await self.send_personal_message(message, user_id)

# Singleton instance
websocket_manager = WebSocketManager()
```

### WebSocket Endpoint (backend/app/api/api_v1/endpoints/websocket.py)

```python
from fastapi import WebSocket, WebSocketDisconnect, Depends
from app.core.websocket import websocket_manager
from app.core.dependencies import get_current_user_ws
from app.models.user import User

async def websocket_endpoint(
    websocket: WebSocket,
    user: User = Depends(get_current_user_ws)
):
    """WebSocket endpoint for real-time updates"""
    await websocket_manager.connect(websocket, str(user.id))

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connection_established",
            "message": "Connected to Interxchange real-time updates",
            "user_id": str(user.id)
        })

        # Keep connection alive and handle incoming messages
        while True:
            # Receive client messages (for ping/pong or subscription management)
            data = await websocket.receive_text()

            # Handle ping
            if data == "ping":
                await websocket.send_json({"type": "pong"})

            # Handle subscription requests
            try:
                message = json.loads(data)
                if message.get("type") == "subscribe_transactions":
                    # Store subscription preferences if needed
                    await websocket.send_json({
                        "type": "subscription_confirmed",
                        "subscription": "transactions"
                    })
            except:
                pass

    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, str(user.id))
```

### WebSocket Auth Dependency (backend/app/core/dependencies.py)

Add to `backend/app/core/dependencies.py`:

```python
from fastapi import WebSocket, WebSocketException, status
from app.core.security import decode_token
from app.core.config import settings

async def get_current_user_ws(websocket: WebSocket) -> User:
    """Get current user from WebSocket connection"""
    # Get token from query parameters
    token = websocket.query_params.get("token")

    if not token:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")

    # Decode token
    payload = decode_token(token, settings.JWT_SECRET_KEY, "access")
    if payload is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token payload")

    # Get user from database
    from app.core.database import get_db
    from app.repositories.user_repository import UserRepository

    async for db in get_db():
        user_repo = UserRepository(db)
        user = await user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="User not found or inactive")
        return user
```

### Add WebSocket Route to Main App (backend/app/main.py)

```python
from app.api.api_v1.endpoints.websocket import websocket_endpoint

app.websocket("/ws")(websocket_endpoint)
```

### Integrate WebSocket Broadcast in Transaction Updates

Update `backend/app/services/transaction_service.py`:

```python
from app.core.websocket import websocket_manager

async def update_transaction_status(self, transaction_id: str, status: str, ...):
    # ... existing code ...

    # Broadcast update via WebSocket
    try:
        transaction = await self.get_transaction(transaction_id)
        await websocket_manager.broadcast_transaction_update(transaction)
    except Exception as e:
        logger.error(f"Failed to broadcast transaction update: {str(e)}")
```

---

## TASK 5: Adapter Base Class & Implementations

### Base Adapter (backend/app/adapters/base_adapter.py)

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.models.connection import Connection
import hvac
import logging

logger = logging.getLogger(__name__)

class BaseAdapter(ABC):
    """Base class for all external system adapters"""

    def __init__(self, connection: Dict[str, Any], vault_client: hvac.Client):
        self.connection = connection
        self.vault_client = vault_client
        self.credentials = self._get_credentials()

    def _get_credentials(self) -> Dict[str, Any]:
        """Retrieve credentials from Vault"""
        try:
            secret_path = self.connection.get('credentials_encrypted')
            if secret_path:
                secret = self.vault_client.secrets.kv.v2.read_secret_version(path=secret_path)
                return secret['data']['data']
        except Exception as e:
            logger.error(f"Failed to retrieve credentials from Vault: {str(e)}")
        return {}

    @abstractmethod
    async def test_connection(self) -> bool:
        """Test connectivity and authentication to the external system"""
        pass

    @abstractmethod
    async def fetch_data(self, params: Dict[str, Any]) -> Any:
        """Fetch data from the source system"""
        pass

    @abstractmethod
    async def send_data(self, data: Any, target: Optional[str] = None) -> Dict[str, Any]:
        """Send data to the destination system"""
        pass

    @abstractmethod
    async def handle_request(self, request_data: Dict[str, Any], route_config: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming request for channel routing"""
        pass
```

### DHIS2 Adapter (backend/app/adapters/dhis2_adapter.py)

```python
import httpx
from typing import Dict, Any, Optional
from app.adapters.base_adapter import BaseAdapter
import logging

logger = logging.getLogger(__name__)

class DHIS2Adapter(BaseAdapter):
    """Adapter for DHIS2 API"""

    async def test_connection(self) -> bool:
        """Test connection to DHIS2 instance"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.connection['url']}/api/me",
                    auth=(self.credentials.get('username'), self.credentials.get('password'))
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"DHIS2 connection test failed: {str(e)}")
            return False

    async def fetch_data(self, params: Dict[str, Any]) -> Any:
        """Fetch data from DHIS2"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Build query parameters
                query_params = {}
                if 'data_set' in params:
                    query_params['dataSet'] = params['data_set']
                if 'org_unit' in params:
                    query_params['orgUnit'] = params['org_unit']
                if 'period' in params:
                    query_params['period'] = params['period']
                if 'last_updated' in params:
                    query_params['lastUpdated'] = params['last_updated']

                response = await client.get(
                    f"{self.connection['url']}/api/dataValueSets",
                    params=query_params,
                    auth=(self.credentials.get('username'), self.credentials.get('password'))
                )

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "records": data.get('dataValues', []),
                        "metadata": {
                            "org_unit": data.get('orgUnit'),
                            "period": data.get('period'),
                            "data_set": data.get('dataSet')
                        }
                    }
                else:
                    raise Exception(f"DHIS2 API error: {response.status_code} - {response.text}")

        except Exception as e:
            logger.error(f"Failed to fetch data from DHIS2: {str(e)}")
            raise

    async def send_data(self, data: Any, target: Optional[str] = None) -> Dict[str, Any]:
        """Send data to DHIS2"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "dataValues": data if isinstance(data, list) else [data]
                }

                response = await client.post(
                    f"{self.connection['url']}/api/dataValueSets",
                    json=payload,
                    auth=(self.credentials.get('username'), self.credentials.get('password'))
                )

                if response.status_code in [200, 201, 202]:
                    result = response.json()
                    return {
                        "success": True,
                        "imported": result.get('imported', 0),
                        "updated": result.get('updated', 0),
                        "ignored": result.get('ignored', 0),
                        "message": "Data sent successfully"
                    }
                else:
                    raise Exception(f"DHIS2 send error: {response.status_code} - {response.text}")

        except Exception as e:
            logger.error(f"Failed to send data to DHIS2: {str(e)}")
            raise

    async def handle_request(self, request_data: Dict[str, Any], route_config: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming webhook request for DHIS2"""
        # Transform and forward request based on route config
        transformed = request_data
        if 'transformations' in route_config:
            for transform in route_config['transformations']:
                # Apply transformation logic
                if transform.get('type') == 'extract_field':
                    field_path = transform.get('field')
                    transformed = transformed.get(field_path, {})

        # Send to target
        target_url = route_config.get('target')
        if target_url:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(target_url, json=transformed)
                return {"forwarded": True, "status_code": response.status_code}

        return {"handled": True, "data": transformed}
```

### Generic HTTP Adapter (backend/app/adapters/generic_adapter.py)

```python
import httpx
from typing import Dict, Any, Optional
from app.adapters.base_adapter import BaseAdapter
import logging

logger = logging.getLogger(__name__)

class GenericAdapter(BaseAdapter):
    """Generic HTTP adapter for any REST API"""

    async def test_connection(self) -> bool:
        """Test connection to the endpoint"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = self._get_headers()
                response = await client.get(
                    self.connection['url'],
                    headers=headers,
                    timeout=10.0
                )
                return response.status_code < 500
        except Exception as e:
            logger.error(f"Generic connection test failed: {str(e)}")
            return False

    def _get_headers(self) -> Dict[str, str]:
        """Build authentication headers based on auth type"""
        headers = {}
        auth_type = self.connection.get('auth_type')

        if auth_type == 'basic':
            # Basic auth handled by client
            pass
        elif auth_type == 'api_key':
            api_key = self.credentials.get('api_key')
            key_header = self.credentials.get('key_header', 'X-API-Key')
            headers[key_header] = api_key
        elif auth_type == 'bearer':
            token = self.credentials.get('token')
            headers['Authorization'] = f"Bearer {token}"

        return headers

    def _get_auth(self):
        """Get auth tuple for basic auth"""
        if self.connection.get('auth_type') == 'basic':
            return (self.credentials.get('username'), self.credentials.get('password'))
        return None

    async def fetch_data(self, params: Dict[str, Any]) -> Any:
        """Fetch data from generic HTTP endpoint"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                method = params.get('method', 'GET').upper()
                url = params.get('url', self.connection['url'])
                headers = {**self._get_headers(), **params.get('headers', {})}
                auth = self._get_auth()

                if method == 'GET':
                    response = await client.get(
                        url,
                        params=params.get('params', {}),
                        headers=headers,
                        auth=auth
                    )
                elif method == 'POST':
                    response = await client.post(
                        url,
                        json=params.get('data', {}),
                        headers=headers,
                        auth=auth
                    )
                else:
                    response = await client.request(
                        method,
                        url,
                        json=params.get('data', {}),
                        headers=headers,
                        auth=auth
                    )

                if response.status_code < 400:
                    return response.json()
                else:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")

        except Exception as e:
            logger.error(f"Failed to fetch data from generic endpoint: {str(e)}")
            raise

    async def send_data(self, data: Any, target: Optional[str] = None) -> Dict[str, Any]:
        """Send data to generic HTTP endpoint"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                target_url = target or self.connection['url']
                headers = self._get_headers()
                headers['Content-Type'] = 'application/json'
                auth = self._get_auth()

                response = await client.post(
                    target_url,
                    json=data,
                    headers=headers,
                    auth=auth
                )

                return {
                    "success": response.status_code < 400,
                    "status_code": response.status_code,
                    "response": response.json() if response.status_code < 400 else response.text
                }

        except Exception as e:
            logger.error(f"Failed to send data to generic endpoint: {str(e)}")
            raise

    async def handle_request(self, request_data: Dict[str, Any], route_config: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming request for generic channel"""
        # Forward to target as-is
        target_url = route_config.get('target')
        if target_url:
            async with httpx.AsyncClient(timeout=30.0) as client:
                method = route_config.get('method', 'POST')
                response = await client.request(
                    method,
                    target_url,
                    json=request_data,
                    headers=self._get_headers()
                )
                return {"forwarded": True, "status_code": response.status_code, "response": response.json()}

        return {"handled": True, "data": request_data}
```

### Adapter Factory (backend/app/adapters/**init**.py)

```python
from typing import Dict, Any
from app.adapters.base_adapter import BaseAdapter
from app.adapters.dhis2_adapter import DHIS2Adapter
from app.adapters.generic_adapter import GenericAdapter
import hvac

def get_adapter(connection: Dict[str, Any], vault_client: hvac.Client) -> BaseAdapter:
    """Factory method to get the appropriate adapter for a connection"""
    connection_type = connection.get('type')

    if connection_type == 'dhis2':
        return DHIS2Adapter(connection, vault_client)
    elif connection_type == 'generic':
        return GenericAdapter(connection, vault_client)
    # Add more adapters as needed (OpenHIM, OpenFN, FHIR, HL7)
    else:
        return GenericAdapter(connection, vault_client)
```

---

## TASK 6: Frontend - Transactions Page

### Transactions Types (frontend/src/types/transaction.ts)

```typescript
export type TransactionStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "cancelled";

export interface Transaction {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: TransactionStatus;
  processed_count: number;
  failed_count: number;
  duration: number | null;
  started_at: string;
  completed_at: string | null;
  triggered_by: string;
}

export interface TransactionDetail extends Transaction {
  error_details?: {
    error?: string;
    failed_records?: Array<{ index: number; error: string; record: any }>;
  };
  source_data_summary?: {
    records_fetched: number;
    records_transformed: number;
  };
  destination_response?: {
    batches_sent: number;
    responses: any[];
  };
}

export interface TransactionStats {
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  processing_transactions: number;
  success_rate: number;
  average_duration_seconds: number;
  total_records_processed: number;
}

export interface TransactionVolume {
  month: string;
  success: number;
  failed: number;
}
```

### Transactions API Service (frontend/src/features/transactions/transactionsApi.ts)

```typescript
import api from "../../utils/api";
import {
  Transaction,
  TransactionDetail,
  TransactionStats,
  TransactionVolume,
} from "../../types/transaction";

export const transactionsApi = {
  getTransactions: async (params?: {
    workflow_id?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get<Transaction[]>("/transactions", { params });
    return response.data;
  },

  getTransaction: async (id: string) => {
    const response = await api.get<TransactionDetail>(`/transactions/${id}`);
    return response.data;
  },

  getStats: async (days: number = 30) => {
    const response = await api.get<TransactionStats>(
      "/transactions/stats/overview",
      {
        params: { days },
      },
    );
    return response.data;
  },

  getVolume: async (months: number = 6) => {
    const response = await api.get<TransactionVolume[]>(
      "/transactions/stats/volume",
      {
        params: { months },
      },
    );
    return response.data;
  },
};
```

### Transactions Slice (frontend/src/features/transactions/transactionsSlice.ts)

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { transactionsApi } from "./transactionsApi";
import {
  Transaction,
  TransactionStats,
  TransactionVolume,
} from "../../types/transaction";

interface TransactionsState {
  transactions: Transaction[];
  currentTransaction: Transaction | null;
  stats: TransactionStats | null;
  volume: TransactionVolume[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
}

const initialState: TransactionsState = {
  transactions: [],
  currentTransaction: null,
  stats: null,
  volume: [],
  isLoading: false,
  error: null,
  totalCount: 0,
};

export const fetchTransactions = createAsyncThunk(
  "transactions/fetchTransactions",
  async (params?: {
    workflow_id?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }) => {
    return await transactionsApi.getTransactions(params);
  },
);

export const fetchTransactionById = createAsyncThunk(
  "transactions/fetchTransactionById",
  async (id: string) => {
    return await transactionsApi.getTransaction(id);
  },
);

export const fetchTransactionStats = createAsyncThunk(
  "transactions/fetchTransactionStats",
  async (days?: number) => {
    return await transactionsApi.getStats(days);
  },
);

export const fetchTransactionVolume = createAsyncThunk(
  "transactions/fetchTransactionVolume",
  async (months?: number) => {
    return await transactionsApi.getVolume(months);
  },
);

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    clearCurrentTransaction: (state) => {
      state.currentTransaction = null;
    },
    updateTransactionFromWebSocket: (
      state,
      action: PayloadAction<Transaction>,
    ) => {
      const index = state.transactions.findIndex(
        (t) => t.id === action.payload.id,
      );
      if (index !== -1) {
        state.transactions[index] = action.payload;
      }
      if (state.currentTransaction?.id === action.payload.id) {
        state.currentTransaction = action.payload;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions = action.payload;
        state.totalCount = action.payload.length;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch transactions";
      })
      .addCase(fetchTransactionById.fulfilled, (state, action) => {
        state.currentTransaction = action.payload;
      })
      .addCase(fetchTransactionStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchTransactionVolume.fulfilled, (state, action) => {
        state.volume = action.payload;
      });
  },
});

export const {
  clearCurrentTransaction,
  updateTransactionFromWebSocket,
  clearError,
} = transactionsSlice.actions;
export default transactionsSlice.reducer;
```

### WebSocket Hook (frontend/src/hooks/useWebSocket.ts)

```typescript
import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "../store";
import { updateTransactionFromWebSocket } from "../features/transactions/transactionsSlice";

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Get token from cookies or localStorage
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    if (!token) {
      console.warn("No access token found for WebSocket connection");
      return;
    }

    const wsUrl = `${process.env.REACT_APP_WS_URL || "ws://localhost:8000"}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      // Subscribe to transaction updates
      ws.send(JSON.stringify({ type: "subscribe_transactions" }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "transaction_update") {
          dispatch(updateTransactionFromWebSocket(message.data));
        } else if (message.type === "pong") {
          // Heartbeat response
        } else if (message.type === "connection_established") {
          console.log("WebSocket connection established:", message);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    // Heartbeat ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [dispatch]);

  return { isConnected };
};
```

### Transactions Page (frontend/src/features/transactions/TransactionsPage.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  CircularProgress,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTransactions, fetchTransactionStats, fetchTransactionVolume } from './transactionsSlice';
import { useWebSocket } from '../../hooks/useWebSocket';
import TransactionDetailDrawer from './TransactionDetailDrawer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell } from 'recharts';

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  success: 'success',
  failed: 'error',
  processing: 'info',
  pending: 'warning',
  cancelled: 'default'
};

const statusIcons: Record<string, JSX.Element> = {
  success: <CheckCircleIcon fontSize="small" />,
  failed: <ErrorIcon fontSize="small" />,
  processing: <ScheduleIcon fontSize="small" />,
  pending: <PendingIcon fontSize="small" />
};

const TransactionsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { transactions, stats, volume, isLoading } = useAppSelector(state => state.transactions);
  const { isConnected } = useWebSocket();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  useEffect(() => {
    loadData();

    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchTransactionStats());
      dispatch(fetchTransactionVolume());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const loadData = () => {
    const params: any = { skip: (page - 1) * pageSize, limit: pageSize };
    if (statusFilter !== 'all') params.status = statusFilter;

    dispatch(fetchTransactions(params));
    dispatch(fetchTransactionStats());
    dispatch(fetchTransactionVolume());
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transaction.workflow_name && transaction.workflow_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setDetailDrawerOpen(true);
  };

  // Prepare chart data
  const volumeData = volume.map(v => ({
    month: v.month,
    Success: v.success,
    Failed: v.failed
  }));

  const pieData = stats ? [
    { name: 'Successful', value: stats.successful_transactions, color: '#4caf50' },
    { name: 'Failed', value: stats.failed_transactions, color: '#f44336' },
    { name: 'Processing', value: stats.processing_transactions, color: '#2196f3' }
  ] : [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Transactions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor and audit all data exchange transactions
          </Typography>
          {!isConnected && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Real-time updates disconnected. Reconnecting...
            </Alert>
          )}
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={loadData}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Transactions</Typography>
                <Typography variant="h3">{stats.total_transactions.toLocaleString()}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Success rate: {stats.success_rate}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: 4, borderLeftColor: 'success.main' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Successful</Typography>
                <Typography variant="h3" color="success.main">{stats.successful_transactions.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: 4, borderLeftColor: 'error.main' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Failed</Typography>
                <Typography variant="h3" color="error.main">{stats.failed_transactions.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Records Processed</Typography>
                <Typography variant="h3">{stats.total_records_processed.toLocaleString()}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Avg duration: {formatDuration(stats.average_duration_seconds)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Transaction Volume</Typography>
            <BarChart width={600} height={300} data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="Success" fill="#4caf50" />
              <Bar dataKey="Failed" fill="#f44336" />
            </BarChart>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Workflow Status</Typography>
            <PieChart width={300} height={300}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search by ID or workflow..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Transactions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Transaction ID</TableCell>
              <TableCell>Workflow</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Processed / Failed</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Time</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">No transactions found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {transaction.id}
                    </Typography>
                  </TableCell>
                  <TableCell>{transaction.workflow_name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      icon={statusIcons[transaction.status]}
                      label={transaction.status.toUpperCase()}
                      color={statusColors[transaction.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {transaction.processed_count.toLocaleString()} / {transaction.failed_count.toLocaleString()}
                  </TableCell>
                  <TableCell>{formatDuration(transaction.duration)}</TableCell>
                  <TableCell>{formatDate(transaction.started_at)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => handleViewDetails(transaction)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {filteredTransactions.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={Math.ceil(filteredTransactions.length / pageSize)}
            page={page}
            onChange={(_, value) => setPage(value)}
          />
        </Box>
      )}

      {/* Detail Drawer */}
      <TransactionDetailDrawer
        open={detailDrawerOpen}
        transaction={selectedTransaction}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedTransaction(null);
        }}
      />
    </Box>
  );
};

export default TransactionsPage;
```

### Add to Store (frontend/src/store/index.ts)

```typescript
import transactionsReducer from "../features/transactions/transactionsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    mappings: mappingsReducer,
    workflows: workflowsReducer,
    channels: channelsReducer,
    transactions: transactionsReducer,
  },
});
```

### Update App Routes (frontend/src/App.tsx)

```typescript
import TransactionsPage from './features/transactions/TransactionsPage';

// Add route
<Route
  path="/transactions"
  element={
    <ProtectedRoute>
      <MainLayout>
        <TransactionsPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

---

## TASK 7: Dashboard Enhancements

### Dashboard Stats API Integration (frontend/src/features/dashboard/DashboardPage.tsx)

Update existing DashboardPage with real data:

```typescript
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTransactionStats, fetchTransactionVolume } from '../transactions/transactionsSlice';
import { fetchWorkflows } from '../workflows/workflowsSlice';
import { fetchConnections } from '../connections/connectionsSlice';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Grid, Paper, Typography, Box, CircularProgress } from '@mui/material';

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { stats, volume, isLoading: transactionsLoading } = useAppSelector(state => state.transactions);
  const { workflows } = useAppSelector(state => state.workflows);
  const { connections } = useAppSelector(state => state.connections);

  useEffect(() => {
    dispatch(fetchTransactionStats());
    dispatch(fetchTransactionVolume());
    dispatch(fetchWorkflows({}));
    dispatch(fetchConnections());
  }, [dispatch]);

  const activeConnections = connections.filter(c => c.status === 'active').length;
  const activeWorkflows = workflows.filter(w => w.status === 'active').length;

  const workflowStatusData = [
    { name: 'Active', value: workflows.filter(w => w.status === 'active').length, color: '#4caf50' },
    { name: 'Paused', value: workflows.filter(w => w.status === 'paused').length, color: '#ff9800' },
    { name: 'Error', value: workflows.filter(w => w.status === 'error').length, color: '#f44336' },
    { name: 'Draft', value: workflows.filter(w => w.status === 'draft').length, color: '#9e9e9e' }
  ].filter(d => d.value > 0);

  if (transactionsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Connections</Typography>
            <Typography variant="h2">{connections.length}</Typography>
            <Typography variant="body2" color="text.secondary">{activeConnections} active</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Workflows</Typography>
            <Typography variant="h2">{workflows.length}</Typography>
            <Typography variant="body2" color="text.secondary">{activeWorkflows} active</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Transactions</Typography>
            <Typography variant="h2">{stats?.total_transactions.toLocaleString() || 0}</Typography>
            <Typography variant="body2" color="text.secondary">
              ~{stats?.success_rate || 0}% success rate
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">Records Processed</Typography>
            <Typography variant="h2">{stats?.total_records_processed.toLocaleString() || 0}</Typography>
            <Typography variant="body2" color="text.secondary">
              {stats?.failed_transactions || 0} failed transactions
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Transaction Volume</Typography>
            <BarChart width={600} height={300} data={volume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="success" fill="#4caf50" name="Success" />
              <Bar dataKey="failed" fill="#f44336" name="Failed" />
            </BarChart>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Workflow Status</Typography>
            {workflowStatusData.length > 0 ? (
              <PieChart width={300} height={300}>
                <Pie
                  data={workflowStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {workflowStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <Typography color="text.secondary" align="center">No workflow data</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
```

---

## DELIVERABLES CHECKLIST

Before considering Phase 4 complete, ensure all items below are implemented and working:

### Backend

- [ ] Transaction database model with status enum
- [ ] Alembic migration created and applied
- [ ] Transaction repository with queries and statistics
- [ ] Transaction service with business logic
- [ ] Transaction API endpoints (list, detail, stats, volume)
- [ ] Workflow executor Celery task (fetch → map → send)
- [ ] Mapping engine integration in executor
- [ ] Adapter base class and implementations (DHIS2, Generic)
- [ ] WebSocket manager for real-time updates
- [ ] WebSocket endpoint with auth
- [ ] Transaction WebSocket broadcasts
- [ ] Unit and integration tests

### Frontend

- [ ] Transaction types/interfaces
- [ ] Transactions API service
- [ ] Redux slice for transactions
- [ ] WebSocket hook for real-time updates
- [ ] Transactions page with:
  - [ ] Summary stats cards
  - [ ] Transaction volume chart
  - [ ] Workflow status pie chart
  - [ ] Transactions table with filters
  - [ ] Pagination
  - [ ] Detail drawer
  - [ ] Real-time updates via WebSocket
- [ ] Dashboard updated with real data
- [ ] Route integration

### Integration

- [ ] Celery worker running with Redis
- [ ] Workflow execution triggers transaction creation
- [ ] WebSocket updates on transaction status change
- [ ] Real-time table updates in frontend

---

## NOTES FOR GEMINI

1. **Follow the coding standards** defined in section 11 of the GEMINI.md file
2. **Use the ✅/❌ examples** as guidance for quality code
3. **Generate tests** for all new functionality (aim for >80% coverage)
4. **Error handling**: Implement robust error handling with retries and dead letter queues
5. **Performance**: Use batch processing for large datasets (100 records per batch)
6. **Celery**: Ensure proper configuration with Redis as broker
7. **WebSocket**: Handle reconnection logic on frontend
8. **Commit messages** should follow conventional commits format

---

**Begin Phase 4 implementation now. Provide code files in your response, organized by the directory structure above. After completing each major component, indicate progress and ask for feedback if needed.**
