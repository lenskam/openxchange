from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class OrganizationSettings(Base):
    __tablename__ = "organization_settings"

    id = Column(Integer, primary_key=True, default=1)
    org_name = Column(String(255), default="My Organization")
    country = Column(String(100), default="US")
    primary_contact_email = Column(String(255), default="")
    support_email = Column(String(255), default="")
    platform_name = Column(String(255), default="Interxchange")
    primary_color = Column(String(7), default="#1976D2")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
