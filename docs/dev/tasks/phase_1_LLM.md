# Phase 1 Implementation Prompt for Gemini

Based on the **Interxchange GEMINI.md** development guide, here is a comprehensive prompt to give to the Gemini AI agent for executing Phase 1 of the project.

---

## PROMPT: Implement Interxchange Phase 1 - Core Infrastructure

You are the **Gemini AI agent** tasked with implementing **Phase 1: Core Infrastructure** of the Interxchange interoperability platform according to the specifications in the `GEMINI.md` development guide.

### Phase 1 Scope (7 days)
- Backend foundation, authentication, user models, connection manager (basic)
- Frontend foundation, layout, login
- Docker setup, CI (test only)

### Timeline Expectations
- Day 1-2: Project scaffolding, Docker setup, database models
- Day 3-4: Authentication backend + frontend login
- Day 5-6: User management + connection manager (basic CRUD)
- Day 7: Integration, testing, CI pipeline

---

## TASK 1: Project Scaffolding & Docker Setup

### Backend Structure
Create the following directory structure with initial files:

```
backend/
  app/
    __init__.py
    main.py                 # FastAPI application entry point
    core/
      __init__.py
      config.py             # Pydantic settings management
      security.py           # JWT utilities, password hashing
      dependencies.py       # FastAPI dependencies (DB session, current user)
      exceptions.py         # Custom exception handlers
    api/
      __init__.py
      api_v1/
        __init__.py
        api.py              # API router aggregator
        endpoints/
          __init__.py
          auth.py           # Login, refresh, logout, me
          users.py          # User CRUD (admin only)
          connections.py    # Connection CRUD (basic)
    models/
      __init__.py
      user.py               # User SQLAlchemy model
      connection.py         # Connection SQLAlchemy model
    schemas/
      __init__.py
      user.py               # Pydantic schemas for User
      connection.py         # Pydantic schemas for Connection
      auth.py               # Login/refresh schemas
    services/
      __init__.py
      user_service.py       # User business logic
      connection_service.py # Connection business logic
    repositories/
      __init__.py
      base.py               # Base repository class
      user_repository.py    # User data access
      connection_repository.py # Connection data access
    utils/
      __init__.py
      logging.py            # Logging configuration
  tests/
    __init__.py
    conftest.py             # pytest fixtures
    unit/
      test_user_service.py
    integration/
      test_auth.py
      test_users.py
  requirements/
    base.txt                # Core dependencies
    dev.txt                 # Development dependencies (includes base)
    prod.txt                # Production dependencies (includes base)
  .env.example              # Environment variables template
  Dockerfile                # Multi-stage build
  docker-compose.yml        # Local development services
  alembic/
    versions/
    env.py
    alembic.ini
```

### Frontend Structure
Create the following directory structure:

```
frontend/
  public/
    index.html
    favicon.ico
  src/
    index.tsx               # Entry point
    App.tsx                 # Main App component with routing
    index.css               # Global styles
    components/
      common/
        Sidebar.tsx         # Collapsible sidebar
        TopBar.tsx          # Top navigation bar
        StatusBadge.tsx     # Reusable status badge
        LoadingSpinner.tsx
        ErrorBoundary.tsx
    features/
      auth/
        LoginPage.tsx
        AuthContext.tsx     # Auth state management
        authSlice.ts        # Redux slice for auth
      dashboard/
        DashboardPage.tsx   # Placeholder
      connections/
        ConnectionsPage.tsx # Placeholder
      users/
        UsersPage.tsx       # Placeholder (admin only)
    hooks/
      useAuth.ts
      useDebounce.ts
    store/
      index.ts              # Redux store configuration
      rootReducer.ts
    theme/
      theme.ts              # MUI theme configuration
    types/
      index.ts              # Global TypeScript types
    utils/
      api.ts                # Axios instance with interceptors
      constants.ts
  .env.example
  package.json
  tsconfig.json
  Dockerfile
```

### Docker Configuration

**Dockerfile (backend):**
```dockerfile
# Multi-stage build for Python backend
FROM python:3.11-slim as builder

WORKDIR /app
COPY requirements/base.txt requirements/base.txt
RUN pip install --user -r requirements/base.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**Dockerfile (frontend):**
```dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  vault:
    image: vault:1.13
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_TOKEN}
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
    ports:
      - "8200:8200"
    cap_add:
      - IPC_LOCK
    volumes:
      - vault_data:/vault/file

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres/${POSTGRES_DB}
      - REDIS_URL=${REDIS_URL}
      - VAULT_ADDR=http://vault:8200
      - VAULT_TOKEN=${VAULT_TOKEN}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - JWT_REFRESH_SECRET_KEY=${JWT_REFRESH_SECRET_KEY}
    volumes:
      - ./backend:/app  # Mount for hot reload
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      vault:
        condition: service_started

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
  vault_data:
```

### Environment Variables (.env.example)
```
# Database
POSTGRES_USER=interxchange
POSTGRES_PASSWORD=change_me_in_production
POSTGRES_DB=interxchange

# Redis
REDIS_URL=redis://redis:6379/0

# Vault
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=dev_root_token

# JWT
JWT_SECRET_KEY=super_secret_key_change_me
JWT_REFRESH_SECRET_KEY=another_secret_key_change_me
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

---

## TASK 2: Database Models & Alembic

### Base Model (backend/app/models/base.py)
```python
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
import uuid

Base = declarative_base()

class BaseModel(Base):
    __abstract__ = True
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### User Model (backend/app/models/user.py)
```python
from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.orm import relationship
import enum

class UserRole(enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    EDITOR = "editor"
    VIEWER = "viewer"

class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships (to be added later)
    # created_workflows = relationship("Workflow", back_populates="created_by")
    # uploaded_mappings = relationship("Mapping", back_populates="uploaded_by")
    # audit_logs = relationship("AuditLog", back_populates="user")
```

### Connection Model (backend/app/models/connection.py)
```python
from sqlalchemy import Column, String, Enum, DateTime
import enum

class ConnectionType(enum.Enum):
    DHIS2 = "dhis2"
    OPENHIM = "openhim"
    OPENFN = "openfn"
    FHIR = "fhir"
    HL7 = "hl7"
    GENERIC = "generic"

class AuthType(enum.Enum):
    BASIC = "basic"
    API_KEY = "api_key"
    OAUTH2 = "oauth2"

class ConnectionStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"

class Connection(BaseModel):
    __tablename__ = "connections"
    
    name = Column(String(255), nullable=False)
    type = Column(Enum(ConnectionType), nullable=False)
    url = Column(String(500), nullable=False)
    auth_type = Column(Enum(AuthType), nullable=False)
    credentials_encrypted = Column(String(500))  # Reference path in Vault
    status = Column(Enum(ConnectionStatus), default=ConnectionStatus.INACTIVE)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
```

### Alembic Setup

**alembic/env.py** - Configure for async SQLAlchemy:
```python
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
from app.core.config import settings
from app.models.base import Base
from app.models.user import User
from app.models.connection import Connection

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

**Generate initial migration:**
```bash
cd backend
alembic init alembic
# Configure alembic/env.py as above
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

---

## TASK 3: Core Configuration & Security

### Configuration (backend/app/core/config.py)
```python
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str
    
    # Vault
    VAULT_ADDR: str
    VAULT_TOKEN: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    # Environment
    ENVIRONMENT: str = "development"
    
    model_config = ConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
```

### Security Utilities (backend/app/core/security.py)
```python
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_REFRESH_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def decode_token(token: str, secret_key: str, expected_type: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        if payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None
```

### Dependencies (backend/app/core/dependencies.py)
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import decode_token
from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token, settings.JWT_SECRET_KEY, "access")
    if payload is None:
        raise credentials_exception
    
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    
    if user is None or not user.is_active:
        raise credentials_exception
    
    return user

async def get_current_active_superuser(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
```

---

## TASK 4: Database Connection & Repositories

### Database Session (backend/app/core/database.py)
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True if settings.ENVIRONMENT == "development" else False,
    future=True
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

### Base Repository (backend/app/repositories/base.py)
```python
from typing import Generic, TypeVar, Type, Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.models.base import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db
    
    async def create(self, **kwargs) -> ModelType:
        instance = self.model(**kwargs)
        self.db.add(instance)
        await self.db.commit()
        await self.db.refresh(instance)
        return instance
    
    async def get_by_id(self, id: str) -> Optional[ModelType]:
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()
    
    async def get_all(self, skip: int = 0, limit: int = 100, **filters) -> List[ModelType]:
        query = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.where(getattr(self.model, key) == value)
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update(self, id: str, **kwargs) -> Optional[ModelType]:
        await self.db.execute(
            update(self.model)
            .where(self.model.id == id)
            .values(**kwargs)
        )
        await self.db.commit()
        return await self.get_by_id(id)
    
    async def delete(self, id: str) -> bool:
        result = await self.db.execute(
            delete(self.model).where(self.model.id == id)
        )
        await self.db.commit()
        return result.rowcount > 0
```

### User Repository (backend/app/repositories/user_repository.py)
```python
from sqlalchemy import select
from app.repositories.base import BaseRepository
from app.models.user import User
from typing import Optional

class UserRepository(BaseRepository[User]):
    def __init__(self, db):
        super().__init__(User, db)
    
    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
```

### Connection Repository (backend/app/repositories/connection_repository.py)
```python
from app.repositories.base import BaseRepository
from app.models.connection import Connection

class ConnectionRepository(BaseRepository[Connection]):
    def __init__(self, db):
        super().__init__(Connection, db)
```

---

## TASK 5: Pydantic Schemas

### User Schemas (backend/app/schemas/user.py)
```python
from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.VIEWER
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserInDB(UserBase):
    id: UUID
    created_at: datetime
    last_login: Optional[datetime] = None
    two_factor_enabled: bool = False
    
    model_config = ConfigDict(from_attributes=True)

class UserResponse(UserInDB):
    pass
```

### Connection Schemas (backend/app/schemas/connection.py)
```python
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.connection import ConnectionType, AuthType, ConnectionStatus

class ConnectionBase(BaseModel):
    name: str
    type: ConnectionType
    url: str
    auth_type: AuthType

class ConnectionCreate(ConnectionBase):
    credentials: Dict[str, Any]  # Will be stored in Vault

class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    auth_type: Optional[AuthType] = None
    credentials: Optional[Dict[str, Any]] = None
    status: Optional[ConnectionStatus] = None

class ConnectionInDB(ConnectionBase):
    id: UUID
    status: ConnectionStatus
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ConnectionResponse(ConnectionInDB):
    # Credentials are never returned
    pass
```

### Auth Schemas (backend/app/schemas/auth.py)
```python
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
```

---

## TASK 6: Services

### User Service (backend/app/services/user_service.py)
```python
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional, List

class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)
    
    async def create_user(self, user_data: UserCreate):
        # Check if user exists
        existing = await self.repo.get_by_email(user_data.email)
        if existing:
            raise ValueError("User with this email already exists")
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        user = await self.repo.create(
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role,
            is_active=user_data.is_active
        )
        return user
    
    async def get_user(self, user_id: UUID):
        return await self.repo.get_by_id(str(user_id))
    
    async def get_user_by_email(self, email: str):
        return await self.repo.get_by_email(email)
    
    async def get_all_users(self, skip: int = 0, limit: int = 100, **filters):
        return await self.repo.get_all(skip=skip, limit=limit, **filters)
    
    async def update_user(self, user_id: UUID, user_data: UserUpdate):
        update_data = user_data.model_dump(exclude_unset=True)
        return await self.repo.update(str(user_id), **update_data)
    
    async def delete_user(self, user_id: UUID):
        return await self.repo.delete(str(user_id))
```

### Connection Service (backend/app/services/connection_service.py)
```python
from app.repositories.connection_repository import ConnectionRepository
from app.schemas.connection import ConnectionCreate, ConnectionUpdate
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional, List, Dict, Any
import hvac  # Vault client

class ConnectionService:
    def __init__(self, db: AsyncSession, vault_client: hvac.Client):
        self.repo = ConnectionRepository(db)
        self.vault = vault_client
    
    async def _store_credentials_in_vault(self, connection_id: str, credentials: Dict[str, Any]) -> str:
        """Store credentials in Vault and return the secret path"""
        secret_path = f"secret/data/connections/{connection_id}"
        self.vault.secrets.kv.v2.create_or_update_secret(
            path=secret_path,
            secret=credentials
        )
        return secret_path
    
    async def create_connection(self, connection_data: ConnectionCreate):
        # Store credentials in Vault first
        secret_path = await self._store_credentials_in_vault(
            str(uuid.uuid4()),  # Temporary ID, will be replaced after creation
            connection_data.credentials
        )
        
        # Create connection with reference to Vault
        connection = await self.repo.create(
            name=connection_data.name,
            type=connection_data.type,
            url=connection_data.url,
            auth_type=connection_data.auth_type,
            credentials_encrypted=secret_path,
            status="inactive"
        )
        
        # Update Vault path with actual ID
        correct_path = f"secret/data/connections/{connection.id}"
        self.vault.secrets.kv.v2.create_or_update_secret(
            path=correct_path,
            secret=connection_data.credentials
        )
        # Delete old path
        self.vault.secrets.kv.v2.delete_metadata_and_all_versions(
            path=f"secret/data/connections/{str(uuid.uuid4())}"
        )
        
        # Update connection with correct path
        await self.repo.update(str(connection.id), credentials_encrypted=correct_path)
        
        return connection
    
    async def get_connection(self, connection_id: UUID):
        return await self.repo.get_by_id(str(connection_id))
    
    async def get_all_connections(self, skip: int = 0, limit: int = 100, **filters):
        return await self.repo.get_all(skip=skip, limit=limit, **filters)
    
    async def update_connection(self, connection_id: UUID, connection_data: ConnectionUpdate):
        update_data = connection_data.model_dump(exclude_unset=True)
        
        # If credentials are being updated, update Vault
        if "credentials" in update_data:
            secret_path = f"secret/data/connections/{connection_id}"
            self.vault.secrets.kv.v2.create_or_update_secret(
                path=secret_path,
                secret=update_data.pop("credentials")
            )
        
        return await self.repo.update(str(connection_id), **update_data)
    
    async def delete_connection(self, connection_id: UUID):
        # Delete from Vault first
        secret_path = f"secret/data/connections/{connection_id}"
        self.vault.secrets.kv.v2.delete_metadata_and_all_versions(path=secret_path)
        
        # Delete from database
        return await self.repo.delete(str(connection_id))
    
    async def test_connection(self, connection_id: UUID) -> bool:
        # Basic implementation - will be expanded in later phases
        connection = await self.get_connection(connection_id)
        if not connection:
            return False
        
        # Retrieve credentials from Vault
        secret = self.vault.secrets.kv.v2.read_secret_version(
            path=f"secret/data/connections/{connection_id}"
        )
        credentials = secret['data']['data']
        
        # For now, just return success
        # In later phases, actual adapter will test the connection
        return True
```

---

## TASK 7: API Endpoints

### Main FastAPI App (backend/app/main.py)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api_v1.api import api_router
from app.core.exceptions import setup_exception_handlers

app = FastAPI(
    title="Interxchange API",
    description="Interoperability mediator for health information systems",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Exception handlers
setup_exception_handlers(app)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}
```

### API Router (backend/app/api/api_v1/api.py)
```python
from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, users, connections

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(connections.router, prefix="/connections", tags=["connections"])
```

### Auth Endpoints (backend/app/api/api_v1/endpoints/auth.py)
```python
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings
from app.schemas.auth import LoginRequest, LoginResponse, TokenResponse, RefreshRequest
from app.services.user_service import UserService
from datetime import timedelta

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Login with email and password, returns access and refresh tokens in httpOnly cookies"""
    user_service = UserService(db)
    user = await user_service.get_user_by_email(request.email)
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )
    
    # Create tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=settings.ENVIRONMENT == "production",
        samesite="strict"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        secure=settings.ENVIRONMENT == "production",
        samesite="strict"
    )
    
    # Update last login
    await user_service.update_user(user.id, {"last_login": datetime.utcnow()})
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Get new access token using refresh token"""
    payload = decode_token(request.refresh_token, settings.JWT_REFRESH_SECRET_KEY, "refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_service = UserService(db)
    user = await user_service.get_user(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new access token
    access_token = create_access_token({"sub": str(user.id)})
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=settings.ENVIRONMENT == "production",
        samesite="strict"
    )
    
    return TokenResponse(access_token=access_token)

@router.post("/logout")
async def logout(response: Response):
    """Clear authentication cookies"""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Successfully logged out"}

@router.get("/me")
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """Get current authenticated user information"""
    from app.schemas.user import UserResponse
    return UserResponse.model_validate(current_user)
```

### Users Endpoints (backend/app/api/api_v1/endpoints/users.py)
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_active_superuser
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.user_service import UserService

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)  # Admin only
):
    """Get all users (admin only)"""
    user_service = UserService(db)
    users = await user_service.get_all_users(skip=skip, limit=limit)
    return users

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)  # Admin only
):
    """Create a new user (admin only)"""
    user_service = UserService(db)
    try:
        user = await user_service.create_user(user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)  # Admin only
):
    """Get user by ID (admin only)"""
    user_service = UserService(db)
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)  # Admin only
):
    """Update user (admin only)"""
    user_service = UserService(db)
    user = await user_service.update_user(user_id, user_data)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)  # Admin only
):
    """Delete user (admin only)"""
    user_service = UserService(db)
    deleted = await user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return None
```

### Connections Endpoints (backend/app/api/api_v1/endpoints/connections.py)
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Dict, Any
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.connection import ConnectionCreate, ConnectionUpdate, ConnectionResponse
from app.services.connection_service import ConnectionService
import hvac
from app.core.config import settings

# Initialize Vault client
vault_client = hvac.Client(
    url=settings.VAULT_ADDR,
    token=settings.VAULT_TOKEN
)

router = APIRouter()

@router.get("/", response_model=List[ConnectionResponse])
async def get_connections(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all connections (authenticated users)"""
    filters = {}
    if type:
        filters["type"] = type
    if status:
        filters["status"] = status
    
    connection_service = ConnectionService(db, vault_client)
    connections = await connection_service.get_all_connections(skip=skip, limit=limit, **filters)
    return connections

@router.post("/", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(
    connection_data: ConnectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new connection (authenticated users)"""
    connection_service = ConnectionService(db, vault_client)
    try:
        connection = await connection_service.create_connection(connection_data)
        return connection
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{connection_id}", response_model=ConnectionResponse)
async def get_connection(
    connection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get connection by ID"""
    connection_service = ConnectionService(db, vault_client)
    connection = await connection_service.get_connection(connection_id)
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    return connection

@router.put("/{connection_id}", response_model=ConnectionResponse)
async def update_connection(
    connection_id: UUID,
    connection_data: ConnectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update connection"""
    connection_service = ConnectionService(db, vault_client)
    try:
        connection = await connection_service.update_connection(connection_id, connection_data)
        if not connection:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
        return connection
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(
    connection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete connection"""
    connection_service = ConnectionService(db, vault_client)
    deleted = await connection_service.delete_connection(connection_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    return None

@router.post("/{connection_id}/test")
async def test_connection(
    connection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Test connection (async, returns job ID)"""
    connection_service = ConnectionService(db, vault_client)
    try:
        result = await connection_service.test_connection(connection_id)
        # In Phase 1, just return success
        # In later phases, this will be async and return job_id
        return {"success": result, "message": "Connection test completed"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
```

---

## TASK 8: Frontend Foundation

### API Client (frontend/src/utils/api.ts)
```typescript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // You can add custom logic here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        await api.post('/auth/refresh', { refresh_token: '' }); // Cookie is sent automatically
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

### Auth Context (frontend/src/features/auth/AuthContext.tsx)
```typescript
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import api from '../../utils/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'analyst' | 'editor' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        // Not authenticated
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    // User data will be fetched by /me endpoint, but we can set it from response if available
    const userResponse = await api.get('/auth/me');
    setUser(userResponse.data);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### Redux Store Setup (frontend/src/store/index.ts)
```typescript
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add other reducers here as features are implemented
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Auth Slice (frontend/src/features/auth/authSlice.ts)
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
    },
  },
});

export const { setUser, setLoading, setError, logout } = authSlice.actions;
export default authSlice.reducer;
```

### Login Page (frontend/src/features/auth/LoginPage.tsx)
```typescript
import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Interxchange
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Data Integration Platform
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
```

### App Component with Routing (frontend/src/App.tsx)
```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import theme from './theme/theme';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import ConnectionsPage from './features/connections/ConnectionsPage';
import UsersPage from './features/users/UsersPage';
import Sidebar from './components/common/Sidebar';
import TopBar from './components/common/TopBar';
import { Box } from '@mui/material';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// Main layout with sidebar and top bar
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Box sx={{ flexGrow: 1 }}>
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <Box component="main" sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/connections"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ConnectionsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <MainLayout>
              <UsersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
```

### Placeholder Pages (for dashboard, connections, users)
Create simple placeholder components for now:

**frontend/src/features/dashboard/DashboardPage.tsx**
```typescript
import React from 'react';
import { Typography, Paper, Grid } from '@mui/material';

const DashboardPage: React.FC = () => {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Connections</Typography>
            <Typography variant="h3">8</Typography>
            <Typography variant="body2" color="text.secondary">6 active</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Workflows</Typography>
            <Typography variant="h3">6</Typography>
            <Typography variant="body2" color="text.secondary">3 active</Typography>
          </Paper>
        </Grid>
        {/* Add more placeholder stats */}
      </Grid>
    </div>
  );
};

export default DashboardPage;
```

---

## TASK 9: GitHub Actions CI Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      vault:
        image: vault:1.13
        env:
          VAULT_DEV_ROOT_TOKEN_ID: test_token
        ports:
          - 8200:8200
        options: >-
          --cap-add=IPC_LOCK

    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      working-directory: ./backend
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements/dev.txt
    
    - name: Run migrations
      working-directory: ./backend
      env:
        DATABASE_URL: postgresql+asyncpg://test_user:test_password@localhost/test_db
        REDIS_URL: redis://localhost:6379/0
        VAULT_ADDR: http://localhost:8200
        VAULT_TOKEN: test_token
        JWT_SECRET_KEY: test_key
        JWT_REFRESH_SECRET_KEY: test_refresh_key
      run: |
        alembic upgrade head
    
    - name: Run tests with pytest
      working-directory: ./backend
      env:
        DATABASE_URL: postgresql+asyncpg://test_user:test_password@localhost/test_db
        REDIS_URL: redis://localhost:6379/0
        VAULT_ADDR: http://localhost:8200
        VAULT_TOKEN: test_token
        JWT_SECRET_KEY: test_key
        JWT_REFRESH_SECRET_KEY: test_refresh_key
      run: |
        pytest --cov=app --cov-report=xml -v
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v4
      with:
        file: ./backend/coverage.xml
        flags: backend

  test-frontend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - name: Install dependencies
      working-directory: ./frontend
      run: npm ci
    
    - name: Run linter
      working-directory: ./frontend
      run: npm run lint
    
    - name: Run tests
      working-directory: ./frontend
      run: npm test -- --coverage --watchAll=false
    
    - name: Build
      working-directory: ./frontend
      run: npm run build
      env:
        CI: false

  docker-build:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Build backend Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./backend
        push: false
        tags: interxchange-backend:test
        cache-from: type=gha
        cache-to: type=gha,mode=max
    
    - name: Build frontend Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./frontend
        push: false
        tags: interxchange-frontend:test
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

---

## TASK 10: Initial Tests

### Basic Auth Tests (backend/tests/integration/test_auth.py)
```python
import pytest
from httpx import AsyncClient
from app.main import app
from app.core.database import get_db
from app.models.user import User
from app.core.security import get_password_hash

@pytest.fixture
async def test_user(db_session):
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Test User",
        role="viewer",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, test_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, test_user):
    # First login
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    access_token = login_response.json()["access_token"]
    
    # Then get current user
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"
```

---

## DELIVERABLES CHECKLIST

Before considering Phase 1 complete, ensure all items below are implemented and working:

### Backend
- [ ] Project structure created with all directories
- [ ] Docker Compose with PostgreSQL, Redis, Vault working
- [ ] Database models (User, Connection) with Alembic migrations
- [ ] Configuration management with Pydantic settings
- [ ] JWT authentication with httpOnly cookies
- [ ] Password hashing with bcrypt
- [ ] User repository and service with CRUD operations
- [ ] Connection repository and service with CRUD operations
- [ ] Vault integration for credential storage
- [ ] Auth endpoints: login, refresh, logout, me
- [ ] Users endpoints (admin only): list, create, get, update, delete
- [ ] Connections endpoints: list, create, get, update, delete, test
- [ ] Health check endpoint
- [ ] Unit and integration tests passing
- [ ] All endpoints documented in OpenAPI (available at /docs)

### Frontend
- [ ] Project structure created with all directories
- [ ] Docker setup for frontend
- [ ] Material-UI theme configured
- [ ] API client with axios and interceptors
- [ ] Auth context/provider for authentication state
- [ ] Redux store configured
- [ ] Login page with form validation
- [ ] Protected route wrapper
- [ ] Main layout with sidebar and top bar (collapsible)
- [ ] Dashboard placeholder page with stat cards
- [ ] Connections placeholder page
- [ ] Users placeholder page (admin only)
- [ ] Successful login redirects to dashboard
- [ ] Logout functionality works
- [ ] Token refresh interceptor works

### CI/CD
- [ ] GitHub Actions workflow runs backend tests
- [ ] GitHub Actions workflow runs frontend tests
- [ ] GitHub Actions workflow builds Docker images
- [ ] All tests pass in CI environment

---

## NOTES FOR GEMINI

1. **Follow the coding standards** defined in section 11 of the GEMINI.md file
2. **Use the ✅/❌ examples** as guidance for quality code
3. **Generate tests** for all new functionality (aim for >80% coverage)
4. **Document all API endpoints** with proper OpenAPI descriptions
5. **Commit messages** should follow conventional commits format
6. **If you encounter ambiguities**, ask for clarification before proceeding
7. **Update this document** if you discover patterns that should be documented for future phases

---

**Begin Phase 1 implementation now. Provide code files in your response, organized by the directory structure above. After completing each major component, indicate progress and ask for feedback if needed.**