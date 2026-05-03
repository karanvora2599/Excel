"""Central registry mapping node type strings to their run functions."""
from __future__ import annotations
from typing import Any, Callable
import duckdb

NodeRunFn = Callable[[duckdb.DuckDBPyConnection, dict[str, str], dict[str, Any]], str]

_registry: dict[str, NodeRunFn] = {}


def register(node_type: str) -> Callable[[NodeRunFn], NodeRunFn]:
    def decorator(fn: NodeRunFn) -> NodeRunFn:
        _registry[node_type] = fn
        return fn
    return decorator


def get(node_type: str) -> NodeRunFn:
    if node_type not in _registry:
        raise ValueError(f"Unknown node type: {node_type!r}")
    return _registry[node_type]


def list_types() -> list[str]:
    return sorted(_registry.keys())


def _load_all() -> None:
    """Import all node modules so their @register decorators fire."""
    from app.engine.nodes import (  # noqa: F401
        input_nodes,
        cleaning_nodes,
        formula_nodes,
        join_nodes,
        output_nodes,
        validation_nodes,
    )


_load_all()
