"""Pydantic models for the graph and execution results."""
from __future__ import annotations
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


# ── Column schema ─────────────────────────────────────────────────────────────

class ColumnSchema(BaseModel):
    name: str
    type: Literal["string", "number", "integer", "date", "boolean", "any"]
    nullable: bool = True
    sample_values: list[Any] = Field(default_factory=list)


# ── Graph ─────────────────────────────────────────────────────────────────────

class GraphNode(BaseModel):
    id: str
    type: str
    position: dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0})
    config: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str
    source: str
    source_port: str = "output"
    target: str
    target_port: str = "input"


class WorkflowGraph(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


# ── Node result ───────────────────────────────────────────────────────────────

class NodeStats(BaseModel):
    rows_in: int | None = None
    rows_out: int | None = None
    columns_added: list[str] = Field(default_factory=list)
    columns_removed: list[str] = Field(default_factory=list)


class NodeError(BaseModel):
    message: str
    row_index: int | None = None


class NodeResult(BaseModel):
    node_id: str
    status: Literal["ok", "error", "stale", "running", "pending"]
    row_count: int = 0
    column_count: int = 0
    columns: list[ColumnSchema] = Field(default_factory=list)
    preview: list[dict[str, Any]] = Field(default_factory=list)
    stats: NodeStats = Field(default_factory=NodeStats)
    errors: list[NodeError] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    cache_key: str = ""
    executed_at: datetime = Field(default_factory=datetime.utcnow)


# ── Run request / response ────────────────────────────────────────────────────

class RunResponse(BaseModel):
    results: dict[str, NodeResult]
    execution_order: list[str]
