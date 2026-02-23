from sqlalchemy import Column, DateTime, Enum, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base

class Connection(Base):
    __tablename__ = "connections"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(
        Enum("dhis2", "openhim", "openfn", "fhir", "hl7", "generic", name="connection_types")
    )
    url = Column(String, nullable=False)
    auth_type = Column(
        Enum("basic", "api_key", "oauth2", name="auth_types")
    )
    credentials_encrypted = Column(String)  # Vault path reference
    status = Column(
        Enum("active", "inactive", "error", name="connection_status"),
        default="inactive"
    )
    last_sync_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
