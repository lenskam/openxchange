from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.core.database import get_db
from app.models.user import User
from app.schemas.channel import (
    ChannelCreate,
    ChannelEnableResponse,
    ChannelListResponse,
    ChannelResponse,
    ChannelUpdate,
)
from app.services.channel_service import ChannelService

router = APIRouter(prefix="/channels", tags=["channels"])


@router.get("", response_model=ChannelListResponse)
async def list_channels(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = ChannelService(db)
    items = await service.get_multi(skip=skip, limit=limit)
    total = await service.count()
    return {"items": items, "total": total}


@router.post("", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_channel(
    channel_in: ChannelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst"])),
):
    service = ChannelService(db)
    return await service.create(
        name=channel_in.name,
        description=channel_in.description,
        url_pattern=channel_in.url_pattern,
        method=channel_in.method,
        protocol=channel_in.protocol,
        routes=[r.model_dump() for r in channel_in.routes],
        auth_required=channel_in.auth_required,
        rate_limit=channel_in.rate_limit,
        timeout=channel_in.timeout,
        retry_count=channel_in.retry_count,
        trigger_workflow_id=channel_in.trigger_workflow_id,
    )


@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(["admin", "analyst", "editor", "viewer"])
    ),
):
    service = ChannelService(db)
    channel = await service.get(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@router.put("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: int,
    channel_in: ChannelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst"])),
):
    service = ChannelService(db)
    kwargs = channel_in.model_dump(exclude_none=True)
    if not kwargs:
        existing = await service.get(channel_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Channel not found")
        return existing
    result = await service.update(channel_id, **kwargs)
    if not result:
        raise HTTPException(status_code=404, detail="Channel not found")
    return result


@router.delete("/{channel_id}")
async def delete_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    service = ChannelService(db)
    deleted = await service.delete(channel_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"detail": "Channel deleted"}


@router.post("/{channel_id}/enable", response_model=ChannelEnableResponse)
async def enable_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst"])),
):
    service = ChannelService(db)
    result = await service.enable(channel_id)
    if not result:
        raise HTTPException(status_code=404, detail="Channel not found")
    return result


@router.post("/{channel_id}/disable", response_model=ChannelEnableResponse)
async def disable_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "analyst"])),
):
    service = ChannelService(db)
    result = await service.disable(channel_id)
    if not result:
        raise HTTPException(status_code=404, detail="Channel not found")
    return result
