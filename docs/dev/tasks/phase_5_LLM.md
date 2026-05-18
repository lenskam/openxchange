# Phase 5 Implementation Prompt for Gemini

Based on the **Interxchange GEMINI.md** development guide, here is a comprehensive prompt for the Gemini AI agent to execute **Phase 5: Advanced Features & Polish**.

---

## PROMPT: Implement Interxchange Phase 5 - Advanced Features & Polish

You are the **Gemini AI agent** tasked with implementing **Phase 5: Advanced Features & Polish** of the Interxchange interoperability platform according to the specifications in the `GEMINI.md` development guide.

### Phase 5 Scope (7 days)

**NOTE**: Dashboard and Users CRUD pages were already fully implemented during Phase 1. Phase 5 focuses on what's still pending below.

- Settings pages (Profile, Organization, Notifications, Security, System)
- Audit Log page with comprehensive tracking
- Real-time updates integration across all pages
- Prometheus/Grafana monitoring setup
- Structured logging (ELK/Loki integration)
- Documentation (API, User Guide, Deployment)

### Timeline Expectations

- Day 1: Audit Log model, repository, service, and API endpoints
- Day 2-3: Settings pages (Profile, Organization, Notifications, Security, System)
- Day 4-5: Real-time dashboard updates + WebSocket integration for all pages
- Day 6: Monitoring (Prometheus metrics, Grafana dashboards) + Structured logging
- Day 7: Documentation (OpenAPI, User Guide, Deployment Guide) + Final polish

---

## TASK 1: Audit Log Model, Repository & Service

### Audit Log Model (backend/app/models/audit_log.py)

```python
from sqlalchemy import Column, String, ForeignKey, DateTime, JSON, Text, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from datetime import datetime
import enum

class AuditAction(enum.Enum):
    # Authentication actions
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGED = "password_changed"

    # User management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_INVITED = "user_invited"
    USER_ROLE_CHANGED = "user_role_changed"

    # Connection management
    CONNECTION_CREATED = "connection_created"
    CONNECTION_UPDATED = "connection_updated"
    CONNECTION_DELETED = "connection_deleted"
    CONNECTION_TESTED = "connection_tested"

    # Workflow management
    WORKFLOW_CREATED = "workflow_created"
    WORKFLOW_UPDATED = "workflow_updated"
    WORKFLOW_DELETED = "workflow_deleted"
    WORKFLOW_TRIGGERED = "workflow_triggered"
    WORKFLOW_EXECUTED = "workflow_executed"

    # Mapping management
    MAPPING_UPLOADED = "mapping_uploaded"
    MAPPING_UPDATED = "mapping_updated"
    MAPPING_DELETED = "mapping_deleted"
    MAPPING_VERSION_CREATED = "mapping_version_created"

    # Channel management
    CHANNEL_CREATED = "channel_created"
    CHANNEL_UPDATED = "channel_updated"
    CHANNEL_DELETED = "channel_deleted"
    CHANNEL_ENABLED = "channel_enabled"
    CHANNEL_DISABLED = "channel_disabled"

    # Settings
    SETTINGS_UPDATED = "settings_updated"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"

    # System
    SYSTEM_BACKUP = "system_backup"
    SYSTEM_MIGRATION = "system_migration"
    SYSTEM_CACHE_CLEARED = "system_cache_cleared"
    SYSTEM_RESTART = "system_restart"

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    action = Column(String(100), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resource_type = Column(String(100), nullable=False, index=True)
    resource_id = Column(String(255), nullable=True, index=True)
    resource_name = Column(String(500), nullable=True)
    details = Column(JSON, default={})
    ip_address = Column(String(45), nullable=False)  # IPv6 compatible
    user_agent = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
```

### Update User Model (add relationship)

```python
# In backend/app/models/user.py, add:
audit_logs = relationship("AuditLog", back_populates="user")
```

### Audit Log Repository (backend/app/repositories/audit_log_repository.py)

```python
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.models.audit_log import AuditLog, AuditAction
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID

class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self, db):
        super().__init__(AuditLog, db)

    async def create_log(
        self,
        action: str,
        user_id: Optional[str],
        resource_type: str,
        resource_id: Optional[str],
        resource_name: Optional[str],
        details: Dict[str, Any],
        ip_address: str,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Create an audit log entry"""
        return await self.create(
            action=action,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=datetime.utcnow()
        )

    async def get_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        action: Optional[str] = None,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get audit logs with filters"""
        query = select(AuditLog).options(
            selectinload(AuditLog.user)
        ).order_by(desc(AuditLog.timestamp))

        if action:
            query = query.where(AuditLog.action == action)
        if user_id:
            query = query.where(AuditLog.user_id == user_id)
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
        if resource_id:
            query = query.where(AuditLog.resource_id == resource_id)
        if start_date:
            query = query.where(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.where(AuditLog.timestamp <= end_date)
        if search:
            query = query.where(
                (AuditLog.action.ilike(f"%{search}%")) |
                (AuditLog.resource_name.ilike(f"%{search}%")) |
                (AuditLog.resource_type.ilike(f"%{search}%"))
            )

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        logs = result.scalars().all()

        return [
            {
                "id": log.id,
                "action": log.action,
                "user_id": log.user_id,
                "user_email": log.user.email if log.user else "System",
                "user_name": log.user.full_name if log.user else "System",
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "resource_name": log.resource_name,
                "details": log.details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "timestamp": log.timestamp
            }
            for log in logs
        ]

    async def get_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get audit log statistics"""
        since_date = datetime.utcnow() - timedelta(days=days)

        # Total actions
        total_query = select(func.count()).select_from(AuditLog).where(AuditLog.timestamp >= since_date)
        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0

        # Actions by type
        actions_query = select(
            AuditLog.action, func.count(AuditLog.action)
        ).where(AuditLog.timestamp >= since_date).group_by(AuditLog.action)
        actions_result = await self.db.execute(actions_query)
        actions_by_type = {row[0]: row[1] for row in actions_result.fetchall()}

        # Actions by user
        users_query = select(
            AuditLog.user_id, func.count(AuditLog.user_id)
        ).where(
            and_(AuditLog.timestamp >= since_date, AuditLog.user_id.isnot(None))
        ).group_by(AuditLog.user_id).order_by(func.count().desc()).limit(10)
        users_result = await self.db.execute(users_query)
        actions_by_user = {row[0]: row[1] for row in users_result.fetchall()}

        return {
            "total_actions": total,
            "actions_by_type": actions_by_type,
            "most_active_users": actions_by_user,
            "period_days": days
        }
```

### Audit Log Service (backend/app/services/audit_service.py)

```python
from app.repositories.audit_log_repository import AuditLogRepository
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

class AuditService:
    def __init__(self, db: AsyncSession):
        self.repo = AuditLogRepository(db)

    async def log(
        self,
        action: str,
        user_id: Optional[str],
        resource_type: str,
        resource_id: Optional[str],
        resource_name: Optional[str],
        details: Dict[str, Any],
        ip_address: str,
        user_agent: Optional[str] = None
    ):
        """Log an action to audit trail"""
        try:
            await self.repo.create_log(
                action=action,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_name=resource_name,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent
            )
        except Exception as e:
            # Don't let audit logging failures break the main flow
            logger.error(f"Failed to create audit log: {str(e)}")

    async def get_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        action: Optional[str] = None,
        user_id: Optional[UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get filtered audit logs"""
        return await self.repo.get_logs(
            skip=skip,
            limit=limit,
            action=action,
            user_id=str(user_id) if user_id else None,
            resource_type=resource_type,
            resource_id=resource_id,
            start_date=start_date,
            end_date=end_date,
            search=search
        )

    async def get_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get audit statistics"""
        return await self.repo.get_stats(days=days)
```

### Audit Log Schemas (backend/app/schemas/audit_log.py)

```python
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List

class AuditLogBase(BaseModel):
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: str
    user_agent: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    user_id: Optional[UUID] = None

class AuditLogResponse(AuditLogBase):
    id: UUID
    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditLogStatsResponse(BaseModel):
    total_actions: int
    actions_by_type: Dict[str, int]
    most_active_users: Dict[str, int]
    period_days: int
```

### Audit Log Endpoints (backend/app/api/api_v1/endpoints/audit_logs.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.dependencies import get_current_active_superuser
from app.schemas.audit_log import AuditLogResponse, AuditLogStatsResponse
from app.services.audit_service import AuditService
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse])
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)  # Admin only
):
    """Get audit logs with filters (admin only)"""
    audit_service = AuditService(db)
    logs = await audit_service.get_logs(
        skip=skip,
        limit=limit,
        action=action,
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        start_date=start_date,
        end_date=end_date,
        search=search
    )
    return logs

@router.get("/stats", response_model=AuditLogStatsResponse)
async def get_audit_stats(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)  # Admin only
):
    """Get audit log statistics (admin only)"""
    audit_service = AuditService(db)
    stats = await audit_service.get_stats(days=days)
    return stats
```

### Update API Router (backend/app/api/api_v1/api.py)

```python
from app.api.api_v1.endpoints import audit_logs

api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
```

### Middleware for Automatic Audit Logging (backend/app/core/middleware.py)

```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.services.audit_service import AuditService
from app.core.database import AsyncSessionLocal
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)

class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware to automatically log API requests"""

    # Endpoints to exclude from logging
    EXCLUDED_PATHS = ["/health", "/metrics", "/docs", "/redoc", "/openapi.json"]

    # Actions to log for specific endpoints
    ENDPOINT_ACTIONS = {
        "POST:/api/v1/users": "user_created",
        "PUT:/api/v1/users/": "user_updated",
        "DELETE:/api/v1/users/": "user_deleted",
        "POST:/api/v1/connections": "connection_created",
        "PUT:/api/v1/connections/": "connection_updated",
        "DELETE:/api/v1/connections/": "connection_deleted",
        "POST:/api/v1/workflows": "workflow_created",
        "PUT:/api/v1/workflows/": "workflow_updated",
        "DELETE:/api/v1/workflows/": "workflow_deleted",
        "POST:/api/v1/channels": "channel_created",
        "PUT:/api/v1/channels/": "channel_updated",
        "DELETE:/api/v1/channels/": "channel_deleted",
        "POST:/api/v1/mappings/upload": "mapping_uploaded",
        "DELETE:/api/v1/mappings/": "mapping_deleted",
        "POST:/api/v1/settings": "settings_updated"
    }

    async def dispatch(self, request: Request, call_next):
        # Skip excluded paths
        if any(request.url.path.startswith(path) for path in self.EXCLUDED_PATHS):
            return await call_next(request)

        # Get request body for logging (for POST/PUT)
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                # Store body for later use
                request.state.body = body
            except:
                pass

        response = await call_next(request)

        # Determine if we should log this request
        action_key = f"{request.method}:{request.url.path}"

        # Try exact match first
        action = self.ENDPOINT_ACTIONS.get(action_key)

        # Try prefix match for dynamic routes
        if not action:
            for key in self.ENDPOINT_ACTIONS:
                if key.endswith("/") and action_key.startswith(key):
                    action = self.ENDPOINT_ACTIONS[key]
                    break
                elif "/" in key and key.count("/") == action_key.count("/"):
                    # Check if they match except for ID part
                    key_parts = key.split("/")
                    path_parts = action_key.split("/")
                    if len(key_parts) == len(path_parts):
                        match = True
                        for i, part in enumerate(key_parts):
                            if part != path_parts[i] and not part.endswith("/"):
                                # This part is likely a resource ID
                                if i == len(key_parts) - 2:  # Position before last
                                    continue
                                else:
                                    match = False
                                    break
                        if match:
                            action = self.ENDPOINT_ACTIONS[key]
                            break

        # Log if action is defined and response is successful (2xx)
        if action and 200 <= response.status_code < 300:
            try:
                # Get user from request (if authenticated)
                user_id = None
                if hasattr(request.state, "user"):
                    user_id = request.state.user.id

                # Extract resource ID from path
                resource_id = None
                path_parts = request.url.path.split("/")
                for i, part in enumerate(path_parts):
                    if part in ["users", "connections", "workflows", "channels", "mappings"]:
                        if i + 1 < len(path_parts):
                            resource_id = path_parts[i + 1]

                # Parse body for additional details
                details = {
                    "method": request.method,
                    "url": str(request.url),
                    "status_code": response.status_code
                }

                if body:
                    try:
                        parsed_body = json.loads(body)
                        # Don't log sensitive data
                        if "password" in parsed_body:
                            parsed_body["password"] = "***"
                        if "credentials" in parsed_body:
                            parsed_body["credentials"] = "***"
                        details["request_body"] = parsed_body
                    except:
                        pass

                # Create audit log
                async with AsyncSessionLocal() as db:
                    audit_service = AuditService(db)
                    await audit_service.log(
                        action=action,
                        user_id=str(user_id) if user_id else None,
                        resource_type=action_key.split(":")[1].split("/")[2] if len(action_key.split("/")) > 2 else "api",
                        resource_id=resource_id,
                        resource_name=None,
                        details=details,
                        ip_address=request.client.host if request.client else "unknown",
                        user_agent=request.headers.get("user-agent")
                    )
                    await db.commit()
            except Exception as e:
                logger.error(f"Failed to create audit log from middleware: {str(e)}")

        return response
```

### Register Middleware (backend/app/main.py)

```python
from app.core.middleware import AuditMiddleware

app.add_middleware(AuditMiddleware)
```

---

## TASK 2: Users Page Enhancements (Admin)

### User Invite Functionality (backend/app/services/user_service.py)

Add invite method to existing UserService:

```python
async def invite_user(self, email: str, full_name: str, role: str, invited_by: User) -> Dict[str, Any]:
    """Invite a new user (creates inactive user and sends invitation email)"""

    # Check if user already exists
    existing = await self.repo.get_by_email(email)
    if existing:
        raise ValueError(f"User with email {email} already exists")

    # Generate temporary password
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

    # Create user (inactive until they set password)
    user = await self.repo.create(
        email=email,
        hashed_password=get_password_hash(temp_password),
        full_name=full_name,
        role=role,
        is_active=False,
        two_factor_enabled=False
    )

    # TODO: Send invitation email with temporary password
    # In production, integrate with SMTP service
    # For now, log the temporary password
    logger.info(f"User invited: {email}, temporary password: {temp_password}")

    # Audit log
    from app.services.audit_service import AuditService
    audit_service = AuditService(self.repo.db)
    await audit_service.log(
        action="user_invited",
        user_id=str(invited_by.id),
        resource_type="user",
        resource_id=str(user.id),
        resource_name=full_name,
        details={"email": email, "role": role},
        ip_address=invited_by.last_login_ip if hasattr(invited_by, 'last_login_ip') else "unknown",
        user_agent=None
    )

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "temporary_password": temp_password  # Only returned in development
    }

async def resend_invite(self, user_id: UUID, invited_by: User) -> Dict[str, Any]:
    """Resend invitation to a user"""

    user = await self.repo.get_by_id(str(user_id))
    if not user:
        raise ValueError("User not found")

    if user.is_active:
        raise ValueError("User is already active")

    # Generate new temporary password
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

    # Update password
    await self.repo.update(str(user_id), hashed_password=get_password_hash(temp_password))

    # TODO: Resend invitation email with temporary password
    logger.info(f"Resent invitation to {user.email}, new temporary password: {temp_password}")

    return {
        "user_id": user.id,
        "email": user.email,
        "message": "Invitation resent",
        "temporary_password": temp_password  # Only returned in development
    }
```

### Add Invite Endpoints (backend/app/api/api_v1/endpoints/users.py)

```python
@router.post("/invite", response_model=UserResponse)
async def invite_user(
    email: str,
    full_name: str,
    role: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Invite a new user (admin only)"""
    user_service = UserService(db)
    try:
        result = await user_service.invite_user(email, full_name, role, current_user)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{user_id}/resend-invite")
async def resend_invite(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Resend invitation to a user (admin only)"""
    user_service = UserService(db)
    try:
        result = await user_service.resend_invite(user_id, current_user)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Frontend Users Page (frontend/src/features/users/UsersPage.tsx)

Create enhanced UsersPage with invite functionality:

```typescript
import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchUsers, inviteUser, deleteUser, updateUser, resendInvite } from './usersSlice';

const roleColors: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  admin: 'error',
  analyst: 'warning',
  editor: 'info',
  viewer: 'default'
};

const UsersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { users, isLoading } = useAppSelector(state => state.users);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [inviteData, setInviteData] = useState({
    email: '',
    full_name: '',
    role: 'viewer'
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleInvite = async () => {
    try {
      const result = await dispatch(inviteUser(inviteData)).unwrap();
      setSnackbar({ open: true, message: `User invited successfully`, severity: 'success' });
      setTempPassword(result.temporary_password);
      setInviteModalOpen(false);
      setInviteData({ email: '', full_name: '', role: 'viewer' });
      dispatch(fetchUsers());
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to invite user', severity: 'error' });
    }
  };

  const handleResendInvite = async (userId: string) => {
    try {
      const result = await dispatch(resendInvite(userId)).unwrap();
      setSnackbar({ open: true, message: 'Invitation resent', severity: 'success' });
      setTempPassword(result.temporary_password);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to resend invite', severity: 'error' });
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      await dispatch(updateUser({ id: user.id, data: { is_active: !user.is_active } })).unwrap();
      setSnackbar({ open: true, message: `User ${user.is_active ? 'disabled' : 'enabled'} successfully`, severity: 'success' });
      dispatch(fetchUsers());
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to update user', severity: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await dispatch(deleteUser(userId)).unwrap();
        setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
        dispatch(fetchUsers());
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message || 'Failed to delete user', severity: 'error' });
      }
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await dispatch(updateUser({ id: userId, data: { role } })).unwrap();
      setSnackbar({ open: true, message: 'User role updated', severity: 'success' });
      dispatch(fetchUsers());
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to update role', severity: 'error' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Summary stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const pendingUsers = users.filter(u => !u.is_active).length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage platform users, roles, and permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setInviteModalOpen(true)}
        >
          Invite User
        </Button>
      </Box>

      {/* Summary Stats */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
        <Paper sx={{ p: 2, minWidth: 150, textAlign: 'center' }}>
          <Typography variant="h4">{totalUsers}</Typography>
          <Typography variant="body2" color="text.secondary">Total Users</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 150, textAlign: 'center' }}>
          <Typography variant="h4" color="success.main">{activeUsers}</Typography>
          <Typography variant="body2" color="text.secondary">Active</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 150, textAlign: 'center' }}>
          <Typography variant="h4" color="warning.main">{pendingUsers}</Typography>
          <Typography variant="body2" color="text.secondary">Pending</Typography>
        </Paper>
      </Box>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">No users found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: roleColors[user.role] }}>
                        {user.full_name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        variant="outlined"
                      >
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="analyst">Analyst</MenuItem>
                        <MenuItem value="editor">Editor</MenuItem>
                        <MenuItem value="viewer">Viewer</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Chip label="Active" color="success" size="small" />
                    ) : (
                      <Chip label="Pending" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Resend Invite">
                      <IconButton
                        size="small"
                        onClick={() => handleResendInvite(user.id)}
                        disabled={user.is_active}
                      >
                        <EmailIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={user.is_active ? 'Disable User' : 'Enable User'}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.is_active ? (
                          <BlockIcon fontSize="small" color="error" />
                        ) : (
                          <CheckCircleIcon fontSize="small" color="success" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.role === 'admin'}  // Don't allow deleting admin
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Invite User Modal */}
      <Dialog open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Full Name"
              fullWidth
              value={inviteData.full_name}
              onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
            />
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={inviteData.role}
                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="analyst">Analyst</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
            <Alert severity="info">
              The user will receive an email with a temporary password to set up their account.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteModalOpen(false)}>Cancel</Button>
          <Button onClick={handleInvite} variant="contained">Send Invitation</Button>
        </DialogActions>
      </Dialog>

      {/* Temporary Password Dialog */}
      <Dialog open={!!tempPassword} onClose={() => setTempPassword(null)} maxWidth="sm" fullWidth>
        <DialogTitle>User Invited Successfully</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            User has been invited. In development mode, the temporary password is shown below.
          </Alert>
          <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
            <Typography variant="body2" fontFamily="monospace" align="center">
              Temporary Password: <strong>{tempPassword}</strong>
            </Typography>
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            In production, this password would be sent via email. Save this password now as it won't be shown again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTempPassword(null)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

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

export default UsersPage;
```

---

## TASK 3: Settings Pages

### System Settings Model (backend/app/models/system_settings.py)

```python
from sqlalchemy import Column, String, Integer, Boolean, JSON
from app.models.base import BaseModel

class SystemSettings(BaseModel):
    __tablename__ = "system_settings"

    # Singleton - only one row should exist
    id = Column(Integer, primary_key=True, default=1)

    # Organization settings
    organization_name = Column(String(255), default="Ministry of Health")
    country = Column(String(100), default="Democratic Republic of Congo")
    primary_contact_email = Column(String(255), nullable=True)
    support_email = Column(String(255), nullable=True)
    platform_name = Column(String(100), default="Interchange")
    primary_color = Column(String(7), default="#2563eb")  # Hex color

    # System settings
    default_date_format = Column(String(50), default="YYYY-MM-DD")
    log_retention_days = Column(Integer, default=90)
    default_timezone = Column(String(50), default="Africa/Lubumbashi")
    max_concurrent_workflows = Column(Integer, default=5)

    # Security settings
    session_timeout_minutes = Column(Integer, default=30)
    two_factor_required = Column(Boolean, default=False)
    password_policy = Column(JSON, default={
        "min_length": 8,
        "require_uppercase": True,
        "require_lowercase": True,
        "require_numbers": True,
        "require_special": True
    })

    # Notification settings (system-wide defaults)
    email_notifications_enabled = Column(Boolean, default=True)
    slack_webhook_url = Column(String(500), nullable=True)
    workflow_failure_alerts = Column(Boolean, default=True)
    daily_digest_enabled = Column(Boolean, default=False)
    daily_digest_time = Column(String(5), default="09:00")  # HH:MM format
```

### Settings Service (backend/app/services/settings_service.py)

```python
from app.repositories.base import BaseRepository
from app.models.system_settings import SystemSettings
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

class SettingsRepository(BaseRepository[SystemSettings]):
    def __init__(self, db: AsyncSession):
        super().__init__(SystemSettings, db)

    async def get_settings(self) -> SystemSettings:
        """Get system settings (create default if not exists)"""
        settings = await self.get_by_id(1)
        if not settings:
            settings = await self.create(id=1)
        return settings

class SettingsService:
    def __init__(self, db: AsyncSession):
        self.repo = SettingsRepository(db)

    async def get_organization_settings(self) -> Dict[str, Any]:
        settings = await self.repo.get_settings()
        return {
            "organization_name": settings.organization_name,
            "country": settings.country,
            "primary_contact_email": settings.primary_contact_email,
            "support_email": settings.support_email,
            "platform_name": settings.platform_name,
            "primary_color": settings.primary_color
        }

    async def update_organization_settings(self, data: Dict[str, Any]) -> Dict[str, Any]:
        settings = await self.repo.get_settings()
        for key, value in data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        await self.repo.db.commit()
        return await self.get_organization_settings()

    async def get_system_settings(self) -> Dict[str, Any]:
        settings = await self.repo.get_settings()
        return {
            "default_date_format": settings.default_date_format,
            "log_retention_days": settings.log_retention_days,
            "default_timezone": settings.default_timezone,
            "max_concurrent_workflows": settings.max_concurrent_workflows,
            "session_timeout_minutes": settings.session_timeout_minutes,
            "two_factor_required": settings.two_factor_required,
            "password_policy": settings.password_policy
        }

    async def update_system_settings(self, data: Dict[str, Any]) -> Dict[str, Any]:
        settings = await self.repo.get_settings()
        for key, value in data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        await self.repo.db.commit()
        return await self.get_system_settings()

    async def get_notification_settings(self) -> Dict[str, Any]:
        settings = await self.repo.get_settings()
        return {
            "email_notifications_enabled": settings.email_notifications_enabled,
            "slack_webhook_url": settings.slack_webhook_url,
            "workflow_failure_alerts": settings.workflow_failure_alerts,
            "daily_digest_enabled": settings.daily_digest_enabled,
            "daily_digest_time": settings.daily_digest_time
        }

    async def update_notification_settings(self, data: Dict[str, Any]) -> Dict[str, Any]:
        settings = await self.repo.get_settings()
        for key, value in data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        await self.repo.db.commit()
        return await self.get_notification_settings()
```

### Settings Endpoints (backend/app/api/api_v1/endpoints/settings.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_active_superuser
from app.services.settings_service import SettingsService
from app.models.user import User
from pydantic import BaseModel
from typing import Optional, Dict, Any

router = APIRouter()

# Pydantic models for settings
class OrganizationSettingsUpdate(BaseModel):
    organization_name: Optional[str] = None
    country: Optional[str] = None
    primary_contact_email: Optional[str] = None
    support_email: Optional[str] = None
    platform_name: Optional[str] = None
    primary_color: Optional[str] = None

class SystemSettingsUpdate(BaseModel):
    default_date_format: Optional[str] = None
    log_retention_days: Optional[int] = None
    default_timezone: Optional[str] = None
    max_concurrent_workflows: Optional[int] = None
    session_timeout_minutes: Optional[int] = None
    two_factor_required: Optional[bool] = None
    password_policy: Optional[Dict[str, Any]] = None

class NotificationSettingsUpdate(BaseModel):
    email_notifications_enabled: Optional[bool] = None
    slack_webhook_url: Optional[str] = None
    workflow_failure_alerts: Optional[bool] = None
    daily_digest_enabled: Optional[bool] = None
    daily_digest_time: Optional[str] = None

# Organization settings (admin only)
@router.get("/organization")
async def get_organization_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings_service = SettingsService(db)
    return await settings_service.get_organization_settings()

@router.put("/organization")
async def update_organization_settings(
    data: OrganizationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    settings_service = SettingsService(db)
    return await settings_service.update_organization_settings(data.model_dump(exclude_unset=True))

# System settings (admin only)
@router.get("/system")
async def get_system_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings_service = SettingsService(db)
    return await settings_service.get_system_settings()

@router.put("/system")
async def update_system_settings(
    data: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    settings_service = SettingsService(db)
    return await settings_service.update_system_settings(data.model_dump(exclude_unset=True))

# Notification settings
@router.get("/notifications")
async def get_notification_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings_service = SettingsService(db)
    return await settings_service.get_notification_settings()

@router.put("/notifications")
async def update_notification_settings(
    data: NotificationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings_service = SettingsService(db)
    return await settings_service.update_notification_settings(data.model_dump(exclude_unset=True))
```

### API Key Management (backend/app/services/api_key_service.py)

```python
from app.repositories.base import BaseRepository
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional
from uuid import UUID
import secrets
import bcrypt
from datetime import datetime

class ApiKey(BaseModel):
    __tablename__ = "api_keys"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    key_hash = Column(String(255), nullable=False)  # bcrypt hash of the actual key
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    scopes = Column(JSON, default=["read:all"])  # e.g., ["read:transactions", "execute:workflows"]
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", back_populates="api_keys")

class ApiKeyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_api_key(self, user_id: UUID, name: str, scopes: List[str]) -> Dict[str, Any]:
        """Generate a new API key (returns the raw key once)"""

        # Generate raw key
        raw_key = f"ix_{secrets.token_urlsafe(32)}"

        # Hash the key for storage
        key_hash = bcrypt.hashpw(raw_key.encode(), bcrypt.gensalt()).decode()

        # Store in database
        api_key = ApiKey(
            name=name,
            key_hash=key_hash,
            user_id=str(user_id),
            scopes=scopes
        )
        self.db.add(api_key)
        await self.db.commit()
        await self.db.refresh(api_key)

        # Return the raw key (only shown once)
        return {
            "id": api_key.id,
            "name": api_key.name,
            "key": raw_key,
            "scopes": api_key.scopes,
            "created_at": api_key.created_at
        }

    async def validate_api_key(self, api_key: str) -> Optional[User]:
        """Validate an API key and return the associated user"""

        # Extract prefix for lookup (first 10 chars)
        prefix = api_key[:10]

        # Find potential matches (this is simplified - in production use proper indexing)
        query = select(ApiKey).where(ApiKey.key_hash.like(f"{prefix}%"))
        result = await self.db.execute(query)
        keys = result.scalars().all()

        for key in keys:
            if bcrypt.checkpw(api_key.encode(), key.key_hash.encode()):
                # Update last used timestamp
                key.last_used_at = datetime.utcnow()
                await self.db.commit()

                # Return associated user
                user_query = select(User).where(User.id == key.user_id)
                user_result = await self.db.execute(user_query)
                return user_result.scalar_one_or_none()

        return None

    async def get_user_keys(self, user_id: UUID) -> List[Dict[str, Any]]:
        """Get all API keys for a user"""
        query = select(ApiKey).where(ApiKey.user_id == str(user_id))
        result = await self.db.execute(query)
        keys = result.scalars().all()

        return [
            {
                "id": k.id,
                "name": k.name,
                "scopes": k.scopes,
                "last_used_at": k.last_used_at,
                "created_at": k.created_at
            }
            for k in keys
        ]

    async def revoke_api_key(self, key_id: UUID, user_id: UUID) -> bool:
        """Revoke an API key"""
        query = delete(ApiKey).where(
            ApiKey.id == str(key_id),
            ApiKey.user_id == str(user_id)
        )
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0
```

---

## TASK 4: Prometheus Metrics & Monitoring

### Metrics Endpoint (backend/app/core/metrics.py)

```python
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response
import time
from typing import Callable
from functools import wraps

# Define metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10)
)

workflow_executions_total = Counter(
    'workflow_executions_total',
    'Total workflow executions',
    ['workflow_id', 'status']
)

workflow_execution_duration_seconds = Histogram(
    'workflow_execution_duration_seconds',
    'Workflow execution duration in seconds',
    ['workflow_id']
)

active_workflows_gauge = Gauge(
    'active_workflows',
    'Number of active workflows'
)

active_connections_gauge = Gauge(
    'active_connections',
    'Number of active connections'
)

transactions_total = Counter(
    'transactions_total',
    'Total transactions',
    ['status']
)

database_connection_pool_size = Gauge(
    'database_connection_pool_size',
    'Database connection pool size'
)

celery_queue_size = Gauge(
    'celery_queue_size',
    'Celery queue size',
    ['queue_name']
)

def track_request_metrics(func: Callable):
    """Decorator to track HTTP request metrics"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()

        # Get endpoint path from request
        request = kwargs.get('request')
        endpoint = request.url.path if request else "unknown"

        try:
            response = await func(*args, **kwargs)

            # Record metrics
            duration = time.time() - start_time
            status_code = getattr(response, 'status_code', 200)

            http_requests_total.labels(
                method=request.method if request else "unknown",
                endpoint=endpoint,
                status=status_code
            ).inc()

            http_request_duration_seconds.labels(
                method=request.method if request else "unknown",
                endpoint=endpoint
            ).observe(duration)

            return response

        except Exception as e:
            # Record failed request
            http_requests_total.labels(
                method=request.method if request else "unknown",
                endpoint=endpoint,
                status=500
            ).inc()
            raise

    return wrapper

async def get_metrics():
    """Return Prometheus metrics"""
    # Update gauges before returning
    from app.core.database import engine
    from app.models.workflow import WorkflowStatus
    from app.models.connection import ConnectionStatus

    # Update connection pool size
    if hasattr(engine, 'pool'):
        database_connection_pool_size.set(engine.pool.size())

    # Update active workflows count
    # This would require a database query - implement as needed
    # active_workflows_gauge.set(workflow_count)

    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
```

### Add Metrics Endpoint (backend/app/main.py)

```python
from app.core.metrics import get_metrics

@app.get("/metrics")
async def metrics():
    return await get_metrics()
```

### Prometheus Configuration (monitoring/prometheus/prometheus.yml)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "interxchange-backend"
    static_configs:
      - targets: ["backend:8000"]
    metrics_path: "/metrics"

  - job_name: "celery-worker"
    static_configs:
      - targets: ["celery_worker:5555"]

  - job_name: "postgres"
    static_configs:
      - targets: ["postgres_exporter:9187"]

  - job_name: "redis"
    static_configs:
      - targets: ["redis_exporter:9121"]
```

### Grafana Dashboard Configuration (monitoring/grafana/dashboards/interxchange.json)

Create a comprehensive dashboard with:

- Request rate and latency charts
- Workflow execution metrics
- Transaction success/failure rates
- System resource usage
- Database connection pool status
- Celery queue sizes

---

## TASK 5: Structured Logging

### Logging Configuration (backend/app/core/logging.py)

```python
import logging
import json
from datetime import datetime
from typing import Dict, Any
from pythonjsonlogger import jsonlogger

class StructuredLogger:
    """Structured JSON logger for ELK/Loki integration"""

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)

    def _log(self, level: str, message: str, extra: Dict[str, Any] = None):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            "service": "interxchange-backend",
            ** (extra or {})
        }

        getattr(self.logger, level.lower())(json.dumps(log_entry))

    def info(self, message: str, **kwargs):
        self._log("INFO", message, kwargs)

    def error(self, message: str, **kwargs):
        self._log("ERROR", message, kwargs)

    def warning(self, message: str, **kwargs):
        self._log("WARNING", message, kwargs)

    def debug(self, message: str, **kwargs):
        self._log("DEBUG", message, kwargs)

# Configure root logger
def setup_logging():
    """Configure logging for production"""
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        fmt='%(asctime)s %(name)s %(levelname)s %(message)s',
        rename_fields={
            'asctime': 'timestamp',
            'levelname': 'level'
        }
    )
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    # Reduce noise from some libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Usage example
logger = StructuredLogger(__name__)
# logger.info("Workflow executed", workflow_id=workflow_id, status="success")
```

### Add to main.py

```python
from app.core.logging import setup_logging

# Call during startup
setup_logging()
```

---

## TASK 6: Frontend Settings Pages

### Settings Page Component (frontend/src/features/settings/SettingsPage.tsx)

Create a comprehensive settings page with tabs:

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchOrganizationSettings,
  fetchSystemSettings,
  fetchNotificationSettings,
  updateOrganizationSettings,
  updateSystemSettings,
  updateNotificationSettings,
  generateApiKey,
  revokeApiKey,
  fetchApiKeys
} from './settingsSlice';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { organization, system, notifications, apiKeys, isLoading, error } = useAppSelector(state => state.settings);
  const { user } = useAppSelector(state => state.auth);

  const [tabValue, setTabValue] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyScopes, setNewApiKeyScopes] = useState<string[]>(['read:all']);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const [orgForm, setOrgForm] = useState({
    organization_name: '',
    country: '',
    primary_contact_email: '',
    support_email: '',
    platform_name: '',
    primary_color: '#2563eb'
  });

  const [sysForm, setSysForm] = useState({
    default_date_format: 'YYYY-MM-DD',
    log_retention_days: 90,
    default_timezone: 'Africa/Lubumbashi',
    max_concurrent_workflows: 5,
    session_timeout_minutes: 30,
    two_factor_required: false
  });

  const [notifForm, setNotifForm] = useState({
    email_notifications_enabled: true,
    slack_webhook_url: '',
    workflow_failure_alerts: true,
    daily_digest_enabled: false,
    daily_digest_time: '09:00'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (organization) {
      setOrgForm(organization);
    }
    if (system) {
      setSysForm(system);
    }
    if (notifications) {
      setNotifForm(notifications);
    }
  }, [organization, system, notifications]);

  const loadSettings = () => {
    dispatch(fetchOrganizationSettings());
    dispatch(fetchSystemSettings());
    dispatch(fetchNotificationSettings());
    if (user?.role === 'admin') {
      dispatch(fetchApiKeys());
    }
  };

  const handleOrgSave = async () => {
    await dispatch(updateOrganizationSettings(orgForm));
    setSaveSuccess(true);
  };

  const handleSysSave = async () => {
    await dispatch(updateSystemSettings(sysForm));
    setSaveSuccess(true);
  };

  const handleNotifSave = async () => {
    await dispatch(updateNotificationSettings(notifForm));
    setSaveSuccess(true);
  };

  const handleGenerateApiKey = async () => {
    const result = await dispatch(generateApiKey({ name: newApiKeyName, scopes: newApiKeyScopes })).unwrap();
    setGeneratedKey(result.key);
    setApiKeyModalOpen(false);
    setNewApiKeyName('');
    dispatch(fetchApiKeys());
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (window.confirm('Are you sure you want to revoke this API key?')) {
      await dispatch(revokeApiKey(keyId));
      dispatch(fetchApiKeys());
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ width: '100%', mt: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Profile" />
          <Tab label="Organization" disabled={!isAdmin} />
          <Tab label="Notifications" />
          <Tab label="Security" />
          <Tab label="System" disabled={!isAdmin} />
        </Tabs>

        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>Profile Information</Typography>
            <TextField
              label="Full Name"
              fullWidth
              margin="normal"
              value={user?.full_name || ''}
              disabled
            />
            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={user?.email || ''}
              disabled
            />
            <TextField
              label="Role"
              fullWidth
              margin="normal"
              value={user?.role?.toUpperCase() || ''}
              disabled
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>Change Password</Typography>
            <TextField
              label="Current Password"
              type="password"
              fullWidth
              margin="normal"
            />
            <TextField
              label="New Password"
              type="password"
              fullWidth
              margin="normal"
            />
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth
              margin="normal"
            />
            <Button variant="contained" sx={{ mt: 2 }}>
              Update Password
            </Button>
          </Box>
        </TabPanel>

        {/* Organization Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>Organization Settings</Typography>
            <TextField
              label="Organization Name"
              fullWidth
              margin="normal"
              value={orgForm.organization_name}
              onChange={(e) => setOrgForm({ ...orgForm, organization_name: e.target.value })}
            />
            <TextField
              label="Country"
              fullWidth
              margin="normal"
              value={orgForm.country}
              onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })}
            />
            <TextField
              label="Primary Contact Email"
              type="email"
              fullWidth
              margin="normal"
              value={orgForm.primary_contact_email}
              onChange={(e) => setOrgForm({ ...orgForm, primary_contact_email: e.target.value })}
            />
            <TextField
              label="Support Email"
              type="email"
              fullWidth
              margin="normal"
              value={orgForm.support_email}
              onChange={(e) => setOrgForm({ ...orgForm, support_email: e.target.value })}
            />
            <TextField
              label="Platform Name"
              fullWidth
              margin="normal"
              value={orgForm.platform_name}
              onChange={(e) => setOrgForm({ ...orgForm, platform_name: e.target.value })}
            />
            <TextField
              label="Primary Color"
              type="color"
              fullWidth
              margin="normal"
              value={orgForm.primary_color}
              onChange={(e) => setOrgForm({ ...orgForm, primary_color: e.target.value })}
            />
            <Button variant="contained" sx={{ mt: 2 }} onClick={handleOrgSave}>
              Save Organization Settings
            </Button>
          </Box>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>Notification Preferences</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notifForm.email_notifications_enabled}
                  onChange={(e) => setNotifForm({ ...notifForm, email_notifications_enabled: e.target.checked })}
                />
              }
              label="Email Notifications"
            />
            <TextField
              label="Slack Webhook URL"
              fullWidth
              margin="normal"
              value={notifForm.slack_webhook_url}
              onChange={(e) => setNotifForm({ ...notifForm, slack_webhook_url: e.target.value })}
              placeholder="https://hooks.slack.com/services/..."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notifForm.workflow_failure_alerts}
                  onChange={(e) => setNotifForm({ ...notifForm, workflow_failure_alerts: e.target.checked })}
                />
              }
              label="Workflow Failure Alerts"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notifForm.daily_digest_enabled}
                  onChange={(e) => setNotifForm({ ...notifForm, daily_digest_enabled: e.target.checked })}
                />
              }
              label="Daily Digest"
            />
            {notifForm.daily_digest_enabled && (
              <TextField
                label="Daily Digest Time"
                type="time"
                fullWidth
                margin="normal"
                value={notifForm.daily_digest_time}
                onChange={(e) => setNotifForm({ ...notifForm, daily_digest_time: e.target.value })}
              />
            )}
            <Button variant="contained" sx={{ mt: 2 }} onClick={handleNotifSave}>
              Save Notification Settings
            </Button>
          </Box>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ maxWidth: 800 }}>
            <Typography variant="h6" gutterBottom>Two-Factor Authentication</Typography>
            <FormControlLabel
              control={<Switch checked={sysForm.two_factor_required} onChange={(e) => setSysForm({ ...sysForm, two_factor_required: e.target.checked })} />}
              label="Require Two-Factor Authentication for all users"
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>Session Management</Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Session Timeout</InputLabel>
              <Select
                value={sysForm.session_timeout_minutes}
                onChange={(e) => setSysForm({ ...sysForm, session_timeout_minutes: e.target.value as number })}
                label="Session Timeout"
              >
                <MenuItem value={15}>15 minutes</MenuItem>
                <MenuItem value={30}>30 minutes</MenuItem>
                <MenuItem value={60}>1 hour</MenuItem>
                <MenuItem value={120}>2 hours</MenuItem>
                <MenuItem value={480}>8 hours</MenuItem>
              </Select>
            </FormControl>

            <Button variant="contained" sx={{ mt: 2, mb: 4 }} onClick={handleSysSave}>
              Save Security Settings
            </Button>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>API Keys</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setApiKeyModalOpen(true)}
              sx={{ mb: 2 }}
            >
              Generate New API Key
            </Button>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Scopes</TableCell>
                    <TableCell>Last Used</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>{key.name}</TableCell>
                      <TableCell>
                        {key.scopes.map((scope) => (
                          <Chip key={scope} label={scope} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </TableCell>
                      <TableCell>{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}</TableCell>
                      <TableCell>{new Date(key.created_at).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleRevokeApiKey(key.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {apiKeys.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No API keys generated yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* System Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>System Configuration</Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Default Date Format</InputLabel>
              <Select
                value={sysForm.default_date_format}
                onChange={(e) => setSysForm({ ...sysForm, default_date_format: e.target.value })}
                label="Default Date Format"
              >
                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Log Retention (days)"
              type="number"
              fullWidth
              margin="normal"
              value={sysForm.log_retention_days}
              onChange={(e) => setSysForm({ ...sysForm, log_retention_days: parseInt(e.target.value) })}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Default Timezone</InputLabel>
              <Select
                value={sysForm.default_timezone}
                onChange={(e) => setSysForm({ ...sysForm, default_timezone: e.target.value })}
                label="Default Timezone"
              >
                <MenuItem value="Africa/Lubumbashi">Africa/Lubumbashi (CAT)</MenuItem>
                <MenuItem value="Africa/Kinshasa">Africa/Kinshasa (WAT)</MenuItem>
                <MenuItem value="UTC">UTC</MenuItem>
                <MenuItem value="Europe/London">Europe/London</MenuItem>
                <MenuItem value="America/New_York">America/New York</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Max Concurrent Workflows"
              type="number"
              fullWidth
              margin="normal"
              value={sysForm.max_concurrent_workflows}
              onChange={(e) => setSysForm({ ...sysForm, max_concurrent_workflows: parseInt(e.target.value) })}
            />

            <Button variant="contained" sx={{ mt: 2 }} onClick={handleSysSave}>
              Save System Settings
            </Button>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>Database Management</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" color="warning">
                Backup Database
              </Button>
              <Button variant="outlined" color="error">
                Clear Cache
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>System Information</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell variant="head">Version</TableCell>
                    <TableCell>1.0.0</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell variant="head">Environment</TableCell>
                    <TableCell>{process.env.NODE_ENV || 'development'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell variant="head">API Version</TableCell>
                    <TableCell>v1</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>
      </Paper>

      {/* API Key Generation Dialog */}
      <Dialog open={apiKeyModalOpen} onClose={() => setApiKeyModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate New API Key</DialogTitle>
        <DialogContent>
          <TextField
            label="Key Name"
            fullWidth
            margin="normal"
            value={newApiKeyName}
            onChange={(e) => setNewApiKeyName(e.target.value)}
            placeholder="e.g., Production Server"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Scopes</InputLabel>
            <Select
              multiple
              value={newApiKeyScopes}
              onChange={(e) => setNewApiKeyScopes(e.target.value as string[])}
              label="Scopes"
              renderValue={(selected) => (selected as string[]).join(', ')}
            >
              <MenuItem value="read:all">Read All</MenuItem>
              <MenuItem value="write:workflows">Write Workflows</MenuItem>
              <MenuItem value="execute:workflows">Execute Workflows</MenuItem>
              <MenuItem value="read:transactions">Read Transactions</MenuItem>
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ mt: 2 }}>
            This key will only be shown once. Make sure to copy it now.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeyModalOpen(false)}>Cancel</Button>
          <Button onClick={handleGenerateApiKey} variant="contained">Generate</Button>
        </DialogActions>
      </Dialog>

      {/* Generated Key Dialog */}
      <Dialog open={!!generatedKey} onClose={() => setGeneratedKey(null)} maxWidth="sm" fullWidth>
        <DialogTitle>API Key Generated</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This key will not be shown again. Copy and store it securely.
          </Alert>
          <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
            <Typography variant="body2" fontFamily="monospace" align="center">
              {generatedKey}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGeneratedKey(null)} variant="contained">I have copied the key</Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSaveSuccess(false)}>
          Settings saved successfully
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage;
```

---

## TASK 7: Documentation

### API Documentation (OpenAPI)

The OpenAPI documentation is automatically generated by FastAPI at `/docs` and `/redoc`. Add descriptions to all endpoints.

### User Guide (docs/user-guide.md)

Create comprehensive user guide covering:

1. Getting Started
2. Managing Connections
3. Creating Workflows
4. Uploading Mappings
5. Configuring Channels
6. Monitoring Transactions
7. User Management (Admin)
8. Settings Configuration
9. Audit Logs
10. Troubleshooting

### Deployment Guide (docs/deployment.md)

Create deployment guide covering:

1. System Requirements
2. Docker Compose Setup
3. Production Configuration
4. Vault Setup
5. SSL/TLS Configuration
6. Database Backup and Restore
7. Monitoring Setup (Prometheus/Grafana)
8. Logging Setup (ELK/Loki)
9. Scaling Considerations
10. Disaster Recovery

### README.md Update

Update root README.md with:

- Project overview
- Quick start guide
- Technology stack
- Development setup
- Testing
- Deployment
- Contributing guidelines

---

## DELIVERABLES CHECKLIST

Before considering Phase 5 complete, ensure all items below are implemented:

### Backend

- [ ] Audit Log model, repository, service, and API endpoints
- [ ] Audit middleware for automatic logging
- [ ] Users page enhancements (invite, resend, role management)
- [ ] Settings models, service, and API endpoints
- [ ] API key management service
- [ ] Prometheus metrics endpoint
- [ ] Structured logging configuration (JSON format)
- [ ] All endpoints have proper OpenAPI descriptions

### Frontend

- [ ] Audit Log page with table, filters, and pagination
- [ ] Enhanced Users page with invite modal and role management
- [ ] Settings pages (Profile, Organization, Notifications, Security, System)
- [ ] API key management UI
- [ ] Real-time dashboard updates via WebSocket
- [ ] Dark/light theme toggle (optional)

### Monitoring & Documentation

- [ ] Prometheus configuration
- [ ] Grafana dashboard JSON
- [ ] User guide markdown
- [ ] Deployment guide markdown
- [ ] Updated README.md
- [ ] API documentation (OpenAPI) complete

### Final Polish

- [ ] Responsive design for all pages (mobile/tablet)
- [ ] Loading states for all async operations
- [ ] Error handling with user-friendly messages
- [ ] Form validation
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Performance optimizations (lazy loading, code splitting)

---

## NOTES FOR GEMINI

1. **Follow the coding standards** defined in section 11 of the GEMINI.md file
2. **Use the ✅/❌ examples** as guidance for quality code
3. **Ensure comprehensive error handling** - never expose internal errors to users
4. **Add loading states** for all async operations
5. **Test all admin-only endpoints** with proper role checks
6. **Document all API endpoints** with descriptions and examples
7. **Ensure audit logging captures all critical actions**
8. **Commit messages** should follow conventional commits format

---

**Begin Phase 5 implementation now. Provide code files in your response, organized by the directory structure above. After completing each major component, indicate progress and ask for feedback if needed.**
