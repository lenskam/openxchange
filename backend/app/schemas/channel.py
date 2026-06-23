from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class RouteStep(BaseModel):
    path: str
    method: str = "GET"
    handler: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class ChannelBase(BaseModel):
    name: str
    url_pattern: str
    method: str = "GET"
    protocol: str = "http"
    routes: List[RouteStep] = []
    auth_required: bool = True
    rate_limit: Optional[int] = None
    timeout: int = 30
    retry_count: int = 3
    trigger_workflow_id: Optional[int] = None


class ChannelCreate(ChannelBase):
    description: Optional[str] = None


class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    url_pattern: Optional[str] = None
    method: Optional[str] = None
    protocol: Optional[str] = None
    routes: Optional[List[RouteStep]] = None
    auth_required: Optional[bool] = None
    rate_limit: Optional[int] = None
    timeout: Optional[int] = None
    retry_count: Optional[int] = None
    trigger_workflow_id: Optional[int] = None


class ChannelResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    url_pattern: str
    method: str
    protocol: str
    routes: List[Dict[str, Any]] = []
    status: bool
    auth_required: bool
    rate_limit: Optional[int] = None
    timeout: int
    retry_count: int
    trigger_workflow_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChannelListResponse(BaseModel):
    items: List[ChannelResponse]
    total: int


class ChannelEnableResponse(BaseModel):
    id: int
    name: str
    status: bool
    message: str
