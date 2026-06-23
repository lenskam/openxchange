import io

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User


@pytest.fixture
async def admin_user(db_session: AsyncSession):
    user = User(
        email="admin_mapping@example.com",
        full_name="Admin Mapping",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("adminpassword")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def viewer_user(db_session: AsyncSession):
    user = User(
        email="viewer_mapping@example.com",
        full_name="Viewer Mapping",
        role="viewer",
        is_active=True,
    )
    user.hashed_password = get_password_hash("viewerpassword")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_list_mappings_empty(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_mapping@example.com", "password": "adminpassword"},
    )
    response = await client.get("/api/v1/mappings", cookies=login.cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_upload_csv_mapping(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_mapping@example.com", "password": "adminpassword"},
    )
    csv_content = b"source,target\ncol1,field_a\ncol2,field_b\n"
    response = await client.post(
        "/api/v1/mappings/upload",
        data={"name": "Test CSV Mapping", "type": "variable"},
        files={"file": ("test.csv", csv_content, "text/csv")},
        cookies=login.cookies,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test CSV Mapping"
    assert data["type"] == "variable"
    assert "id" in data


@pytest.mark.asyncio
async def test_upload_and_list_mappings(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_mapping@example.com", "password": "adminpassword"},
    )
    csv_content = b"key,value\nvar1,val1\nvar2,val2\n"
    await client.post(
        "/api/v1/mappings/upload",
        data={"name": "Var Mapping", "type": "variable"},
        files={"file": ("vars.csv", csv_content, "text/csv")},
        cookies=login.cookies,
    )
    await client.post(
        "/api/v1/mappings/upload",
        data={"name": "Org Mapping", "type": "org_unit"},
        files={"file": ("orgs.csv", csv_content, "text/csv")},
        cookies=login.cookies,
    )
    response = await client.get("/api/v1/mappings", cookies=login.cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2


@pytest.mark.asyncio
async def test_get_mapping_by_id(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_mapping@example.com", "password": "adminpassword"},
    )
    csv_content = b"a,b\n1,2\n"
    upload = await client.post(
        "/api/v1/mappings/upload",
        data={"name": "Get Test", "type": "options"},
        files={"file": ("test.csv", csv_content, "text/csv")},
        cookies=login.cookies,
    )
    mapping_id = upload.json()["id"]
    response = await client.get(
        f"/api/v1/mappings/{mapping_id}",
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Get Test"


@pytest.mark.asyncio
async def test_update_mapping(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_mapping@example.com", "password": "adminpassword"},
    )
    csv_content = b"a,b\n1,2\n"
    upload = await client.post(
        "/api/v1/mappings/upload",
        data={"name": "Old Name", "type": "variable"},
        files={"file": ("test.csv", csv_content, "text/csv")},
        cookies=login.cookies,
    )
    mapping_id = upload.json()["id"]
    response = await client.put(
        f"/api/v1/mappings/{mapping_id}",
        json={"name": "New Name"},
        cookies=login.cookies,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_mapping(client: AsyncClient, admin_user: User, db_session: AsyncSession):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_mapping@example.com", "password": "adminpassword"},
    )
    csv_content = b"x,y\n1,2\n"
    upload = await client.post(
        "/api/v1/mappings/upload",
        data={"name": "Delete Me", "type": "date_format"},
        files={"file": ("test.csv", csv_content, "text/csv")},
        cookies=login.cookies,
    )
    mapping_id = upload.json()["id"]
    response = await client.delete(
        f"/api/v1/mappings/{mapping_id}",
        cookies=login.cookies,
    )
    assert response.status_code == 200

    get_response = await client.get(
        f"/api/v1/mappings/{mapping_id}",
        cookies=login.cookies,
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_viewer_cannot_create_mapping(client: AsyncClient, viewer_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "viewer_mapping@example.com", "password": "viewerpassword"},
    )
    response = await client.post(
        "/api/v1/mappings/upload",
        data={"name": "Should Fail", "type": "variable"},
        files={"file": ("test.csv", b"a,b\n", "text/csv")},
        cookies=login.cookies,
    )
    assert response.status_code in (403,)


@pytest.mark.asyncio
async def test_upload_json_mapping(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin_mapping@example.com", "password": "adminpassword"},
    )
    json_content = b'[{"field": "name", "map_to": "full_name"}, {"field": "email", "map_to": "contact_email"}]'
    response = await client.post(
        "/api/v1/mappings/upload",
        data={"name": "JSON Mapping", "type": "variable"},
        files={"file": ("data.json", json_content, "application/json")},
        cookies=login.cookies,
    )
    assert response.status_code == 201
    assert response.json()["name"] == "JSON Mapping"
