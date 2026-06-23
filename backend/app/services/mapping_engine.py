import io
import json
from typing import Any, Dict, List, Optional

import pandas as pd


class MappingEngine:
    def parse_file(self, content: bytes, filename: str) -> Dict[str, Any]:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        if ext == "csv":
            return self._parse_csv(content)
        elif ext in ("xlsx", "xls"):
            return self._parse_excel(content)
        elif ext == "json":
            return self._parse_json(content)
        elif ext == "xml":
            return self._parse_xml(content)
        else:
            raise ValueError(f"Unsupported file format: .{ext}")

    def _parse_csv(self, content: bytes) -> Dict[str, Any]:
        df = pd.read_csv(io.BytesIO(content), dtype=str)
        return {
            "columns": list(df.columns),
            "rows": df.fillna("").to_dict(orient="records"),
            "row_count": len(df),
        }

    def _parse_excel(self, content: bytes) -> Dict[str, Any]:
        df = pd.read_excel(io.BytesIO(content))
        return {
            "columns": list(df.columns),
            "rows": df.fillna("").to_dict(orient="records"),
            "row_count": len(df),
        }

    def _parse_json(self, content: bytes) -> Dict[str, Any]:
        data = json.loads(content.decode("utf-8"))
        if isinstance(data, list):
            return {
                "columns": list(data[0].keys()) if data else [],
                "rows": data,
                "row_count": len(data),
            }
        return {
            "columns": list(data.keys()),
            "rows": [data],
            "row_count": 1,
        }

    def _parse_xml(self, content: bytes) -> Dict[str, Any]:
        df = pd.read_xml(io.BytesIO(content))
        return {
            "columns": list(df.columns),
            "rows": df.fillna("").to_dict(orient="records"),
            "row_count": len(df),
        }

    def apply_variable(
        self, data: Dict[str, Any], mappings: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        result = dict(data)
        for mapping in mappings:
            source_key = mapping.get("from", mapping.get("source"))
            target_key = mapping.get("to", mapping.get("target"))
            if source_key in result and target_key:
                result[target_key] = result.pop(source_key)
        return result

    def apply_org_unit(
        self, data: Dict[str, Any], mappings: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        result = dict(data)
        for mapping in mappings:
            source_id = str(mapping.get("source_id", mapping.get("from", "")))
            target_id = mapping.get("target_id", mapping.get("to", ""))
            for key, value in result.items():
                if str(value) == source_id:
                    result[key] = target_id
        return result

    def apply_options(
        self, data: Dict[str, Any], mappings: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        result = dict(data)
        for mapping in mappings:
            source_value = mapping.get("from", mapping.get("source"))
            target_value = mapping.get("to", mapping.get("target"))
            for key, value in result.items():
                if str(value) == str(source_value):
                    result[key] = target_value
        return result

    def apply_date_format(
        self, data: Dict[str, Any], mappings: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        import re
        from datetime import datetime

        result = dict(data)
        for mapping in mappings:
            field = mapping.get("field", mapping.get("from", ""))
            source_format = mapping.get("source_format", "%Y-%m-%d")
            target_format = mapping.get("target_format", "%Y-%m-%d")

            if field in result and result[field]:
                try:
                    parsed = datetime.strptime(str(result[field]), source_format)
                    result[field] = parsed.strftime(target_format)
                except ValueError:
                    pass
        return result

    def apply(
        self,
        data: Dict[str, Any],
        mapping_type: str,
        mapping_definitions: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        if mapping_type == "variable":
            return self.apply_variable(data, mapping_definitions)
        elif mapping_type == "org_unit":
            return self.apply_org_unit(data, mapping_definitions)
        elif mapping_type == "options":
            return self.apply_options(data, mapping_definitions)
        elif mapping_type == "date_format":
            return self.apply_date_format(data, mapping_definitions)
        return data
