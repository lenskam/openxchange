# Phase 4: Execution Engine & Transactions — Implementation Plan

**Goal:** Implement workflow execution, transaction logging, adapter system, WebSocket real-time updates, and data dashboard.

**Key adaptation:** Integer PKs throughout (not UUIDs from original spec) for consistency with existing codebase.

## Task 1: Transaction Model, Schema, Repository
- `app/models/transaction.py` — Transaction model (Integer PK, workflow FK, status, counts, duration, error_details JSON)
- `app/schemas/transaction.py` — TransactionCreate/Response/Detail/List/Stats/Volume schemas
- `app/repositories/transaction_repository.py` — get_by_workflow, get_stats, get_volume, filtered list

## Task 2: Transaction Service + API
- `app/services/transaction_service.py` — CRUD + stats aggregation
- Rewrite `app/api/v1/transactions.py` — replace empty stub with real endpoints
- Wire up frontend-expected `{items, total}` format

## Task 3: AuditLog Model + Schema + Repository + Service + API
- `app/models/audit_log.py` — model
- `app/schemas/audit_log.py` — schemas
- `app/repositories/audit_log_repository.py` — search/filter
- `app/services/audit_log_service.py` — CRUD + search
- Rewrite `app/api/v1/audit_logs.py` — real endpoints

## Task 4: Adapter System — Factory + Async DHIS2 + Generic
- `app/adapters/__init__.py` — get_adapter() factory
- Rewrite `app/adapters/dhis2.py` — full async fetch_data/send_data with httpx
- Create `app/adapters/generic.py` — generic HTTP adapter

## Task 5: FHIR + HL7 Adapter Stubs
- `app/adapters/fhir.py` — FHIR R4 adapter
- `app/adapters/hl7.py` — HL7 adapter (basic)

## Task 6: WebSocket Manager
- `app/core/websocket.py` — WebSocketManager with connect/disconnect/broadcast
- Add `/ws` endpoint to `app/main.py`
- Auth via token in query params (reuse decode_token)

## Task 7: Celery Workflow Executor
- Rewrite `app/tasks/workflow_tasks.py` — execute_workflow: fetch workflow → get adapters → fetch data → apply mappings → send data → log transaction → broadcast via WS
- Update `app/tasks/scheduler_tasks.py` — check_workflow_schedules with cron matching

## Task 8: Dashboard Real Data
- Rewrite `app/api/v1/dashboard.py` — replace hardcoded zeros with real queries

## Task 9: Tests
- Transaction unit + integration (~10 tests)
- AuditLog unit + integration (~6 tests)
- Adapter unit (~8 tests)
- WebSocket (~3 tests)
- Dashboard (~4 tests)
- **Total: ~31 new tests**

## Verification
- All existing 89 tests pass (1 pre-existing failure unchanged)
- All new tests pass
