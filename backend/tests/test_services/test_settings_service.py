import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User
from app.services.settings_service import SettingsService


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="settings_admin@test.com",
        full_name="Settings Admin",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("password")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def settings_service(db_session: AsyncSession) -> SettingsService:
    return SettingsService(db_session)


@pytest.mark.asyncio
async def test_get_org_settings_empty(settings_service: SettingsService):
    result = await settings_service.get_org()
    assert result["org_name"] == "My Organization"
    assert result["id"] == 1


@pytest.mark.asyncio
async def test_update_org_settings(
    settings_service: SettingsService, admin_user: User
):
    result = await settings_service.update_org(
        {"org_name": "TestOrg", "country": "KE"}, admin_user.id
    )
    assert result["org_name"] == "TestOrg"
    assert result["country"] == "KE"
    assert result["updated_by_id"] == admin_user.id


@pytest.mark.asyncio
async def test_get_notifications_empty(settings_service: SettingsService):
    result = await settings_service.get_notifications()
    assert result["email_notifications"] is True
    assert result["daily_digest"] is False


@pytest.mark.asyncio
async def test_update_notifications(
    settings_service: SettingsService, admin_user: User
):
    result = await settings_service.update_notifications(
        {"email_notifications": False, "daily_digest": True}, admin_user.id
    )
    assert result["email_notifications"] is False
    assert result["daily_digest"] is True


@pytest.mark.asyncio
async def test_get_system_empty(settings_service: SettingsService):
    result = await settings_service.get_system()
    assert result["log_retention_days"] == 90
    assert result["default_timezone"] == "UTC"


@pytest.mark.asyncio
async def test_update_system(settings_service: SettingsService, admin_user: User):
    result = await settings_service.update_system(
        {"log_retention_days": 180, "max_concurrent_workflows": 10}, admin_user.id
    )
    assert result["log_retention_days"] == 180
    assert result["max_concurrent_workflows"] == 10


@pytest.mark.asyncio
async def test_create_and_list_api_keys(
    settings_service: SettingsService, admin_user: User
):
    created = await settings_service.create_api_key(admin_user.id, "Test Key")
    assert created["name"] == "Test Key"
    assert "full_key" in created
    assert created["key_prefix"] == created["full_key"][:8]

    keys = await settings_service.get_api_keys(admin_user.id)
    assert len(keys) >= 1


@pytest.mark.asyncio
async def test_revoke_api_key(settings_service: SettingsService, admin_user: User):
    created = await settings_service.create_api_key(admin_user.id, "Revoke Me")
    result = await settings_service.revoke_api_key(created["id"], admin_user.id)
    assert result is not None
    assert result["is_active"] is False
