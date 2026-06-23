import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, JSON
from sqlalchemy.sql import func

from app.core.database import Base


class MappingType(str, enum.Enum):
    VARIABLE = "variable"
    ORG_UNIT = "org_unit"
    OPTIONS = "options"
    DATE_FORMAT = "date_format"


class Mapping(Base):
    __tablename__ = "mappings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(
        Enum(
            "variable",
            "org_unit",
            "options",
            "date_format",
            name="mapping_types",
        ),
        nullable=False,
    )
    workflow_id = Column(Integer, nullable=True)  # FK to workflows (Phase 3)
    file_data = Column(JSON, nullable=True)
    extra_meta = Column("metadata", JSON, default=dict)
    version = Column(Integer, default=1)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_latest = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
