from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, default=1)
    email_notifications = Column(Boolean, default=True)
    slack_webhook_url = Column(String(512), nullable=True)
    workflow_failure_alerts = Column(Boolean, default=True)
    daily_digest = Column(Boolean, default=False)
    digest_time = Column(String(5), default="08:00")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
