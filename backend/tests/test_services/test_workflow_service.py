import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.connection import Connection
from app.models.workflow import Workflow
from app.models.user import User
from app.services.workflow_service import WorkflowService


@pytest.fixture
async def sample_user(db_session: AsyncSession) -> User:
    user = User(
        email="wf_user@test.com",
        full_name="WF User",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("password")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def sample_connection(db_session: AsyncSession) -> Connection:
    conn = Connection(
        name="Test Source",
        type="dhis2",
        url="https://source.example.com",
        auth_type="basic",
    )
    db_session.add(conn)
    await db_session.commit()
    await db_session.refresh(conn)
    return conn


@pytest.fixture
async def wf_service(db_session: AsyncSession) -> WorkflowService:
    return WorkflowService(db_session)


@pytest.mark.asyncio
async def test_create_workflow(
    wf_service: WorkflowService,
    sample_user: User,
    sample_connection: Connection,
):
    result = await wf_service.create(
        name="Test Workflow",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
        status="draft",
    )
    assert result["name"] == "Test Workflow"
    assert result["status"] == "draft"
    assert result["source_connection_id"] == sample_connection.id


@pytest.mark.asyncio
async def test_get_workflow(
    wf_service: WorkflowService,
    sample_user: User,
    sample_connection: Connection,
):
    created = await wf_service.create(
        name="Get Test",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
    )
    result = await wf_service.get(created["id"])
    assert result is not None
    assert result["name"] == "Get Test"


@pytest.mark.asyncio
async def test_get_workflow_not_found(wf_service: WorkflowService):
    result = await wf_service.get(9999)
    assert result is None


@pytest.mark.asyncio
async def test_get_multi_workflows(
    wf_service: WorkflowService,
    sample_user: User,
    sample_connection: Connection,
):
    await wf_service.create(
        name="WF1",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
    )
    await wf_service.create(
        name="WF2",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
    )
    items = await wf_service.get_multi()
    assert len(items) >= 2


@pytest.mark.asyncio
async def test_update_workflow(
    wf_service: WorkflowService,
    sample_user: User,
    sample_connection: Connection,
):
    created = await wf_service.create(
        name="Old Name",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
    )
    result = await wf_service.update(created["id"], name="New Name")
    assert result is not None
    assert result["name"] == "New Name"


@pytest.mark.asyncio
async def test_update_workflow_not_found(wf_service: WorkflowService):
    result = await wf_service.update(9999, name="Nope")
    assert result is None


@pytest.mark.asyncio
async def test_delete_workflow(
    wf_service: WorkflowService,
    sample_user: User,
    sample_connection: Connection,
):
    created = await wf_service.create(
        name="Delete Me",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
    )
    assert await wf_service.delete(created["id"]) is True
    assert await wf_service.get(created["id"]) is None


@pytest.mark.asyncio
async def test_delete_workflow_not_found(wf_service: WorkflowService):
    assert await wf_service.delete(9999) is False


@pytest.mark.asyncio
async def test_trigger_workflow(
    wf_service: WorkflowService,
    sample_user: User,
    sample_connection: Connection,
):
    created = await wf_service.create(
        name="Trigger Test",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
    )
    result = await wf_service.trigger(created["id"])
    assert result is not None
    assert result["workflow_id"] == created["id"]
    assert "triggered" in result["message"]


@pytest.mark.asyncio
async def test_trigger_workflow_not_found(wf_service: WorkflowService):
    assert await wf_service.trigger(9999) is None


@pytest.mark.asyncio
async def test_get_history_empty(
    wf_service: WorkflowService,
    sample_user: User,
    sample_connection: Connection,
):
    created = await wf_service.create(
        name="History Test",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
    )
    result = await wf_service.get_history(created["id"])
    assert result["items"] == []
    assert result["total"] == 0


@pytest.mark.asyncio
async def test_filter_by_status(
    wf_service: WorkflowService,
    sample_user: User,
    sample_connection: Connection,
):
    await wf_service.create(
        name="Active WF",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
        status="active",
    )
    await wf_service.create(
        name="Paused WF",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
        status="paused",
    )
    active_items = await wf_service.get_multi(status="active")
    assert all(w["status"] == "active" for w in active_items)
