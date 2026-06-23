from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.connection import Connection
from app.models.transaction import Transaction
from app.models.user import User
from app.models.workflow import Workflow
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conns = await db.execute(select(func.count(Connection.id)))
    total_connections = conns.scalar() or 0
    active_conns = await db.execute(
        select(func.count(Connection.id)).where(Connection.status == "active")
    )
    total_workflows = (await db.execute(select(func.count(Workflow.id)))).scalar() or 0
    active_workflows = (
        await db.execute(
            select(func.count(Workflow.id)).where(Workflow.status == "active")
        )
    ).scalar() or 0

    txn_service = TransactionService(db)
    stats = await txn_service.get_stats()

    return {
        "connections": {"total": total_connections, "active": active_conns.scalar() or 0},
        "workflows": {"total": total_workflows, "active": active_workflows},
        "transactions": {
            "total": stats["total"],
            "success_rate": stats["success_rate"],
        },
        "records": {
            "total": stats["success"],
            "failed": stats["failed"],
        },
    }


@router.get("/transaction-volume")
async def get_transaction_volume(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn_service = TransactionService(db)
    return await txn_service.get_volume(days=days)
