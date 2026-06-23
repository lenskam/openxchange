import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, JSON, String
from sqlalchemy.sql import func

from app.core.database import Base


class ChannelProtocol(str, enum.Enum):
    HTTP = "http"
    HL7 = "hl7"
    MLLP = "mllp"


class ChannelMethod(str, enum.Enum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"


class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    url_pattern = Column(String, nullable=False)
    method = Column(
        Enum("GET", "POST", "PUT", "DELETE", "PATCH", name="channel_methods"),
        nullable=False,
    )
    protocol = Column(
        Enum("http", "hl7", "mllp", name="channel_protocols"),
        default=ChannelProtocol.HTTP,
    )
    routes = Column(JSON, default=list)
    status = Column(Boolean, default=True)
    auth_required = Column(Boolean, default=True)
    rate_limit = Column(Integer, nullable=True)
    timeout = Column(Integer, default=30)
    retry_count = Column(Integer, default=3)
    trigger_workflow_id = Column(
        Integer, ForeignKey("workflows.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
