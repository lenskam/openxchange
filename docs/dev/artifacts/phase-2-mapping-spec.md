# Phase 2: Mapping Engine - Technical Specification

## Overview
The Mapping Engine is a core feature that allows users to define transformations between source and destination systems. It supports different mapping types: Variable, Organisation Unit, Options, and Date Format.

## Database Models

### Mapping Model
```python
class MappingType(enum.Enum):
    VARIABLE = "variable"
    ORG_UNIT = "org_unit"
    OPTIONS = "options"
    DATE_FORMAT = "date_format"

class Mapping(BaseModel):
    __tablename__ = "mappings"

    name: str
    type: MappingType
    workflow_id: UUID (FK to Workflow, nullable - global mappings)
    file_data: JSONB  # parsed mapping content
    metadata: JSONB  # {original_filename: str, record_count: int, ...}
    version: int
    uploaded_by_id: UUID (FK to User)
    last_updated: datetime
    is_latest: bool = True
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /mappings | List mappings (filter by type, workflow) |
| POST | /mappings/upload | Upload mapping file |
| GET | /mappings/{id} | Get mapping details |
| PUT | /mappings/{id} | Update mapping (new version) |
| DELETE | /mappings/{id} | Delete mapping |
| GET | /mappings/{id}/versions | List versions |

## Supported File Formats
- CSV (using pandas)
- Excel (.xlsx, .xls)
- JSON
- XML

## MappingEngine Service
```python
class MappingEngine:
    def apply(self, data: dict) -> dict:
        # Apply variable mappings
        # Apply org unit mappings
        # Apply options mappings
        # Apply date format transformations
        return transformed_data
```

## Frontend Features
- Mappings page with summary cards (Variables, Org Units, Options, Date Formats)
- Upload modal with drag & drop
- Table listing all mappings with filters
- Download, Edit, Delete, Version History actions