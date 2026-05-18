import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import AsyncMock, patch
from sqlalchemy.future import select

from app.models.connection import Connection
from app.models.user import User
from app.core.security import get_password_hash

@pytest.fixture
async def admin_user(db_session: AsyncSession):
    user = User(
        email="admin_conn@example.com",
        full_name="Admin Conn",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("adminpassword")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def sample_connection(db_session: AsyncSession):
    conn = Connection(
        name="Test DHIS2",
        type="dhis2",
        url="https://test.dhis2.org",
        auth_type="basic",
        status="inactive",
        credentials_encrypted="secret/data/connections/999"
    )
    db_session.add(conn)
    await db_session.commit()
    await db_session.refresh(conn)
    return conn

@pytest.fixture
def mock_vault():
    with patch("app.services.connection_service.VaultService") as mock:
        instance = mock.return_value
        instance.write_secret = AsyncMock()
        instance.read_secret = AsyncMock(return_value={"username": "admin", "password": "password"})
        instance.delete_secret = AsyncMock()
        yield instance

@pytest.mark.asyncio
async def test_create_connection(client: AsyncClient, admin_user: User, db_session: AsyncSession, mock_vault):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_conn@example.com", "password": "adminpassword"},
    )
    
    payload = {
        "name": "New System",
        "type": "dhis2",
        "url": "https://new.system.org",
        "auth_type": "basic",
        "credentials": {"username": "abc", "password": "def"}
    }
    
    response = await client.post(
        "/api/v1/connections",
        json=payload,
        cookies=login_response.cookies
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New System"
    assert "id" in data
    
    mock_vault.write_secret.assert_called_once()
    
@pytest.mark.asyncio
async def test_get_connections(client: AsyncClient, admin_user: User, sample_connection: Connection):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_conn@example.com", "password": "adminpassword"},
    )
    
    response = await client.get("/api/v1/connections", cookies=login_response.cookies)
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any(c["id"] == sample_connection.id for c in data["items"])

@pytest.mark.asyncio
async def test_update_connection(client: AsyncClient, admin_user: User, sample_connection: Connection, mock_vault):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_conn@example.com", "password": "adminpassword"},
    )
    
    update_payload = {
        "name": "Updated System",
        "url": "https://updated.system.org"
    }
    
    response = await client.put(
        f"/api/v1/connections/{sample_connection.id}",
        json=update_payload,
        cookies=login_response.cookies
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated System"
    assert data["url"] == "https://updated.system.org/" # Validated as HttpUrl hence trailling slash

@pytest.mark.asyncio
async def test_delete_connection(client: AsyncClient, admin_user: User, sample_connection: Connection, mock_vault, db_session: AsyncSession):
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_conn@example.com", "password": "adminpassword"},
    )
    
    conn_id = sample_connection.id
    
    response = await client.delete(
        f"/api/v1/connections/{conn_id}",
        cookies=login_response.cookies
    )
    
    assert response.status_code == 200
    
    mock_vault.delete_secret.assert_called_once()
    
    db_session.expire(sample_connection)
    result = await db_session.execute(select(Connection).where(Connection.id == conn_id))
    assert result.scalar_one_or_none() is None
