import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User

@pytest.fixture
async def test_user(db_session: AsyncSession):
    user = User(
        email="test@example.com",
        full_name="Test User",
        role="viewer",
        is_active=True,
    )
    user.hashed_password = get_password_hash("password123")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    
    # Check that cookies are set properly
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db_session: AsyncSession):
    user = User(
        email="inactive@example.com",
        full_name="Inactive User",
        role="viewer",
        is_active=False,
    )
    user.hashed_password = get_password_hash("password123")
    db_session.add(user)
    await db_session.commit()
    
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@example.com", "password": "password123"},
    )
    assert response.status_code == 400
    assert "Inactive user" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, test_user: User):
    # First login to set the cookie
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    
    # httpx AsyncClient persists cookies across requests during the same `async with` block implicitly, 
    # but we will manually pass the cookies just to be safe and explicit
    cookies = login_response.cookies
    
    response = await client.get("/api/v1/auth/me", cookies=cookies)
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"
    assert data["role"] == "viewer"
    assert data["is_active"] is True

@pytest.mark.asyncio
async def test_logout(client: AsyncClient, test_user: User):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    
    # Perform logout
    logout_response = await client.post("/api/v1/auth/logout", cookies=login_response.cookies)
    assert logout_response.status_code == 200
    
    # Me endpoint should fail
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
