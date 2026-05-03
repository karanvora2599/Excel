"""Topological graph executor — runs nodes in dependency order via DuckDB."""
from __future__ import annotations
import traceback
from collections import defaultdict, deque
from datetime import datetime
from typing import Any

import duckdb
import polars as pl

from app.config import settings
from app.engine import cache as node_cache
from app.engine import node_registry
from app.engine.models import (
    ColumnSchema,
    GraphEdge,
    GraphNode,
    NodeError,
    NodeResult,
    NodeStats,
    RunResponse,
    WorkflowGraph,
)


# ── Topology ──────────────────────────────────────────────────────────────────

def topological_sort(nodes: list[GraphNode], edges: list[GraphEdge]) -> list[str]:
    """Kahn's algorithm. Raises ValueError on cycles."""
    node_ids = {n.id for n in nodes}
    in_degree: dict[str, int] = {n.id: 0 for n in nodes}
    dependents: dict[str, list[str]] = defaultdict(list)

    for edge in edges:
        if edge.source in node_ids and edge.target in node_ids:
            in_degree[edge.target] += 1
            dependents[edge.source].append(edge.target)

    queue: deque[str] = deque(nid for nid, deg in in_degree.items() if deg == 0)
    order: list[str] = []

    while queue:
        nid = queue.popleft()
        order.append(nid)
        for dep in dependents[nid]:
            in_degree[dep] -= 1
            if in_degree[dep] == 0:
                queue.append(dep)

    if len(order) != len(nodes):
        raise ValueError("Workflow graph contains a cycle")

    return order


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_input_map(
    node_id: str,
    edges: list[GraphEdge],
    view_map: dict[str, dict[str, str]],
) -> dict[str, str]:
    """Return {port_name: view_name} for all edges targeting this node."""
    result: dict[str, str] = {}
    for edge in edges:
        if edge.target == node_id:
            source_views = view_map.get(edge.source, {})
            view_name = source_views.get(edge.source_port)
            if view_name:
                result[edge.target_port] = view_name
    return result


def _df_to_result(node_id: str, df: pl.DataFrame, stats: NodeStats) -> NodeResult:
    schema = []
    for col in df.columns:
        dtype = df[col].dtype
        if dtype in (pl.Int8, pl.Int16, pl.Int32, pl.Int64,
                     pl.UInt8, pl.UInt16, pl.UInt32, pl.UInt64):
            col_type = "integer"
        elif dtype in (pl.Float32, pl.Float64):
            col_type = "number"
        elif dtype == pl.Boolean:
            col_type = "boolean"
        elif dtype in (pl.Date, pl.Datetime):
            col_type = "date"
        else:
            col_type = "string"

        schema.append(ColumnSchema(
            name=col,
            type=col_type,  # type: ignore[arg-type]
            nullable=df[col].null_count() > 0,
            sample_values=[str(v) for v in df[col].drop_nulls().head(3).to_list()],
        ))

    return NodeResult(
        node_id=node_id,
        status="ok",
        row_count=len(df),
        column_count=len(df.columns),
        columns=schema,
        preview=df.head(settings.preview_row_limit).to_dicts(),
        stats=stats,
        errors=[],
        warnings=[],
        executed_at=datetime.utcnow(),
    )


# ── Executor ──────────────────────────────────────────────────────────────────

def execute_graph(graph: WorkflowGraph, from_node: str | None = None) -> RunResponse:
    """
    Execute the workflow graph (or from a specific node forward).

    Each node's run() receives a shared DuckDB connection and returns the name
    of a view it registered. Results are cached by content hash.
    """
    order = topological_sort(graph.nodes, graph.edges)
    node_map: dict[str, GraphNode] = {n.id: n for n in graph.nodes}

    # If from_node is set, only execute that node and its descendants.
    if from_node:
        descendants = _descendants(from_node, graph.edges)
        order = [nid for nid in order if nid in descendants or nid == from_node]

    con = duckdb.connect()
    view_map: dict[str, dict[str, str]] = {}  # node_id → {port: view_name}
    results: dict[str, NodeResult] = {}

    for node_id in order:
        node = node_map[node_id]
        input_views = _build_input_map(node_id, graph.edges, view_map)
        input_keys = list(input_views.values())

        # Cache check
        cached = node_cache.get(node_id, node.config, input_keys)
        if cached:
            results[node_id] = cached
            # Re-register the cached view so downstream nodes can use it
            if cached.status == "ok" and cached.preview:
                df = pl.DataFrame(cached.preview)
                _register_df(con, f"node_{node_id.replace('-', '_')}_output", df)
                view_map[node_id] = {"output": f"node_{node_id.replace('-', '_')}_output"}
            continue

        try:
            run_fn = node_registry.get(node.type)
        except ValueError:
            result = NodeResult(
                node_id=node_id,
                status="error",
                errors=[NodeError(message=f"Unknown node type: {node.type!r}")],
            )
            results[node_id] = result
            continue

        try:
            output_view = run_fn(con, input_views, node.config)
            df = con.execute(f"SELECT * FROM {output_view}").pl()

            # Compute stats vs primary input
            rows_in: int | None = None
            if input_views:
                first_view = next(iter(input_views.values()))
                rows_in = con.execute(f"SELECT COUNT(*) FROM {first_view}").fetchone()[0]  # type: ignore[index]

            input_cols: set[str] = set()
            for v in input_views.values():
                try:
                    cols = [r[0] for r in con.execute(f"DESCRIBE {v}").fetchall()]
                    input_cols.update(cols)
                except Exception:
                    pass

            out_cols = set(df.columns)
            stats = NodeStats(
                rows_in=rows_in,
                rows_out=len(df),
                columns_added=sorted(out_cols - input_cols),
                columns_removed=sorted(input_cols - out_cols),
            )

            result = _df_to_result(node_id, df, stats)
            node_cache.put(node_id, node.config, input_keys, result)

            # Register view for downstream nodes
            _register_df(con, output_view, df)
            view_map[node_id] = {"output": output_view}

        except Exception as exc:
            result = NodeResult(
                node_id=node_id,
                status="error",
                errors=[NodeError(message=str(exc))],
                warnings=[traceback.format_exc(limit=3)],
            )

        results[node_id] = result

    return RunResponse(results=results, execution_order=order)


def _register_df(con: duckdb.DuckDBPyConnection, name: str, df: pl.DataFrame) -> None:
    con.register(name, df)


def _descendants(start: str, edges: list[GraphEdge]) -> set[str]:
    """BFS to find all nodes reachable from start via directed edges."""
    visited: set[str] = set()
    queue: deque[str] = deque([start])
    while queue:
        cur = queue.popleft()
        if cur in visited:
            continue
        visited.add(cur)
        for edge in edges:
            if edge.source == cur and edge.target not in visited:
                queue.append(edge.target)
    return visited
