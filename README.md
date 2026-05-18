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
| **Frontend** | React 19, TypeScript, MUI 7, Redux Toolkit, Recharts, Vite 7 |
| **Database** | PostgreSQL 15 |
| **Cache / Queue** | Redis 7 |
| **Secrets** | HashiCorp Vault 1.15 |
| **Auth** | JWT (access + refresh tokens in httpOnly cookies), bcrypt |
| **Infrastructure** | Docker Compose, GitHub Actions |

---

## Prerequisites

- **Docker** + **Docker Compose** (recommended — runs everything except frontend)
- OR **Python 3.11+**, **Node.js 20+**, **PostgreSQL 15**, **Redis 7**, **Vault 1.15** (manual setup)

---

## Quick Start (Docker)

```bash
# 1. Start backend services
docker-compose up -d

# 2. Run database migrations
docker-compose exec backend alembic upgrade head

# 3. Start frontend (separate terminal — not in docker-compose yet)
cd frontend
npm install
npm run dev
```

- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173

> The docker-compose.yml starts PostgreSQL (port 5433), Redis (6379), Vault (8200), and the FastAPI backend (8000). The frontend runs separately via Vite dev server.

---

## Manual Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements/dev.txt
```

Make sure PostgreSQL, Redis, and Vault are running. Update `backend/.env` as needed, then:

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

The frontend dev server proxies API calls to `http://localhost:8000/api/v1` (configured in `frontend/src/services/api.ts`).

---

## Configuration

Key environment variables in `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://interxchange:interxchange@postgres/interxchange` | PostgreSQL connection |
| `JWT_SECRET_KEY` | `dev_jwt_secret` | Access token signing key |
| `JWT_REFRESH_SECRET_KEY` | `dev_refresh_secret` | Refresh token signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL |
| `VAULT_URL` | `http://vault:8200` | HashiCorp Vault URL |
| `VAULT_TOKEN` | `dev_token` | Vault authentication token |
| `ENVIRONMENT` | `development` | Runtime environment |

Copy `backend/.env.example` to `backend/.env` and adjust for your environment.

---

## Hands-On Testing

After starting both backend and frontend:

### 1. Log in

Navigate to http://localhost:5173. A default admin user is seeded? If not, use the `/docs` Swagger UI:

```bash
# Create an admin user via the API
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'
```

Check `app/api/v1/auth.py` or look for a seed script to find the default credentials.

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
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared UI components (Sidebar, TopBar, etc.)
│   │   ├── features/         # Page-level feature modules
│   │   │   ├── auth/         # Login page, AuthContext, Redux slice
│   │   │   ├── connections/  # Connections CRUD page
│   │   │   ├── dashboard/    # Dashboard with charts
│   │   │   └── users/        # Users management page
│   │   ├── hooks/            # Custom hooks (useAuth, useDebounce)
│   │   ├── services/         # Axios client with token refresh
│   │   ├── store/            # Redux store configuration
│   │   └── theme/            # MUI theme customization
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml        # PostgreSQL, Redis, Vault, Backend
├── .github/workflows/ci.yml  # GitHub Actions CI
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
