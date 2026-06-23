import io
import json

import pandas as pd
import pytest

from app.services.mapping_engine import MappingEngine


@pytest.fixture
def engine():
    return MappingEngine()


class TestParseCsv:
    def test_parses_csv_content(self, engine: MappingEngine):
        content = b"name,age,city\nAlice,30,NYC\nBob,25,LA\n"
        result = engine._parse_csv(content)
        assert result["columns"] == ["name", "age", "city"]
        assert result["row_count"] == 2
        assert result["rows"] == [
            {"name": "Alice", "age": "30", "city": "NYC"},
            {"name": "Bob", "age": "25", "city": "LA"},
        ]

    def test_empty_csv(self, engine: MappingEngine):
        content = b"col1,col2\n"
        result = engine._parse_csv(content)
        assert result["columns"] == ["col1", "col2"]
        assert result["row_count"] == 0
        assert result["rows"] == []


class TestParseJson:
    def test_parses_json_array(self, engine: MappingEngine):
        data = [{"id": 1, "val": "a"}, {"id": 2, "val": "b"}]
        content = json.dumps(data).encode()
        result = engine._parse_json(content)
        assert result["columns"] == ["id", "val"]
        assert result["row_count"] == 2
        assert result["rows"] == data

    def test_parses_json_object(self, engine: MappingEngine):
        data = {"key1": "value1", "key2": "value2"}
        content = json.dumps(data).encode()
        result = engine._parse_json(content)
        assert result["row_count"] == 1
        assert result["rows"] == [data]

    def test_empty_json_array(self, engine: MappingEngine):
        content = b"[]"
        result = engine._parse_json(content)
        assert result["columns"] == []
        assert result["row_count"] == 0


class TestParseExcel:
    def test_parses_excel_content(self, engine: MappingEngine):
        df = pd.DataFrame({"col1": ["a", "b"], "col2": [1, 2]})
        buf = io.BytesIO()
        df.to_excel(buf, index=False)
        buf.seek(0)
        content = buf.read()
        result = engine._parse_excel(content)
        assert result["columns"] == ["col1", "col2"]
        assert result["row_count"] == 2

    def test_empty_excel(self, engine: MappingEngine):
        df = pd.DataFrame({"h": pd.Series(dtype="object")})
        buf = io.BytesIO()
        df.to_excel(buf, index=False)
        buf.seek(0)
        content = buf.read()
        result = engine._parse_excel(content)
        assert result["columns"] == ["h"]
        assert result["row_count"] == 0


class TestParseXml:
    def test_parses_xml_content(self, engine: MappingEngine):
        xml_content = b"""<?xml version="1.0"?>
<root>
  <row><name>Alice</name><role>admin</role></row>
  <row><name>Bob</name><role>viewer</role></row>
</root>"""
        result = engine._parse_xml(xml_content)
        assert result["columns"] == ["name", "role"]
        assert result["row_count"] == 2

    def test_empty_xml(self, engine: MappingEngine):
        xml_content = b"""<?xml version="1.0"?><root></root>"""
        try:
            result = engine._parse_xml(xml_content)
            assert result["row_count"] == 0
        except ValueError:
            pass


class TestParseFile:
    def test_dispatch_by_extension_csv(self, engine: MappingEngine):
        result = engine.parse_file(b"a,b\n1,2\n", "data.csv")
        assert result["columns"] == ["a", "b"]

    def test_dispatch_by_extension_json(self, engine: MappingEngine):
        result = engine.parse_file(b'[{"x":1}]', "data.json")
        assert result["columns"] == ["x"]

    def test_unsupported_format(self, engine: MappingEngine):
        with pytest.raises(ValueError, match="Unsupported file format"):
            engine.parse_file(b"data", "file.txt")


class TestApplyVariable:
    def test_renames_field(self, engine: MappingEngine):
        result = engine.apply_variable(
            {"old_name": "value1", "keep": "value2"},
            [{"from": "old_name", "to": "new_name"}],
        )
        assert result == {"new_name": "value1", "keep": "value2"}

    def test_no_matching_key(self, engine: MappingEngine):
        result = engine.apply_variable(
            {"a": 1},
            [{"from": "nonexistent", "to": "b"}],
        )
        assert result == {"a": 1}


class TestApplyOrgUnit:
    def test_replaces_id(self, engine: MappingEngine):
        result = engine.apply_org_unit(
            {"org": "OU_123", "name": "Central"},
            [{"source_id": "OU_123", "target_id": "OU_789"}],
        )
        assert result == {"org": "OU_789", "name": "Central"}


class TestApplyOptions:
    def test_translates_value(self, engine: MappingEngine):
        result = engine.apply_options(
            {"status": "active", "count": 5},
            [{"from": "active", "to": "enabled"}],
        )
        assert result == {"status": "enabled", "count": 5}


class TestApplyDateFormat:
    def test_converts_format(self, engine: MappingEngine):
        result = engine.apply_date_format(
            {"date": "2024-01-15"},
            [{"field": "date", "source_format": "%Y-%m-%d", "target_format": "%d/%m/%Y"}],
        )
        assert result == {"date": "15/01/2024"}

    def test_invalid_date_returns_original(self, engine: MappingEngine):
        result = engine.apply_date_format(
            {"date": "not-a-date"},
            [{"field": "date", "source_format": "%Y-%m-%d", "target_format": "%d/%m/%Y"}],
        )
        assert result == {"date": "not-a-date"}


class TestApply:
    def test_dispatches_by_type_variable(self, engine: MappingEngine):
        result = engine.apply({"a": 1}, "variable", [{"from": "a", "to": "b"}])
        assert "b" in result

    def test_dispatches_by_type_org_unit(self, engine: MappingEngine):
        result = engine.apply({"org": "X"}, "org_unit", [{"source_id": "X", "target_id": "Y"}])
        assert result["org"] == "Y"

    def test_dispatches_by_type_options(self, engine: MappingEngine):
        result = engine.apply({"s": "yes"}, "options", [{"from": "yes", "to": "true"}])
        assert result["s"] == "true"

    def test_dispatches_by_type_date_format(self, engine: MappingEngine):
        result = engine.apply({"d": "2024-01-01"}, "date_format", [{"field": "d", "source_format": "%Y-%m-%d", "target_format": "%m/%d/%Y"}])
        assert result["d"] == "01/01/2024"

    def test_unknown_type_returns_data_unchanged(self, engine: MappingEngine):
        data = {"a": 1}
        result = engine.apply(data, "unknown_type", [])
        assert result == data
