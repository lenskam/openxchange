import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="sett_admin@example.com",
        full_name="Sett Admin",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("adminpass")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def standard_user(db_session: AsyncSession) -> User:
    user = User(
        email="sett_user@example.com",
        full_name="Sett User",
        role="editor",
        is_active=True,
    )
    user.hashed_password = get_password_hash("userpass")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_get_org_settings(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    response = await client.get(
        "/api/v1/settings/organization", cookies=login.cookies
    )
    assert response.status_code == 200
    assert response.json()["org_name"] == "My Organization"


@pytest.mark.asyncio
async def test_update_org_settings(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    response = await client.put(
        "/api/v1/settings/organization",
        json={"org_name": "InterX", "country": "US"},
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["org_name"] == "InterX"


@pytest.mark.asyncio
async def test_get_notification_settings(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    response = await client.get(
        "/api/v1/settings/notifications", cookies=login.cookies
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_notification_settings(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    response = await client.put(
        "/api/v1/settings/notifications",
        json={"email_notifications": False, "daily_digest": True},
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["email_notifications"] is False
    assert response.json()["daily_digest"] is True


@pytest.mark.asyncio
async def test_get_system_admin(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    response = await client.get(
        "/api/v1/settings/system", cookies=login.cookies
    )
    assert response.status_code == 200
    assert response.json()["log_retention_days"] == 90


@pytest.mark.asyncio
async def test_get_system_non_admin_forbidden(
    client: AsyncClient, standard_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_user@example.com", "password": "userpass"},
    )
    response = await client.get(
        "/api/v1/settings/system", cookies=login.cookies
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_system_admin(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    response = await client.put(
        "/api/v1/settings/system",
        json={"log_retention_days": 365, "default_timezone": "America/New_York"},
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["log_retention_days"] == 365


@pytest.mark.asyncio
async def test_create_api_key(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    response = await client.post(
        "/api/v1/settings/api-keys",
        json={"name": "My API Key"},
        cookies=login.cookies,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My API Key"
    assert "full_key" in data


@pytest.mark.asyncio
async def test_list_api_keys(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    await client.post(
        "/api/v1/settings/api-keys",
        json={"name": "Key 1"},
        cookies=login.cookies,
    )
    response = await client.get(
        "/api/v1/settings/api-keys", cookies=login.cookies
    )
    assert response.status_code == 200
    assert len(response.json()) >= 1


@pytest.mark.asyncio
async def test_revoke_api_key(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    create = await client.post(
        "/api/v1/settings/api-keys",
        json={"name": "Revoke Me"},
        cookies=login.cookies,
    )
    key_id = create.json()["id"]
    response = await client.delete(
        f"/api/v1/settings/api-keys/{key_id}",
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


@pytest.mark.asyncio
async def test_update_profile(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    response = await client.put(
        "/api/v1/auth/me",
        json={"full_name": "Updated Name"},
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Name"


@pytest.mark.asyncio
async def test_change_password(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "adminpass"},
    )
    response = await client.put(
        "/api/v1/auth/me/password",
        json={"current_password": "adminpass", "new_password": "newpass123"},
        cookies=login.cookies,
    )
    assert response.status_code == 200

    login_new = await client.post(
        "/api/v1/auth/login",
        json={"email": "sett_admin@example.com", "password": "newpass123"},
    )
    assert login_new.status_code == 200
