"""Validation and QC nodes."""
from __future__ import annotations
import re
import uuid
from typing import Any
import duckdb
import polars as pl
from app.engine.node_registry import register


def _uid() -> str:
    return uuid.uuid4().hex[:6]


def _require_input(inputs: dict[str, str], port: str = "input") -> str:
    v = inputs.get(port)
    if not v:
        raise ValueError(f"Node requires a '{port}' connection")
    return v


@register("find_duplicates")
def find_duplicates(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    """Flag duplicate rows. Output has a '_is_duplicate' boolean column."""
    src = _require_input(inputs)
    subset: list[str] | None = config.get("subset")
    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]
    partition_cols = ", ".join(f'"{c}"' for c in (subset or all_cols))

    view = f"dups_{_uid()}"
    con.execute(f"""
        CREATE OR REPLACE VIEW {view} AS
        SELECT *,
            ROW_NUMBER() OVER (PARTITION BY {partition_cols}) > 1 AS _is_duplicate
        FROM "{src}"
    """)
    return view


@register("find_missing")
def find_missing(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    """Add a '_missing_columns' column listing which required columns are NULL."""
    src = _require_input(inputs)
    columns: list[str] = config.get("columns", [])

    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]
    check_cols = columns if columns else all_cols

    null_checks = " || ',' || ".join(
        f'CASE WHEN "{c}" IS NULL THEN \'{c}\' ELSE \'\' END'
        for c in check_cols
    )
    view = f"miss_{_uid()}"
    con.execute(f"""
        CREATE OR REPLACE VIEW {view} AS
        SELECT *,
            TRIM(BOTH ',' FROM REGEXP_REPLACE({null_checks}, ',+', ',', 'g')) AS _missing_columns,
            ({' OR '.join(f'"{c}" IS NULL' for c in check_cols)}) AS _has_missing
        FROM "{src}"
    """)
    return view


_REGEX_PRESETS: dict[str, str] = {
    "phone":   r"^\+?[0-9]{7,15}$",
    "email":   r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    "zip":     r"^\d{5}(-\d{4})?$",
    "integer": r"^-?\d+$",
    "number":  r"^-?\d+(\.\d+)?$",
}


@register("validate_regex")
def validate_regex(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    """Add a '_valid' boolean column based on regex match."""
    src = _require_input(inputs)
    column: str = config.get("column", "")
    pattern: str = config.get("pattern", "")
    preset: str = config.get("preset", "")

    if not column:
        raise ValueError("validate_regex: 'column' required")

    regex = _REGEX_PRESETS.get(preset, pattern)
    if not regex:
        raise ValueError("validate_regex: 'pattern' or 'preset' required")

    escaped = regex.replace("'", "''")
    view = f"regex_{_uid()}"
    con.execute(f"""
        CREATE OR REPLACE VIEW {view} AS
        SELECT *,
            REGEXP_MATCHES(CAST("{column}" AS VARCHAR), '{escaped}') AS _valid
        FROM "{src}"
    """)
    return view
