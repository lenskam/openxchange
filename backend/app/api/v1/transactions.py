from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.core.database import get_db
from app.models.user import User
from app.schemas.transaction import (
    TransactionListResponse,
    TransactionResponse,
    TransactionStats,
    TransactionVolumePoint,
)
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    workflow_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = TransactionService(db)
    return await service.get_multi(
        skip=skip, limit=limit, status=status, workflow_id=workflow_id
    )


@router.get("/stats", response_model=TransactionStats)
async def get_transaction_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = TransactionService(db)
    return await service.get_stats()


@router.get("/volume", response_model=list[TransactionVolumePoint])
async def get_transaction_volume(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = TransactionService(db)
    return await service.get_volume(days=days)


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = TransactionService(db)
    txn = await service.get(transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn
