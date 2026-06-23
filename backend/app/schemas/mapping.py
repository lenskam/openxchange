from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class MappingBase(BaseModel):
    name: str
    type: str


class MappingCreate(MappingBase):
    workflow_id: Optional[int] = None


class MappingUpload(MappingBase):
    workflow_id: Optional[int] = None
    file_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class MappingUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    workflow_id: Optional[int] = None


class MappingInDBBase(MappingBase):
    id: int
    workflow_id: Optional[int] = None
    version: int
    uploaded_by_id: int
    last_updated: datetime
    is_latest: bool
    created_at: datetime
    extra_meta: Optional[Dict[str, Any]] = None
    file_data: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class MappingInDB(MappingInDBBase):
    pass


class MappingVersion(BaseModel):
    id: int
    version: int
    last_updated: datetime
    uploaded_by_id: int

    model_config = {"from_attributes": True}


class MappingList(BaseModel):
    items: List[MappingInDB]
    total: int


class MappingSummary(BaseModel):
    id: int
    name: str
    type: str
    workflow: Optional[str] = None
    records: int = 0
    last_updated: str
    uploaded_by: str
    initials: str
    color: str
    icon: str
    iconColor: str


class MappingListSummary(BaseModel):
    items: List[MappingSummary]
    total: int
