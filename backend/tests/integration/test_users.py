import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_password_hash
from app.models.user import User

@pytest.fixture
async def admin_user(db_session: AsyncSession):
    user = User(
        email="admin@example.com",
        full_name="Admin User",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("adminpassword")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def standard_user(db_session: AsyncSession):
    user = User(
        email="user@example.com",
        full_name="Standard User",
        role="viewer",
        is_active=True,
    )
    user.hashed_password = get_password_hash("userpassword")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.mark.asyncio
async def test_get_users_admin(client: AsyncClient, admin_user: User):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "adminpassword"},
    )
    
    response = await client.get("/api/v1/users", cookies=login_response.cookies)
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1
    assert data["items"][0]["email"] == "admin@example.com"

@pytest.mark.asyncio
async def test_get_users_non_admin(client: AsyncClient, standard_user: User):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "userpassword"},
    )
    
    response = await client.get("/api/v1/users", cookies=login_response.cookies)
    
    # Should be forbidden for non-admins
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_invite_user(client: AsyncClient, admin_user: User, db_session: AsyncSession):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "adminpassword"},
    )
    
    new_user_data = {
        "email": "newuser@example.com",
        "full_name": "New User",
        "role": "analyst",
    }
    
    response = await client.post(
        "/api/v1/users",
        json=new_user_data,
        cookies=login_response.cookies
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["is_active"] is False  # newly invited users are inactive
    
    # Verify in DB
    result = await db_session.execute(select(User).where(User.email == "newuser@example.com"))
    user = result.scalar_one()
    assert user.full_name == "New User"

@pytest.mark.asyncio
async def test_update_user(client: AsyncClient, admin_user: User, standard_user: User):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "adminpassword"},
    )
    
    update_data = {
        "full_name": "Updated Name",
        "role": "editor"
    }
    
    response = await client.put(
        f"/api/v1/users/{standard_user.id}",
        json=update_data,
        cookies=login_response.cookies
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["role"] == "editor"

@pytest.mark.asyncio
async def test_delete_user(client: AsyncClient, admin_user: User, standard_user: User, db_session: AsyncSession):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "adminpassword"},
    )
    
    user_id_to_delete = standard_user.id
    
    response = await client.delete(
        f"/api/v1/users/{user_id_to_delete}",
        cookies=login_response.cookies
    )
    
    # Should perform soft-delete
    assert response.status_code == 200
    
    # Re-fetch user to check if it's inactive
    # db_session holds a cached copy of the standard_user, so we must expire it
    db_session.expire(standard_user)
    result = await db_session.execute(select(User).where(User.id == user_id_to_delete))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.is_active is False
