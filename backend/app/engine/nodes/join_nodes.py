"""Join, append, group-by, and lookup nodes."""
from __future__ import annotations
import uuid
from typing import Any
import duckdb
from app.engine.node_registry import register


def _uid() -> str:
    return uuid.uuid4().hex[:6]


@register("join_tables")
def join_tables(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    left = inputs.get("left")
    right = inputs.get("right")
    if not left or not right:
        raise ValueError("join_tables requires 'left' and 'right' connections")

    left_key: str = config.get("left_key", "")
    right_key: str = config.get("right_key", "")
    join_type: str = config.get("join_type", "left").upper()

    if not left_key or not right_key:
        raise ValueError("join_tables: 'left_key' and 'right_key' required")
    if join_type not in ("LEFT", "INNER", "RIGHT", "FULL"):
        raise ValueError(f"join_tables: unknown join_type {join_type!r}")

    # Prefix right-side columns that conflict with left-side names
    left_cols = [r[0] for r in con.execute(f'DESCRIBE "{left}"').fetchall()]
    right_cols = [r[0] for r in con.execute(f'DESCRIBE "{right}"').fetchall()]

    left_parts = [f'l."{c}"' for c in left_cols]
    right_parts = []
    for c in right_cols:
        if c == right_key:
            continue  # drop the duplicate join key from right side
        alias = f"{c}_right" if c in left_cols else c
        right_parts.append(f'r."{c}" AS "{alias}"')

    select = ", ".join(left_parts + right_parts)
    view = f"join_{_uid()}"
    con.execute(f"""
        CREATE OR REPLACE VIEW {view} AS
        SELECT {select}
        FROM "{left}" l
        {join_type} JOIN "{right}" r ON l."{left_key}" = r."{right_key}"
    """)
    return view


@register("append_tables")
def append_tables(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    top = inputs.get("top")
    bottom = inputs.get("bottom")
    if not top or not bottom:
        raise ValueError("append_tables requires 'top' and 'bottom' connections")

    match_by: str = config.get("match_by", "name")
    view = f"append_{_uid()}"

    if match_by == "position":
        # Cast bottom columns to match top column names positionally
        top_cols = [r[0] for r in con.execute(f'DESCRIBE "{top}"').fetchall()]
        bot_cols = [r[0] for r in con.execute(f'DESCRIBE "{bottom}"').fetchall()]
        min_cols = min(len(top_cols), len(bot_cols))
        top_select = ", ".join(f'"{c}"' for c in top_cols[:min_cols])
        bot_select = ", ".join(f'"{bot_cols[i]}" AS "{top_cols[i]}"' for i in range(min_cols))
        con.execute(f"""
            CREATE OR REPLACE VIEW {view} AS
            SELECT {top_select} FROM "{top}"
            UNION ALL
            SELECT {bot_select} FROM "{bottom}"
        """)
    else:
        con.execute(f"""
            CREATE OR REPLACE VIEW {view} AS
            SELECT * FROM "{top}"
            UNION ALL
            SELECT * FROM "{bottom}"
        """)
    return view


@register("group_by")
def group_by(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    src = inputs.get("input")
    if not src:
        raise ValueError("group_by requires an 'input' connection")

    group_columns: list[str] = config.get("group_columns", [])
    aggregations: list[dict] = config.get("aggregations", [])

    if not group_columns:
        raise ValueError("group_by: 'group_columns' required")
    if not aggregations:
        raise ValueError("group_by: at least one aggregation required")

    agg_fn_map = {
        "sum": "SUM",
        "avg": "AVG",
        "count": "COUNT",
        "count_distinct": "COUNT(DISTINCT {col})",
        "min": "MIN",
        "max": "MAX",
    }

    group_select = ", ".join(f'"{c}"' for c in group_columns)
    agg_parts = []
    for agg in aggregations:
        col: str = agg.get("column", "")
        fn: str = agg.get("function", "sum").lower()
        out: str = agg.get("output_name", f"{fn}_{col}")

        if fn == "count_distinct":
            expr = f'COUNT(DISTINCT "{col}")'
        elif fn == "count" and not col:
            expr = "COUNT(*)"
        else:
            sql_fn = agg_fn_map.get(fn, "SUM")
            expr = f'{sql_fn}("{col}")'

        agg_parts.append(f'{expr} AS "{out}"')

    view = f"grp_{_uid()}"
    con.execute(f"""
        CREATE OR REPLACE VIEW {view} AS
        SELECT {group_select}, {", ".join(agg_parts)}
        FROM "{src}"
        GROUP BY {group_select}
    """)
    return view


@register("lookup")
def lookup(con: duckdb.DuckDBPyConnection, inputs: dict[str, str], config: dict[str, Any]) -> str:
    """VLOOKUP-style: left join returning only specified return columns from the lookup table."""
    main = inputs.get("main")
    lookup_table = inputs.get("lookup")
    if not main or not lookup_table:
        raise ValueError("lookup requires 'main' and 'lookup' connections")

    main_key: str = config.get("main_key", "")
    lookup_key: str = config.get("lookup_key", "")
    return_columns: list[str] = config.get("return_columns", [])

    if not main_key or not lookup_key:
        raise ValueError("lookup: 'main_key' and 'lookup_key' required")

    main_cols = [r[0] for r in con.execute(f'DESCRIBE "{main}"').fetchall()]
    main_select = ", ".join(f'm."{c}"' for c in main_cols)

    if return_columns:
        ret_select = ", ".join(f'l."{c}"' for c in return_columns)
    else:
        # Return all lookup columns except the key
        lkp_cols = [r[0] for r in con.execute(f'DESCRIBE "{lookup_table}"').fetchall()]
        ret_select = ", ".join(f'l."{c}"' for c in lkp_cols if c != lookup_key)

    view = f"lkp_{_uid()}"
    con.execute(f"""
        CREATE OR REPLACE VIEW {view} AS
        SELECT {main_select}, {ret_select}
        FROM "{main}" m
        LEFT JOIN "{lookup_table}" l ON m."{main_key}" = l."{lookup_key}"
    """)
    return view
