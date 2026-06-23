import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class WorkflowStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    DRAFT = "draft"


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    source_connection_id = Column(
        Integer, ForeignKey("connections.id", ondelete="RESTRICT"), nullable=False
    )
    destination_connection_id = Column(
        Integer, ForeignKey("connections.id", ondelete="RESTRICT"), nullable=False
    )
    schedule = Column(String, nullable=True)
    status = Column(
        Enum(
            "active",
            "paused",
            "error",
            "draft",
            name="workflow_status",
        ),
        default=WorkflowStatus.DRAFT,
    )
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    last_run_at = Column(DateTime, nullable=True)
    last_run_status = Column(String, nullable=True)
    total_runs = Column(Integer, default=0)
    successful_runs = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    source_connection = relationship(
        "Connection", foreign_keys=[source_connection_id], lazy="joined"
    )
    destination_connection = relationship(
        "Connection", foreign_keys=[destination_connection_id], lazy="joined"
    )
    created_by = relationship("User", lazy="joined")
    transactions = relationship("Transaction", back_populates="workflow", lazy="select")
