# Phase 3: Workflow & Channel Management - Technical Specification

## Overview
This phase implements Workflow and Channel management - the core of the integration platform. Workflows combine source/destination connections with mappings and schedules. Channels provide HTTP/HL7 routing capabilities.

## Database Models

### Workflow Model
```python
class Workflow(BaseModel):
    __tablename__ = "workflows"

    name: str
    description: str
    source_connection_id: UUID (FK to Connection)
    destination_connection_id: UUID (FK to Connection)
    schedule: str (nullable - cron expression)
    status: Enum('active', 'paused', 'error', 'draft')
    created_by_id: UUID (FK to User)
```

### Channel Model
```python
class Channel(BaseModel):
    __tablename__ = "channels"

    name: str
    url_pattern: str
    method: str (POST, GET, etc.)
    protocol: Enum('http', 'hl7')
    routes: JSONB  # list of {transformations: [...], target: str}
    status: bool  # enabled/disabled
```

## API Endpoints

### Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /workflows | List workflows |
| POST | /workflows | Create workflow |
| GET | /workflows/{id} | Get workflow details |
| PUT | /workflows/{id} | Update workflow |
| DELETE | /workflows/{id} | Delete workflow |
| POST | /workflows/{id}/trigger | Manual trigger |
| GET | /workflows/{id}/history | Transaction history |

### Channels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /channels | List channels |
| POST | /channels | Create channel |
| GET | /channels/{id} | Get channel details |
| PUT | /channels/{id} | Update channel |
| DELETE | /channels/{id} | Delete channel |
| POST | /channels/{id}/enable | Enable channel |
| POST | /channels/{id}/disable | Disable channel |

## Scheduling (Celery Beat)
- Periodic task reads workflow schedule from DB
- Triggers `execute_workflow` Celery task
- Supports cron expressions for flexible scheduling

## Frontend Features
- Workflows page with status cards and filters
- Create/Edit workflow modal with connection and mapping selection
- Channels page with routing configuration
- Enable/disable channel toggles