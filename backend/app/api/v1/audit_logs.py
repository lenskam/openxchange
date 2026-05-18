from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("")
async def list_audit_logs(
    limit: int = 10,
    skip: int = 0,
    current_user: User = Depends(get_current_user),
):
    return {"items": [], "total": 0}
