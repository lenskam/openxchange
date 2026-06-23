from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    action: str
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    timestamp: datetime
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
