from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class OrganizationSettingsBase(BaseModel):
    org_name: str = "My Organization"
    country: str = "US"
    primary_contact_email: str = ""
    support_email: str = ""
    platform_name: str = "Interxchange"
    primary_color: str = "#1976D2"


class OrganizationSettingsUpdate(OrganizationSettingsBase):
    pass


class OrganizationSettingsResponse(OrganizationSettingsBase):
    id: int
    updated_at: Optional[datetime] = None
    updated_by_id: Optional[int] = None

    model_config = {"from_attributes": True}


class NotificationSettingsBase(BaseModel):
    email_notifications: bool = True
    slack_webhook_url: Optional[str] = None
    workflow_failure_alerts: bool = True
    daily_digest: bool = False
    digest_time: str = "08:00"


class NotificationSettingsUpdate(NotificationSettingsBase):
    pass


class NotificationSettingsResponse(NotificationSettingsBase):
    id: int
    updated_at: Optional[datetime] = None
    updated_by_id: Optional[int] = None

    model_config = {"from_attributes": True}


class SystemSettingsBase(BaseModel):
    default_date_format: str = "YYYY-MM-DD"
    log_retention_days: int = 90
    default_timezone: str = "UTC"
    max_concurrent_workflows: int = 5


class SystemSettingsUpdate(SystemSettingsBase):
    pass


class SystemSettingsResponse(SystemSettingsBase):
    id: int
    updated_at: Optional[datetime] = None
    updated_by_id: Optional[int] = None

    model_config = {"from_attributes": True}


class ApiKeyCreate(BaseModel):
    name: str


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    key_prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ApiKeyCreated(ApiKeyResponse):
    full_key: str
