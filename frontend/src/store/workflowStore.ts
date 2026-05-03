import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import type { NodeResult, Workflow } from '../types'
import api from '../api/client'

export interface FlowNode extends Node {
  data: {
    label: string
    nodeType: string
    config: Record<string, unknown>
    status: 'ok' | 'error' | 'stale' | 'running' | 'pending'
    rowCount?: number
  }
}

interface WorkflowState {
  // Workflow meta
  workflowId: string | null
  workflowName: string

  // React Flow state
  nodes: FlowNode[]
  edges: Edge[]

  // Selection
  selectedNodeId: string | null

  // Execution results
  results: Record<string, NodeResult>
  running: boolean

  // Actions
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (nodeType: string, position: { x: number; y: number }, initialConfig?: Record<string, unknown>) => void
  selectNode: (id: string | null) => void
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void
  deleteNode: (id: string) => void
  runGraph: () => Promise<void>
  saveWorkflow: () => Promise<void>
  loadWorkflow: (wf: Workflow) => void
  setWorkflowName: (name: string) => void
}

const NODE_LABELS: Record<string, string> = {
  excel_input: 'Excel Input',
  csv_input: 'CSV Input',
  excel_output: 'Excel Output',
  csv_output: 'CSV Output',
  select_columns: 'Select Columns',
  rename_columns: 'Rename Columns',
  drop_columns: 'Drop Columns',
  change_data_type: 'Change Data Type',
  filter_rows: 'Filter Rows',
  sort_rows: 'Sort Rows',
  remove_duplicates: 'Remove Duplicates',
  top_n_rows: 'Top N Rows',
  trim_text: 'Trim Text',
  fill_missing: 'Fill Missing',
  replace_values: 'Replace Values',
  standardize_case: 'Standardize Case',
  add_column: 'Add Column',
  split_column: 'Split Column',
  merge_columns: 'Merge Columns',
  date_extract: 'Date Extract',
  conditional_column: 'Conditional Column',
  join_tables: 'Join Tables',
  append_tables: 'Append Tables',
  group_by: 'Group By',
  lookup: 'Lookup',
  find_duplicates: 'Find Duplicates',
  find_missing: 'Find Missing',
  validate_regex: 'Validate Regex',
}

let _nodeCounter = 0

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: null,
  workflowName: 'Untitled Workflow',
  nodes: [],
  edges: [],
  selectedNodeId: null,
  results: {},
  running: false,

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as FlowNode[] })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge(
        {
          ...connection,
          type: 'smoothstep',
          style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed' as const, color: '#a1a1aa', width: 14, height: 14 },
        },
        s.edges,
      ),
    })),

  addNode: (nodeType, position, initialConfig) => {
    const id = `node_${++_nodeCounter}_${Date.now()}`
    const newNode: FlowNode = {
      id,
      type: 'gridflowNode',
      position,
      data: {
        label: NODE_LABELS[nodeType] ?? nodeType,
        nodeType,
        config: initialConfig ?? {},
        status: 'pending',
      },
    }
    set((s) => ({ nodes: [...s.nodes, newNode], selectedNodeId: id }))
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  updateNodeConfig: (id, config) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, config, status: 'stale' } }
          : n,
      ),
      // Mark downstream nodes as stale too
      results: Object.fromEntries(
        Object.entries(s.results).filter(([k]) => k !== id),
      ),
    }))
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }))
  },

  runGraph: async () => {
    const { workflowId, nodes, edges } = get()
    if (!workflowId) {
      await get().saveWorkflow()
    }
    const id = get().workflowId!

    set({ running: true })
    try {
      // Save graph first, then run
      await api.put(`/workflows/${id}`, {
        graph: { nodes: _toApiNodes(nodes), edges: _toApiEdges(edges) },
      })
      const { data } = await api.post<{ results: Record<string, NodeResult> }>(`/workflows/${id}/run`)

      set((s) => ({
        results: data.results,
        nodes: s.nodes.map((n) => {
          const r = data.results[n.id]
          if (!r) return n
          return {
            ...n,
            data: {
              ...n.data,
              status: r.status,
              rowCount: r.row_count,
            },
          }
        }),
      }))
    } catch (err) {
      console.error('Run failed', err)
    } finally {
      set({ running: false })
    }
  },

  saveWorkflow: async () => {
    const { workflowId, workflowName, nodes, edges } = get()
    const graph = { nodes: _toApiNodes(nodes), edges: _toApiEdges(edges) }

    if (workflowId) {
      await api.put(`/workflows/${workflowId}`, { name: workflowName, graph })
    } else {
      const { data } = await api.post<{ id: string }>('/workflows', {
        name: workflowName,
        graph,
      })
      set({ workflowId: data.id })
    }
  },

  loadWorkflow: (wf) => {
    set({
      workflowId: wf.id,
      workflowName: wf.name,
      nodes: wf.graph.nodes.map((n) => ({
        id: n.id,
        type: 'gridflowNode',
        position: n.position,
        data: {
          label: NODE_LABELS[n.type] ?? n.type,
          nodeType: n.type,
          config: n.config,
          status: 'stale' as const,
        },
      })),
      edges: wf.graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.source_port,
        target: e.target,
        targetHandle: e.target_port,
        type: 'smoothstep',
        style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
        markerEnd: { type: 'arrowclosed' as const, color: '#a1a1aa', width: 14, height: 14 },
      })),
      results: {},
    })
  },

  setWorkflowName: (name) => set({ workflowName: name }),
}))

function _toApiNodes(nodes: FlowNode[]) {
  return nodes.map((n) => ({
    id: n.id,
    type: n.data.nodeType,
    position: n.position,
    config: n.data.config,
  }))
}

function _toApiEdges(edges: Edge[]) {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    source_port: e.sourceHandle ?? 'output',
    target: e.target,
    target_port: e.targetHandle ?? 'input',
  }))
}
