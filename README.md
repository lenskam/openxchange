# Interxchange — Health Interoperability Mediator

A data integration platform that connects health information systems (DHIS2, OpenHIM, OpenFn, FHIR, HL7, etc.) through configurable connections, mappings, workflows, and transactions.

---

## Features

| Feature | Status |
|---------|--------|
| JWT authentication (login / refresh / logout) | ✅ Implemented |
| User management (CRUD, roles: admin/analyst/editor/viewer, invite) | ✅ Implemented |
| Connections CRUD (with Vault credential storage, test endpoint) | ✅ Implemented |
| Dashboard (stats cards, bar chart, pie chart, recent activity) | ✅ Implemented |
| Workflow management | 📅 Phase 3 |
| Channel management | 📅 Phase 3 |
| Transaction execution engine | 📅 Phase 4 |
| Mappings upload & transformation | 📅 Phase 2 |
| Audit log | 📅 Phase 4 |
| CI/CD pipeline | ✅ Implemented |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2.0 (async), Alembic |
| **Frontend** | React 19, TypeScript, MUI 7, Redux Toolkit, Recharts, Vite 7, Tailwind CSS |
| **Database** | PostgreSQL 15 |
| **Cache / Queue** | Redis 7 |
| **Secrets** | HashiCorp Vault 1.15 |
| **Auth** | JWT (access + refresh tokens in httpOnly cookies), bcrypt |
| **Infrastructure** | Docker Compose, GitHub Actions |

---

## Prerequisites

- **Docker** + **Docker Compose** (recommended — runs the full stack)
- OR **Python 3.11+**, **Node.js 20+**, **PostgreSQL 15**, **Redis 7**, **Vault 1.15** (manual setup)

---

## Quick Start (Docker)

The root `.env` file configures all services. Defaults work out of the box.

```bash
# 1. Start all services (PostgreSQL, Redis, Vault, backend, frontend)
docker-compose up -d

# 2. Run database migrations
docker-compose exec backend alembic upgrade head
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

> Services run on non-standard host ports where defaults were taken:
> PostgreSQL on `5433`, Redis on `6380` (instead of 6379), Vault on `8200`.

---

## Manual Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements/dev.txt
```

Make sure PostgreSQL, Redis (on port **6380**), and Vault are running. Update `backend/.env` as needed, then:

```bash
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend calls the API at `http://localhost:8000/api/v1` (configured in `frontend/src/services/api.ts`).

---

## Configuration

### Root `.env` (for Docker Compose)

All variables are defined in `.env.example` at the project root. Copy it and adjust:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `interxchange` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `interxchange` | PostgreSQL password |
| `POSTGRES_DB` | `interxchange` | PostgreSQL database name |
| `POSTGRES_HOST_PORT` | `5433` | PostgreSQL host port |
| `REDIS_HOST_PORT` | `6380` | Redis host port |
| `VAULT_HOST_PORT` | `8200` | Vault host port |
| `VAULT_TOKEN` | `dev_token` | Vault dev root token |
| `BACKEND_HOST_PORT` | `8000` | Backend API host port |
| `JWT_SECRET_KEY` | `dev_jwt_secret` | Access token signing key |
| `JWT_REFRESH_SECRET_KEY` | `dev_refresh_secret` | Refresh token signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL |
| `ENVIRONMENT` | `development` | Runtime environment |
| `LOG_LEVEL` | `INFO` | Logging level |
| `FRONTEND_HOST_PORT` | `5173` | Frontend dev server host port |
| `VITE_API_URL` | `http://localhost:8000/api/v1` | API base URL for the frontend |

### Backend `.env` (for manual runs)

Copy `backend/.env.example` → `backend/.env` and adjust database host/ports for your local environment.

---

## Hands-On Testing

After starting (Docker or manual):

### 1. Log in

Open http://localhost:5173. Use the `/docs` Swagger UI to create a user if none exists:

```bash
# Create an admin user via the API
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'
```

Check `backend/app/api/v1/auth.py` for the default credentials.

### 2. Browse the Dashboard

After login you land on the Dashboard. It shows:
- **Stat cards**: Total connections, active workflows, transactions today, success rate
- **Bar chart**: Transaction volume by day (last 7 days)
- **Pie chart**: Transaction status distribution
- **Recent transactions table**
- **Activity feed**

> Note: Dashboard stats are currently placeholder data — the backend endpoints for dashboard stats and real transactions are planned for Phase 4.

### 3. Manage Connections

Navigate to **Connections** in the sidebar.

- **List**: All connections displayed as cards with name, type, status badge
- **Create**: Click "Create Connection" — fill in name, type (DHIS2, OpenHIM, OpenFn, FHIR, HL7, Generic), URL, auth type, and credentials
- **Edit**: Click the edit icon on any card
- **Delete**: Click the delete icon
- **Test**: Click the test icon — calls the adapter's `test_connection` (DHIS2 adapter does a basic connectivity check; others return a placeholder response)

Credentials are encrypted and stored in Vault, not the database.

### 4. Manage Users (Admin only)

Navigate to **Users** in the sidebar.

- **List**: Table with search and filtering
- **Invite**: Click "Invite User" — set email, full name, role (admin/analyst/editor/viewer)
- **Edit**: Click edit on any user row
- **Disable**: Disable a user (soft-delete)
- **Resend Invite**: Resend invitation email

Non-admin users see a read-only view.

### 5. Test the API directly

Open http://localhost:8000/docs for the interactive Swagger UI. All endpoints are documented there.

---

## API Reference

Base URL: `/api/v1`

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login, returns JWT in httpOnly cookies |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | No | Clear auth cookies |
| GET | `/auth/me` | Yes | Get current user |

### Connections

| Method | Path | Required Role | Description |
|--------|------|---------------|-------------|
| GET | `/connections` | admin, analyst, editor, viewer | List all |
| POST | `/connections` | admin, analyst | Create |
| GET | `/connections/{id}` | admin, analyst, editor, viewer | Get by ID |
| PUT | `/connections/{id}` | admin, analyst, editor | Update |
| DELETE | `/connections/{id}` | admin | Delete (cleans Vault) |
| POST | `/connections/{id}/test` | admin, analyst, editor | Test connection |

### Users

| Method | Path | Required Role | Description |
|--------|------|---------------|-------------|
| GET | `/users` | admin | List all |
| POST | `/users` | admin | Create / invite |
| GET | `/users/{id}` | admin | Get by ID |
| PUT | `/users/{id}` | admin | Update |
| DELETE | `/users/{id}` | admin | Soft-delete |
| POST | `/users/{id}/resend-invite` | admin | Resend invitation |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | `{"status": "ok"}` |

---

## Project Structure

```
interxchange/
├── .env                       # Environment variables (gitignored)
├── .env.example               # Environment template (tracked)
├── docker-compose.yml         # Full stack orchestration
├── .github/workflows/ci.yml   # GitHub Actions CI
├── backend/
│   ├── app/
│   │   ├── api/v1/           # Route handlers (auth, connections, users)
│   │   ├── core/             # Config, database, security, exceptions
│   │   ├── models/           # SQLAlchemy models (user, connection)
│   │   ├── repositories/     # Data access layer (base, user, connection)
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic (user, connection, vault)
│   │   └── adapters/         # External system adapters (DHIS2, etc.)
│   ├── migrations/           # Alembic migrations
│   ├── requirements/         # Python dependencies (base, dev, prod)
│   ├── tests/                # pytest integration + unit tests
│   ├── Dockerfile
│   ├── .env                  # Manual-run env vars (gitignored)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared UI components (Sidebar, TopBar, etc.)
│   │   ├── features/         # Page-level feature modules
│   │   ├── hooks/            # Custom hooks (useAuth, useDebounce)
│   │   ├── services/         # Axios client with token refresh
│   │   ├── store/            # Redux store configuration
│   │   └── theme/            # MUI theme customization
│   ├── Dockerfile
│   └── package.json
└── README.md
```

---

## Testing

```bash
cd backend
pytest -v                       # All tests
pytest tests/integration/       # Integration tests only  
pytest --cov=app                # With coverage report
```

Tests use an in-memory SQLite database and httpx async client. No external services required.

---

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `main`/`develop`:

1. **Backend tests** — Python 3.11, install deps, run migrations, pytest with coverage
2. **Frontend checks** — Node 20, npm ci, lint, type-check (tsc), build
3. **Docker build** — Build both backend and frontend images

---

## What's Next

| Phase | Focus |
|-------|-------|
| Phase 2 | Mapping Engine — file upload (CSV/Excel/JSON/XML), variable mapping |
| Phase 3 | Workflow & Channel management — scheduling, multi-channel routing |
| Phase 4 | Execution engine — transaction processing, real-time updates, audit log |
| Phase 5 | Advanced features — Settings pages, real-time dashboard |
| Phase 6 | Production CI/CD — SSL/TLS, backups, monitoring, scaling |
| Phase 7 | Testing & documentation — E2E, performance, security |
| Phase 8 | Post-launch — monitoring, incident response, feedback |

---

## License

Proprietary — internal use.
