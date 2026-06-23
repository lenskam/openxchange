import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.connection import Connection
from app.models.user import User


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="admin_wf@example.com",
        full_name="Admin WF",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("adminpassword")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def editor_user(db_session: AsyncSession) -> User:
    user = User(
        email="editor_wf@example.com",
        full_name="Editor WF",
        role="editor",
        is_active=True,
    )
    user.hashed_password = get_password_hash("editorpassword")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def viewer_user(db_session: AsyncSession) -> User:
    user = User(
        email="viewer_wf@example.com",
        full_name="Viewer WF",
        role="viewer",
        is_active=True,
    )
    user.hashed_password = get_password_hash("viewerpassword")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def sample_connection(db_session: AsyncSession) -> Connection:
    conn = Connection(
        name="WF Test Source",
        type="dhis2",
        url="https://wf-source.example.com",
        auth_type="basic",
    )
    db_session.add(conn)
    await db_session.commit()
    await db_session.refresh(conn)
    return conn


def _login_url() -> str:
    return "/api/v1/auth/login"


@pytest.mark.asyncio
async def test_list_workflows_empty(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        _login_url(),
        json={"email": "admin_wf@example.com", "password": "adminpassword"},
    )
    response = await client.get("/api/v1/workflows", cookies=login.cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_create_workflow(
    client: AsyncClient,
    admin_user: User,
    sample_connection: Connection,
):
    login = await client.post(
        _login_url(),
        json={"email": "admin_wf@example.com", "password": "adminpassword"},
    )
    payload = {
        "name": "Integration Test WF",
        "source_connection_id": sample_connection.id,
        "destination_connection_id": sample_connection.id,
        "status": "draft",
    }
    response = await client.post(
        "/api/v1/workflows",
        json=payload,
        cookies=login.cookies,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Integration Test WF"
    assert data["status"] == "draft"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_workflow_by_id(
    client: AsyncClient,
    admin_user: User,
    sample_connection: Connection,
):
    login = await client.post(
        _login_url(),
        json={"email": "admin_wf@example.com", "password": "adminpassword"},
    )
    create = await client.post(
        "/api/v1/workflows",
        json={
            "name": "Get WF Test",
            "source_connection_id": sample_connection.id,
            "destination_connection_id": sample_connection.id,
        },
        cookies=login.cookies,
    )
    wf_id = create.json()["id"]
    response = await client.get(
        f"/api/v1/workflows/{wf_id}",
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Get WF Test"


@pytest.mark.asyncio
async def test_get_workflow_not_found(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        _login_url(),
        json={"email": "admin_wf@example.com", "password": "adminpassword"},
    )
    response = await client.get("/api/v1/workflows/9999", cookies=login.cookies)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_workflow(
    client: AsyncClient,
    admin_user: User,
    sample_connection: Connection,
):
    login = await client.post(
        _login_url(),
        json={"email": "admin_wf@example.com", "password": "adminpassword"},
    )
    create = await client.post(
        "/api/v1/workflows",
        json={
            "name": "Old WF Name",
            "source_connection_id": sample_connection.id,
            "destination_connection_id": sample_connection.id,
        },
        cookies=login.cookies,
    )
    wf_id = create.json()["id"]
    response = await client.put(
        f"/api/v1/workflows/{wf_id}",
        json={"name": "New WF Name"},
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New WF Name"


@pytest.mark.asyncio
async def test_delete_workflow(
    client: AsyncClient,
    admin_user: User,
    sample_connection: Connection,
):
    login = await client.post(
        _login_url(),
        json={"email": "admin_wf@example.com", "password": "adminpassword"},
    )
    create = await client.post(
        "/api/v1/workflows",
        json={
            "name": "Delete WF",
            "source_connection_id": sample_connection.id,
            "destination_connection_id": sample_connection.id,
        },
        cookies=login.cookies,
    )
    wf_id = create.json()["id"]
    del_response = await client.delete(
        f"/api/v1/workflows/{wf_id}",
        cookies=login.cookies,
    )
    assert del_response.status_code == 200
    get_response = await client.get(
        f"/api/v1/workflows/{wf_id}",
        cookies=login.cookies,
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_trigger_workflow(
    client: AsyncClient,
    admin_user: User,
    sample_connection: Connection,
):
    login = await client.post(
        _login_url(),
        json={"email": "admin_wf@example.com", "password": "adminpassword"},
    )
    create = await client.post(
        "/api/v1/workflows",
        json={
            "name": "Trigger WF",
            "source_connection_id": sample_connection.id,
            "destination_connection_id": sample_connection.id,
        },
        cookies=login.cookies,
    )
    wf_id = create.json()["id"]
    response = await client.post(
        f"/api/v1/workflows/{wf_id}/trigger",
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["workflow_id"] == wf_id


@pytest.mark.asyncio
async def test_trigger_workflow_not_found(
    client: AsyncClient, admin_user: User
):
    login = await client.post(
        _login_url(),
        json={"email": "admin_wf@example.com", "password": "adminpassword"},
    )
    response = await client.post(
        "/api/v1/workflows/9999/trigger",
        cookies=login.cookies,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_workflow_history(
    client: AsyncClient,
    admin_user: User,
    sample_connection: Connection,
):
    login = await client.post(
        _login_url(),
        json={"email": "admin_wf@example.com", "password": "adminpassword"},
    )
    create = await client.post(
        "/api/v1/workflows",
        json={
            "name": "History WF",
            "source_connection_id": sample_connection.id,
            "destination_connection_id": sample_connection.id,
        },
        cookies=login.cookies,
    )
    wf_id = create.json()["id"]
    response = await client.get(
        f"/api/v1/workflows/{wf_id}/history",
        cookies=login.cookies,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_viewer_cannot_create_workflow(
    client: AsyncClient,
    viewer_user: User,
    sample_connection: Connection,
):
    login = await client.post(
        _login_url(),
        json={"email": "viewer_wf@example.com", "password": "viewerpassword"},
    )
    response = await client.post(
        "/api/v1/workflows",
        json={
            "name": "Viewer Create",
            "source_connection_id": sample_connection.id,
            "destination_connection_id": sample_connection.id,
        },
        cookies=login.cookies,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_editor_cannot_delete_workflow(
    client: AsyncClient,
    editor_user: User,
    sample_connection: Connection,
):
    login = await client.post(
        _login_url(),
        json={"email": "editor_wf@example.com", "password": "editorpassword"},
    )
    response = await client.delete(
        "/api/v1/workflows/1",
        cookies=login.cookies,
    )
    assert response.status_code == 403
