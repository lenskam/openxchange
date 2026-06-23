import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="admin_chan@example.com",
        full_name="Admin Chan",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("adminpassword")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def viewer_user(db_session: AsyncSession) -> User:
    user = User(
        email="viewer_chan@example.com",
        full_name="Viewer Chan",
        role="viewer",
        is_active=True,
    )
    user.hashed_password = get_password_hash("viewerpassword")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_list_channels_empty(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_chan@example.com", "password": "adminpassword"},
    )
    response = await client.get("/api/v1/channels", cookies=login.cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_create_channel(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_chan@example.com", "password": "adminpassword"},
    )
    payload = {
        "name": "Test Channel",
        "url_pattern": "/api/test",
        "method": "POST",
        "protocol": "http",
    }
    response = await client.post(
        "/api/v1/channels",
        json=payload,
        cookies=login.cookies,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Channel"
    assert data["url_pattern"] == "/api/test"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_channel_by_id(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_chan@example.com", "password": "adminpassword"},
    )
    create = await client.post(
        "/api/v1/channels",
        json={"name": "Get Chan", "url_pattern": "/api/get", "method": "GET"},
        cookies=login.cookies,
    )
    chan_id = create.json()["id"]
    response = await client.get(
        f"/api/v1/channels/{chan_id}",
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Get Chan"


@pytest.mark.asyncio
async def test_get_channel_not_found(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_chan@example.com", "password": "adminpassword"},
    )
    response = await client.get("/api/v1/channels/9999", cookies=login.cookies)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_channel(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_chan@example.com", "password": "adminpassword"},
    )
    create = await client.post(
        "/api/v1/channels",
        json={"name": "Old Chan", "url_pattern": "/api/old", "method": "GET"},
        cookies=login.cookies,
    )
    chan_id = create.json()["id"]
    response = await client.put(
        f"/api/v1/channels/{chan_id}",
        json={"name": "New Chan"},
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Chan"


@pytest.mark.asyncio
async def test_delete_channel(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_chan@example.com", "password": "adminpassword"},
    )
    create = await client.post(
        "/api/v1/channels",
        json={
            "name": "Delete Chan",
            "url_pattern": "/api/delete",
            "method": "DELETE",
        },
        cookies=login.cookies,
    )
    chan_id = create.json()["id"]
    del_resp = await client.delete(
        f"/api/v1/channels/{chan_id}",
        cookies=login.cookies,
    )
    assert del_resp.status_code == 200
    get_resp = await client.get(
        f"/api/v1/channels/{chan_id}",
        cookies=login.cookies,
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_enable_channel(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_chan@example.com", "password": "adminpassword"},
    )
    create = await client.post(
        "/api/v1/channels",
        json={
            "name": "Enable Chan",
            "url_pattern": "/api/enable",
            "method": "GET",
        },
        cookies=login.cookies,
    )
    chan_id = create.json()["id"]
    response = await client.post(
        f"/api/v1/channels/{chan_id}/enable",
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["status"] is True


@pytest.mark.asyncio
async def test_disable_channel(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_chan@example.com", "password": "adminpassword"},
    )
    create = await client.post(
        "/api/v1/channels",
        json={
            "name": "Disable Chan",
            "url_pattern": "/api/disable",
            "method": "GET",
        },
        cookies=login.cookies,
    )
    chan_id = create.json()["id"]
    response = await client.post(
        f"/api/v1/channels/{chan_id}/disable",
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["status"] is False


@pytest.mark.asyncio
async def test_viewer_cannot_create_channel(
    client: AsyncClient, viewer_user: User
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "viewer_chan@example.com", "password": "viewerpassword"},
    )
    response = await client.post(
        "/api/v1/channels",
        json={"name": "Fail", "url_pattern": "/api/fail", "method": "GET"},
        cookies=login.cookies,
    )
    assert response.status_code == 403
