import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User
from app.services.audit_log_service import AuditLogService


@pytest.fixture
async def sample_user(db_session: AsyncSession) -> User:
    user = User(
        email="audit_user@test.com",
        full_name="Audit User",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("password")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def audit_service(db_session: AsyncSession) -> AuditLogService:
    return AuditLogService(db_session)


@pytest.mark.asyncio
async def test_log_create(audit_service: AuditLogService, sample_user: User):
    result = await audit_service.log(
        action="test_action",
        user_id=sample_user.id,
        resource_type="workflow",
        resource_id="1",
    )
    assert result["action"] == "test_action"
    assert result["user_id"] == sample_user.id
    assert result["resource_type"] == "workflow"
    assert "id" in result


@pytest.mark.asyncio
async def test_log_with_details(audit_service: AuditLogService, sample_user: User):
    result = await audit_service.log(
        action="update",
        user_id=sample_user.id,
        resource_type="connection",
        resource_id="5",
        details={"field": "name", "old": "Old", "new": "New"},
    )
    assert result["details"] == {"field": "name", "old": "Old", "new": "New"}


@pytest.mark.asyncio
async def test_log_with_ip(audit_service: AuditLogService, sample_user: User):
    result = await audit_service.log(
        action="login",
        user_id=sample_user.id,
        resource_type="session",
        ip_address="192.168.1.1",
    )
    assert result.get("ip_address") == "192.168.1.1"


@pytest.mark.asyncio
async def test_search_empty(audit_service: AuditLogService):
    result = await audit_service.search()
    assert result["total"] == 0
    assert result["items"] == []


@pytest.mark.asyncio
async def test_search_with_filters(
    audit_service: AuditLogService, sample_user: User
):
    await audit_service.log(
        action="create", user_id=sample_user.id, resource_type="workflow"
    )
    await audit_service.log(
        action="delete", user_id=sample_user.id, resource_type="connection"
    )

    result = await audit_service.search(action="create")
    assert result["total"] == 1

    result2 = await audit_service.search(resource_type="connection")
    assert result2["total"] == 1


@pytest.mark.asyncio
async def test_search_by_user(audit_service: AuditLogService, sample_user: User):
    await audit_service.log(
        action="view", user_id=sample_user.id, resource_type="report"
    )
    result = await audit_service.search(user_id=sample_user.id)
    assert result["total"] == 1
