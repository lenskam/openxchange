import asyncio
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exceptions import setup_exception_handlers
from app.core.security import decode_token
from app.core.websocket_manager import ws_manager

app = FastAPI(
    title="Interxchange API",
    description="Interoperability mediator connecting health information systems",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

setup_exception_handlers(app)


@app.get("/health")
async def health_check():
    checks = await asyncio.gather(
        _check_database(),
        _check_redis(),
        _check_vault(),
    )
    db_status, redis_status, vault_status = checks
    all_healthy = all(s["status"] == "healthy" for s in checks)
    status_code = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "healthy" if all_healthy else "degraded",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "checks": {
            "database": db_status,
            "redis": redis_status,
            "vault": vault_status,
        },
    }


async def _check_database():
    from app.core.database import engine
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "detail": str(e)}


async def _check_redis():
    try:
        from redis.asyncio import Redis as AsyncRedis
        r = AsyncRedis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        await r.ping()
        await r.aclose()
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "detail": str(e)}


async def _check_vault():
    try:
        import hvac
        client = hvac.Client(url=settings.VAULT_URL, token=settings.VAULT_TOKEN)
        if client.is_authenticated():
            return {"status": "healthy"}
        return {"status": "unhealthy", "detail": "Vault client not authenticated"}
    except Exception as e:
        return {"status": "unhealthy", "detail": str(e)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = ""):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        payload = decode_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        user_id = int(user_id_str)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
