from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exceptions import setup_exception_handlers

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
    return {"status": "ok"}
