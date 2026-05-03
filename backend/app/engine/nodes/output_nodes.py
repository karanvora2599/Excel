"""Output nodes — write results to files."""
from __future__ import annotations
import uuid
from pathlib import Path
from typing import Any
import duckdb
import polars as pl
from app.engine.node_registry import register
from app.config import settings


def _out_path(filename: str) -> Path:
    out_dir = Path(settings.file_storage_path) / "exports"
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir / filename


@register("excel_output")
def excel_output(
    con: duckdb.DuckDBPyConnection,
    inputs: dict[str, str],
    config: dict[str, Any],
) -> str:
    input_view = inputs.get("input")
    if not input_view:
        raise ValueError("excel_output requires an 'input' connection")

    df = con.execute(f"SELECT * FROM {input_view}").pl()
    filename: str = config.get("filename", f"export_{uuid.uuid4().hex[:8]}.xlsx")
    if not filename.endswith(".xlsx"):
        filename += ".xlsx"

    sheet_name: str = config.get("sheet_name", "Sheet1")
    path = _out_path(filename)
    df.write_excel(path, worksheet=sheet_name)

    # Pass data through so preview works
    view = f"excel_out_{uuid.uuid4().hex[:6]}"
    con.register(view, df)
    return view


@register("csv_output")
def csv_output(
    con: duckdb.DuckDBPyConnection,
    inputs: dict[str, str],
    config: dict[str, Any],
) -> str:
    input_view = inputs.get("input")
    if not input_view:
        raise ValueError("csv_output requires an 'input' connection")

    df = con.execute(f"SELECT * FROM {input_view}").pl()
    filename: str = config.get("filename", f"export_{uuid.uuid4().hex[:8]}.csv")
    if not filename.endswith(".csv"):
        filename += ".csv"

    path = _out_path(filename)
    df.write_csv(path)

    view = f"csv_out_{uuid.uuid4().hex[:6]}"
    con.register(view, df)
    return view
