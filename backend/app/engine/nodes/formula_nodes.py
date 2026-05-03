"""Formula and transformation nodes."""
from __future__ import annotations
import re
import uuid
from typing import Any
import duckdb
from app.engine.node_registry import register


def _uid() -> str:
    return uuid.uuid4().hex[:6]


def _require_input(inputs: dict[str, str], port: str = "input") -> str:
    v = inputs.get(port)
    if not v:
        raise ValueError(f"Node requires a '{port}' connection")
    return v


def _safe_expression(expr: str) -> str:
    """Wrap column references like [Column Name] → "Column Name" for DuckDB."""
    return re.sub(r'\[([^\]]+)\]', r'"\1"', expr)


@register("add_column")
def add_column(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    column_name: str = config.get("column_name", "")
    expression: str = config.get("expression", "")
    if not column_name:
        raise ValueError("add_column: 'column_name' required")
    if not expression:
        raise ValueError("add_column: 'expression' required")

    safe_expr = _safe_expression(expression)
    escaped_name = column_name.replace('"', '""')
    view = f"addcol_{_uid()}"
    con.execute(
        f'CREATE OR REPLACE VIEW {view} AS SELECT *, ({safe_expr}) AS "{escaped_name}" FROM "{src}"'
    )
    return view


@register("split_column")
def split_column(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    column: str = config.get("column", "")
    delimiter: str = config.get("delimiter", ",")
    output_columns: list[str] = config.get("output_columns", [])
    if not column:
        raise ValueError("split_column: 'column' required")
    if len(output_columns) < 2:
        raise ValueError("split_column: provide at least 2 'output_columns'")

    escaped_delim = delimiter.replace("'", "''")
    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]

    split_parts = [
        f'SPLIT_PART(CAST("{column}" AS VARCHAR), \'{escaped_delim}\', {i + 1}) AS "{name}"'
        for i, name in enumerate(output_columns)
    ]
    keep = [f'"{c}"' for c in all_cols]
    view = f"split_{_uid()}"
    con.execute(
        f'CREATE OR REPLACE VIEW {view} AS SELECT {", ".join(keep + split_parts)} FROM "{src}"'
    )
    return view


@register("merge_columns")
def merge_columns(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    columns: list[str] = config.get("columns", [])
    separator: str = config.get("separator", " ")
    output_column: str = config.get("output_column", "merged")
    if len(columns) < 2:
        raise ValueError("merge_columns: provide at least 2 columns")

    escaped_sep = separator.replace("'", "''")
    concat_parts = f" || '{escaped_sep}' || ".join(f'CAST("{c}" AS VARCHAR)' for c in columns)
    view = f"merge_{_uid()}"
    con.execute(
        f'CREATE OR REPLACE VIEW {view} AS SELECT *, ({concat_parts}) AS "{output_column}" FROM "{src}"'
    )
    return view


@register("date_extract")
def date_extract(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    column: str = config.get("column", "")
    parts: list[str] = config.get("parts", ["year", "month", "day"])
    if not column:
        raise ValueError("date_extract: 'column' required")

    part_fns = {
        "year":    f'YEAR(TRY_CAST("{column}" AS DATE))',
        "month":   f'MONTH(TRY_CAST("{column}" AS DATE))',
        "day":     f'DAY(TRY_CAST("{column}" AS DATE))',
        "weekday": f'DAYOFWEEK(TRY_CAST("{column}" AS DATE))',
        "quarter": f'QUARTER(TRY_CAST("{column}" AS DATE))',
    }
    extra_cols = [f'{part_fns[p]} AS "{column}_{p}"' for p in parts if p in part_fns]
    view = f"date_{_uid()}"
    con.execute(
        f'CREATE OR REPLACE VIEW {view} AS SELECT *, {", ".join(extra_cols)} FROM "{src}"'
    )
    return view


@register("conditional_column")
def conditional_column(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    column_name: str = config.get("column_name", "")
    conditions: list[dict] = config.get("conditions", [])
    else_value = config.get("else_value", None)
    if not column_name:
        raise ValueError("conditional_column: 'column_name' required")
    if not conditions:
        raise ValueError("conditional_column: at least one condition required")

    when_clauses = []
    for cond in conditions:
        when_expr = _safe_expression(cond.get("when", ""))
        then_val = cond.get("then", "")
        when_clauses.append(f"WHEN ({when_expr}) THEN {_literal(then_val)}")

    else_clause = f"ELSE {_literal(else_value)}" if else_value is not None else "ELSE NULL"
    case_expr = f'CASE {" ".join(when_clauses)} {else_clause} END'

    view = f"cond_{_uid()}"
    con.execute(
        f'CREATE OR REPLACE VIEW {view} AS SELECT *, ({case_expr}) AS "{column_name}" FROM "{src}"'
    )
    return view


def _literal(val: Any) -> str:
    if val is None:
        return "NULL"
    try:
        float(str(val))
        return str(val)
    except (TypeError, ValueError):
        escaped = str(val).replace("'", "''")
        return f"'{escaped}'"
