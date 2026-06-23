from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_validator


class WorkflowBase(BaseModel):
    name: str
    source_connection_id: int
    destination_connection_id: int


class WorkflowCreate(WorkflowBase):
    description: Optional[str] = None
    schedule: Optional[str] = None
    status: str = "draft"

    @field_validator("schedule")
    @classmethod
    def validate_cron(cls, v: Optional[str]) -> Optional[str]:
        if v:
            parts = v.strip().split()
            if len(parts) != 5:
                raise ValueError("schedule must be a valid cron expression with 5 fields")
        return v


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source_connection_id: Optional[int] = None
    destination_connection_id: Optional[int] = None
    schedule: Optional[str] = None
    status: Optional[str] = None

    @field_validator("schedule")
    @classmethod
    def validate_cron(cls, v: Optional[str]) -> Optional[str]:
        if v:
            parts = v.strip().split()
            if len(parts) != 5:
                raise ValueError("schedule must be a valid cron expression with 5 fields")
        return v


class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    source_connection_id: int
    destination_connection_id: int
    source_connection_name: Optional[str] = None
    destination_connection_name: Optional[str] = None
    schedule: Optional[str] = None
    status: str
    created_by_id: int
    created_by_name: Optional[str] = None
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    total_runs: int = 0
    successful_runs: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkflowDetailResponse(WorkflowResponse):
    mappings_count: int = 0
    recent_transactions: List[Dict[str, Any]] = []


class WorkflowListResponse(BaseModel):
    items: List[WorkflowResponse]
    total: int


class WorkflowTriggerResponse(BaseModel):
    message: str
    workflow_id: int
    triggered_at: str


class WorkflowHistoryResponse(BaseModel):
    id: int
    workflow_id: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    records_processed: int = 0
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class WorkflowHistoryListResponse(BaseModel):
    items: List[WorkflowHistoryResponse]
    total: int
