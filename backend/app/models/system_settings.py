from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, default=1)
    default_date_format = Column(String(20), default="YYYY-MM-DD")
    log_retention_days = Column(Integer, default=90)
    default_timezone = Column(String(50), default="UTC")
    max_concurrent_workflows = Column(Integer, default=5)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
