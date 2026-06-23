import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.audit_log import AuditLog
from app.models.user import User


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="audit_admin@example.com",
        full_name="Audit Admin",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("adminpass")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def sample_logs(
    db_session: AsyncSession, admin_user: User
) -> list[AuditLog]:
    logs = []
    entries = [
        ("create", "workflow", "1"),
        ("update", "connection", "2"),
        ("delete", "mapping", "3"),
    ]
    for action, resource_type, resource_id in entries:
        log = AuditLog(
            action=action,
            user_id=admin_user.id,
            resource_type=resource_type,
            resource_id=resource_id,
        )
        db_session.add(log)
        logs.append(log)
    await db_session.commit()
    for l in logs:
        await db_session.refresh(l)
    return logs


@pytest.mark.asyncio
async def test_list_audit_logs(
    client: AsyncClient,
    admin_user: User,
    sample_logs: list[AuditLog],
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "audit_admin@example.com", "password": "adminpass"},
    )
    response = await client.get("/api/v1/audit-logs", cookies=login.cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3


@pytest.mark.asyncio
async def test_filter_by_action(
    client: AsyncClient,
    admin_user: User,
    sample_logs: list[AuditLog],
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "audit_admin@example.com", "password": "adminpass"},
    )
    response = await client.get(
        "/api/v1/audit-logs?action=create", cookies=login.cookies
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["action"] == "create"


@pytest.mark.asyncio
async def test_filter_by_resource_type(
    client: AsyncClient,
    admin_user: User,
    sample_logs: list[AuditLog],
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "audit_admin@example.com", "password": "adminpass"},
    )
    response = await client.get(
        "/api/v1/audit-logs?resource_type=workflow", cookies=login.cookies
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["resource_type"] == "workflow"


@pytest.mark.asyncio
async def test_get_audit_log_by_id(
    client: AsyncClient,
    admin_user: User,
    sample_logs: list[AuditLog],
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "audit_admin@example.com", "password": "adminpass"},
    )
    log_id = sample_logs[0].id
    response = await client.get(
        f"/api/v1/audit-logs/{log_id}", cookies=login.cookies
    )
    assert response.status_code == 200
    assert response.json()["id"] == log_id


@pytest.mark.asyncio
async def test_get_audit_log_not_found(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "audit_admin@example.com", "password": "adminpass"},
    )
    response = await client.get("/api/v1/audit-logs/9999", cookies=login.cookies)
    assert response.status_code == 404
