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
        email="dash_admin@example.com",
        full_name="Dash Admin",
        role="admin",
        is_active=True,
    )
    user.hashed_password = get_password_hash("adminpass")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def seed_data(
    db_session: AsyncSession, admin_user: User
) -> User:
    conn = Connection(
        name="Dash Conn",
        type="dhis2",
        url="https://dash.example.com",
        auth_type="basic",
        status="active",
    )
    db_session.add(conn)
    await db_session.commit()
    await db_session.refresh(conn)

    wf = Workflow(
        name="Dash WF",
        source_connection_id=conn.id,
        destination_connection_id=conn.id,
        created_by_id=admin_user.id,
        status="active",
    )
    db_session.add(wf)
    await db_session.commit()
    await db_session.refresh(wf)

    txn = Transaction(
        workflow_id=wf.id,
        status="success",
        triggered_by="test",
    )
    db_session.add(txn)
    await db_session.commit()

    return admin_user


@pytest.mark.asyncio
async def test_dashboard_stats(
    client: AsyncClient,
    admin_user: User,
    seed_data: User,
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dash_admin@example.com", "password": "adminpass"},
    )
    response = await client.get("/api/v1/dashboard/stats", cookies=login.cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["connections"]["total"] >= 1
    assert data["connections"]["active"] >= 1
    assert data["workflows"]["total"] >= 1
    assert data["workflows"]["active"] >= 1
    assert data["transactions"]["total"] >= 1


@pytest.mark.asyncio
async def test_dashboard_transaction_volume(
    client: AsyncClient,
    admin_user: User,
    seed_data: User,
):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dash_admin@example.com", "password": "adminpass"},
    )
    response = await client.get(
        "/api/v1/dashboard/transaction-volume", cookies=login.cookies
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
