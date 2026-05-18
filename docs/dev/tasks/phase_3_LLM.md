# Phase 3 Implementation Prompt for Gemini

Based on the **Interxchange GEMINI.md** development guide, here is a comprehensive prompt for the Gemini AI agent to execute **Phase 3: Workflow & Channel Management**.

---

## PROMPT: Implement Interxchange Phase 3 - Workflow & Channel Management

You are the **Gemini AI agent** tasked with implementing **Phase 3: Workflow & Channel Management** of the Interxchange interoperability platform according to the specifications in the `GEMINI.md` development guide.

### Phase 3 Scope (5 days)

- Workflow models, API, UI (source/destination connections, schedule, status)
- Channel models, API, UI (URL patterns, methods, protocols, routes)
- Scheduler integration (Celery Beat for scheduled workflows)

### Timeline Expectations

- Day 1: Database models for Workflow and Channel, Alembic migrations
- Day 2: Workflow API endpoints (CRUD, trigger, history)
- Day 3: Channel API endpoints (CRUD, enable/disable, dynamic routing)
- Day 4: Frontend Workflows page (cards, create/edit modal)
- Day 5: Frontend Channels page (table, modal) + Scheduler integration

---

## TASK 1: Database Models for Workflow & Channel

### Workflow Model (backend/app/models/workflow.py)

```python
from sqlalchemy import Column, String, Enum, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum

class WorkflowStatus(enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    DRAFT = "draft"

class Workflow(BaseModel):
    __tablename__ = "workflows"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source_connection_id = Column(String(36), ForeignKey("connections.id", ondelete="RESTRICT"), nullable=False)
    destination_connection_id = Column(String(36), ForeignKey("connections.id", ondelete="RESTRICT"), nullable=False)
    schedule = Column(String(100), nullable=True)  # Cron expression
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_run_status = Column(String(50), nullable=True)
    total_runs = Column(Integer, default=0)
    successful_runs = Column(Integer, default=0)

    # Relationships
    source_connection = relationship("Connection", foreign_keys=[source_connection_id])
    destination_connection = relationship("Connection", foreign_keys=[destination_connection_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    # mappings = relationship("Mapping", back_populates="workflow")
    # transactions = relationship("Transaction", back_populates="workflow")
```

### Channel Model (backend/app/models/channel.py)

```python
from sqlalchemy import Column, String, Enum, Boolean, JSON
from app.models.base import BaseModel
import enum

class ChannelProtocol(enum.Enum):
    HTTP = "http"
    HL7 = "hl7"
    MLLP = "mllp"

class ChannelMethod(enum.Enum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"

class Channel(BaseModel):
    __tablename__ = "channels"

    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    url_pattern = Column(String(500), nullable=False)
    method = Column(Enum(ChannelMethod), nullable=False)
    protocol = Column(Enum(ChannelProtocol), default=ChannelProtocol.HTTP)
    routes = Column(JSON, default=list)  # List of transformation steps and targets
    status = Column(Boolean, default=True)  # Enabled/Disabled
    auth_required = Column(Boolean, default=True)
    rate_limit = Column(Integer, nullable=True)  # Requests per minute
    timeout = Column(Integer, default=30)  # Seconds
    retry_count = Column(Integer, default=3)

    # Optional: link to workflow
    trigger_workflow_id = Column(String(36), ForeignKey("workflows.id", ondelete="SET NULL"), nullable=True)
```

### Update models/**init**.py

```python
from app.models.user import User, UserRole
from app.models.connection import Connection, ConnectionType, AuthType, ConnectionStatus
from app.models.mapping import Mapping, MappingType
from app.models.workflow import Workflow, WorkflowStatus
from app.models.channel import Channel, ChannelProtocol, ChannelMethod
```

### Generate Alembic Migrations

```bash
cd backend
alembic revision --autogenerate -m "Add workflows and channels tables"
alembic upgrade head
```

---

## TASK 2: Pydantic Schemas for Workflow & Channel

### Workflow Schemas (backend/app/schemas/workflow.py)

```python
from pydantic import BaseModel, ConfigDict, Field, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models.workflow import WorkflowStatus

class WorkflowBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    source_connection_id: UUID
    destination_connection_id: UUID
    schedule: Optional[str] = Field(None, description="Cron expression (e.g., '0 */6 * * *' for every 6 hours)")
    status: WorkflowStatus = WorkflowStatus.DRAFT

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    source_connection_id: Optional[UUID] = None
    destination_connection_id: Optional[UUID] = None
    schedule: Optional[str] = None
    status: Optional[WorkflowStatus] = None

    @field_validator('schedule')
    @classmethod
    def validate_cron(cls, v: Optional[str]) -> Optional[str]:
        if v:
            # Basic cron validation (5 fields: minute hour day month weekday)
            parts = v.split()
            if len(parts) != 5:
                raise ValueError('Cron expression must have 5 fields: minute hour day month weekday')
        return v

class WorkflowInDB(WorkflowBase):
    id: UUID
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    total_runs: int = 0
    successful_runs: int = 0

    model_config = ConfigDict(from_attributes=True)

class WorkflowResponse(WorkflowInDB):
    source_connection_name: Optional[str] = None
    destination_connection_name: Optional[str] = None
    created_by_name: Optional[str] = None
    mappings_count: int = 0

class WorkflowDetailResponse(WorkflowResponse):
    mappings: List[Dict[str, Any]] = Field(default_factory=list)
    recent_transactions: List[Dict[str, Any]] = Field(default_factory=list)

class WorkflowTriggerResponse(BaseModel):
    workflow_id: UUID
    transaction_id: str
    status: str
    message: str

class WorkflowHistoryResponse(BaseModel):
    id: UUID
    status: str
    processed_count: int
    failed_count: int
    duration: Optional[float]
    started_at: datetime
    completed_at: Optional[datetime]
```

### Channel Schemas (backend/app/schemas/channel.py)

```python
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models.channel import ChannelProtocol, ChannelMethod

class RouteStep(BaseModel):
    transformation: str = Field(..., description="Type of transformation (e.g., 'json_path', 'xml_transform', 'filter')")
    config: Dict[str, Any] = Field(default_factory=dict)
    target: Optional[str] = Field(None, description="Target endpoint for this step")

class ChannelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    url_pattern: str = Field(..., description="URL path pattern (e.g., '/api/v1/birth-declaration')")
    method: ChannelMethod
    protocol: ChannelProtocol = ChannelProtocol.HTTP
    routes: List[RouteStep] = Field(default_factory=list)
    status: bool = True
    auth_required: bool = True
    rate_limit: Optional[int] = Field(None, ge=1, le=10000, description="Requests per minute")
    timeout: int = Field(30, ge=1, le=300)
    retry_count: int = Field(3, ge=0, le=10)
    trigger_workflow_id: Optional[UUID] = None

class ChannelCreate(ChannelBase):
    pass

class ChannelUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    url_pattern: Optional[str] = None
    method: Optional[ChannelMethod] = None
    protocol: Optional[ChannelProtocol] = None
    routes: Optional[List[RouteStep]] = None
    status: Optional[bool] = None
    auth_required: Optional[bool] = None
    rate_limit: Optional[int] = None
    timeout: Optional[int] = None
    retry_count: Optional[int] = None
    trigger_workflow_id: Optional[UUID] = None

class ChannelInDB(ChannelBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChannelResponse(ChannelInDB):
    routes_count: int = 0
    is_enabled: bool

class ChannelEnableResponse(BaseModel):
    id: UUID
    status: bool
    message: str
```

---

## TASK 3: Workflow Repository & Service

### Workflow Repository (backend/app/repositories/workflow_repository.py)

```python
from sqlalchemy import select, update, func, and_, or_
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.models.workflow import Workflow, WorkflowStatus
from typing import Optional, List, Dict, Any
from uuid import UUID

class WorkflowRepository(BaseRepository[Workflow]):
    def __init__(self, db):
        super().__init__(Workflow, db)

    async def get_by_status(self, status: WorkflowStatus, skip: int = 0, limit: int = 100) -> List[Workflow]:
        query = select(Workflow).where(Workflow.status == status).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_active_workflows(self) -> List[Workflow]:
        """Get all active workflows (for scheduler)"""
        query = select(Workflow).where(Workflow.status == WorkflowStatus.ACTIVE)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_connection(self, connection_id: str, as_source: bool = True) -> List[Workflow]:
        if as_source:
            query = select(Workflow).where(Workflow.source_connection_id == connection_id)
        else:
            query = select(Workflow).where(Workflow.destination_connection_id == connection_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_run_stats(self, workflow_id: str, success: bool, run_time: datetime):
        """Update workflow run statistics"""
        await self.db.execute(
            update(Workflow)
            .where(Workflow.id == workflow_id)
            .values(
                last_run_at=run_time,
                last_run_status="success" if success else "failed",
                total_runs=Workflow.total_runs + 1,
                successful_runs=Workflow.successful_runs + (1 if success else 0)
            )
        )
        await self.db.commit()

    async def get_workflows_with_connections(self, skip: int = 0, limit: int = 100, **filters) -> List[Workflow]:
        """Get workflows with connection details pre-loaded"""
        query = select(Workflow).options(
            selectinload(Workflow.source_connection),
            selectinload(Workflow.destination_connection),
            selectinload(Workflow.created_by)
        )

        for key, value in filters.items():
            if hasattr(Workflow, key) and value is not None:
                query = query.where(getattr(Workflow, key) == value)

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
```

### Workflow Service (backend/app/services/workflow_service.py)

```python
from app.repositories.workflow_repository import WorkflowRepository
from app.repositories.mapping_repository import MappingRepository
from app.repositories.connection_repository import ConnectionRepository
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate
from app.schemas.mapping import MappingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncio

class WorkflowService:
    def __init__(self, db: AsyncSession):
        self.repo = WorkflowRepository(db)
        self.mapping_repo = MappingRepository(db)
        self.connection_repo = ConnectionRepository(db)

    async def create_workflow(self, workflow_data: WorkflowCreate, created_by_id: UUID):
        """Create a new workflow"""
        # Validate connections exist
        source_conn = await self.connection_repo.get_by_id(str(workflow_data.source_connection_id))
        dest_conn = await self.connection_repo.get_by_id(str(workflow_data.destination_connection_id))

        if not source_conn:
            raise ValueError(f"Source connection {workflow_data.source_connection_id} not found")
        if not dest_conn:
            raise ValueError(f"Destination connection {workflow_data.destination_connection_id} not found")

        workflow = await self.repo.create(
            name=workflow_data.name,
            description=workflow_data.description,
            source_connection_id=str(workflow_data.source_connection_id),
            destination_connection_id=str(workflow_data.destination_connection_id),
            schedule=workflow_data.schedule,
            status=workflow_data.status,
            created_by_id=str(created_by_id)
        )

        return workflow

    async def get_workflow(self, workflow_id: UUID, include_details: bool = False):
        """Get workflow by ID"""
        if include_details:
            workflows = await self.repo.get_workflows_with_connections(id=str(workflow_id))
            workflow = workflows[0] if workflows else None
        else:
            workflow = await self.repo.get_by_id(str(workflow_id))

        if not workflow:
            return None

        # Get mappings count
        mappings = await self.mapping_repo.get_by_workflow(workflow_id, include_global=False)

        # Build response
        result = {
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "status": workflow.status,
            "schedule": workflow.schedule,
            "source_connection_id": workflow.source_connection_id,
            "destination_connection_id": workflow.destination_connection_id,
            "source_connection_name": getattr(workflow.source_connection, 'name', None),
            "destination_connection_name": getattr(workflow.destination_connection, 'name', None),
            "created_by_name": getattr(workflow.created_by, 'full_name', None),
            "mappings_count": len(mappings),
            "last_run_at": workflow.last_run_at,
            "last_run_status": workflow.last_run_status,
            "total_runs": workflow.total_runs,
            "successful_runs": workflow.successful_runs,
            "created_at": workflow.created_at,
            "updated_at": workflow.updated_at
        }

        if include_details:
            result["mappings"] = [MappingResponse.model_validate(m).model_dump() for m in mappings]

        return result

    async def get_all_workflows(self, skip: int = 0, limit: int = 100, **filters):
        """Get all workflows with connection details"""
        workflows = await self.repo.get_workflows_with_connections(skip=skip, limit=limit, **filters)

        results = []
        for workflow in workflows:
            mappings_count = len(await self.mapping_repo.get_by_workflow(workflow.id, include_global=False))
            results.append({
                "id": workflow.id,
                "name": workflow.name,
                "description": workflow.description,
                "status": workflow.status,
                "schedule": workflow.schedule,
                "source_connection_name": getattr(workflow.source_connection, 'name', None),
                "destination_connection_name": getattr(workflow.destination_connection, 'name', None),
                "mappings_count": mappings_count,
                "last_run_at": workflow.last_run_at,
                "last_run_status": workflow.last_run_status,
                "total_runs": workflow.total_runs,
                "successful_runs": workflow.successful_runs,
                "created_at": workflow.created_at
            })

        return results

    async def update_workflow(self, workflow_id: UUID, workflow_data: WorkflowUpdate):
        """Update workflow"""
        update_data = workflow_data.model_dump(exclude_unset=True)
        if 'source_connection_id' in update_data:
            update_data['source_connection_id'] = str(update_data['source_connection_id'])
        if 'destination_connection_id' in update_data:
            update_data['destination_connection_id'] = str(update_data['destination_connection_id'])
        return await self.repo.update(str(workflow_id), **update_data)

    async def delete_workflow(self, workflow_id: UUID):
        """Delete workflow"""
        return await self.repo.delete(str(workflow_id))

    async def trigger_workflow(self, workflow_id: UUID, triggered_by: str = "manual") -> Dict[str, Any]:
        """Trigger workflow execution (async)"""
        workflow = await self.get_workflow(workflow_id)
        if not workflow:
            raise ValueError("Workflow not found")

        if workflow['status'] != 'active':
            raise ValueError(f"Cannot trigger workflow with status: {workflow['status']}")

        # Create transaction record
        from app.services.transaction_service import TransactionService
        transaction_service = TransactionService(self.repo.db)

        transaction = await transaction_service.create_transaction(
            workflow_id=workflow_id,
            triggered_by=triggered_by
        )

        # Queue Celery task (to be implemented in Phase 4)
        # from app.tasks.workflow_tasks import execute_workflow
        # execute_workflow.delay(str(workflow_id), str(transaction['id']))

        return {
            "workflow_id": workflow_id,
            "transaction_id": transaction['id'],
            "status": "queued",
            "message": "Workflow execution queued"
        }

    async def get_workflow_history(self, workflow_id: UUID, limit: int = 50) -> List[Dict[str, Any]]:
        """Get transaction history for a workflow"""
        from app.repositories.transaction_repository import TransactionRepository
        transaction_repo = TransactionRepository(self.repo.db)

        transactions = await transaction_repo.get_by_workflow(str(workflow_id), limit=limit)

        return [
            {
                "id": t.id,
                "status": t.status,
                "processed_count": t.processed_count,
                "failed_count": t.failed_count,
                "duration": t.duration,
                "started_at": t.started_at,
                "completed_at": t.completed_at
            }
            for t in transactions
        ]
```

---

## TASK 4: Channel Repository & Service

### Channel Repository (backend/app/repositories/channel_repository.py)

```python
from sqlalchemy import select, update, and_
from app.repositories.base import BaseRepository
from app.models.channel import Channel, ChannelProtocol, ChannelMethod
from typing import Optional, List
from uuid import UUID

class ChannelRepository(BaseRepository[Channel]):
    def __init__(self, db):
        super().__init__(Channel, db)

    async def get_enabled_channels(self) -> List[Channel]:
        """Get all enabled channels (for dynamic routing)"""
        query = select(Channel).where(Channel.status == True)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_url_pattern(self, url_pattern: str, method: str) -> Optional[Channel]:
        """Find channel by URL pattern and method"""
        query = select(Channel).where(
            and_(
                Channel.url_pattern == url_pattern,
                Channel.method == method,
                Channel.status == True
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def enable_channel(self, channel_id: str) -> Optional[Channel]:
        """Enable a channel"""
        await self.db.execute(
            update(Channel)
            .where(Channel.id == channel_id)
            .values(status=True)
        )
        await self.db.commit()
        return await self.get_by_id(channel_id)

    async def disable_channel(self, channel_id: str) -> Optional[Channel]:
        """Disable a channel"""
        await self.db.execute(
            update(Channel)
            .where(Channel.id == channel_id)
            .values(status=False)
        )
        await self.db.commit()
        return await self.get_by_id(channel_id)
```

### Channel Service (backend/app/services/channel_service.py)

```python
from app.repositories.channel_repository import ChannelRepository
from app.schemas.channel import ChannelCreate, ChannelUpdate
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional, List, Dict, Any

class ChannelService:
    def __init__(self, db: AsyncSession):
        self.repo = ChannelRepository(db)

    async def create_channel(self, channel_data: ChannelCreate) -> Dict[str, Any]:
        """Create a new channel"""
        # Check if URL pattern already exists
        existing = await self.repo.get_by_url_pattern(
            channel_data.url_pattern,
            channel_data.method.value
        )
        if existing:
            raise ValueError(f"Channel with URL pattern '{channel_data.url_pattern}' and method '{channel_data.method.value}' already exists")

        # Convert routes to dict format
        routes = [route.model_dump() for route in channel_data.routes]

        channel = await self.repo.create(
            name=channel_data.name,
            description=channel_data.description,
            url_pattern=channel_data.url_pattern,
            method=channel_data.method,
            protocol=channel_data.protocol,
            routes=routes,
            status=channel_data.status,
            auth_required=channel_data.auth_required,
            rate_limit=channel_data.rate_limit,
            timeout=channel_data.timeout,
            retry_count=channel_data.retry_count,
            trigger_workflow_id=str(channel_data.trigger_workflow_id) if channel_data.trigger_workflow_id else None
        )

        return {
            "id": channel.id,
            "name": channel.name,
            "url_pattern": channel.url_pattern,
            "method": channel.method,
            "status": channel.status,
            "routes_count": len(channel.routes)
        }

    async def get_channel(self, channel_id: UUID) -> Optional[Dict[str, Any]]:
        """Get channel by ID"""
        channel = await self.repo.get_by_id(str(channel_id))
        if not channel:
            return None

        return {
            "id": channel.id,
            "name": channel.name,
            "description": channel.description,
            "url_pattern": channel.url_pattern,
            "method": channel.method,
            "protocol": channel.protocol,
            "routes": channel.routes,
            "status": channel.status,
            "auth_required": channel.auth_required,
            "rate_limit": channel.rate_limit,
            "timeout": channel.timeout,
            "retry_count": channel.retry_count,
            "trigger_workflow_id": channel.trigger_workflow_id,
            "created_at": channel.created_at,
            "updated_at": channel.updated_at
        }

    async def get_all_channels(self, skip: int = 0, limit: int = 100, enabled_only: bool = False) -> List[Dict[str, Any]]:
        """Get all channels"""
        if enabled_only:
            channels = await self.repo.get_enabled_channels()
        else:
            channels = await self.repo.get_all(skip=skip, limit=limit)

        return [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "url_pattern": c.url_pattern,
                "method": c.method,
                "protocol": c.protocol,
                "routes_count": len(c.routes),
                "status": c.status,
                "auth_required": c.auth_required,
                "created_at": c.created_at
            }
            for c in channels
        ]

    async def update_channel(self, channel_id: UUID, channel_data: ChannelUpdate) -> Optional[Dict[str, Any]]:
        """Update channel"""
        update_data = channel_data.model_dump(exclude_unset=True)

        if 'routes' in update_data:
            update_data['routes'] = [route.model_dump() for route in update_data['routes']]

        if 'trigger_workflow_id' in update_data:
            update_data['trigger_workflow_id'] = str(update_data['trigger_workflow_id']) if update_data['trigger_workflow_id'] else None

        channel = await self.repo.update(str(channel_id), **update_data)

        if not channel:
            return None

        return {
            "id": channel.id,
            "name": channel.name,
            "status": channel.status,
            "updated_at": channel.updated_at
        }

    async def delete_channel(self, channel_id: UUID) -> bool:
        """Delete channel"""
        return await self.repo.delete(str(channel_id))

    async def enable_channel(self, channel_id: UUID) -> Dict[str, Any]:
        """Enable a channel"""
        channel = await self.repo.enable_channel(str(channel_id))
        if not channel:
            raise ValueError("Channel not found")

        return {
            "id": channel.id,
            "status": channel.status,
            "message": "Channel enabled successfully"
        }

    async def disable_channel(self, channel_id: UUID) -> Dict[str, Any]:
        """Disable a channel"""
        channel = await self.repo.disable_channel(str(channel_id))
        if not channel:
            raise ValueError("Channel not found")

        return {
            "id": channel.id,
            "status": channel.status,
            "message": "Channel disabled successfully"
        }
```

---

## TASK 5: API Endpoints for Workflow & Channel

### Workflow Endpoints (backend/app/api/api_v1/endpoints/workflows.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.workflow import (
    WorkflowCreate, WorkflowUpdate, WorkflowResponse,
    WorkflowDetailResponse, WorkflowTriggerResponse, WorkflowHistoryResponse
)
from app.services.workflow_service import WorkflowService
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[WorkflowResponse])
async def get_workflows(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    source_connection_id: Optional[UUID] = None,
    destination_connection_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all workflows with optional filters"""
    filters = {}
    if status:
        filters["status"] = status
    if source_connection_id:
        filters["source_connection_id"] = str(source_connection_id)
    if destination_connection_id:
        filters["destination_connection_id"] = str(destination_connection_id)

    workflow_service = WorkflowService(db)
    workflows = await workflow_service.get_all_workflows(skip=skip, limit=limit, **filters)
    return workflows

@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new workflow"""
    workflow_service = WorkflowService(db)

    try:
        workflow = await workflow_service.create_workflow(workflow_data, current_user.id)
        return await workflow_service.get_workflow(workflow.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{workflow_id}", response_model=WorkflowDetailResponse)
async def get_workflow(
    workflow_id: UUID,
    include_details: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get workflow by ID with optional details"""
    workflow_service = WorkflowService(db)
    workflow = await workflow_service.get_workflow(workflow_id, include_details=include_details)

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return workflow

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: UUID,
    workflow_data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update workflow"""
    workflow_service = WorkflowService(db)

    try:
        workflow = await workflow_service.update_workflow(workflow_id, workflow_data)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return await workflow_service.get_workflow(workflow_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete workflow"""
    workflow_service = WorkflowService(db)
    deleted = await workflow_service.delete_workflow(workflow_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Workflow not found")

@router.post("/{workflow_id}/trigger", response_model=WorkflowTriggerResponse)
async def trigger_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger workflow execution"""
    workflow_service = WorkflowService(db)

    try:
        result = await workflow_service.trigger_workflow(workflow_id, triggered_by=current_user.email)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{workflow_id}/history", response_model=List[WorkflowHistoryResponse])
async def get_workflow_history(
    workflow_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get transaction history for a workflow"""
    workflow_service = WorkflowService(db)

    # Verify workflow exists
    workflow = await workflow_service.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    history = await workflow_service.get_workflow_history(workflow_id, limit=limit)
    return history
```

### Channel Endpoints (backend/app/api/api_v1/endpoints/channels.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.channel import (
    ChannelCreate, ChannelUpdate, ChannelResponse, ChannelEnableResponse
)
from app.services.channel_service import ChannelService
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[ChannelResponse])
async def get_channels(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    enabled_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all channels"""
    channel_service = ChannelService(db)
    channels = await channel_service.get_all_channels(skip=skip, limit=limit, enabled_only=enabled_only)
    return channels

@router.post("/", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_channel(
    channel_data: ChannelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new channel"""
    channel_service = ChannelService(db)

    try:
        channel = await channel_service.create_channel(channel_data)
        return channel
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get channel by ID"""
    channel_service = ChannelService(db)
    channel = await channel_service.get_channel(channel_id)

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    return channel

@router.put("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: UUID,
    channel_data: ChannelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update channel"""
    channel_service = ChannelService(db)

    try:
        channel = await channel_service.update_channel(channel_id, channel_data)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        return channel
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete channel"""
    channel_service = ChannelService(db)
    deleted = await channel_service.delete_channel(channel_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Channel not found")

@router.post("/{channel_id}/enable", response_model=ChannelEnableResponse)
async def enable_channel(
    channel_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enable a channel"""
    channel_service = ChannelService(db)

    try:
        result = await channel_service.enable_channel(channel_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{channel_id}/disable", response_model=ChannelEnableResponse)
async def disable_channel(
    channel_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disable a channel"""
    channel_service = ChannelService(db)

    try:
        result = await channel_service.disable_channel(channel_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

### Update API Router (backend/app/api/api_v1/api.py)

```python
from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, users, connections, mappings, workflows, channels

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(connections.router, prefix="/connections", tags=["connections"])
api_router.include_router(mappings.router, prefix="/mappings", tags=["mappings"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
api_router.include_router(channels.router, prefix="/channels", tags=["channels"])
```

---

## TASK 6: Scheduler Integration (Celery Beat)

### Celery Configuration (backend/app/core/celery_app.py)

```python
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "interxchange",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.workflow_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Beat schedule will be populated dynamically from database
celery_app.conf.beat_schedule = {}

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Setup periodic tasks"""
    from app.tasks.scheduler_tasks import check_workflow_schedules
    sender.add_periodic_task(60.0, check_workflow_schedules.s(), name="check-workflow-schedules")
```

### Scheduler Task (backend/app/tasks/scheduler_tasks.py)

```python
from celery import shared_task
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.workflow import Workflow, WorkflowStatus
from app.repositories.workflow_repository import WorkflowRepository
from app.tasks.workflow_tasks import execute_workflow
import asyncio
from croniter import croniter
from datetime import datetime

@shared_task(name="check_workflow_schedules")
def check_workflow_schedules():
    """Check all active workflows and trigger those due for execution"""
    # Run async function synchronously
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(_check_schedules())
    loop.close()
    return result

async def _check_schedules():
    """Async implementation of schedule checking"""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        repo = WorkflowRepository(db)

        # Get all active workflows
        workflows = await repo.get_active_workflows()

        now = datetime.utcnow()
        triggered = []

        for workflow in workflows:
            if workflow.schedule:
                # Check if schedule matches current time
                cron = croniter(workflow.schedule, workflow.last_run_at or workflow.created_at)
                next_run = cron.get_next(datetime)

                if next_run <= now:
                    # Trigger workflow
                    execute_workflow.delay(str(workflow.id))
                    triggered.append(str(workflow.id))

                    # Update last_run_at immediately to prevent duplicate triggers
                    await repo.update(str(workflow.id), last_run_at=now)

        await db.commit()

    await engine.dispose()
    return {"triggered": triggered, "count": len(triggered)}
```

### Workflow Task Stub (backend/app/tasks/workflow_tasks.py)

```python
from celery import shared_task
import logging

logger = logging.getLogger(__name__)

@shared_task(name="execute_workflow", bind=True, max_retries=3)
def execute_workflow(self, workflow_id: str):
    """
    Execute a workflow (stub for Phase 4)
    Full implementation will be added in Phase 4 with mapping engine and adapters
    """
    logger.info(f"Executing workflow {workflow_id} (stub - Phase 3 placeholder)")

    # Placeholder - Phase 4 will implement actual execution
    return {
        "workflow_id": workflow_id,
        "status": "pending",
        "message": "Workflow execution will be implemented in Phase 4"
    }
```

---

## TASK 7: Frontend - Workflows Page

### Workflows Types (frontend/src/types/workflow.ts)

```typescript
export type WorkflowStatus = "active" | "paused" | "error" | "draft";

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  schedule: string | null;
  source_connection_name: string | null;
  destination_connection_name: string | null;
  mappings_count: number;
  last_run_at: string | null;
  last_run_status: string | null;
  total_runs: number;
  successful_runs: number;
  created_at: string;
}

export interface WorkflowDetail extends Workflow {
  source_connection_id: string;
  destination_connection_id: string;
  created_by_name: string;
  mappings: any[];
  recent_transactions: any[];
}

export interface WorkflowCreate {
  name: string;
  description?: string;
  source_connection_id: string;
  destination_connection_id: string;
  schedule?: string;
  status: WorkflowStatus;
}

export interface WorkflowUpdate {
  name?: string;
  description?: string;
  source_connection_id?: string;
  destination_connection_id?: string;
  schedule?: string | null;
  status?: WorkflowStatus;
}
```

### Workflows API Service (frontend/src/features/workflows/workflowsApi.ts)

```typescript
import api from "../../utils/api";
import {
  Workflow,
  WorkflowDetail,
  WorkflowCreate,
  WorkflowUpdate,
} from "../../types/workflow";

export const workflowsApi = {
  getWorkflows: async (params?: {
    status?: string;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get<Workflow[]>("/workflows", { params });
    return response.data;
  },

  getWorkflow: async (id: string, includeDetails: boolean = true) => {
    const response = await api.get<WorkflowDetail>(`/workflows/${id}`, {
      params: { include_details: includeDetails },
    });
    return response.data;
  },

  createWorkflow: async (data: WorkflowCreate) => {
    const response = await api.post<Workflow>("/workflows", data);
    return response.data;
  },

  updateWorkflow: async (id: string, data: WorkflowUpdate) => {
    const response = await api.put<Workflow>(`/workflows/${id}`, data);
    return response.data;
  },

  deleteWorkflow: async (id: string) => {
    await api.delete(`/workflows/${id}`);
  },

  triggerWorkflow: async (id: string) => {
    const response = await api.post(`/workflows/${id}/trigger`);
    return response.data;
  },

  getWorkflowHistory: async (id: string, limit: number = 50) => {
    const response = await api.get(`/workflows/${id}/history`, {
      params: { limit },
    });
    return response.data;
  },
};
```

### Workflows Page (frontend/src/features/workflows/WorkflowsPage.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayArrowIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Pause as PauseIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchWorkflows, deleteWorkflow, triggerWorkflow } from './workflowsSlice';
import WorkflowFormModal from './WorkflowFormModal';
import WorkflowDetailDrawer from './WorkflowDetailDrawer';

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  active: 'success',
  paused: 'warning',
  error: 'error',
  draft: 'default'
};

const WorkflowsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { workflows, isLoading } = useAppSelector(state => state.workflows);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    const params: any = {};
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    dispatch(fetchWorkflows(params));
  }, [dispatch, statusFilter]);

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (workflow.description && workflow.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, workflowId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorkflowId(workflowId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkflowId(null);
  };

  const handleViewDetails = () => {
    const workflow = workflows.find(w => w.id === selectedWorkflowId);
    setSelectedWorkflow(workflow);
    setDetailDrawerOpen(true);
    handleMenuClose();
  };

  const handleEdit = () => {
    const workflow = workflows.find(w => w.id === selectedWorkflowId);
    setEditingWorkflow(workflow);
    setFormModalOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedWorkflowId) {
      await dispatch(deleteWorkflow(selectedWorkflowId));
      setSnackbar({ open: true, message: 'Workflow deleted successfully', severity: 'success' });
      handleMenuClose();
    }
  };

  const handleTrigger = async () => {
    if (selectedWorkflowId) {
      const result = await dispatch(triggerWorkflow(selectedWorkflowId));
      if (result.payload) {
        setSnackbar({ open: true, message: 'Workflow triggered successfully', severity: 'success' });
      }
      handleMenuClose();
    }
  };

  const handleFormSuccess = () => {
    setFormModalOpen(false);
    setEditingWorkflow(null);
    dispatch(fetchWorkflows({}));
    setSnackbar({ open: true, message: 'Workflow saved successfully', severity: 'success' });
  };

  const formatSchedule = (schedule: string | null) => {
    if (!schedule) return 'Manual only';

    // Basic cron to human-readable
    const parts = schedule.split(' ');
    if (parts.length === 5) {
      const [minute, hour, day, month, weekday] = parts;
      if (minute === '0' && hour === '*/6') return 'Every 6 hours';
      if (minute === '0' && hour === '*/1') return 'Every hour';
      if (minute === '0' && hour === '0') return 'Daily at midnight';
      if (minute === '0' && hour === '*/12') return 'Twice daily';
      if (minute === '*/30') return 'Every 30 minutes';
    }
    return schedule;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Workflows
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage data integration workflows and their mappings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingWorkflow(null);
            setFormModalOpen(true);
          }}
        >
          New Workflow
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search workflows..."
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
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, value) => value && setStatusFilter(value)}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="paused">Paused</ToggleButton>
          <ToggleButton value="draft">Draft</ToggleButton>
          <ToggleButton value="error">Error</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Workflows Grid */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredWorkflows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No workflows found</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredWorkflows.map((workflow) => (
            <Grid item xs={12} md={6} lg={4} key={workflow.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h2" noWrap sx={{ flex: 1 }}>
                      {workflow.name}
                    </Typography>
                    <Chip
                      label={workflow.status.toUpperCase()}
                      color={statusColors[workflow.status]}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {workflow.description || 'No description'}
                  </Typography>

                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Source → Destination
                    </Typography>
                    <Typography variant="body2">
                      {workflow.source_connection_name || 'Unknown'} → {workflow.destination_connection_name || 'Unknown'}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Schedule
                    </Typography>
                    <Typography variant="body2">
                      {formatSchedule(workflow.schedule)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Mappings: {workflow.mappings_count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Runs: {workflow.total_runs}
                    </Typography>
                  </Box>

                  {workflow.last_run_at && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Last: {new Date(workflow.last_run_at).toLocaleString()}
                    </Typography>
                  )}
                </CardContent>

                <CardActions>
                  <Tooltip title="Run Now">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedWorkflowId(workflow.id);
                        handleTrigger();
                      }}
                      disabled={workflow.status !== 'active'}
                    >
                      <PlayArrowIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedWorkflow(workflow);
                        setDetailDrawerOpen(true);
                      }}
                    >
                      <HistoryIcon />
                    </IconButton>
                  </Tooltip>
                  <Box sx={{ flexGrow: 1 }} />
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, workflow.id)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleViewDetails}>
          <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleTrigger}>
          <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
          Run Now
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Form Modal */}
      <WorkflowFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingWorkflow(null);
        }}
        onSuccess={handleFormSuccess}
        initialData={editingWorkflow}
      />

      {/* Detail Drawer */}
      <WorkflowDetailDrawer
        open={detailDrawerOpen}
        workflowId={selectedWorkflow?.id}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedWorkflow(null);
        }}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkflowsPage;
```

### Workflow Form Modal (frontend/src/features/workflows/WorkflowFormModal.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Chip
} from '@mui/material';
import { useAppDispatch } from '../../store';
import { createWorkflow, updateWorkflow } from './workflowsSlice';
import { connectionsApi } from '../connections/connectionsApi';
import { WorkflowStatus } from '../../types/workflow';

interface WorkflowFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

const WorkflowFormModal: React.FC<WorkflowFormModalProps> = ({ open, onClose, onSuccess, initialData }) => {
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source_connection_id: '',
    destination_connection_id: '',
    schedule: '',
    status: 'draft' as WorkflowStatus
  });

  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadConnections();
      if (initialData) {
        setFormData({
          name: initialData.name,
          description: initialData.description || '',
          source_connection_id: initialData.source_connection_id || '',
          destination_connection_id: initialData.destination_connection_id || '',
          schedule: initialData.schedule || '',
          status: initialData.status
        });
      } else {
        setFormData({
          name: '',
          description: '',
          source_connection_id: '',
          destination_connection_id: '',
          schedule: '',
          status: 'draft'
        });
      }
    }
  }, [open, initialData]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const data = await connectionsApi.getConnections();
      setConnections(data);
    } catch (err) {
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Workflow name is required');
      return;
    }
    if (!formData.source_connection_id) {
      setError('Please select a source connection');
      return;
    }
    if (!formData.destination_connection_id) {
      setError('Please select a destination connection');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (initialData) {
        await dispatch(updateWorkflow({ id: initialData.id, data: formData })).unwrap();
      } else {
        await dispatch(createWorkflow(formData)).unwrap();
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save workflow');
    } finally {
      setSubmitting(false);
    }
  };

  const cronExamples = [
    { label: 'Every hour', value: '0 */1 * * *' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
    { label: 'Manual only', value: '' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {initialData ? 'Edit Workflow' : 'Create New Workflow'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Workflow Name"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Birth Declaration Sync"
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what this workflow does..."
          />

          <FormControl fullWidth required>
            <InputLabel>Source Connection</InputLabel>
            <Select
              value={formData.source_connection_id}
              onChange={(e) => setFormData({ ...formData, source_connection_id: e.target.value })}
              label="Source Connection"
              disabled={loading}
            >
              {connections.map((conn) => (
                <MenuItem key={conn.id} value={conn.id}>
                  {conn.name} ({conn.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel>Destination Connection</InputLabel>
            <Select
              value={formData.destination_connection_id}
              onChange={(e) => setFormData({ ...formData, destination_connection_id: e.target.value })}
              label="Destination Connection"
              disabled={loading}
            >
              {connections.map((conn) => (
                <MenuItem key={conn.id} value={conn.id}>
                  {conn.name} ({conn.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Schedule (Cron)</InputLabel>
            <Select
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              label="Schedule (Cron)"
            >
              {cronExamples.map((example) => (
                <MenuItem key={example.value} value={example.value}>
                  {example.label}
                </MenuItem>
              ))}
              <MenuItem value="custom">Custom cron expression</MenuItem>
            </Select>
          </FormControl>

          {formData.schedule === 'custom' && (
            <TextField
              label="Custom Cron Expression"
              fullWidth
              placeholder="* * * * *"
              helperText="Format: minute hour day month weekday (e.g., '*/30 * * * *' for every 30 minutes)"
              value=""
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
            />
          )}

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as WorkflowStatus })}
              label="Status"
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="paused">Paused</MenuItem>
            </Select>
          </FormControl>

          {formData.status === 'active' && !formData.schedule && (
            <Alert severity="info">
              This workflow has no schedule. It can only be triggered manually.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? <CircularProgress size={24} /> : (initialData ? 'Update' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkflowFormModal;
```

### Update App Routes (frontend/src/App.tsx)

Add Workflows and Channels routes:

```typescript
// Add to imports
import WorkflowsPage from './features/workflows/WorkflowsPage';
import ChannelsPage from './features/channels/ChannelsPage';

// Add to Routes
<Route
  path="/workflows"
  element={
    <ProtectedRoute>
      <MainLayout>
        <WorkflowsPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/channels"
  element={
    <ProtectedRoute>
      <MainLayout>
        <ChannelsPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

### Update Sidebar (frontend/src/components/common/Sidebar.tsx)

Add Workflows and Channels to navigation:

```typescript
// Add to navigation items
const platformItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Connections', icon: <StorageIcon />, path: '/connections' },
  { text: 'Workflows', icon: <AccountTreeIcon />, path: '/workflows' },      // Add
  { text: 'Transactions', icon: <ReceiptIcon />, path: '/transactions' },
  { text: 'Channels', icon: <RouterIcon />, path: '/channels' },             // Add
  { text: 'Mappings', icon: <MapIcon />, path: '/mappings' },
];
```

---

## TASK 8: Testing for Phase 3

### Workflow Tests (backend/tests/integration/test_workflows.py)

```python
import pytest
from httpx import AsyncClient
from uuid import uuid4

@pytest.mark.asyncio
async def test_create_workflow(client: AsyncClient, auth_headers, test_connection):
    payload = {
        "name": "Test Workflow",
        "description": "Integration test workflow",
        "source_connection_id": str(test_connection.id),
        "destination_connection_id": str(test_connection.id),
        "schedule": "0 */6 * * *",
        "status": "draft"
    }

    response = await client.post("/api/v1/workflows", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Workflow"
    assert data["status"] == "draft"

@pytest.mark.asyncio
async def test_get_workflows(client: AsyncClient, auth_headers):
    response = await client.get("/api/v1/workflows", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_trigger_workflow(client: AsyncClient, auth_headers, test_workflow):
    response = await client.post(f"/api/v1/workflows/{test_workflow.id}/trigger", headers=auth_headers)

    if test_workflow.status == "active":
        assert response.status_code == 200
        data = response.json()
        assert "transaction_id" in data
    else:
        assert response.status_code == 400
```

### Channel Tests (backend/tests/integration/test_channels.py)

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_channel(client: AsyncClient, auth_headers):
    payload = {
        "name": "Test Channel",
        "description": "Integration test channel",
        "url_pattern": "/test/webhook",
        "method": "POST",
        "protocol": "http",
        "routes": [
            {
                "transformation": "json_path",
                "config": {"path": "$.data"},
                "target": "http://localhost:8000/api/target"
            }
        ],
        "status": True,
        "auth_required": True,
        "rate_limit": 100,
        "timeout": 30,
        "retry_count": 3
    }

    response = await client.post("/api/v1/channels", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Channel"
    assert data["url_pattern"] == "/test/webhook"

@pytest.mark.asyncio
async def test_enable_channel(client: AsyncClient, auth_headers, test_channel):
    response = await client.post(f"/api/v1/channels/{test_channel.id}/enable", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == True

@pytest.mark.asyncio
async def test_disable_channel(client: AsyncClient, auth_headers, test_channel):
    response = await client.post(f"/api/v1/channels/{test_channel.id}/disable", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == False
```

---

## DELIVERABLES CHECKLIST

Before considering Phase 3 complete, ensure all items below are implemented and working:

### Backend

- [ ] Workflow database model with status enum
- [ ] Channel database model with protocol/method enums
- [ ] Alembic migrations created and applied
- [ ] Pydantic schemas for Workflow and Channel
- [ ] Workflow repository with CRUD and statistics
- [ ] Workflow service with business logic
- [ ] Channel repository with CRUD and enable/disable
- [ ] Channel service with business logic
- [ ] All Workflow endpoints:
  - [ ] GET /workflows - list workflows
  - [ ] POST /workflows - create workflow
  - [ ] GET /workflows/{id} - get workflow
  - [ ] PUT /workflows/{id} - update workflow
  - [ ] DELETE /workflows/{id} - delete workflow
  - [ ] POST /workflows/{id}/trigger - manual trigger
  - [ ] GET /workflows/{id}/history - transaction history
- [ ] All Channel endpoints:
  - [ ] GET /channels - list channels
  - [ ] POST /channels - create channel
  - [ ] GET /channels/{id} - get channel
  - [ ] PUT /channels/{id} - update channel
  - [ ] DELETE /channels/{id} - delete channel
  - [ ] POST /channels/{id}/enable - enable channel
  - [ ] POST /channels/{id}/disable - disable channel
- [ ] Celery Beat scheduler with dynamic workflow scheduling
- [ ] Unit and integration tests

### Frontend

- [ ] Workflow types/interfaces defined
- [ ] Workflows API service with all endpoints
- [ ] Redux slice for workflows state
- [ ] Workflows page with:
  - [ ] Grid of workflow cards
  - [ ] Search and status filter
  - [ ] Action menu (edit, delete, run, view details)
  - [ ] Create/Edit workflow modal
  - [ ] Detail drawer with history
- [ ] Channel types/interfaces defined
- [ ] Channels API service with all endpoints
- [ ] Redux slice for channels state
- [ ] Channels page with:
  - [ ] Summary stats
  - [ ] Table of channels
  - [ ] Enable/disable toggle
  - [ ] Create/Edit channel modal
  - [ ] Route configuration editor
- [ ] Updated sidebar navigation
- [ ] Route integration in App.tsx

### Scheduler

- [ ] Celery Beat configuration
- [ ] Dynamic schedule loading from database
- [ ] Cron validation and parsing
- [ ] Workflow execution queueing (stub for Phase 4)

---

## NOTES FOR GEMINI

1. **Follow the coding standards** defined in section 11 of the GEMINI.md file
2. **Use the ✅/❌ examples** as guidance for quality code
3. **Generate tests** for all new functionality (aim for >80% coverage)
4. **Cron expression validation**: Ensure proper validation of user-provided cron expressions
5. **Dynamic routing**: The ChannelRouter implementation for dynamic FastAPI routes will be completed in Phase 4
6. **Celery setup**: Ensure Redis is configured properly for Celery broker
7. **Commit messages** should follow conventional commits format
8. **Update the GEMINI.md living document** if you discover patterns that should be documented

---

**Begin Phase 3 implementation now. Provide code files in your response, organized by the directory structure above. After completing each major component, indicate progress and ask for feedback if needed.**
