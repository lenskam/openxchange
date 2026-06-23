from fastapi import APIRouter

from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.auth import router as auth_router
from app.api.v1.channels import router as channels_router
from app.api.v1.connections import router as connections_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.mappings import router as mappings_router
from app.api.v1.settings import router as settings_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.users import router as users_router
from app.api.v1.workflows import router as workflows_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(transactions_router)
api_router.include_router(users_router)
api_router.include_router(connections_router)
api_router.include_router(workflows_router)
api_router.include_router(mappings_router)
api_router.include_router(channels_router)
api_router.include_router(audit_logs_router)
api_router.include_router(settings_router)
