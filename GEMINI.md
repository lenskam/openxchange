# Enhanced GEMINI.md – Complete Development Plan for Interxchange

This document provides an exhaustive specification for building the **Interxchange** interoperability platform. It is intended for an LLM agent (or development team) to generate code, configurations, and documentation. All decisions are based on the provided context, prototype images, and the answers to clarifying questions.

---

## Table of Contents
- [Enhanced GEMINI.md – Complete Development Plan for Interxchange](#enhanced-geminimd--complete-development-plan-for-interxchange)
  - [Table of Contents](#table-of-contents)
  - [1. Project Overview](#1-project-overview)
  - [2. Technology Stack](#2-technology-stack)
  - [3. System Architecture](#3-system-architecture)
  - [4. Detailed Frontend Specifications](#4-detailed-frontend-specifications)
    - [4.1 Common Components](#41-common-components)
    - [4.2 Dashboard Page](#42-dashboard-page)
    - [4.3 Connections Page](#43-connections-page)
    - [4.4 Workflows Page](#44-workflows-page)
    - [4.5 Transactions Page](#45-transactions-page)
    - [4.6 Channels Page](#46-channels-page)
    - [4.7 Mappings Page](#47-mappings-page)
    - [4.8 Users Page](#48-users-page)
    - [4.9 Audit Log Page](#49-audit-log-page)
    - [4.10 Settings Pages](#410-settings-pages)
      - [4.10.1 Profile Tab](#4101-profile-tab)
      - [4.10.2 Organization Tab](#4102-organization-tab)
      - [4.10.3 Notifications Tab](#4103-notifications-tab)
      - [4.10.4 Security Tab](#4104-security-tab)
      - [4.10.5 System Tab](#4105-system-tab)
  - [5. Backend Specifications](#5-backend-specifications)
    - [5.1 Database Models](#51-database-models)
      - [User](#user)
      - [Connection](#connection)
      - [Workflow](#workflow)
      - [Mapping](#mapping)
      - [Channel](#channel)
      - [Transaction](#transaction)
      - [AuditLog](#auditlog)
      - [ApiKey (for programmatic access)](#apikey-for-programmatic-access)
      - [SystemSettings (singleton table)](#systemsettings-singleton-table)
    - [5.2 API Endpoints](#52-api-endpoints)
      - [Authentication](#authentication)
      - [Users (admin only)](#users-admin-only)
      - [Connections](#connections)
      - [Workflows](#workflows)
      - [Mappings](#mappings)
      - [Channels](#channels)
      - [Transactions](#transactions)
      - [Audit Logs](#audit-logs)
      - [Settings](#settings)
      - [Dashboard](#dashboard)
      - [Admin Operations](#admin-operations)
      - [Metrics \& Health](#metrics--health)
      - [WebSocket](#websocket)
    - [5.3 Authentication \& Authorization](#53-authentication--authorization)
    - [5.4 External Adapters](#54-external-adapters)
    - [5.5 Mapping Engine](#55-mapping-engine)
    - [5.6 Workflow Executor](#56-workflow-executor)
    - [5.7 Channel Router](#57-channel-router)
    - [5.8 Background Tasks \& Scheduling](#58-background-tasks--scheduling)
    - [5.9 Real‑time Updates (WebSockets)](#59-realtime-updates-websockets)
  - [6. Security \& Compliance](#6-security--compliance)
  - [7. CI/CD \& Deployment](#7-cicd--deployment)
    - [Docker Compose (Development)](#docker-compose-development)
    - [Docker Compose (Production)](#docker-compose-production)
    - [GitHub Actions Workflow](#github-actions-workflow)
    - [Environment Variables](#environment-variables)
  - [8. Testing Strategy](#8-testing-strategy)
    - [Backend (pytest)](#backend-pytest)
    - [Frontend (Jest + React Testing Library)](#frontend-jest--react-testing-library)
    - [E2E (Cypress) – Optional but recommended for critical flows.](#e2e-cypress--optional-but-recommended-for-critical-flows)
  - [9. Documentation](#9-documentation)
  - [10. Development Phases](#10-development-phases)

---

## 1. Project Overview

**Interxchange** is an interoperability mediator that connects health information systems (DHIS2, OpenHIM, OpenFN, FHIR, HL7, etc.) by allowing users to define:

- **Connections** to external systems (with credentials stored securely in Vault).
- **Mappings** (variable, organisation unit, options, date format) that transform data.
- **Channels** that define routing rules (URL patterns, methods, protocols).
- **Workflows** that combine a source connection, a destination connection, mappings, and a schedule.

The platform monitors all activity via a **Dashboard**, **Transactions**, and **Audit Log**. It provides a full **User Management** system with role‑based access (Admin, Analyst, Editor, Viewer). Settings include system configuration, organisation branding, notification preferences, and security options.

---

## 2. Technology Stack

| Layer              | Technology                                                                 |
|--------------------|----------------------------------------------------------------------------|
| Backend            | FastAPI (Python 3.11+), SQLAlchemy 2.0 (async), Alembic                   |
| Frontend           | React 18, TypeScript, Material‑UI (MUI) v5, React Router v6, Recharts     |
| Databases          | PostgreSQL 15 (primary), MongoDB (optional for ML data)                    |
| Cache / Message Broker | Redis                                                                  |
| Task Queue         | Celery (with Redis as broker)                                             |
| Real‑time          | WebSockets (via FastAPI)                                                  |
| Authentication     | JWT (access + refresh tokens), httpOnly cookies                           |
| Secrets Management | HashiCorp Vault                                                           |
| External Adapters  | Custom Python classes implementing a common interface                     |
| Monitoring         | Prometheus, Grafana, structured JSON logging (to ELK/Loki)                |
| Containerization   | Docker, Docker Compose (dev & prod)                                       |
| CI/CD              | GitHub Actions (test, build, scan, deploy)                                |
| Testing            | Pytest (backend), Jest + React Testing Library (frontend)                 |
| Documentation      | OpenAPI (Swagger), Markdown user guides                                   |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│                  (Material‑UI, TypeScript)                   │
└─────────────────────────────┬───────────────────────────────┘
                              │ REST + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Auth      │ │   API       │ │ WebSocket   │           │
│  │   (JWT)     │ │   Routes    │ │   Manager   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Service Layer                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │Connection│ │ Workflow │ │ Mapping  │           │   │
│  │  │ Manager  │ │Orchestrator│ │ Engine   │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │Channel   │ │Transaction│ │ Audit    │           │   │
│  │  │ Router   │ │ Logger    │ │ Service  │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Adapters Layer                       │   │
│  │  DHIS2 │ OpenHIM │ OpenFN │ FHIR │ HL7 │ Generic   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Repositories (SQL/NoSQL)               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │PostgreSQL│      │ MongoDB  │      │  Redis   │
    │ (main)   │      │ (ML)     │      │(cache/broker)
    └──────────┘      └──────────┘      └──────────┘
                            │
                            ▼
                      ┌──────────┐
                      │  Vault   │
                      │(secrets) │
                      └──────────┘
```

---

## 4. Detailed Frontend Specifications

All pages must exactly match the provided Figma prototypes. Use Material‑UI components with custom theme overrides.

### 4.1 Common Components

- **Sidebar** (collapsible):
  - Logo: “InterExchange” with “Data Integration Platform” subtitle.
  - Sections: **PLATFORM** (Dashboard, Connections, Workflows, Transactions, Channels, Mappings), **ADMINISTRATION** (Users, Audit Log, Settings).
  - Active item highlight.
  - Footer: “System Health” (link to docs) and “Documentation” link.
- **Top Bar**:
  - Search input: “Search connections, workflows, transactions...”
  - User avatar (initials) and dropdown for profile, logout.
- **Status Badges**:
  - Active: green (#4caf50)
  - Inactive: gray (#9e9e9e)
  - Error: red (#f44336)
  - Pending: orange (#ff9800)
  - Processing: blue (#2196f3)
- **Icons**: Use MUI icons. For connection types: DHIS2 (custom icon or `Storage`), OpenHIM (`Router`), FHIR (`MedicalServices`), HL7 (`Message`), etc.
- **Charts**: Recharts library.

### 4.2 Dashboard Page

**URL**: `/dashboard`

**Components**:

- **Stat Cards** (grid of 4):
  - Connections: value “8”, subtitle “6 active”
  - Workflows: value “6”, subtitle “3 active”
  - Transactions: value “1,847”, subtitle “~96.3% success rate”
  - Records Processed: value “285K”, subtitle “1,243 failed”
- **Transaction Volume Chart** (bar chart):
  - X-axis: months (Sep, Oct, Nov, Dec, Jan, Feb)
  - Y-axis: count (0‑1300)
  - Two bars per month: success (green), failed (red)
- **Workflow Status Pie Chart**:
  - Segments: Active (3), Paused (1), Error (1), Draft (1)
- **Recent Transactions** (table, 5 rows):
  - Columns: Workflow, Records, Duration, Status (badge)
  - Example rows from prototype
- **Activity Feed** (timeline):
  - Each item: icon, user/system, action, resource, details, timestamp
  - “View all” link at bottom (goes to Audit Log)
- **Active Workflows** (list of 4):
  - Workflow name, description, schedule, last run time
  - “View all” link (goes to Workflows)
- **System Health** (card with link to documentation)

**Data Sources**:
- Aggregated stats from `/api/v1/dashboard/stats`
- Chart data from `/api/v1/dashboard/transaction-volume?months=6`
- Recent transactions from `/api/v1/transactions?limit=5`
- Activity feed from `/api/v1/audit-logs?limit=5`
- Active workflows from `/api/v1/workflows?status=active&limit=4`

### 4.3 Connections Page

**URL**: `/connections`

**Layout**:
- Title “Connections”, subtitle “Manage connections to external data systems”
- Search bar (filter by name/type/url)
- Grid of connection cards (8 cards as in prototype)

**Connection Card**:
- Left: icon representing type (DHIS2, OpenHIM, FHIR, etc.)
- Connection name (e.g., “National DHIS2 Instance”)
- Type label (e.g., “DHIS2”)
- URL (truncated if long)
- Status badge (Active/Inactive/Error)
- Metadata: “Last sync: Feb 18, 09:30 AM · Created: Jun 15, 2025”
- Three‑dot menu (Edit, Test, Delete)

**Actions**:
- “+ New Connection” button (top right) opens a modal/form.
- Clicking a card navigates to connection detail page (not in prototype, but may be needed). For MVP, the menu covers actions.

**New/Edit Connection Modal**:
- Fields: Name, Type (dropdown), URL, Authentication Type (Basic, API Key, OAuth2), credentials fields (conditional), Test Connection button, Save.

### 4.4 Workflows Page

**URL**: `/workflows`

**Layout**:
- Title “Workflows”, subtitle “Manage data integration workflows and their mappings”
- Search bar (filter workflows)
- “New Workflow” button
- “All Status” dropdown filter (Active, Paused, Error, Draft)
- Grid of workflow cards (6 cards as in prototype)

**Workflow Card**:
- Title (e.g., “Birth Declaration Sync”)
- Description (e.g., “Synchronize birth declarations from Civil Registry to DHIS2 tracker”)
- Source → Destination (with arrow icon)
- Schedule (e.g., “Every 6 hours”)
- Mappings count (e.g., “24 mappings”)
- Last run time (e.g., “Last: Feb 18, 07:00 AM”)
- Status badge (implied by color border or badge)

**Actions**:
- Click card to open detail/edit page (optional for MVP; can be modal). For simplicity, three‑dot menu with Edit, Delete, Run Now.

### 4.5 Transactions Page

**URL**: `/transactions`

**Layout**:
- Title “Transactions”, subtitle “Monitor and audit all data exchange transactions”
- Summary stats: Total, Success, Failed, In Progress (as pills)
- Search bar: “Search by ID or workflow...”
- Table with columns:
  - Transaction ID (e.g., `txn-001`)
  - Workflow (name)
  - Status (badge with icon)
  - Processed / Failed (e.g., “342 / 0”)
  - Duration (e.g., “3m 24s”)
  - Time (e.g., “Feb 18, 2026, 07:00 AM”)
  - Details icon (opens drawer with full details)
- Pagination (10 per page)

**Transaction Detail Drawer**:
- Shows all fields, plus error messages, raw request/response (if any).

**Real‑time Updates**:
- When a transaction status changes, the table row updates via WebSocket.

### 4.6 Channels Page

**URL**: `/channels`

**Layout**:
- Title “Channels”, subtitle “Configure routing channels for data exchange (OpenHIM‑compatible)”
- Summary stats: Total Channels (6), Enabled (5), Total Routes (10)
- Search bar
- “+ New Channel” button
- Table with columns:
  - Channel Name (with description below in smaller text)
  - URL Pattern (e.g., `/birth-declaration`)
  - Method (POST, GET, etc.)
  - Protocol (HTTP, HL7)
  - Routes (count)
  - Status toggle (Enabled/Disabled)
  - Actions (Edit, Delete)

**New/Edit Channel Modal**:
- Name, URL Pattern, Method, Protocol
- Routes: list of transformation steps (can be JSON editor) and target endpoint.
- Status checkbox.

### 4.7 Mappings Page

**URL**: `/mappings`

**Layout**:
- Title “Mappings”, subtitle “Manage variable, org unit, option, and date format mappings”
- Summary cards (as in prototype):
  - Variables: 5
  - Org Unit: 3
  - Option: 1
  - Date Format: 1
- Search bar
- Table with columns:
  - Name
  - Type (badge)
  - Workflow (name)
  - Records (count)
  - Last Updated (date)
  - Uploaded By (user)
  - Actions (Download, Edit, Delete, Version History)
- “Upload Mapping” button (opens modal)

**Upload Mapping Modal**:
- File upload (drag & drop) – supports CSV, Excel, JSON, XML.
- Mapping Type dropdown (Variable, Org Unit, Options, Date Format)
- Workflow association (optional, can be global)
- Upon upload, backend parses, validates, stores, and returns record count.

### 4.8 Users Page

**URL**: `/users` (Admin only)

**Layout**:
- Title “User Management”, subtitle “Manage platform users, roles, and permissions”
- Summary stats: Total Users (7), Active (5), Pending (1)
- Search bar: “Search users by name or email...”
- “Invite User” button
- “All Roles” filter dropdown
- Table with columns:
  - User (name + email)
  - Role (Admin, Analyst, Editor, Viewer)
  - Status (Active, Inactive, Pending)
  - Last Login
  - Created
  - Actions (Edit, Disable, Delete, Resend Invite)

**Invite User Modal**:
- Email, Full Name, Role, optional message.

### 4.9 Audit Log Page

**URL**: `/audit-log`

**Layout**:
- Title “Audit Log”, subtitle “Track all platform activities and changes”
- Search bar (free text search)
- Table with columns:
  - Action (e.g., “Workflow Executed”)
  - User (or “System”)
  - Resource (e.g., “Birth Declaration Sync”)
  - Details (short description)
  - IP Address
  - Timestamp
- Pagination

### 4.10 Settings Pages

Settings are organized into tabs. Use Material‑UI Tabs.

#### 4.10.1 Profile Tab
- Avatar upload
- Name, Email, Role (read‑only)
- Change Password section (Current, New, Confirm)

#### 4.10.2 Organization Tab
- Organization Name (text field)
- Country (dropdown)
- Primary Contact Email
- Support Email
- Platform Name (for branding)
- Primary Color (color picker, default #2563eb)

#### 4.10.3 Notifications Tab
- Email Notifications (toggle)
- Slack Integration (toggle + webhook URL field)
- Workflow Failure Alerts (toggle)
- Daily Digest (toggle + time selector)

#### 4.10.4 Security Tab
- Two‑Factor Authentication (toggle, placeholder)
- Session Timeout (dropdown: 15min, 30min, 1h, etc.)
- API Keys section:
  - List of existing keys (name, prefix, last used, revoke button)
  - “Generate New Key” button (opens modal with name, scope selection, returns full key once)
- Active Sessions list:
  - Current session details
  - Other sessions (device, IP, last active) with “Revoke” button

#### 4.10.5 System Tab
- Default Date Format (dropdown: YYYY-MM-DD, DD/MM/YYYY, etc.)
- Log Retention (days) (number input)
- Default Timezone (dropdown)
- Max Concurrent Workflows (number input)
- “Save Settings” button
- System Information table (read‑only):
  - Version, Environment, Database, Uptime, API Version, Python, Flask, Last Deploy
- Database Management section:
  - Backup Database button
  - Run Migrations button
  - Clear Cache button

---

## 5. Backend Specifications

### 5.1 Database Models

All models are defined using SQLAlchemy 2.0 with async support. Use `sqlalchemy.orm` with `asyncpg`. Migrations via Alembic.

#### User
```python
id: int PK
email: str, unique, index
hashed_password: str
full_name: str
role: Enum('admin','analyst','editor','viewer')
is_active: bool
two_factor_enabled: bool = False
created_at: datetime
last_login: datetime, nullable
```

#### Connection
```python
id: int PK
name: str
type: Enum('dhis2','openhim','openfn','fhir','hl7','generic')
url: str
auth_type: Enum('basic','api_key','oauth2')
credentials_encrypted: str  # encrypted JSON stored in Vault, reference only
status: Enum('active','inactive','error')
last_sync_at: datetime, nullable
created_at: datetime
updated_at: datetime
```

#### Workflow
```python
id: int PK
name: str
description: str
source_connection_id: int FK(connections)
destination_connection_id: int FK(connections)
schedule: str, nullable  # cron expression or null for manual/real-time
status: Enum('active','paused','error','draft')
created_by_id: int FK(users)
created_at: datetime
updated_at: datetime
```

#### Mapping
```python
id: int PK
name: str
type: Enum('variable','org_unit','options','date_format')
workflow_id: int FK(workflows), nullable  # null means global
file_data: JSONB  # parsed mapping content
metadata: JSONB  # {original_filename: str, record_count: int, ...}
version: int
uploaded_by_id: int FK(users)
last_updated: datetime
is_latest: bool = True
```

#### Channel
```python
id: int PK
name: str
url_pattern: str
method: str  # POST, GET, etc.
protocol: Enum('http','hl7')  # can extend
routes: JSONB  # list of {transformations: [...], target: str}
status: bool  # enabled/disabled
created_at: datetime
updated_at: datetime
```

#### Transaction
```python
id: str PK (UUID or custom like 'txn_xxx')
workflow_id: int FK(workflows)
status: Enum('pending','processing','success','failed')
processed_count: int = 0
failed_count: int = 0
duration: float, nullable  # seconds
started_at: datetime
completed_at: datetime, nullable
error_details: JSONB, nullable
triggered_by: str  # 'system' or user email
```

#### AuditLog
```python
id: int PK
action: str
user_id: int FK(users), nullable
resource_type: str
resource_id: str, nullable
details: JSONB
ip_address: str
timestamp: datetime
```

#### ApiKey (for programmatic access)
```python
id: int PK
name: str
key_hash: str  # bcrypt hash of the actual key
user_id: int FK(users)
scopes: JSONB  # e.g., ["read:transactions", "execute:workflows"]
last_used_at: datetime, nullable
created_at: datetime
```

#### SystemSettings (singleton table)
```python
id: int PK (always 1)
default_date_format: str = "YYYY-MM-DD"
log_retention_days: int = 90
default_timezone: str = "UTC+2"
max_concurrent_workflows: int = 5
organization_name: str = "Ministry of Health"
country: str = "Democratic Republic of Congo"
primary_contact_email: str
support_email: str
platform_name: str = "Interchange"
primary_color: str = "#2563eb"
... other settings as needed
```

### 5.2 API Endpoints

All endpoints under `/api/v1`. Use Pydantic models for request/response validation. Provide OpenAPI schemas.

#### Authentication

| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| POST   | `/auth/login`          | Login with email/password → returns access token (in httpOnly cookie) and refresh token. |
| POST   | `/auth/refresh`        | Refresh access token using refresh token. |
| POST   | `/auth/logout`         | Clear cookies, invalidate refresh token. |
| GET    | `/auth/me`             | Get current user info.               |

#### Users (admin only)

| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | `/users`               | List users (filter by role, status). |
| POST   | `/users`               | Invite user (creates inactive user, sends email). |
| GET    | `/users/{id}`          | Get user details.                    |
| PUT    | `/users/{id}`          | Update user (role, status, etc.).    |
| DELETE | `/users/{id}`          | Delete user (soft delete?).          |
| POST   | `/users/{id}/resend-invite` | Resend invitation email.        |

#### Connections

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/connections`                    | List connections (filter by type, status). |
| POST   | `/connections`                    | Create new connection (credentials encrypted via Vault). |
| GET    | `/connections/{id}`               | Get connection details (credentials not returned). |
| PUT    | `/connections/{id}`               | Update connection.                   |
| DELETE | `/connections/{id}`               | Delete connection.                   |
| POST   | `/connections/{id}/test`          | Test connection (async, returns job ID). |
| GET    | `/connections/{id}/test/{job_id}` | Get test result.                     |

#### Workflows

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/workflows`                      | List workflows (filter by status, source/dest). |
| POST   | `/workflows`                      | Create workflow.                     |
| GET    | `/workflows/{id}`                 | Get workflow details with mappings.  |
| PUT    | `/workflows/{id}`                 | Update workflow.                     |
| DELETE | `/workflows/{id}`                 | Delete workflow.                     |
| POST   | `/workflows/{id}/trigger`         | Manually trigger workflow execution. |
| GET    | `/workflows/{id}/history`         | Get transaction history for workflow.|

#### Mappings

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/mappings`                       | List mappings (filter by type, workflow). |
| POST   | `/mappings/upload`                | Upload mapping file (multipart/form-data). Accepts CSV, Excel, JSON, XML. Returns mapping ID and record count. |
| GET    | `/mappings/{id}`                  | Get mapping metadata and parsed data.|
| PUT    | `/mappings/{id}`                  | Update mapping (creates new version). |
| DELETE | `/mappings/{id}`                  | Delete mapping (soft delete?).       |
| GET    | `/mappings/{id}/versions`         | List versions of a mapping.          |

#### Channels

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/channels`                       | List channels.                       |
| POST   | `/channels`                       | Create channel.                      |
| GET    | `/channels/{id}`                  | Get channel details.                 |
| PUT    | `/channels/{id}`                  | Update channel.                      |
| DELETE | `/channels/{id}`                  | Delete channel.                      |
| POST   | `/channels/{id}/enable`           | Enable channel.                      |
| POST   | `/channels/{id}/disable`          | Disable channel.                     |

#### Transactions

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/transactions`                   | List transactions (filter by workflow, status, date range). |
| GET    | `/transactions/{id}`              | Get transaction details.             |
| GET    | `/transactions/{id}/logs`         | Get execution logs for transaction.  |

#### Audit Logs

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/audit-logs`                     | Search audit logs (filter by user, resource, date). |

#### Settings

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/settings/system`                | Get system settings.                 |
| PUT    | `/settings/system`                | Update system settings (admin only). |
| GET    | `/settings/organization`          | Get organization settings.           |
| PUT    | `/settings/organization`          | Update organization settings (admin only). |
| GET    | `/settings/notifications`         | Get current user's notification preferences. |
| PUT    | `/settings/notifications`         | Update notification preferences.     |
| GET    | `/settings/security`              | Get security settings (2FA status, session timeout, API keys list). |
| POST   | `/settings/security/api-keys`     | Generate new API key (returns full key once). |
| DELETE | `/settings/security/api-keys/{id}`| Revoke API key.                      |
| GET    | `/settings/security/sessions`     | List active sessions for current user. |
| DELETE | `/settings/security/sessions/{id}`| Terminate a session.                 |

#### Dashboard

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/dashboard/stats`                | Get aggregate stats (connections, workflows, transactions, records). |
| GET    | `/dashboard/transaction-volume`   | Get monthly success/failed counts.   |

#### Admin Operations

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| POST   | `/admin/db/backup`                | Trigger database backup.             |
| POST   | `/admin/db/migrate`               | Run pending migrations.              |
| POST   | `/admin/cache/clear`              | Clear Redis cache.                   |

#### Metrics & Health

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/metrics`                        | Prometheus metrics endpoint.         |
| GET    | `/health`                         | Health check (returns OK if all services up). |

#### WebSocket

- Endpoint: `/ws?token=<jwt>`
- Events:
  - `transaction_update`: Sent when a transaction status changes (includes transaction object).
  - `system_alert`: For critical system events.

### 5.3 Authentication & Authorization

- **JWT tokens**: 
  - Access token: short‑lived (15 minutes), stored in httpOnly cookie named `access_token`.
  - Refresh token: long‑lived (7 days), stored in httpOnly cookie named `refresh_token`.
  - Refresh endpoint validates refresh token and issues new access token.
- **Roles**:
  - **Admin**: Full access to all resources, user management, settings.
  - **Analyst**: Can view all, create workflows, mappings, channels; cannot manage users or system settings.
  - **Editor**: Can create/edit workflows, mappings, channels; cannot delete.
  - **Viewer**: Read‑only access to all pages except settings.
- **Permission checks** are implemented as FastAPI dependencies (`get_current_user`, `require_roles`).

### 5.4 External Adapters

All adapters inherit from a base class `BaseAdapter`:

```python
class BaseAdapter(ABC):
    def __init__(self, connection: Connection, vault_client):
        self.connection = connection
        self.credentials = vault_client.get_secret(connection.credentials_encrypted)  # decrypt

    @abstractmethod
    async def test_connection(self) -> bool:
        """Test connectivity and authentication."""

    @abstractmethod
    async def fetch_data(self, params: dict) -> Any:
        """Fetch data from source (e.g., for workflows)."""

    @abstractmethod
    async def send_data(self, data: Any, target: str = None) -> dict:
        """Send data to destination."""

    @abstractmethod
    async def handle_request(self, request_data: dict, route_config: dict) -> dict:
        """Handle incoming request for channel routing."""
```

Implement adapters for:

- **DHIS2**: Use `requests` to interact with DHIS2 API. Support tracker and aggregate endpoints.
- **OpenHIM**: Use OpenHIM API to register channels, mediate requests.
- **OpenFN**: Interact with OpenFN jobs and triggers.
- **FHIR**: Use `fhir.resources` to parse and create FHIR resources. Communicate via REST.
- **HL7**: Use `hl7apy` to parse HL7 messages. For listening,可能需要 a separate HL7 server (MLLP). We'll implement a client that can send HL7 over MLLP or HTTP.
- **Generic**: Allow user to define HTTP method, headers, body template.

### 5.5 Mapping Engine

**Mapping File Formats**:

- **Variable Mapping**: CSV with columns: `source_field`, `target_field`, `transformation` (optional). Or JSON array of objects.
- **Org Unit Mapping**: CSV with `source_code`, `target_uid`.
- **Options Mapping**: CSV with `source_value`, `target_option_code`.
- **Date Format Mapping**: Simple JSON `{source_format: "YYYY-MM-DD", target_format: "DD/MM/YYYY"}` or multiple.

**Parsing**:
- Use pandas for CSV/Excel (fast vectorized operations).
- Use `json` and `xml.etree.ElementTree` for JSON/XML.

**Storage**:
- Parsed data stored as JSONB in `file_data` field. For variable mappings, it could be a list of dicts.

**Mapping Engine Service**:

```python
class MappingEngine:
    def __init__(self, workflow_id: int, db_session):
        self.workflow_id = workflow_id
        self.db = db_session
        self.mappings = self._load_mappings()

    def _load_mappings(self):
        # load all mappings for this workflow (including global)
        ...

    def apply(self, data: dict) -> dict:
        # apply variable mappings (field mapping + transformation)
        # apply org unit mapping (replace codes)
        # apply options mapping (replace values)
        # apply date formatting
        return transformed_data
```

**Transformation Functions**:
- Support simple operations: concatenation, arithmetic, conditional. For MVP, allow user to specify a Python expression? Safer: provide a set of predefined functions. We'll start with basic field mapping and later add scripting.

### 5.6 Workflow Executor

**Celery Task**: `execute_workflow(workflow_id, trigger_info)`

Steps:
1. Fetch workflow details from DB.
2. Get source and destination connection adapters.
3. Fetch data from source (using adapter `fetch_data`). For scheduled workflows, fetch all data since last run? Need to support incremental.
   - For REST API, could use `?lastUpdated` parameter.
   - For database, use timestamp column.
   - For HL7, may need to listen continuously (handled by channel).
4. Apply mapping engine to each record.
5. Send transformed data to destination (adapter `send_data`). For batch, send in chunks.
6. Record transaction: log processed/failed counts, duration, errors.
7. Update transaction status via WebSocket.

**Error Handling**:
- If source fetch fails → transaction status = failed, error details saved.
- If individual record fails, increment failed_count, continue.
- Retry policy: configurable (e.g., retry 3 times with exponential backoff). Use Celery retry mechanism.

**Dead Letter Queue**: After max retries, move to a dead letter queue (another Celery queue) for manual inspection.

### 5.7 Channel Router

**Purpose**: Channels allow external systems to push data into Interxchange (like OpenHIM). They listen on specific URL patterns and methods.

**Implementation**:
- FastAPI routes are dynamically created based on enabled channels. When a channel is created/updated, we register a route in FastAPI.
- When a request hits a channel, the `ChannelRouter` service:
  1. Logs the request (audit log).
  2. Applies any transformations defined in the channel's `routes` (e.g., mapping, filtering).
  3. Forwards to the target endpoint (could be multiple).
  4. Records a transaction (if it is a workflow trigger) or just logs.
- Supports protocols: HTTP (native), HL7 (via a separate MLLP server – we might defer HL7 channel to Phase 2).

### 5.8 Background Tasks & Scheduling

- **Celery Beat** schedule reads from `Workflow` table where `schedule` is not null.
- A periodic task (every minute) checks for workflows that need to run (cron matching). Alternatively, use Celery Beat's dynamic scheduler that reloads from DB periodically.
- When a workflow is due, enqueue `execute_workflow` task.

**Real‑time Workflows**:
- Workflows with schedule = null can be triggered manually via API or by a channel.
- Channels can be linked to a workflow, so that incoming requests trigger the workflow.

### 5.9 Real‑time Updates (WebSockets)

- On transaction status change, broadcast to all connected clients (or to a room specific to the workflow).
- Frontend subscribes and updates transaction table / dashboard.

**Implementation**:
- Use FastAPI's `WebSocket` and `WebSocketEndpoint`.
- Maintain a set of active connections.
- When a transaction is updated, send JSON message with transaction data.

---

## 6. Security & Compliance

- **Vault**:
  - Store all external credentials (passwords, API keys) in Vault's Key/Value secrets engine.
  - In `Connection` model, store a reference path (e.g., `secret/data/connections/{id}`) instead of encrypted text in DB.
  - Backend retrieves credentials from Vault on demand (with caching).
- **Encryption at rest**: Database encrypted, Vault encrypted.
- **JWT security**: httpOnly cookies, secure flag in production, sameSite strict.
- **API Keys**:
  - Hashed with bcrypt before storing.
  - Sent as `Authorization: Bearer <key>` header.
  - Scoped to specific resources.
- **GDPR**:
  - Right to access: provide endpoint to export user data.
  - Right to be forgotten: anonymize or delete user data (except audit logs kept for compliance).
- **Session Management**:
  - Store active sessions in Redis (key: `session:{user_id}:{session_id}`) with expiry.
  - On logout or timeout, remove session.
  - Limit concurrent sessions per user (configurable).

---

## 7. CI/CD & Deployment

### Docker Compose (Development)

`docker-compose.yml` should include:

- `postgres`: official image, volume for data.
- `mongodb`: optional, for ML data.
- `redis`: for cache and broker.
- `vault`: dev mode (for development; production uses proper config).
- `backend`: build from `./backend/Dockerfile`, mount code for hot reload.
- `frontend`: build from `./frontend/Dockerfile`, mount code, use `npm start`.
- `celery_worker`: same backend image, command `celery -A app.tasks worker`.
- `celery_beat`: same backend image, command `celery -A app.tasks beat`.
- `prometheus`: config in `./monitoring/prometheus`.
- `grafana`: with dashboards.

### Docker Compose (Production)

Similar but with:
- No volume mounts for code.
- Use built images from registry.
- Vault in production mode (sealed, unsealed manually or via auto-unseal).
- Environment variables for secrets.

### GitHub Actions Workflow

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
        ports: ['5432:5432']
      redis:
        image: redis
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - name: Install dependencies
        run: pip install -r backend/requirements.txt
      - name: Run tests
        run: pytest --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Install dependencies
        run: npm ci --prefix frontend
      - name: Run tests
        run: npm test --prefix frontend -- --coverage

  build-and-scan:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: docker compose -f docker-compose.prod.yml build
      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'interxchange-backend:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'
      - name: Upload Trivy results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: build-and-scan
    steps:
      - name: Deploy to production
        run: |
          # SSH to server, pull latest images, docker compose up -d
```

### Environment Variables

Create `.env.example` with all required variables:

```
# Database
POSTGRES_USER=interxchange
POSTGRES_PASSWORD=change_me
POSTGRES_DB=interxchange

# Redis
REDIS_URL=redis://redis:6379/0

# Vault
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=dev_token  # In production, use approle

# JWT
JWT_SECRET_KEY=super_secret_key
JWT_REFRESH_SECRET_KEY=another_secret

# Frontend API URL (for production)
REACT_APP_API_URL=https://api.example.com

# ... other settings
```

---

## 8. Testing Strategy

### Backend (pytest)

- **Unit tests** for services (mapping engine, adapters) with mocked dependencies.
- **Integration tests** for API endpoints using `TestClient` and a test database (separate PostgreSQL instance). Use `pytest-asyncio`.
- **Mock external APIs** using `responses` or `httpx_mock`.
- **Coverage** target: 80%.

Example test for connections API:

```python
async def test_create_connection(client, db_session, vault_mock):
    payload = {
        "name": "Test DHIS2",
        "type": "dhis2",
        "url": "https://test.dhis2.org",
        "auth_type": "basic",
        "credentials": {"username": "admin", "password": "pass"}
    }
    response = await client.post("/api/v1/connections", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test DHIS2"
    # Verify vault called
    vault_mock.write.assert_called_once()
```

### Frontend (Jest + React Testing Library)

- Test components in isolation.
- Mock API calls with `jest-fetch-mock` or `msw`.
- Test user interactions (clicks, form submissions).
- Coverage target: 70%.

Example test for Connections list:

```javascript
import { render, screen } from '@testing-library/react';
import { ConnectionsPage } from './ConnectionsPage';

test('displays connections', async () => {
  render(<ConnectionsPage />);
  expect(await screen.findByText('National DHIS2 Instance')).toBeInTheDocument();
});
```

### E2E (Cypress) – Optional but recommended for critical flows.

---

## 9. Documentation

- **API Documentation**: Auto‑generated OpenAPI at `/docs` (Swagger UI) and `/redoc`.
- **User Guide**: Markdown files in `docs/` covering:
  - Installation (Docker)
  - Configuration (environment variables, Vault setup)
  - User roles
  - Creating connections, workflows, mappings
  - Monitoring
- **In‑app Help**: Add help icons linking to relevant documentation sections.

---

## 10. Development Phases

Follow the phased approach from the original roadmap, but with these refined tasks:

- **Phase 1: Core Infrastructure** (7 days)
  - Backend foundation, auth, user models, connection manager (basic).
  - Frontend foundation, layout, login.
  - Docker setup, CI (test only).

- **Phase 2: Mapping Engine** (7 days)
  - Mapping models, file upload, parsing.
  - Mapping engine service.
  - Frontend Mappings page.

- **Phase 3: Workflow & Channel Management** (5 days)
  - Workflow models, API, UI.
  - Channel models, API, UI.
  - Scheduler integration.

- **Phase 4: Execution Engine & Transactions** (5 days)
  - Workflow executor, Celery tasks.
  - Transaction logging, WebSocket updates.
  - Frontend Transactions page, Dashboard widgets.

- **Phase 5: Advanced Features & Polish** (7 days)
  - Complete Dashboard, Settings pages, Audit Log, Users.
  - Real‑time updates integration.
  - Prometheus/Grafana, logging.
  - Documentation.

- **Phase 6: CI/CD & Deployment** (parallel)
  - GitHub Actions, production Docker Compose, Vault setup.

- **Phase 7: Frontend (api integration) Revise and testing**

- **Phase 8: Backend (api) Revise and testing**

- **Phase 9: Final Project Documentation**
---

This enhanced GEMINI.md provides everything needed for an LLM agent to generate the full Interxchange platform. Each component is specified in detail, with concrete examples and expected behavior. The agent should follow the phases and generate code accordingly, ensuring it matches the prototypes and meets all functional requirements.