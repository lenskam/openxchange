# Phase 2 Implementation Prompt for Gemini

Based on the **Interxchange GEMINI.md** development guide, here is a comprehensive prompt for the Gemini AI agent to execute **Phase 2: Mapping Engine**.

---

## PROMPT: Implement Interxchange Phase 2 - Mapping Engine

You are the **Gemini AI agent** tasked with implementing **Phase 2: Mapping Engine** of the Interxchange interoperability platform according to the specifications in the `GEMINI.md` development guide.

### Phase 2 Scope (7 days)

- Mapping models, file upload, parsing (CSV, Excel, JSON, XML)
- Mapping engine service (variable, org unit, options, date format transformations)
- Frontend Mappings page with upload modal, table, and version management

### Timeline Expectations

- Day 1-2: Database models, file upload API endpoints, parsing utilities
- Day 3-4: Mapping engine service with transformation logic
- Day 5-6: Frontend Mappings page (table, upload modal, actions)
- Day 7: Testing, validation, integration with Phase 1

---

## TASK 1: Database Models for Mappings

### Mapping Model (backend/app/models/mapping.py)

```python
from sqlalchemy import Column, String, Enum, Integer, ForeignKey, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import BaseModel
import enum

class MappingType(enum.Enum):
    VARIABLE = "variable"
    ORG_UNIT = "org_unit"
    OPTIONS = "options"
    DATE_FORMAT = "date_format"

class Mapping(BaseModel):
    __tablename__ = "mappings"

    name = Column(String(255), nullable=False)
    type = Column(Enum(MappingType), nullable=False)
    workflow_id = Column(String(36), ForeignKey("workflows.id", ondelete="SET NULL"), nullable=True)
    file_data = Column(JSONB, nullable=False)  # Parsed mapping content
    metadata = Column(JSONB, default={})  # {original_filename, record_count, file_size, etc.}
    version = Column(Integer, nullable=False, default=1)
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    last_updated = Column(DateTime(timezone=True), nullable=False)
    is_latest = Column(Boolean, default=True)

    # Relationships
    # workflow = relationship("Workflow", back_populates="mappings")
    # uploaded_by = relationship("User", back_populates="uploaded_mappings")
```

### Update models/**init**.py to include Mapping

```python
from app.models.user import User, UserRole
from app.models.connection import Connection, ConnectionType, AuthType, ConnectionStatus
from app.models.mapping import Mapping, MappingType
```

### Alembic Migration

Generate and run migration for Mapping table:

```bash
cd backend
alembic revision --autogenerate -m "Add mappings table"
alembic upgrade head
```

---

## TASK 2: Pydantic Schemas for Mappings

### Mapping Schemas (backend/app/schemas/mapping.py)

```python
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List
from app.models.mapping import MappingType

class MappingBase(BaseModel):
    name: str
    type: MappingType
    workflow_id: Optional[UUID] = None

class MappingCreate(MappingBase):
    pass

class MappingUpdate(BaseModel):
    name: Optional[str] = None
    workflow_id: Optional[UUID] = None

class FileUploadResponse(BaseModel):
    mapping_id: UUID
    name: str
    type: MappingType
    record_count: int
    version: int
    message: str

class MappingInDB(MappingBase):
    id: UUID
    file_data: Dict[str, Any]
    metadata: Dict[str, Any]
    version: int
    uploaded_by_id: UUID
    last_updated: datetime
    is_latest: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MappingResponse(MappingInDB):
    # Exclude file_data for list views, include for detail views
    pass

class MappingDetailResponse(MappingResponse):
    file_data: Dict[str, Any]  # Include full data for detail view

class MappingVersionResponse(BaseModel):
    id: UUID
    version: int
    last_updated: datetime
    uploaded_by_id: UUID
    metadata: Dict[str, Any]
    is_latest: bool
```

---

## TASK 3: File Parsing Utilities

### File Parser Service (backend/app/services/file_parser.py)

```python
import pandas as pd
import json
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Tuple
from fastapi import UploadFile, HTTPException
from io import StringIO, BytesIO
import csv

class FileParser:
    """Handles parsing of mapping files in various formats"""

    SUPPORTED_FORMATS = ['.csv', '.xlsx', '.xls', '.json', '.xml']

    @staticmethod
    async def parse_file(file: UploadFile, mapping_type: str) -> Tuple[Dict[str, Any], int]:
        """
        Parse uploaded file based on mapping type and file format
        Returns: (parsed_data, record_count)
        """
        content = await file.read()
        filename = file.filename.lower()

        if filename.endswith('.csv'):
            return await FileParser._parse_csv(content, mapping_type)
        elif filename.endswith(('.xlsx', '.xls')):
            return await FileParser._parse_excel(content, mapping_type)
        elif filename.endswith('.json'):
            return await FileParser._parse_json(content, mapping_type)
        elif filename.endswith('.xml'):
            return await FileParser._parse_xml(content, mapping_type)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format. Supported: {FileParser.SUPPORTED_FORMATS}")

    @staticmethod
    async def _parse_csv(content: bytes, mapping_type: str) -> Tuple[Dict[str, Any], int]:
        """Parse CSV file"""
        try:
            df = pd.read_csv(BytesIO(content))
            records = df.to_dict('records')

            if mapping_type == "variable":
                # Expected columns: source_field, target_field, transformation (optional)
                required = ['source_field', 'target_field']
                for col in required:
                    if col not in df.columns:
                        raise ValueError(f"CSV missing required column: {col}")

                parsed_data = {
                    "mappings": records,
                    "columns": df.columns.tolist()
                }

            elif mapping_type == "org_unit":
                # Expected columns: source_code, target_uid
                if 'source_code' not in df.columns or 'target_uid' not in df.columns:
                    raise ValueError("Org unit mapping requires 'source_code' and 'target_uid' columns")
                parsed_data = {
                    "mappings": {row['source_code']: row['target_uid'] for row in records},
                    "record_count": len(records)
                }

            elif mapping_type == "options":
                # Expected columns: source_value, target_option_code
                if 'source_value' not in df.columns or 'target_option_code' not in df.columns:
                    raise ValueError("Options mapping requires 'source_value' and 'target_option_code' columns")
                parsed_data = {
                    "mappings": {row['source_value']: row['target_option_code'] for row in records},
                    "record_count": len(records)
                }

            else:  # date_format
                parsed_data = {
                    "format": records[0] if records else {},
                    "record_count": len(records)
                }

            return parsed_data, len(records)

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")

    @staticmethod
    async def _parse_excel(content: bytes, mapping_type: str) -> Tuple[Dict[str, Any], int]:
        """Parse Excel file"""
        try:
            df = pd.read_excel(BytesIO(content))
            records = df.to_dict('records')

            # Same validation logic as CSV
            if mapping_type == "variable":
                required = ['source_field', 'target_field']
                for col in required:
                    if col not in df.columns:
                        raise ValueError(f"Excel missing required column: {col}")
                parsed_data = {"mappings": records, "columns": df.columns.tolist()}
            elif mapping_type == "org_unit":
                if 'source_code' not in df.columns or 'target_uid' not in df.columns:
                    raise ValueError("Org unit mapping requires 'source_code' and 'target_uid' columns")
                parsed_data = {"mappings": {row['source_code']: row['target_uid'] for row in records}}
            elif mapping_type == "options":
                if 'source_value' not in df.columns or 'target_option_code' not in df.columns:
                    raise ValueError("Options mapping requires 'source_value' and 'target_option_code' columns")
                parsed_data = {"mappings": {row['source_value']: row['target_option_code'] for row in records}}
            else:
                parsed_data = {"format": records[0] if records else {}}

            return parsed_data, len(records)

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error parsing Excel: {str(e)}")

    @staticmethod
    async def _parse_json(content: bytes, mapping_type: str) -> Tuple[Dict[str, Any], int]:
        """Parse JSON file"""
        try:
            data = json.loads(content.decode('utf-8'))

            if mapping_type == "variable":
                if isinstance(data, list):
                    parsed_data = {"mappings": data}
                    record_count = len(data)
                elif isinstance(data, dict) and 'mappings' in data:
                    parsed_data = data
                    record_count = len(data.get('mappings', []))
                else:
                    raise ValueError("Variable mapping JSON must be an array or object with 'mappings' key")

            elif mapping_type in ["org_unit", "options"]:
                if isinstance(data, dict):
                    parsed_data = {"mappings": data}
                    record_count = len(data)
                else:
                    raise ValueError(f"{mapping_type} mapping must be a key-value object")

            else:  # date_format
                parsed_data = {"format": data}
                record_count = 1

            return parsed_data, record_count

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error parsing JSON: {str(e)}")

    @staticmethod
    async def _parse_xml(content: bytes, mapping_type: str) -> Tuple[Dict[str, Any], int]:
        """Parse XML file"""
        try:
            root = ET.parse(BytesIO(content)).getroot()

            if mapping_type == "variable":
                mappings = []
                for mapping_elem in root.findall('.//mapping'):
                    mapping = {
                        'source_field': mapping_elem.findtext('source_field', ''),
                        'target_field': mapping_elem.findtext('target_field', ''),
                        'transformation': mapping_elem.findtext('transformation', None)
                    }
                    mappings.append(mapping)
                parsed_data = {"mappings": mappings}
                record_count = len(mappings)

            elif mapping_type == "org_unit":
                mappings = {}
                for mapping_elem in root.findall('.//mapping'):
                    source = mapping_elem.findtext('source_code')
                    target = mapping_elem.findtext('target_uid')
                    if source and target:
                        mappings[source] = target
                parsed_data = {"mappings": mappings}
                record_count = len(mappings)

            elif mapping_type == "options":
                mappings = {}
                for mapping_elem in root.findall('.//mapping'):
                    source = mapping_elem.findtext('source_value')
                    target = mapping_elem.findtext('target_option_code')
                    if source and target:
                        mappings[source] = target
                parsed_data = {"mappings": mappings}
                record_count = len(mappings)

            else:  # date_format
                format_elem = root.find('.//format')
                parsed_data = {"format": format_elem.attrib if format_elem is not None else {}}
                record_count = 1

            return parsed_data, record_count

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error parsing XML: {str(e)}")
```

---

## TASK 4: Mapping Repository & Service

### Mapping Repository (backend/app/repositories/mapping_repository.py)

```python
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.models.mapping import Mapping
from typing import Optional, List, Dict, Any
from uuid import UUID

class MappingRepository(BaseRepository[Mapping]):
    def __init__(self, db):
        super().__init__(Mapping, db)

    async def get_by_workflow(self, workflow_id: UUID, include_global: bool = True) -> List[Mapping]:
        """Get mappings for a specific workflow, optionally including global mappings"""
        query = select(Mapping).where(
            (Mapping.workflow_id == str(workflow_id)) |
            (Mapping.workflow_id.is_(None) if include_global else False),
            Mapping.is_latest == True
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_type(self, mapping_type: str) -> List[Mapping]:
        """Get mappings by type"""
        query = select(Mapping).where(Mapping.type == mapping_type, Mapping.is_latest == True)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_version(self, original_id: UUID, new_file_data: Dict[str, Any],
                            new_metadata: Dict[str, Any], uploaded_by_id: str) -> Mapping:
        """Create a new version of an existing mapping"""
        # Mark old version as not latest
        await self.db.execute(
            update(Mapping)
            .where(Mapping.id == str(original_id))
            .values(is_latest=False)
        )

        # Get old mapping data
        old_mapping = await self.get_by_id(str(original_id))
        if not old_mapping:
            raise ValueError("Original mapping not found")

        # Create new version
        new_version = await self.create(
            name=old_mapping.name,
            type=old_mapping.type,
            workflow_id=old_mapping.workflow_id,
            file_data=new_file_data,
            metadata=new_metadata,
            version=old_mapping.version + 1,
            uploaded_by_id=uploaded_by_id,
            last_updated=func.now(),
            is_latest=True
        )

        return new_version

    async def get_versions(self, mapping_id: UUID) -> List[Mapping]:
        """Get all versions of a mapping"""
        mapping = await self.get_by_id(str(mapping_id))
        if not mapping:
            return []

        query = select(Mapping).where(
            Mapping.name == mapping.name,
            Mapping.type == mapping.type
        ).order_by(Mapping.version.desc())

        result = await self.db.execute(query)
        return result.scalars().all()
```

### Mapping Service (backend/app/services/mapping_service.py)

```python
from app.repositories.mapping_repository import MappingRepository
from app.schemas.mapping import MappingCreate, MappingUpdate
from app.services.file_parser import FileParser
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
from uuid import UUID
from typing import Optional, List, Dict, Any
from datetime import datetime

class MappingService:
    def __init__(self, db: AsyncSession):
        self.repo = MappingRepository(db)

    async def upload_mapping(
        self,
        file: UploadFile,
        name: str,
        mapping_type: str,
        workflow_id: Optional[UUID],
        uploaded_by_id: UUID
    ) -> Dict[str, Any]:
        """Upload and parse a mapping file"""

        # Parse file
        parsed_data, record_count = await FileParser.parse_file(file, mapping_type)

        # Prepare metadata
        metadata = {
            "original_filename": file.filename,
            "file_size": file.size,
            "record_count": record_count,
            "uploaded_at": datetime.utcnow().isoformat(),
            "content_type": file.content_type
        }

        # Check if mapping with same name exists
        existing_mappings = await self.repo.get_all(name=name, is_latest=True)
        version = 1
        if existing_mappings:
            version = existing_mappings[0].version + 1

        # Create mapping
        mapping = await self.repo.create(
            name=name,
            type=mapping_type,
            workflow_id=str(workflow_id) if workflow_id else None,
            file_data=parsed_data,
            metadata=metadata,
            version=version,
            uploaded_by_id=str(uploaded_by_id),
            last_updated=datetime.utcnow(),
            is_latest=True
        )

        return {
            "mapping_id": mapping.id,
            "name": mapping.name,
            "type": mapping.type,
            "record_count": record_count,
            "version": mapping.version,
            "message": f"Successfully uploaded {record_count} records"
        }

    async def get_mapping(self, mapping_id: UUID, include_data: bool = False):
        """Get mapping by ID, optionally including file data"""
        mapping = await self.repo.get_by_id(str(mapping_id))
        if include_data:
            return mapping
        # Return without file_data for list views
        if mapping:
            mapping.file_data = None
        return mapping

    async def get_all_mappings(self, skip: int = 0, limit: int = 100, **filters):
        """Get all mappings with pagination"""
        return await self.repo.get_all(skip=skip, limit=limit, **filters)

    async def update_mapping(self, mapping_id: UUID, mapping_data: MappingUpdate):
        """Update mapping metadata"""
        update_data = mapping_data.model_dump(exclude_unset=True)
        if 'workflow_id' in update_data:
            update_data['workflow_id'] = str(update_data['workflow_id']) if update_data['workflow_id'] else None
        return await self.repo.update(str(mapping_id), **update_data)

    async def delete_mapping(self, mapping_id: UUID):
        """Soft delete mapping (mark as not latest)"""
        return await self.repo.update(str(mapping_id), is_latest=False)

    async def get_versions(self, mapping_id: UUID):
        """Get all versions of a mapping"""
        return await self.repo.get_versions(mapping_id)

    async def get_mappings_by_workflow(self, workflow_id: UUID):
        """Get mappings for a workflow (including global)"""
        return await self.repo.get_by_workflow(workflow_id)
```

---

## TASK 5: Mapping Engine Core

### Mapping Engine (backend/app/services/mapping_engine.py)

```python
from typing import Dict, Any, List, Optional
from datetime import datetime
import re

class MappingEngine:
    """
    Core transformation engine that applies mappings to data
    Supports: variable mapping, org unit mapping, options mapping, date formatting
    """

    def __init__(self, mappings: Dict[str, Any]):
        """
        Initialize with mappings
        mappings = {
            'variable': {'mappings': [...], 'columns': [...]},
            'org_unit': {'mappings': {...}},
            'options': {'mappings': {...}},
            'date_format': {'format': {...}}
        }
        """
        self.variable_mappings = mappings.get('variable', {})
        self.org_unit_mappings = mappings.get('org_unit', {})
        self.options_mappings = mappings.get('options', {})
        self.date_format_config = mappings.get('date_format', {})

    @classmethod
    async def load_from_db(cls, db, workflow_id: Optional[str] = None):
        """Factory method to load mappings from database"""
        from app.services.mapping_service import MappingService

        mapping_service = MappingService(db)

        # Get all relevant mappings
        if workflow_id:
            mappings_list = await mapping_service.get_mappings_by_workflow(workflow_id)
        else:
            mappings_list = await mapping_service.get_all_mappings(is_latest=True)

        # Organize by type
        organized = {
            'variable': {'mappings': [], 'columns': []},
            'org_unit': {},
            'options': {},
            'date_format': {}
        }

        for mapping in mappings_list:
            if mapping.type.value == 'variable':
                organized['variable']['mappings'].extend(mapping.file_data.get('mappings', []))
                organized['variable']['columns'] = mapping.file_data.get('columns', [])
            elif mapping.type.value == 'org_unit':
                organized['org_unit'].update(mapping.file_data.get('mappings', {}))
            elif mapping.type.value == 'options':
                organized['options'].update(mapping.file_data.get('mappings', {}))
            elif mapping.type.value == 'date_format':
                organized['date_format'] = mapping.file_data.get('format', {})

        return cls(organized)

    def apply(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply all mappings to a single record"""
        transformed = data.copy()

        # Apply variable mappings (field mapping + transformations)
        transformed = self._apply_variable_mappings(transformed)

        # Apply org unit mapping
        transformed = self._apply_org_unit_mapping(transformed)

        # Apply options mapping
        transformed = self._apply_options_mapping(transformed)

        # Apply date formatting
        transformed = self._apply_date_formatting(transformed)

        return transformed

    def apply_batch(self, data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply mappings to a batch of records"""
        return [self.apply(record) for record in data_list]

    def _apply_variable_mappings(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply field-to-field mappings with optional transformations"""
        if not self.variable_mappings.get('mappings'):
            return data

        result = {}

        for mapping in self.variable_mappings['mappings']:
            source_field = mapping.get('source_field')
            target_field = mapping.get('target_field')
            transformation = mapping.get('transformation')

            # Get source value
            value = self._get_nested_value(data, source_field)

            # Apply transformation if specified
            if value is not None and transformation:
                value = self._apply_transformation(value, transformation)

            # Set target value
            self._set_nested_value(result, target_field, value)

        # Copy unmapped fields
        for key, value in data.items():
            if key not in [m['source_field'] for m in self.variable_mappings['mappings']]:
                result[key] = value

        return result

    def _apply_org_unit_mapping(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Replace org unit codes with target UIDs"""
        if not self.org_unit_mappings:
            return data

        # Look for common org unit fields
        org_unit_fields = ['org_unit', 'organisation_unit', 'orgUnit', 'ou']

        for field in org_unit_fields:
            if field in data and data[field] in self.org_unit_mappings:
                data[field] = self.org_unit_mappings[data[field]]

        return data

    def _apply_options_mapping(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Replace option values with target codes"""
        if not self.options_mappings:
            return data

        for field, value in data.items():
            if isinstance(value, str) and value in self.options_mappings:
                data[field] = self.options_mappings[value]
            elif isinstance(value, list):
                data[field] = [
                    self.options_mappings.get(v, v) if v in self.options_mappings else v
                    for v in value
                ]

        return data

    def _apply_date_formatting(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply date format transformations"""
        if not self.date_format_config:
            return data

        source_format = self.date_format_config.get('source_format')
        target_format = self.date_format_config.get('target_format')

        if not source_format or not target_format:
            return data

        # Find date fields (common names)
        date_fields = ['date', 'created_at', 'updated_at', 'timestamp', 'birth_date']

        for field in date_fields:
            if field in data and isinstance(data[field], str):
                try:
                    # Parse from source format
                    date_obj = datetime.strptime(data[field], source_format)
                    # Format to target format
                    data[field] = date_obj.strftime(target_format)
                except (ValueError, TypeError):
                    # If parsing fails, keep original
                    pass

        return data

    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """Get value from nested dict using dot notation"""
        keys = path.split('.')
        value = data

        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None

        return value

    def _set_nested_value(self, data: Dict[str, Any], path: str, value: Any) -> None:
        """Set value in nested dict using dot notation"""
        keys = path.split('.')

        for key in keys[:-1]:
            if key not in data:
                data[key] = {}
            data = data[key]

        data[keys[-1]] = value

    def _apply_transformation(self, value: Any, transformation: str) -> Any:
        """Apply simple transformations to values"""
        transformation = transformation.strip().lower()

        if transformation == 'uppercase':
            return str(value).upper()
        elif transformation == 'lowercase':
            return str(value).lower()
        elif transformation == 'trim':
            return str(value).strip()
        elif transformation.startswith('concat:'):
            # concat:suffix or concat:prefix:append
            parts = transformation.split(':')
            if len(parts) == 2:
                return f"{value}{parts[1]}"
            elif len(parts) == 3:
                return f"{parts[1]}{value}{parts[2]}"
        elif transformation == 'to_string':
            return str(value)
        elif transformation == 'to_int' and isinstance(value, (int, float, str)):
            try:
                return int(float(value))
            except:
                return value
        elif transformation == 'to_float' and isinstance(value, (int, float, str)):
            try:
                return float(value)
            except:
                return value
        elif transformation.startswith('replace:'):
            # replace:old:new
            parts = transformation.split(':')
            if len(parts) == 3:
                return str(value).replace(parts[1], parts[2])

        return value
```

---

## TASK 6: API Endpoints for Mappings

### Mappings Endpoints (backend/app/api/api_v1/endpoints/mappings.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.mapping import (
    MappingCreate, MappingUpdate, MappingResponse,
    MappingDetailResponse, FileUploadResponse, MappingVersionResponse
)
from app.services.mapping_service import MappingService
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[MappingResponse])
async def get_mappings(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    workflow_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all mappings with optional filters"""
    filters = {}
    if type:
        filters["type"] = type
    if workflow_id:
        filters["workflow_id"] = str(workflow_id)

    mapping_service = MappingService(db)
    mappings = await mapping_service.get_all_mappings(skip=skip, limit=limit, **filters)
    return mappings

@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_mapping(
    file: UploadFile = File(...),
    name: str = Form(...),
    type: str = Form(...),
    workflow_id: Optional[UUID] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a mapping file (CSV, Excel, JSON, XML)"""

    # Validate mapping type
    valid_types = ['variable', 'org_unit', 'options', 'date_format']
    if type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mapping type. Must be one of: {valid_types}"
        )

    # Validate file extension
    allowed_extensions = ['.csv', '.xlsx', '.xls', '.json', '.xml']
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported: {allowed_extensions}"
        )

    mapping_service = MappingService(db)

    try:
        result = await mapping_service.upload_mapping(
            file=file,
            name=name,
            mapping_type=type,
            workflow_id=workflow_id,
            uploaded_by_id=current_user.id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{mapping_id}", response_model=MappingDetailResponse)
async def get_mapping(
    mapping_id: UUID,
    include_data: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get mapping by ID with full data"""
    mapping_service = MappingService(db)
    mapping = await mapping_service.get_mapping(mapping_id, include_data=include_data)

    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    return mapping

@router.put("/{mapping_id}", response_model=MappingResponse)
async def update_mapping(
    mapping_id: UUID,
    mapping_data: MappingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update mapping metadata"""
    mapping_service = MappingService(db)
    mapping = await mapping_service.update_mapping(mapping_id, mapping_data)

    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    return mapping

@router.delete("/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping(
    mapping_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete mapping (soft delete)"""
    mapping_service = MappingService(db)
    deleted = await mapping_service.delete_mapping(mapping_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Mapping not found")

    return None

@router.get("/{mapping_id}/versions", response_model=List[MappingVersionResponse])
async def get_mapping_versions(
    mapping_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all versions of a mapping"""
    mapping_service = MappingService(db)
    versions = await mapping_service.get_versions(mapping_id)
    return versions

@router.get("/by-workflow/{workflow_id}", response_model=List[MappingResponse])
async def get_mappings_by_workflow(
    workflow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all mappings for a specific workflow (including global)"""
    mapping_service = MappingService(db)
    mappings = await mapping_service.get_mappings_by_workflow(workflow_id)
    return mappings
```

### Update API Router (backend/app/api/api_v1/api.py)

```python
from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, users, connections, mappings

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(connections.router, prefix="/connections", tags=["connections"])
api_router.include_router(mappings.router, prefix="/mappings", tags=["mappings"])
```

---

## TASK 7: Frontend - Mappings Page

### Mappings Types (frontend/src/types/mapping.ts)

```typescript
export type MappingType = "variable" | "org_unit" | "options" | "date_format";

export interface Mapping {
  id: string;
  name: string;
  type: MappingType;
  workflow_id: string | null;
  metadata: {
    original_filename: string;
    record_count: number;
    file_size: number;
    uploaded_at: string;
  };
  version: number;
  uploaded_by_id: string;
  last_updated: string;
  is_latest: boolean;
  created_at: string;
}

export interface MappingDetail extends Mapping {
  file_data: any;
}

export interface MappingVersion {
  id: string;
  version: number;
  last_updated: string;
  uploaded_by_id: string;
  metadata: any;
  is_latest: boolean;
}

export interface FileUploadResponse {
  mapping_id: string;
  name: string;
  type: MappingType;
  record_count: number;
  version: number;
  message: string;
}
```

### Mappings API Service (frontend/src/features/mappings/mappingsApi.ts)

```typescript
import api from "../../utils/api";
import {
  Mapping,
  MappingDetail,
  MappingVersion,
  FileUploadResponse,
} from "../../types/mapping";

export const mappingsApi = {
  // Get all mappings
  getMappings: async (params?: {
    type?: string;
    workflow_id?: string;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get<Mapping[]>("/mappings", { params });
    return response.data;
  },

  // Get single mapping
  getMapping: async (id: string, includeData: boolean = true) => {
    const response = await api.get<MappingDetail>(`/mappings/${id}`, {
      params: { include_data: includeData },
    });
    return response.data;
  },

  // Upload mapping file
  uploadMapping: async (
    file: File,
    name: string,
    type: MappingType,
    workflow_id?: string,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("type", type);
    if (workflow_id) {
      formData.append("workflow_id", workflow_id);
    }

    const response = await api.post<FileUploadResponse>(
      "/mappings/upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  // Update mapping metadata
  updateMapping: async (
    id: string,
    data: { name?: string; workflow_id?: string | null },
  ) => {
    const response = await api.put<Mapping>(`/mappings/${id}`, data);
    return response.data;
  },

  // Delete mapping
  deleteMapping: async (id: string) => {
    await api.delete(`/mappings/${id}`);
  },

  // Get mapping versions
  getVersions: async (id: string) => {
    const response = await api.get<MappingVersion[]>(
      `/mappings/${id}/versions`,
    );
    return response.data;
  },

  // Get mappings by workflow
  getMappingsByWorkflow: async (workflowId: string) => {
    const response = await api.get<Mapping[]>(
      `/mappings/by-workflow/${workflowId}`,
    );
    return response.data;
  },
};
```

### Mappings Slice (frontend/src/features/mappings/mappingsSlice.ts)

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { mappingsApi } from "./mappingsApi";
import { Mapping, MappingDetail } from "../../types/mapping";

interface MappingsState {
  mappings: Mapping[];
  currentMapping: MappingDetail | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
}

const initialState: MappingsState = {
  mappings: [],
  currentMapping: null,
  isLoading: false,
  error: null,
  totalCount: 0,
};

// Async thunks
export const fetchMappings = createAsyncThunk(
  "mappings/fetchMappings",
  async (params?: {
    type?: string;
    workflow_id?: string;
    skip?: number;
    limit?: number;
  }) => {
    return await mappingsApi.getMappings(params);
  },
);

export const fetchMappingById = createAsyncThunk(
  "mappings/fetchMappingById",
  async (id: string) => {
    return await mappingsApi.getMapping(id);
  },
);

export const uploadMappingFile = createAsyncThunk(
  "mappings/uploadMappingFile",
  async ({
    file,
    name,
    type,
    workflow_id,
  }: {
    file: File;
    name: string;
    type: string;
    workflow_id?: string;
  }) => {
    return await mappingsApi.uploadMapping(
      file,
      name,
      type as any,
      workflow_id,
    );
  },
);

export const deleteMapping = createAsyncThunk(
  "mappings/deleteMapping",
  async (id: string) => {
    await mappingsApi.deleteMapping(id);
    return id;
  },
);

const mappingsSlice = createSlice({
  name: "mappings",
  initialState,
  reducers: {
    clearCurrentMapping: (state) => {
      state.currentMapping = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch mappings
      .addCase(fetchMappings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMappings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mappings = action.payload;
        state.totalCount = action.payload.length;
      })
      .addCase(fetchMappings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to fetch mappings";
      })
      // Fetch mapping by id
      .addCase(fetchMappingById.fulfilled, (state, action) => {
        state.currentMapping = action.payload;
      })
      // Upload mapping
      .addCase(uploadMappingFile.fulfilled, (state, action) => {
        // Add to list
        const newMapping: Mapping = {
          id: action.payload.mapping_id,
          name: action.payload.name,
          type: action.payload.type,
          workflow_id: null,
          metadata: {
            original_filename: "",
            record_count: action.payload.record_count,
            file_size: 0,
            uploaded_at: new Date().toISOString(),
          },
          version: action.payload.version,
          uploaded_by_id: "",
          last_updated: new Date().toISOString(),
          is_latest: true,
          created_at: new Date().toISOString(),
        };
        state.mappings.unshift(newMapping);
      })
      // Delete mapping
      .addCase(deleteMapping.fulfilled, (state, action) => {
        state.mappings = state.mappings.filter((m) => m.id !== action.payload);
      });
  },
});

export const { clearCurrentMapping, clearError } = mappingsSlice.actions;
export default mappingsSlice.reducer;
```

### Mappings Page (frontend/src/features/mappings/MappingsPage.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Upload as UploadIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMappings, deleteMapping, uploadMappingFile } from './mappingsSlice';
import UploadMappingModal from './UploadMappingModal';
import MappingDetailDrawer from './MappingDetailDrawer';

const MappingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { mappings, isLoading, error } = useAppSelector(state => state.mappings);

  const [searchTerm, setSearchTerm] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);

  // Summary stats
  const summaryStats = {
    total: mappings.length,
    variable: mappings.filter(m => m.type === 'variable').length,
    org_unit: mappings.filter(m => m.type === 'org_unit').length,
    options: mappings.filter(m => m.type === 'options').length,
    date_format: mappings.filter(m => m.type === 'date_format').length
  };

  useEffect(() => {
    dispatch(fetchMappings());
  }, [dispatch]);

  const filteredMappings = mappings.filter(mapping =>
    mapping.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, mappingId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedMappingId(mappingId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMappingId(null);
  };

  const handleViewDetails = () => {
    const mapping = mappings.find(m => m.id === selectedMappingId);
    setSelectedMapping(mapping);
    setDetailDrawerOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedMappingId) {
      await dispatch(deleteMapping(selectedMappingId));
      setSnackbar({ open: true, message: 'Mapping deleted successfully', severity: 'success' });
      handleMenuClose();
    }
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    dispatch(fetchMappings());
    setSnackbar({ open: true, message: 'Mapping uploaded successfully', severity: 'success' });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'variable': return 'primary';
      case 'org_unit': return 'success';
      case 'options': return 'warning';
      case 'date_format': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Mappings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage variable, org unit, option, and date format mappings for data transformation
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadModalOpen(true)}
        >
          Upload Mapping
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Mappings</Typography>
              <Typography variant="h3">{summaryStats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Variable</Typography>
              <Typography variant="h3">{summaryStats.variable}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Org Unit</Typography>
              <Typography variant="h3">{summaryStats.org_unit}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Options / Date Format</Typography>
              <Typography variant="h3">{summaryStats.options + summaryStats.date_format}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search mappings by name or type..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* Mappings Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Workflow</TableCell>
              <TableCell>Records</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell>Uploaded By</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredMappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary">No mappings found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredMappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {mapping.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={mapping.type.replace('_', ' ').toUpperCase()}
                      color={getTypeColor(mapping.type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {mapping.workflow_id ? (
                      <Typography variant="body2" color="primary">
                        {mapping.workflow_id.substring(0, 8)}...
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Global</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {mapping.metadata?.record_count?.toLocaleString() || '-'}
                  </TableCell>
                  <TableCell>v{mapping.version}</TableCell>
                  <TableCell>{formatDate(mapping.last_updated)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {mapping.uploaded_by_id?.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedMapping(mapping);
                          setDetailDrawerOpen(true);
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, mapping.id)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Upload Modal */}
      <UploadMappingModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Detail Drawer */}
      <MappingDetailDrawer
        open={detailDrawerOpen}
        mapping={selectedMapping}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedMapping(null);
        }}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MappingsPage;
```

### Upload Mapping Modal (frontend/src/features/mappings/UploadMappingModal.tsx)

```typescript
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useAppDispatch } from '../../store';
import { uploadMappingFile } from './mappingsSlice';

interface UploadMappingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UploadMappingModal: React.FC<UploadMappingModalProps> = ({ open, onClose, onSuccess }) => {
  const dispatch = useAppDispatch();

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);

      // Auto-populate name from filename if empty
      if (!name) {
        const baseName = acceptedFiles[0].name.replace(/\.[^/.]+$/, '');
        setName(baseName);
      }
    }
  }, [name]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml']
    },
    maxFiles: 1
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a mapping name');
      return;
    }
    if (!type) {
      setError('Please select a mapping type');
      return;
    }
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await dispatch(uploadMappingFile({ file, name, type })).unwrap();
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload mapping');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setType('');
    setFile(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Mapping</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Mapping Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., DHIS2 Tracker Mapping"
            required
          />

          <FormControl fullWidth required>
            <InputLabel>Mapping Type</InputLabel>
            <Select value={type} onChange={(e) => setType(e.target.value)} label="Mapping Type">
              <MenuItem value="variable">Variable Mapping</MenuItem>
              <MenuItem value="org_unit">Org Unit Mapping</MenuItem>
              <MenuItem value="options">Options Mapping</MenuItem>
              <MenuItem value="date_format">Date Format Mapping</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              File Format Requirements:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {type === 'variable' && (
                <>
                  <Chip label="CSV: source_field, target_field, transformation" size="small" />
                  <Chip label="Excel: same columns" size="small" />
                  <Chip label="JSON: array of mappings" size="small" />
                </>
              )}
              {type === 'org_unit' && (
                <>
                  <Chip label="CSV: source_code, target_uid" size="small" />
                  <Chip label="JSON: key-value object" size="small" />
                </>
              )}
              {type === 'options' && (
                <>
                  <Chip label="CSV: source_value, target_option_code" size="small" />
                  <Chip label="JSON: key-value object" size="small" />
                </>
              )}
              {type === 'date_format' && (
                <>
                  <Chip label="JSON: {source_format, target_format}" size="small" />
                </>
              )}
            </Box>
          </Box>

          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.400',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s'
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" gutterBottom>
              {isDragActive
                ? 'Drop your file here'
                : 'Drag & drop a file here, or click to select'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: CSV, Excel, JSON, XML
            </Typography>
            {file && (
              <Box sx={{ mt: 2 }}>
                <Chip label={file.name} onDelete={() => setFile(null)} />
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={uploading || !name || !type || !file}
        >
          {uploading ? <CircularProgress size={24} /> : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadMappingModal;
```

### Update App Routes (frontend/src/App.tsx)

Add the Mappings route:

```typescript
// Add to imports
import MappingsPage from './features/mappings/MappingsPage';

// Add to Routes
<Route
  path="/mappings"
  element={
    <ProtectedRoute>
      <MainLayout>
        <MappingsPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

### Add Mappings Reducer to Store (frontend/src/store/index.ts)

```typescript
import mappingsReducer from "../features/mappings/mappingsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    mappings: mappingsReducer,
    // Add other reducers here
  },
});
```

---

## TASK 8: Testing for Phase 2

### Mapping Engine Tests (backend/tests/unit/test_mapping_engine.py)

```python
import pytest
from app.services.mapping_engine import MappingEngine

@pytest.mark.asyncio
async def test_variable_mapping():
    mappings = {
        'variable': {
            'mappings': [
                {'source_field': 'first_name', 'target_field': 'given_name'},
                {'source_field': 'last_name', 'target_field': 'family_name', 'transformation': 'uppercase'},
                {'source_field': 'age', 'target_field': 'patient_age', 'transformation': 'to_string'}
            ]
        }
    }

    engine = MappingEngine(mappings)
    input_data = {'first_name': 'John', 'last_name': 'Doe', 'age': 30, 'status': 'active'}
    result = engine.apply(input_data)

    assert result['given_name'] == 'John'
    assert result['family_name'] == 'DOE'
    assert result['patient_age'] == '30'
    assert result['status'] == 'active'

@pytest.mark.asyncio
async def test_org_unit_mapping():
    mappings = {
        'org_unit': {
            'mappings': {'OU123': 'abc-def-123', 'OU456': 'ghi-jkl-456'}
        }
    }

    engine = MappingEngine(mappings)
    input_data = {'org_unit': 'OU123', 'name': 'Test'}
    result = engine.apply(input_data)

    assert result['org_unit'] == 'abc-def-123'
    assert result['name'] == 'Test'

@pytest.mark.asyncio
async def test_options_mapping():
    mappings = {
        'options': {
            'mappings': {'M': 'Male', 'F': 'Female', 'O': 'Other'}
        }
    }

    engine = MappingEngine(mappings)
    input_data = {'gender': 'M', 'preferences': ['M', 'F']}
    result = engine.apply(input_data)

    assert result['gender'] == 'Male'
    assert result['preferences'] == ['Male', 'Female']

@pytest.mark.asyncio
async def test_date_formatting():
    mappings = {
        'date_format': {
            'format': {'source_format': '%Y-%m-%d', 'target_format': '%d/%m/%Y'}
        }
    }

    engine = MappingEngine(mappings)
    input_data = {'date': '2024-01-15', 'name': 'Test'}
    result = engine.apply(input_data)

    assert result['date'] == '15/01/2024'
    assert result['name'] == 'Test'
```

### Mapping API Tests (backend/tests/integration/test_mappings.py)

```python
import pytest
from httpx import AsyncClient
from io import BytesIO

@pytest.mark.asyncio
async def test_upload_csv_mapping(client: AsyncClient, test_user, auth_headers):
    csv_content = b"source_field,target_field,transformation\nfirst_name,given_name,\nlast_name,family_name,uppercase"
    files = {
        'file': ('test_mapping.csv', BytesIO(csv_content), 'text/csv'),
        'name': (None, 'Test Variable Mapping'),
        'type': (None, 'variable')
    }

    response = await client.post(
        "/api/v1/mappings/upload",
        files=files,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data['name'] == 'Test Variable Mapping'
    assert data['type'] == 'variable'
    assert data['record_count'] == 2

@pytest.mark.asyncio
async def test_get_mappings(client: AsyncClient, auth_headers):
    response = await client.get("/api/v1/mappings", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_mapping_by_id(client: AsyncClient, test_mapping, auth_headers):
    response = await client.get(f"/api/v1/mappings/{test_mapping.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data['id'] == str(test_mapping.id)
    assert 'file_data' in data

@pytest.mark.asyncio
async def test_delete_mapping(client: AsyncClient, test_mapping, auth_headers):
    response = await client.delete(f"/api/v1/mappings/{test_mapping.id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify it's soft deleted
    get_response = await client.get(f"/api/v1/mappings/{test_mapping.id}", headers=auth_headers)
    # Should still exist but is_latest=False
    assert get_response.status_code == 200
```

---

## DELIVERABLES CHECKLIST

Before considering Phase 2 complete, ensure all items below are implemented and working:

### Backend

- [ ] Mapping database model with versioning
- [ ] Alembic migration created and applied
- [ ] Pydantic schemas for mappings
- [ ] File parser service (CSV, Excel, JSON, XML)
- [ ] Mapping repository with CRUD and versioning
- [ ] Mapping service for business logic
- [ ] Mapping engine core transformation logic
- [ ] All mapping endpoints implemented:
  - [ ] GET /mappings - list mappings
  - [ ] POST /mappings/upload - upload file
  - [ ] GET /mappings/{id} - get mapping
  - [ ] PUT /mappings/{id} - update
  - [ ] DELETE /mappings/{id} - soft delete
  - [ ] GET /mappings/{id}/versions - get version history
  - [ ] GET /mappings/by-workflow/{workflow_id} - filter by workflow
- [ ] Unit tests for mapping engine
- [ ] Integration tests for mapping endpoints
- [ ] API documentation in OpenAPI

### Frontend

- [ ] Mapping types/interfaces defined
- [ ] Mappings API service with all endpoints
- [ ] Redux slice for mappings state management
- [ ] Mappings page with:
  - [ ] Summary stats cards
  - [ ] Search/filter functionality
  - [ ] Table with all mapping data
  - [ ] Action menu (view, delete)
- [ ] Upload mapping modal with:
  - [ ] Form fields (name, type)
  - [ ] Drag-and-drop file upload
  - [ ] Format validation
  - [ ] Success/error handling
- [ ] Mapping detail drawer with:
  - [ ] Full mapping data display
  - [ ] File content preview
  - [ ] Version history
- [ ] Route integration in App.tsx
- [ ] Proper loading and error states

### Integration

- [ ] Frontend successfully communicates with backend APIs
- [ ] File upload works for all supported formats
- [ ] Large files handled properly (no timeouts)
- [ ] Error messages clear and user-friendly

---

## NOTES FOR GEMINI

1. **Follow the coding standards** defined in section 11 of the GEMINI.md file
2. **Use the ✅/❌ examples** as guidance for quality code
3. **Generate tests** for all new functionality (aim for >80% coverage for mapping engine)
4. **Handle edge cases**:
   - Empty files
   - Malformed CSV/JSON/XML
   - Very large files (streaming approach)
   - Duplicate mapping names
5. **Performance considerations**:
   - Use pandas for efficient CSV/Excel parsing
   - Batch processing for large datasets
   - Async database operations
6. **Commit messages** should follow conventional commits format
7. **Update the GEMINI.md living document** if you discover patterns that should be documented

---

**Begin Phase 2 implementation now. Provide code files in your response, organized by the directory structure above. After completing each major component, indicate progress and ask for feedback if needed.**
