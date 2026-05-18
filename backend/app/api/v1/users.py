from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_roles
from app.core.database import get_db
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.schemas.user import UserCreate, UserInDB, UserList, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserList)
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserService(db)
    items = await service.get_multi(skip=skip, limit=limit)
    total = await service.count()
    return {"items": items, "total": total}


@router.post("", response_model=UserInDB, status_code=status.HTTP_201_CREATED)
async def invite_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    service = UserService(db)
    return await service.create(user_in)


@router.get("/{user_id}", response_model=UserInDB)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    service = UserService(db)
    try:
        return await service.get(user_id)
    except NotFoundException:
        raise HTTPException(status_code=404, detail="User not found")


@router.put("/{user_id}", response_model=UserInDB)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    service = UserService(db)
    try:
        return await service.update(user_id, user_in)
    except NotFoundException:
        raise HTTPException(status_code=404, detail="User not found")


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    service = UserService(db)
    await service.soft_delete(user_id)
    return {"detail": "User deleted (soft)"}


@router.post("/{user_id}/resend-invite")
async def resend_invite(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    service = UserService(db)
    user = await service.get(user_id)
    return {"detail": f"Invitation resent to {user.email}"}
