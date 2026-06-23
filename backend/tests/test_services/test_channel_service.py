import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import Channel
from app.services.channel_service import ChannelService


@pytest.fixture
async def channel_service(db_session: AsyncSession) -> ChannelService:
    return ChannelService(db_session)


@pytest.mark.asyncio
async def test_create_channel(channel_service: ChannelService):
    result = await channel_service.create(
        name="Test Channel",
        url_pattern="/api/test",
        method="POST",
        protocol="http",
    )
    assert result["name"] == "Test Channel"
    assert result["url_pattern"] == "/api/test"
    assert result["status"] is True
    assert result["timeout"] == 30
    assert result["retry_count"] == 3


@pytest.mark.asyncio
async def test_create_channel_with_routes(channel_service: ChannelService):
    routes = [
        {"path": "/transform", "method": "POST", "handler": "transform_handler"}
    ]
    result = await channel_service.create(
        name="Routed Channel",
        url_pattern="/api/routed",
        method="POST",
        routes=routes,
    )
    assert len(result["routes"]) == 1
    assert result["routes"][0]["path"] == "/transform"


@pytest.mark.asyncio
async def test_get_channel(channel_service: ChannelService):
    created = await channel_service.create(
        name="Get Channel",
        url_pattern="/api/get-test",
        method="GET",
    )
    result = await channel_service.get(created["id"])
    assert result is not None
    assert result["name"] == "Get Channel"


@pytest.mark.asyncio
async def test_get_channel_not_found(channel_service: ChannelService):
    assert await channel_service.get(9999) is None


@pytest.mark.asyncio
async def test_get_multi_channels(channel_service: ChannelService):
    await channel_service.create(name="Ch1", url_pattern="/api/ch1", method="GET")
    await channel_service.create(name="Ch2", url_pattern="/api/ch2", method="POST")
    items = await channel_service.get_multi()
    assert len(items) >= 2


@pytest.mark.asyncio
async def test_update_channel(channel_service: ChannelService):
    created = await channel_service.create(
        name="Old Name",
        url_pattern="/api/update-test",
        method="GET",
    )
    result = await channel_service.update(created["id"], name="New Name")
    assert result is not None
    assert result["name"] == "New Name"


@pytest.mark.asyncio
async def test_update_channel_not_found(channel_service: ChannelService):
    result = await channel_service.update(9999, name="Nope")
    assert result is None


@pytest.mark.asyncio
async def test_delete_channel(channel_service: ChannelService):
    created = await channel_service.create(
        name="Delete Me",
        url_pattern="/api/delete-me",
        method="DELETE",
    )
    assert await channel_service.delete(created["id"]) is True
    assert await channel_service.get(created["id"]) is None


@pytest.mark.asyncio
async def test_delete_channel_not_found(channel_service: ChannelService):
    assert await channel_service.delete(9999) is False


@pytest.mark.asyncio
async def test_enable_channel(channel_service: ChannelService):
    created = await channel_service.create(
        name="Enable Test",
        url_pattern="/api/enable-test",
        method="GET",
    )
    result = await channel_service.enable(created["id"])
    assert result is not None
    assert result["status"] is True


@pytest.mark.asyncio
async def test_disable_channel(channel_service: ChannelService):
    created = await channel_service.create(
        name="Disable Test",
        url_pattern="/api/disable-test",
        method="GET",
    )
    result = await channel_service.disable(created["id"])
    assert result is not None
    assert result["status"] is False


@pytest.mark.asyncio
async def test_enable_channel_not_found(channel_service: ChannelService):
    assert await channel_service.enable(9999) is None


@pytest.mark.asyncio
async def test_disable_channel_not_found(channel_service: ChannelService):
    assert await channel_service.disable(9999) is None
