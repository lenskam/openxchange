from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, HttpUrl

class ConnectionBase(BaseModel):
    name: str
    type: str # enum: dhis2, openhim, openfn, fhir, hl7, generic
    url: HttpUrl
    auth_type: str # enum: basic, api_key, oauth2

class ConnectionCreate(ConnectionBase):
    credentials: Dict[str, Any]

class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    url: Optional[HttpUrl] = None
    auth_type: Optional[str] = None
    credentials: Optional[Dict[str, Any]] = None

class ConnectionInDBBase(ConnectionBase):
    id: int
    status: str
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # ensure url is serialized as string
    class Config:
        from_attributes = True

class ConnectionInDB(ConnectionInDBBase):
    pass

class ConnectionList(BaseModel):
    items: list[ConnectionInDB]
    total: int

class ConnectionTest(BaseModel):
    status: str
    message: str
