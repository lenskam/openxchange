import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.connection import Connection
from app.models.transaction import Transaction
from app.models.workflow import Workflow
from app.models.user import User


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="txn_admin@example.com",
        full_name="Txn Admin",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("adminpass")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def sample_connection(db_session: AsyncSession) -> Connection:
    conn = Connection(
        name="Txn Conn",
        type="dhis2",
        url="https://txn.example.com",
        auth_type="basic",
    )
    db_session.add(conn)
    await db_session.commit()
    await db_session.refresh(conn)
    return conn


@pytest.fixture
async def sample_workflow(
    db_session: AsyncSession, admin_user: User, sample_connection: Connection
) -> Workflow:
    wf = Workflow(
        name="Txn Integration WF",
        source_connection_id=sample_connection.id,
        destination_connection_id=sample_connection.id,
        created_by_id=admin_user.id,
        status="active",
    )
    db_session.add(wf)
    await db_session.commit()
    await db_session.refresh(wf)
    return wf


@pytest.fixture
async def sample_transactions(
    db_session: AsyncSession, sample_workflow: Workflow
) -> list[Transaction]:
    txns = []
    for i in range(3):
        txn = Transaction(
            workflow_id=sample_workflow.id,
            status="success" if i < 2 else "failed",
            triggered_by="test",
            processed_count=10,
            failed_count=0 if i < 2 else 3,
        )
        db_session.add(txn)
        txns.append(txn)
    await db_session.commit()
    for t in txns:
        await db_session.refresh(t)
    return txns


@pytest.mark.asyncio
async def test_list_transactions(
    client: AsyncClient,
    admin_user: User,
    sample_workflow: Workflow,
    sample_transactions: list[Transaction],
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "txn_admin@example.com", "password": "adminpass"},
    )
    response = await client.get("/api/v1/transactions", cookies=login.cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 3


@pytest.mark.asyncio
async def test_get_transaction_by_id(
    client: AsyncClient,
    admin_user: User,
    sample_transactions: list[Transaction],
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "txn_admin@example.com", "password": "adminpass"},
    )
    txn_id = sample_transactions[0].id
    response = await client.get(
        f"/api/v1/transactions/{txn_id}", cookies=login.cookies
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == txn_id


@pytest.mark.asyncio
async def test_get_transaction_not_found(client: AsyncClient, admin_user: User):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "txn_admin@example.com", "password": "adminpass"},
    )
    response = await client.get("/api/v1/transactions/9999", cookies=login.cookies)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_transaction_stats(
    client: AsyncClient,
    admin_user: User,
    sample_transactions: list[Transaction],
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "txn_admin@example.com", "password": "adminpass"},
    )
    response = await client.get("/api/v1/transactions/stats", cookies=login.cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 3
    assert data["success"] >= 2
    assert data["failed"] >= 1


@pytest.mark.asyncio
async def test_get_transaction_volume(
    client: AsyncClient,
    admin_user: User,
    sample_transactions: list[Transaction],
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "txn_admin@example.com", "password": "adminpass"},
    )
    response = await client.get(
        "/api/v1/transactions/volume", cookies=login.cookies
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
