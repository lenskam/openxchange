import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.connection import Connection
from app.models.transaction import Transaction
from app.models.workflow import Workflow
from app.models.user import User
from app.services.transaction_service import TransactionService


@pytest.fixture
async def sample_user(db_session: AsyncSession) -> User:
    user = User(
        email="txn_user@test.com",
        full_name="Txn User",
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
        name="Txn Source",
        type="dhis2",
        url="https://source.example.com",
        auth_type="basic",
    )
    db_session.add(conn)
    await db_session.commit()
    await db_session.refresh(conn)
    return conn


@pytest.fixture
async def sample_workflow(
    db_session: AsyncSession, sample_user: User, sample_connection: Connection
) -> Workflow:
    wf = Workflow(
        name="Txn WF",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=sample_user.id,
        status="active",
    )
    db_session.add(wf)
    await db_session.commit()
    await db_session.refresh(wf)
    return wf


@pytest.fixture
async def txn_service(db_session: AsyncSession) -> TransactionService:
    return TransactionService(db_session)


@pytest.mark.asyncio
async def test_create_transaction(
    txn_service: TransactionService,
    sample_workflow: Workflow,
):
    result = await txn_service.create(
        workflow_id=sample_workflow.id,
        status="processing",
        triggered_by="system",
    )
    assert result["workflow_id"] == sample_workflow.id
    assert result["status"] == "processing"
    assert "id" in result
    assert "txn_id" in result


@pytest.mark.asyncio
async def test_get_transaction(
    txn_service: TransactionService,
    sample_workflow: Workflow,
):
    created = await txn_service.create(
        workflow_id=sample_workflow.id, triggered_by="test"
    )
    result = await txn_service.get(created["id"])
    assert result is not None
    assert result["id"] == created["id"]


@pytest.mark.asyncio
async def test_get_transaction_not_found(txn_service: TransactionService):
    result = await txn_service.get(9999)
    assert result is None


@pytest.mark.asyncio
async def test_get_by_workflow(
    txn_service: TransactionService,
    sample_workflow: Workflow,
):
    await txn_service.create(workflow_id=sample_workflow.id, triggered_by="sys")
    await txn_service.create(workflow_id=sample_workflow.id, triggered_by="user")
    result = await txn_service.get_by_workflow(sample_workflow.id)
    assert result["total"] == 2
    assert len(result["items"]) == 2


@pytest.mark.asyncio
async def test_update_status(
    txn_service: TransactionService,
    sample_workflow: Workflow,
):
    created = await txn_service.create(
        workflow_id=sample_workflow.id, triggered_by="test"
    )
    result = await txn_service.update_status(
        transaction_id=created["id"],
        status="success",
        processed_count=10,
        failed_count=2,
    )
    assert result is not None
    assert result["status"] == "success"
    assert result["processed_count"] == 10
    assert result["failed_count"] == 2


@pytest.mark.asyncio
async def test_update_status_not_found(txn_service: TransactionService):
    result = await txn_service.update_status(9999, status="success")
    assert result is None


@pytest.mark.asyncio
async def test_get_stats_empty(txn_service: TransactionService):
    stats = await txn_service.get_stats()
    assert stats["total"] == 0
    assert stats["success"] == 0
    assert stats["failed"] == 0
    assert stats["success_rate"] == 0.0


@pytest.mark.asyncio
async def test_get_stats_with_data(
    txn_service: TransactionService,
    sample_workflow: Workflow,
):
    c1 = await txn_service.create(workflow_id=sample_workflow.id, triggered_by="sys")
    c2 = await txn_service.create(workflow_id=sample_workflow.id, triggered_by="sys")
    await txn_service.update_status(c1["id"], status="success")
    await txn_service.update_status(c2["id"], status="failed")
    stats = await txn_service.get_stats()
    assert stats["total"] == 2
    assert stats["success"] == 1
    assert stats["failed"] == 1
    assert stats["success_rate"] == 50.0


@pytest.mark.asyncio
async def test_get_volume_empty(txn_service: TransactionService):
    volume = await txn_service.get_volume()
    assert volume == []


@pytest.mark.asyncio
async def test_get_volume_with_data(
    txn_service: TransactionService,
    sample_workflow: Workflow,
    db_session: AsyncSession,
):
    txn = Transaction(
        workflow_id=sample_workflow.id,
        status="success",
        triggered_by="test",
        completed_at=__import__("datetime").datetime.utcnow(),
    )
    db_session.add(txn)
    await db_session.commit()

    volume = await txn_service.get_volume(days=30)
    assert len(volume) >= 1
    assert volume[0]["success"] >= 1
