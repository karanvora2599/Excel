"""Column and row cleaning nodes."""
from __future__ import annotations
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


# ── Column operations ─────────────────────────────────────────────────────────

@register("select_columns")
def select_columns(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    cols: list[str] = config.get("columns", [])
    if not cols:
        raise ValueError("select_columns: 'columns' must not be empty")
    quoted = ", ".join(f'"{c}"' for c in cols)
    view = f"sel_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT {quoted} FROM "{src}"')
    return view


@register("drop_columns")
def drop_columns(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    cols: list[str] = config.get("columns", [])
    if not cols:
        raise ValueError("drop_columns: 'columns' must not be empty")
    exclude = set(cols)
    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]
    keep = [c for c in all_cols if c not in exclude]
    if not keep:
        raise ValueError("drop_columns: cannot drop all columns")
    quoted = ", ".join(f'"{c}"' for c in keep)
    view = f"drop_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT {quoted} FROM "{src}"')
    return view


@register("rename_columns")
def rename_columns(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    renames: list[dict] = config.get("renames", [])
    rename_map = {r["from"]: r["to"] for r in renames if r.get("from") and r.get("to")}
    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]
    parts = [
        f'"{c}" AS "{rename_map.get(c, c)}"' for c in all_cols
    ]
    view = f"ren_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT {", ".join(parts)} FROM "{src}"')
    return view


@register("change_data_type")
def change_data_type(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    column: str = config.get("column", "")
    to_type: str = config.get("to_type", "string")
    if not column:
        raise ValueError("change_data_type: 'column' required")

    type_map = {
        "string": "VARCHAR",
        "number": "DOUBLE",
        "integer": "BIGINT",
        "date": "DATE",
        "boolean": "BOOLEAN",
    }
    sql_type = type_map.get(to_type, "VARCHAR")
    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]
    parts = [
        f'TRY_CAST("{c}" AS {sql_type}) AS "{c}"' if c == column else f'"{c}"'
        for c in all_cols
    ]
    view = f"cast_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT {", ".join(parts)} FROM "{src}"')
    return view


# ── Row operations ────────────────────────────────────────────────────────────

@register("filter_rows")
def filter_rows(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    conditions: list[dict] = config.get("conditions", [])
    logic: str = config.get("logic", "AND").upper()

    if not conditions:
        raise ValueError("filter_rows: at least one condition required")

    clauses = []
    for cond in conditions:
        col = cond.get("column", "")
        op = cond.get("operator", "equals")
        val = cond.get("value", "")
        clause = _build_filter_clause(col, op, val)
        if clause:
            clauses.append(clause)

    if not clauses:
        raise ValueError("filter_rows: no valid conditions")

    joiner = f" {logic} "
    where = joiner.join(f"({c})" for c in clauses)
    view = f"filt_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT * FROM "{src}" WHERE {where}')
    return view


def _build_filter_clause(col: str, op: str, val: Any) -> str:
    c = f'"{col}"'
    if op == "equals":
        return f"{c} = {_literal(val)}"
    if op == "not_equals":
        return f"{c} != {_literal(val)}"
    if op == "greater_than":
        return f"{c} > {_literal(val)}"
    if op == "less_than":
        return f"{c} < {_literal(val)}"
    if op == "greater_than_or_equal":
        return f"{c} >= {_literal(val)}"
    if op == "less_than_or_equal":
        return f"{c} <= {_literal(val)}"
    if op == "contains":
        return f"{c} LIKE '%{str(val).replace('%', '%%')}%'"
    if op == "starts_with":
        return f"{c} LIKE '{str(val).replace('%', '%%')}%'"
    if op == "ends_with":
        return f"{c} LIKE '%{str(val).replace('%', '%%')}'"
    if op == "is_empty":
        return f"({c} IS NULL OR CAST({c} AS VARCHAR) = '')"
    if op == "is_not_empty":
        return f"({c} IS NOT NULL AND CAST({c} AS VARCHAR) != '')"
    raise ValueError(f"Unknown filter operator: {op!r}")


def _literal(val: Any) -> str:
    try:
        float(val)
        return str(val)
    except (TypeError, ValueError):
        escaped = str(val).replace("'", "''")
        return f"'{escaped}'"


@register("sort_rows")
def sort_rows(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    columns: list[dict] = config.get("columns", [])
    if not columns:
        raise ValueError("sort_rows: at least one sort column required")
    order_parts = [
        f'"{c["name"]}" {"DESC" if c.get("direction", "asc").lower() == "desc" else "ASC"}'
        for c in columns
        if c.get("name")
    ]
    view = f"sort_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT * FROM "{src}" ORDER BY {", ".join(order_parts)}')
    return view


@register("remove_duplicates")
def remove_duplicates(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    subset: list[str] | None = config.get("subset")
    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]

    if subset:
        partition_cols = ", ".join(f'"{c}"' for c in subset)
    else:
        partition_cols = ", ".join(f'"{c}"' for c in all_cols)

    view = f"dedup_{_uid()}"
    con.execute(f"""
        CREATE OR REPLACE VIEW {view} AS
        SELECT {", ".join(f'"{c}"' for c in all_cols)}
        FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY {partition_cols}) AS _rn
            FROM "{src}"
        )
        WHERE _rn = 1
    """)
    return view


@register("top_n_rows")
def top_n_rows(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    n: int = int(config.get("n", 100))
    order_by: str | None = config.get("order_by")
    direction: str = config.get("direction", "asc").upper()

    order_clause = f'ORDER BY "{order_by}" {direction}' if order_by else ""
    view = f"topn_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT * FROM "{src}" {order_clause} LIMIT {n}')
    return view


# ── Text cleaning ─────────────────────────────────────────────────────────────

@register("trim_text")
def trim_text(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    columns: list[str] = config.get("columns", [])
    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]
    trim_set = set(columns) if columns else set(all_cols)
    parts = [
        f'TRIM(CAST("{c}" AS VARCHAR)) AS "{c}"' if c in trim_set else f'"{c}"'
        for c in all_cols
    ]
    view = f"trim_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT {", ".join(parts)} FROM "{src}"')
    return view


@register("fill_missing")
def fill_missing(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    column: str = config.get("column", "")
    strategy: str = config.get("strategy", "value")
    fill_value = config.get("fill_value", "")

    if not column:
        raise ValueError("fill_missing: 'column' required")

    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]

    if strategy == "value":
        fill_expr = f'COALESCE("{column}", {_literal(fill_value)})'
    elif strategy == "mean":
        fill_expr = f'COALESCE("{column}", AVG("{column}") OVER ())'
    elif strategy == "median":
        fill_expr = f'COALESCE("{column}", MEDIAN("{column}") OVER ())'
    else:
        fill_expr = f'"{column}"'  # previous not easily done in pure SQL window without ordering

    parts = [fill_expr + f' AS "{column}"' if c == column else f'"{c}"' for c in all_cols]
    view = f"fill_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT {", ".join(parts)} FROM "{src}"')
    return view


@register("replace_values")
def replace_values(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    column: str = config.get("column", "")
    find: str = config.get("find", "")
    replace: str = config.get("replace", "")
    if not column:
        raise ValueError("replace_values: 'column' required")

    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]
    escaped_find = find.replace("'", "''")
    escaped_replace = replace.replace("'", "''")
    parts = [
        f"REPLACE(CAST(\"{c}\" AS VARCHAR), '{escaped_find}', '{escaped_replace}') AS \"{c}\"" if c == column else f'"{c}"'
        for c in all_cols
    ]
    view = f"repl_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT {", ".join(parts)} FROM "{src}"')
    return view


@register("standardize_case")
def standardize_case(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = _require_input(inputs)
    columns: list[str] = config.get("columns", [])
    case: str = config.get("case", "lower").lower()
    all_cols = [r[0] for r in con.execute(f'DESCRIBE "{src}"').fetchall()]
    col_set = set(columns)

    fn_map = {"upper": "UPPER", "lower": "LOWER", "title": "INITCAP"}
    fn = fn_map.get(case, "LOWER")

    parts = [
        f'{fn}(CAST("{c}" AS VARCHAR)) AS "{c}"' if c in col_set else f'"{c}"'
        for c in all_cols
    ]
    view = f"case_{_uid()}"
    con.execute(f'CREATE OR REPLACE VIEW {view} AS SELECT {", ".join(parts)} FROM "{src}"')
    return view
