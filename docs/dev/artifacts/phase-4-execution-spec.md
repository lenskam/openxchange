# Phase 4: Execution Engine & Transactions - Technical Specification

## Overview
This phase implements the workflow execution engine - the core system that actually runs data integration workflows and logs all activity.

## Database Models

### Transaction Model
```python
class TransactionStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"

class Transaction(BaseModel):
    __tablename__ = "transactions"

    id: str (UUID or custom like 'txn_xxx')
    workflow_id: UUID (FK to Workflow)
    status: TransactionStatus
    processed_count: int = 0
    failed_count: int = 0
    duration: float (nullable - seconds)
    started_at: datetime
    completed_at: datetime (nullable)
    error_details: JSONB (nullable)
    triggered_by: str ('system' or user email)
```

### AuditLog Model
```python
class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    action: str
    user_id: UUID (FK to User, nullable)
    resource_type: str
    resource_id: str (nullable)
    details: JSONB
    ip_address: str
    timestamp: datetime
```

## External System Adapters

### Base Adapter Interface
```python
class BaseAdapter(ABC):
    async def test_connection(self) -> bool
    async def fetch_data(self, params: dict) -> Any
    async def send_data(self, data: Any, target: str = None) -> dict
    async def handle_request(self, request_data: dict, route_config: dict) -> dict
```

### Implemented Adapters
- DHIS2: REST API integration for tracker and aggregate
- OpenHIM: Channel registration, mediation
- OpenFN: Job and trigger management
- FHIR: FHIR resources parsing and REST communication
- HL7: Message parsing via hl7apy
- Generic: Custom HTTP endpoints

## Workflow Executor (Celery Task)
```
execute_workflow(workflow_id, trigger_info):
1. Fetch workflow details
2. Get source/destination adapters
3. Fetch data from source (incremental)
4. Apply MappingEngine transformations
5. Send transformed data to destination
6. Log transaction results
7. Broadcast WebSocket update
```

## WebSocket Events
- `transaction_update`: Transaction status changes
- `system_alert`: Critical system events

## Frontend Features
- Transactions table with status badges
- Transaction detail drawer (logs, errors, raw request/response)
- Real-time updates via WebSocket
- Audit log search and filtering

## Dashboard Widgets
- Transaction volume chart (daily/weekly)
- Success/failure rate stat cards
- Recent transactions feed
- System health indicator