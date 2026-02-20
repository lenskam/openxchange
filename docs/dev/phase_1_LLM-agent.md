# Prompt Template for LLM Agent – Phase 1: Core Infrastructure

Use this prompt to instruct the LLM agent to begin implementing Phase 1 of the Interxchange platform. The agent should generate code, configuration files, and documentation according to the specifications in the enhanced GEMINI.md.

---

## INSTRUCTIONS FOR LLM AGENT

You are an expert full-stack developer tasked with implementing **Phase 1: Core Infrastructure** of the Interxchange platform. Follow the specifications below exactly. Generate all necessary code, configuration files, and documentation. Ensure the implementation is production-ready, secure, and follows best practices.

---

### Phase 1 Overview

**Goal**: Set up the foundational backend and frontend structure, database models, authentication, and basic API endpoints for connection management.

**Duration**: 7 days (simulated)

**Deliverables**:
- FastAPI application with application factory pattern
- PostgreSQL database with SQLAlchemy models and Alembic migrations
- JWT authentication (login, refresh, logout)
- User model with role-based access control (Admin, Analyst, Editor, Viewer)
- Vault integration for secrets management (dev mode)
- Connection management: models, CRUD API, test connection endpoint (basic)
- React + TypeScript frontend with Material-UI, layout, authentication pages
- Docker Compose setup for development
- CI/CD pipeline (GitHub Actions) for testing

---

### Detailed Tasks

#### Day 1-2: Backend Foundation

1. **Project Structure**
   Create the following directory structure:
   ```
   backend/
   ├── app/
   │   ├── __init__.py
   │   ├── main.py
   │   ├── core/
   │   │   ├── config.py
   │   │   ├── security.py
   │   │   ├── database.py
   │   │   └── exceptions.py
   │   ├── models/
   │   │   ├── __init__.py
   │   │   ├── user.py
   │   │   └── connection.py
   │   ├── schemas/
   │   │   ├── __init__.py
   │   │   ├── user.py
   │   │   ├── connection.py
   │   │   └── auth.py
   │   ├── api/
   │   │   ├── __init__.py
   │   │   ├── dependencies.py
   │   │   ├── v1/
   │   │   │   ├── __init__.py
   │   │   │   ├── auth.py
   │   │   │   ├── users.py
   │   │   │   └── connections.py
   │   ├── services/
   │   │   ├── __init__.py
   │   │   ├── auth_service.py
   │   │   ├── user_service.py
   │   │   ├── connection_service.py
   │   │   └── vault_service.py
   │   ├── adapters/
   │   │   ├── __init__.py
   │   │   ├── base.py
   │   │   └── dhis2.py  # placeholder
   │   └── utils/
   │       ├── logging.py
   │       └── validators.py
   ├── tests/
   │   ├── __init__.py
   │   ├── conftest.py
   │   ├── test_api/
   │   ├── test_services/
   │   └── test_adapters/
   ├── migrations/
   ├── requirements/
   │   ├── base.txt
   │   ├── dev.txt
   │   └── prod.txt
   ├── .env.example
   ├── alembic.ini
   └── Dockerfile
   ```

2. **Configuration** (`app/core/config.py`)
   - Use Pydantic `BaseSettings` to load from environment variables.
   - Include: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `VAULT_URL`, `VAULT_TOKEN` (dev), `ENVIRONMENT`, `LOG_LEVEL`.
   - Provide a `Settings` class with `Config` class reading from `.env`.

3. **Database** (`app/core/database.py`)
   - Create async SQLAlchemy engine using `create_async_engine` with `asyncpg`.
   - Define `AsyncSessionLocal` and `get_db` dependency.
   - Base class for models: `Base = declarative_base()`.

4. **Models** (`app/models/`)
   - **User** (`user.py`):
     ```python
     class User(Base):
         __tablename__ = "users"
         id = Column(Integer, primary_key=True)
         email = Column(String, unique=True, index=True, nullable=False)
         hashed_password = Column(String, nullable=False)
         full_name = Column(String)
         role = Column(Enum("admin", "analyst", "editor", "viewer", name="user_roles"), default="viewer")
         is_active = Column(Boolean, default=True)
         two_factor_enabled = Column(Boolean, default=False)
         created_at = Column(DateTime, default=func.now())
         last_login = Column(DateTime, nullable=True)
     ```
   - **Connection** (`connection.py`):
     ```python
     class Connection(Base):
         __tablename__ = "connections"
         id = Column(Integer, primary_key=True)
         name = Column(String, nullable=False)
         type = Column(Enum("dhis2", "openhim", "openfn", "fhir", "hl7", "generic", name="connection_types"))
         url = Column(String, nullable=False)
         auth_type = Column(Enum("basic", "api_key", "oauth2", name="auth_types"))
         credentials_encrypted = Column(String)  # Vault path reference
         status = Column(Enum("active", "inactive", "error", name="connection_status"), default="inactive")
         last_sync_at = Column(DateTime, nullable=True)
         created_at = Column(DateTime, default=func.now())
         updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
     ```

5. **Alembic Migrations**
   - Initialize Alembic: `alembic init migrations`
   - Configure `alembic.ini` to use `alembic/env.py` with async SQLAlchemy.
   - Generate initial migration: `alembic revision --autogenerate -m "init"`
   - Ensure migration script creates tables correctly.

6. **Security Utilities** (`app/core/security.py`)
   - Password hashing: `pwd_context = CryptContext(schemes=["bcrypt"])`
   - Functions: `verify_password`, `get_password_hash`
   - JWT functions: `create_access_token`, `create_refresh_token`, `decode_token`
   - Token data schemas (Pydantic) for JWT payload.

7. **Vault Service** (`app/services/vault_service.py`)
   - Create a class `VaultService` that connects to Vault using `hvac` async client.
   - Methods: `write_secret(path, data)`, `read_secret(path)`, `delete_secret(path)`.
   - For development, use Vault in dev mode (token auth).
   - Store connection credentials under path `secret/data/connections/{connection_id}`.

#### Day 3-4: Authentication & User Management

1. **Auth Schemas** (`app/schemas/auth.py`)
   - `UserLogin` (email, password)
   - `TokenResponse` (access_token, refresh_token, token_type)
   - `RefreshToken` (refresh_token)

2. **Auth API** (`app/api/v1/auth.py`)
   - `POST /auth/login`: validate credentials, update `last_login`, return tokens in httpOnly cookies.
   - `POST /auth/refresh`: validate refresh token, issue new access token.
   - `POST /auth/logout`: clear cookies, invalidate refresh token (optional: add to blacklist).
   - `GET /auth/me`: return current user info (requires auth).

3. **User Schemas** (`app/schemas/user.py`)
   - `UserBase` (email, full_name, role)
   - `UserCreate` (extends UserBase with password)
   - `UserUpdate` (partial)
   - `UserInDB` (includes id, created_at, last_login)
   - `UserList` (paginated)

4. **User API** (`app/api/v1/users.py`) – **Admin only**
   - `GET /users`: list users (filter by role, status)
   - `POST /users`: invite user (creates inactive user, sends email placeholder)
   - `GET /users/{id}`: get user details
   - `PUT /users/{id}`: update user
   - `DELETE /users/{id}`: delete user (soft delete? set inactive)
   - `POST /users/{id}/resend-invite`: placeholder

   **Note**: For MVP, email sending can be a placeholder (log the invitation link). Full email service can be added later.

5. **Dependencies** (`app/api/dependencies.py`)
   - `get_current_user`: extract JWT from cookie, validate, fetch user from DB.
   - `require_roles(*allowed_roles)`: dependency that checks user role.

6. **Tests**
   - Write unit tests for auth service (password hashing, token creation).
   - Write integration tests for auth endpoints using `TestClient` and test database.
   - Mock Vault for tests.

#### Day 5-7: Connection Management

1. **Connection Schemas** (`app/schemas/connection.py`)
   - `ConnectionBase` (name, type, url, auth_type)
   - `ConnectionCreate` (extends ConnectionBase with credentials dict)
   - `ConnectionUpdate` (partial)
   - `ConnectionInDB` (excludes credentials, includes id, status, timestamps)
   - `ConnectionTest` (credentials for test)

2. **Connection Service** (`app/services/connection_service.py`)
   - CRUD methods: `create`, `get`, `get_multi`, `update`, `delete`.
   - When creating/updating:
     - Encrypt credentials by storing in Vault via `VaultService`.
     - Store Vault path in `credentials_encrypted`.
   - `test_connection(connection_id)`: async task that instantiates adapter and calls `test_connection()`.

3. **Connection API** (`app/api/v1/connections.py`)
   - `GET /connections`: list (supports filtering by type, status)
   - `POST /connections`: create new connection
   - `GET /connections/{id}`: get details (no credentials)
   - `PUT /connections/{id}`: update
   - `DELETE /connections/{id}`: delete (also remove from Vault)
   - `POST /connections/{id}/test`: trigger test, return task ID (use BackgroundTasks or Celery – for Phase 1, can be synchronous simple test)
   - `GET /connections/{id}/test/{task_id}`: get test result (placeholder)

4. **Base Adapter** (`app/adapters/base.py`)
   ```python
   class BaseAdapter(ABC):
       def __init__(self, connection: Connection, vault_service: VaultService):
           self.connection = connection
           self.credentials = vault_service.read_secret(connection.credentials_encrypted)

       @abstractmethod
       async def test_connection(self) -> bool:
           pass

       @abstractmethod
       async def fetch_data(self, params: dict) -> Any:
           pass

       @abstractmethod
       async def send_data(self, data: Any) -> dict:
           pass
   ```
   - Implement a simple DHIS2 adapter (placeholder) that just tests connectivity by fetching system info.

5. **Background Tasks** (simplified for Phase 1)
   - Use FastAPI `BackgroundTasks` to run connection tests asynchronously.
   - Store test results in memory cache (Redis) with expiry.
   - Later replace with Celery.

#### Frontend (React + TypeScript)

1. **Project Setup**
   ```
   frontend/
   ├── public/
   ├── src/
   │   ├── components/
   │   │   ├── layout/
   │   │   │   ├── Sidebar.tsx
   │   │   │   ├── Header.tsx
   │   │   │   └── Layout.tsx
   │   │   ├── auth/
   │   │   │   ├── Login.tsx
   │   │   │   └── ProtectedRoute.tsx
   │   │   └── common/
   │   │       ├── StatusBadge.tsx
   │   │       └── LoadingSpinner.tsx
   │   ├── pages/
   │   │   ├── Dashboard.tsx (placeholder)
   │   │   ├── Connections.tsx
   │   │   └── Settings.tsx (placeholder)
   │   ├── services/
   │   │   ├── api.ts
   │   │   ├── auth.ts
   │   │   └── connections.ts
   │   ├── store/
   │   │   ├── authContext.tsx
   │   │   └── index.ts
   │   ├── theme/
   │   │   └── index.ts
   │   ├── types/
   │   │   └── index.ts
   │   ├── App.tsx
   │   ├── index.tsx
   │   └── config.ts
   ├── package.json
   ├── tsconfig.json
   └── Dockerfile
   ```

2. **Theme** (`src/theme/index.ts`)
   - Create Material-UI theme with primary color `#2563eb`.
   - Define typography, spacing, component overrides to match prototype.

3. **Layout Components**
   - **Sidebar**: Logo, navigation items grouped (PLATFORM, ADMINISTRATION), active highlight. Use MUI `Drawer` and `List`.
   - **Header**: Search input (non‑functional for Phase 1), user avatar with dropdown (logout).
   - **Layout**: Combine Sidebar and Header, with main content area.

4. **Authentication**
   - Create `AuthContext` providing `user`, `login`, `logout`, `isAuthenticated`.
   - `Login` page with form (email, password). On success, redirect to Dashboard.
   - `ProtectedRoute` wrapper that redirects to login if not authenticated.

5. **Connections Page** (basic version)
   - Fetch connections from API on mount.
   - Display as cards (as per prototype) with name, type, URL, status badge, last sync, creation date.
   - Implement "New Connection" button that opens a modal form (name, type, URL, auth type, credentials).
   - On submit, call API to create connection.
   - Add "Test Connection" button on each card that calls test endpoint and shows result (toast).
   - Use MUI components: `Card`, `Grid`, `Button`, `Dialog`, `TextField`, `Select`, `Alert`.

6. **API Service** (`src/services/api.ts`)
   - Create Axios instance with base URL.
   - Add interceptors to attach JWT (from cookie – browser automatically sends cookies).
   - Handle 401 responses (redirect to login).

7. **Store/State Management**
   - For Phase 1, use React Context for auth.
   - For connections, use local component state + fetching. Later may add React Query.

#### Docker & CI/CD

1. **Dockerfile for Backend**
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements/base.txt requirements.txt
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
   ```

2. **Dockerfile for Frontend** (development, with hot reload)
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm install
   COPY . .
   CMD ["npm", "start"]
   ```

3. **docker-compose.yml** (development)
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       environment:
         POSTGRES_USER: interxchange
         POSTGRES_PASSWORD: interxchange
         POSTGRES_DB: interxchange
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data

     redis:
       image: redis:7
       ports:
         - "6379:6379"

     vault:
       image: vault:latest
       ports:
         - "8200:8200"
       environment:
         VAULT_DEV_ROOT_TOKEN_ID: dev_token
         VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
       cap_add:
         - IPC_LOCK

     backend:
       build: ./backend
       ports:
         - "8000:8000"
       environment:
         - DATABASE_URL=postgresql+asyncpg://interxchange:interxchange@postgres/interxchange
         - REDIS_URL=redis://redis:6379/0
         - VAULT_URL=http://vault:8200
         - VAULT_TOKEN=dev_token
         - JWT_SECRET_KEY=dev_jwt_secret
         - JWT_REFRESH_SECRET_KEY=dev_refresh_secret
         - ENVIRONMENT=development
       volumes:
         - ./backend:/app
       depends_on:
         - postgres
         - redis
         - vault

     frontend:
       build: ./frontend
       ports:
         - "3000:3000"
       environment:
         - REACT_APP_API_URL=http://localhost:8000/api/v1
       volumes:
         - ./frontend:/app
         - /app/node_modules
       depends_on:
         - backend

   volumes:
     postgres_data:
   ```

4. **GitHub Actions** (`.github/workflows/ci.yml`)
   - Trigger on push to main and pull requests.
   - Jobs:
     - `test-backend`: Set up Python, install deps, run pytest with coverage.
     - `test-frontend`: Set up Node, install deps, run tests.
   - Use services: postgres, redis for backend tests.

---

### Additional Requirements

- **Code Quality**:
  - Backend: Follow PEP 8, use `black` formatting, `isort`, `flake8`.
  - Frontend: Use ESLint (with TypeScript), Prettier.
  - Include pre-commit hooks (optional but recommended).

- **Logging**:
  - Configure structured logging (JSON) in backend using `python-json-logger`.
  - Log all requests (middleware) and important events.

- **Error Handling**:
  - Define custom exception classes in `app/core/exceptions.py`.
  - Add global exception handler that returns consistent error responses (`{"detail": "message"}`).

- **Environment Variables**:
  - Provide `.env.example` with all required variables (no secrets).

- **Documentation**:
  - Update `README.md` with setup instructions: Docker, environment, running tests.
  - For backend, ensure `/docs` (Swagger) is accessible.

---

### Deliverables Checklist

The agent should produce:

- [ ] Complete backend code with all specified files
- [ ] Complete frontend code with all specified files
- [ ] `docker-compose.yml` and Dockerfiles
- [ ] `.env.example`
- [ ] `requirements/*.txt`
- [ ] `package.json` and frontend dependencies
- [ ] Alembic migrations
- [ ] GitHub Actions workflow YAML
- [ ] README with setup instructions
- [ ] Tests (backend and frontend) with coverage >80% for critical paths

---

### Constraints & Notes

- For Phase 1, the mapping engine, workflows, transactions, and real‑time updates are **not** required. Focus only on core infrastructure, auth, and connection management.
- Email sending for user invitations can be a placeholder (console log).
- The DHIS2 adapter only needs a `test_connection` method that works.
- Vault integration: for development, use root token. In production, proper authentication will be added later.
- Use async/await throughout the backend.
- Ensure all API endpoints are properly versioned (`/api/v1/...`).
- JWT tokens should be stored in httpOnly cookies, not localStorage.
- For frontend, the Connections page should match the prototype exactly (cards layout). Other pages can be placeholders with basic text.

---

### How to Proceed

Generate the code phase by phase in the order above. Provide explanations for key decisions and ensure all files are included. After completing each major component, you can ask for confirmation before moving to the next.

Start by setting up the backend project structure and configuration files.

---