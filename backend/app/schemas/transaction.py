from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class TransactionBase(BaseModel):
    workflow_id: int
    triggered_by: str = "system"


class TransactionCreate(TransactionBase):
    pass


class TransactionResponse(BaseModel):
    id: int
    txn_id: str
    workflow_id: int
    workflow_name: Optional[str] = None
    status: str
    processed_count: int = 0
    failed_count: int = 0
    duration: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_details: Optional[Dict[str, Any]] = None
    triggered_by: str
    source_data_summary: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int


class TransactionStats(BaseModel):
    total: int = 0
    success: int = 0
    failed: int = 0
    processing: int = 0
    pending: int = 0
    success_rate: float = 0.0


class TransactionVolumePoint(BaseModel):
    date: str
    count: int
    success: int
    failed: int
