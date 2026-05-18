from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    return {
        "connections": {"total": 0, "active": 0},
        "workflows": {"total": 0, "active": 0},
        "transactions": {"total": 0, "success_rate": 0},
        "records": {"total": 0, "failed": 0},
    }


@router.get("/transaction-volume")
async def get_transaction_volume(months: int = 6, current_user: User = Depends(get_current_user)):
    return []
