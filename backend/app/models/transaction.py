import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    txn_id = Column(
        String(36),
        unique=True,
        nullable=False,
        default=lambda: f"txn_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}",
    )
    workflow_id = Column(
        Integer, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False
    )
    status = Column(
        Enum(
            "pending",
            "processing",
            "success",
            "failed",
            "cancelled",
            name="transaction_status",
        ),
        default=TransactionStatus.PENDING,
    )
    processed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    duration = Column(Float, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    error_details = Column(JSON, nullable=True)
    triggered_by = Column(String(255), nullable=False)
    source_data_summary = Column(JSON, nullable=True)
    destination_response = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workflow = relationship("Workflow", back_populates="transactions")
