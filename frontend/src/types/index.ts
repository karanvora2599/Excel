// ── Column ───────────────────────────────────────────────────────────────────

export type ColumnType = 'string' | 'number' | 'integer' | 'date' | 'boolean' | 'any'

export interface ColumnSchema {
  name: string
  type: ColumnType
  nullable: boolean
  sample_values: unknown[]
}

// ── Files ────────────────────────────────────────────────────────────────────

export interface SheetInfo {
  name: string
  row_count: number
  columns: ColumnSchema[]
}

export interface UploadedFile {
  id: string
  original_filename: string
  file_type: 'excel' | 'csv'
  size_bytes: number
  sheets: Record<string, SheetInfo>
  created_at: string
}

// ── Graph ────────────────────────────────────────────────────────────────────

export type PortType = 'table'

export interface PortDef {
  name: string
  type: PortType
  label?: string
}

export interface NodeDef {
  type: string
  display_name: string
  category: NodeCategory
  inputs: PortDef[]
  outputs: PortDef[]
  config_schema: Record<string, unknown>
}

export type NodeCategory =
  | 'input'
  | 'output'
  | 'columns'
  | 'rows'
  | 'cleaning'
  | 'formula'
  | 'tables'
  | 'validation'

export interface GraphNode {
  id: string
  type: string
  position: { x: number; y: number }
  config: Record<string, unknown>
}

export interface GraphEdge {
  id: string
  source: string
  source_port: string
  target: string
  target_port: string
}

export interface WorkflowGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface Workflow {
  id: string
  name: string
  graph: WorkflowGraph
  created_at: string
  updated_at: string
}

// ── Execution ────────────────────────────────────────────────────────────────

export type NodeStatus = 'ok' | 'error' | 'stale' | 'running' | 'pending'

export interface NodeStats {
  rows_in: number | null
  rows_out: number | null
  columns_added: string[]
  columns_removed: string[]
}

export interface NodeError {
  message: string
  row_index?: number
}

export interface NodeResult {
  node_id: string
  status: NodeStatus
  row_count: number
  column_count: number
  columns: ColumnSchema[]
  preview: Record<string, unknown>[]
  stats: NodeStats
  errors: NodeError[]
  warnings: string[]
  cache_key: string
  executed_at: string
}
