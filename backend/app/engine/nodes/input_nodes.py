"""Input and output nodes."""
from __future__ import annotations
from pathlib import Path
from typing import Any
import duckdb
import polars as pl
from app.engine.node_registry import register
from app.storage.file_store import read_sheet


def _view(node_id_safe: str) -> str:
    return f"v_{node_id_safe}"


@register("excel_input")
def excel_input(
    con: duckdb.DuckDBPyConnection,
    inputs: dict[str, str],
    config: dict[str, Any],
) -> str:
    """Load a sheet from an uploaded Excel file."""
    file_id: str = config.get("file_id", "")
    sheet: str = config.get("sheet", "Sheet1")
    if not file_id:
        raise ValueError("excel_input requires 'file_id' in config")
    df = read_sheet(file_id, sheet)
    view = f"excel_in_{file_id[:8]}_{sheet.replace(' ', '_')}"
    con.register(view, df)
    return view


@register("csv_input")
def csv_input(
    con: duckdb.DuckDBPyConnection,
    inputs: dict[str, str],
    config: dict[str, Any],
) -> str:
    """Load a CSV file that has been uploaded."""
    file_id: str = config.get("file_id", "")
    if not file_id:
        raise ValueError("csv_input requires 'file_id' in config")
    df = read_sheet(file_id, "Sheet1")
    view = f"csv_in_{file_id[:8]}"
    con.register(view, df)
    return view


@register("passthrough")
def passthrough(
    con: duckdb.DuckDBPyConnection,
    inputs: dict[str, str],
    config: dict[str, Any],
) -> str:
    """Identity node — passes input through unchanged. Used for testing."""
    input_view = inputs.get("input")
    if not input_view:
        raise ValueError("passthrough requires an 'input' connection")
    view = f"passthrough_{input_view}"
    con.execute(f"CREATE OR REPLACE VIEW {view} AS SELECT * FROM {input_view}")
    return view
