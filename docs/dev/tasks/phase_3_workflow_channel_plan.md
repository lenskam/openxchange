# Phase 3: Workflow & Channel Management Implementation Plan

> **For agentic workers:** Execute task-by-task, verifying tests pass each step. Follow TDD: stub -> failing test -> implement -> passing test.

**Goal:** Implement Workflow and Channel backend (models, schemas, repositories, services, API endpoints, Celery stubs) for the Interxchange interoperability mediator.

**Architecture:** Follow existing patterns: Integer PKs, `require_roles` auth, `APIRouter(prefix=...)`, `BaseRepository`, service layer with `_to_response` formatting. Frontend pages already exist from Phase 10 (Stitch) — backend only.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Pydantic v2, Celery + Redis, pytest + httpx

---

### Task 1: Database Models

**Files:**
- Create: `app/models/workflow.py`
- Create: `app/models/channel.py`
- Modify: `app/models/__init__.py`

**Workflow Model:**
- `id` (Integer PK), `name` (String), `description` (Text nullable)
- `source_connection_id` (Integer FK -> connections.id)
- `destination_connection_id` (Integer FK -> connections.id)
- `schedule` (String nullable, cron expression)
- `status` (Enum: active/paused/error/draft)
- `created_by_id` (Integer FK -> users.id)
- `last_run_at` (DateTime nullable), `last_run_status` (String nullable)
- `total_runs` (Integer default 0), `successful_runs` (Integer default 0)
- `created_at`, `updated_at` (server_default=func.now())

**Channel Model:**
- `id` (Integer PK), `name` (String), `description` (String nullable)
- `url_pattern` (String), `method` (Enum: GET/POST/PUT/DELETE/PATCH)
- `protocol` (Enum: http/hl7/mllp)
- `routes` (JSON default=list)
- `status` (Boolean default=True), `auth_required` (Boolean default=True)
- `rate_limit` (Integer nullable), `timeout` (Integer default=30), `retry_count` (Integer default=3)
- `trigger_workflow_id` (Integer FK -> workflows.id, nullable)
- `created_at`, `updated_at`

### Task 2: Pydantic Schemas

**Files:**
- Create: `app/schemas/workflow.py`
- Create: `app/schemas/channel.py`

**Workflow schemas:** WorkflowCreate, WorkflowUpdate (with cron validation), WorkflowInDB, WorkflowResponse (with connection names), WorkflowDetailResponse (with mappings + transactions), WorkflowTriggerResponse, WorkflowHistoryResponse

**Channel schemas:** RouteStep, ChannelBase/Create/Update/InDB/Response, ChannelEnableResponse

### Task 3: Repositories

**Files:**
- Create: `app/repositories/workflow_repository.py`
- Create: `app/repositories/channel_repository.py`

**WorkflowRepository:** `get_by_status`, `get_active_workflows`, `get_by_connection`, `update_run_stats`, `get_workflows_with_connections` (selectinload for source/dest connections + created_by)

**ChannelRepository:** `get_enabled_channels`, `get_by_url_pattern`, `enable_channel`, `disable_channel`

### Task 4: Services

**Files:**
- Create: `app/services/workflow_service.py`
- Create: `app/services/channel_service.py`

**WorkflowService:** CRUD, validate connections exist on create, trigger stub (creates transaction record), get_history, `_to_response`/`_to_detail` formatting

**ChannelService:** CRUD with URL uniqueness check, enable/disable, `_to_response` formatting

### Task 5: API Endpoints

**Files:**
- Rewrite: `app/api/v1/workflows.py`
- Create: `app/api/v1/channels.py`
- Modify: `app/api/v1/api.py`

**Workflows (7 routes):**
- GET `/workflows` — list with filters
- POST `/workflows` — create
- GET `/workflows/{id}` — get with optional details
- PUT `/workflows/{id}` — update
- DELETE `/workflows/{id}` — delete
- POST `/workflows/{id}/trigger` — manual trigger
- GET `/workflows/{id}/history` — transaction history

**Channels (7 routes):**
- GET `/channels` — list
- POST `/channels` — create
- GET `/channels/{id}` — get
- PUT `/channels/{id}` — update
- DELETE `/channels/{id}` — delete
- POST `/channels/{id}/enable` — enable
- POST `/channels/{id}/disable` — disable

### Task 6: Celery Scheduler Stub

**Files:**
- Create: `app/core/celery_app.py`
- Create: `app/tasks/scheduler_tasks.py`
- Create: `app/tasks/__init__.py`
- Create: `app/tasks/workflow_tasks.py`

### Task 7: Tests

**Files:**
- Create: `tests/test_services/test_workflow_service.py`
- Create: `tests/test_services/test_channel_service.py`
- Create: `tests/integration/test_workflows.py`
- Create: `tests/integration/test_channels.py`
