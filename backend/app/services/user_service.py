from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.core.security import get_password_hash
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def create(self, obj_in: UserCreate, is_active: bool = False) -> User:
        existing = await self.repo.get_by_email(obj_in.email)
        if existing:
            raise BadRequestException(detail="User with this email already exists")

        hashed = get_password_hash(obj_in.password or "temporary123")
        return await self.repo.create(
            email=obj_in.email,
            hashed_password=hashed,
            full_name=obj_in.full_name,
            role=obj_in.role or "viewer",
            is_active=is_active,
        )

    async def get(self, user_id: int) -> Optional[User]:
        user = await self.repo.get(user_id)
        if not user:
            raise NotFoundException(detail="User not found")
        return user

    async def get_by_email(self, email: str) -> Optional[User]:
        return await self.repo.get_by_email(email)

    async def get_multi(self, skip: int = 0, limit: int = 100) -> List[User]:
        return await self.repo.get_multi(skip=skip, limit=limit)

    async def count(self) -> int:
        return await self.repo.count()

    async def update(self, user_id: int, obj_in: UserUpdate) -> User:
        user = await self.repo.get(user_id)
        if not user:
            raise NotFoundException(detail="User not found")

        update_data = obj_in.model_dump(exclude_unset=True)
        return await self.repo.update(user_id, **update_data)

    async def soft_delete(self, user_id: int) -> User:
        user = await self.repo.get(user_id)
        if not user:
            raise NotFoundException(detail="User not found")
        return await self.repo.update(user_id, is_active=False)

    async def update_last_login(self, user_id: int) -> None:
        from datetime import datetime
        await self.repo.update(user_id, last_login=datetime.utcnow())
