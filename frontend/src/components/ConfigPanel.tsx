import { useWorkflowStore } from '../store/workflowStore'
import InputNodeConfig from './config/InputNodeConfig'
import FilterRowsConfig from './config/FilterRowsConfig'
import GroupByConfig from './config/GroupByConfig'
import JoinConfig from './config/JoinConfig'
import GenericConfig from './config/GenericConfig'

const STATUS_PILL: Record<string, string> = {
  ok:      'bg-green-50 text-green-700 border-green-200',
  error:   'bg-red-50 text-red-700 border-red-200',
  stale:   'bg-amber-50 text-amber-700 border-amber-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function ConfigPanel() {
  const { selectedNodeId, nodes, updateNodeConfig, deleteNode, results } = useWorkflowStore()
  const node = nodes.find((n) => n.id === selectedNodeId)
  const result = node ? results[node.id] : undefined

  if (!node) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <div className="text-center">
          <p className="text-2xl mb-2">⚙️</p>
          <p className="text-[11px] text-gray-400">Select a node to configure</p>
        </div>
      </div>
    )
  }

  const ConfigComponent = getConfigComponent(node.data.nodeType)

  return (
    <div className="flex flex-col h-full">
      {/* Node header */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-gray-800 truncate">{node.data.label}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{node.id}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {result && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded border ${STATUS_PILL[result.status] ?? STATUS_PILL.pending}`}>
                {result.status}
              </span>
            )}
            <button
              onClick={() => deleteNode(node.id)}
              className="text-gray-300 hover:text-red-500 text-sm leading-none transition-colors"
              title="Delete node"
            >
              ×
            </button>
          </div>
        </div>
        {result && result.row_count > 0 && (
          <p className="text-[10px] text-gray-500 mt-1">
            {result.row_count.toLocaleString()} rows · {result.column_count} columns
          </p>
        )}
      </div>

      {/* Error banner */}
      {result?.status === 'error' && result.errors.length > 0 && (
        <div className="mx-3 mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {result.errors[0].message}
        </div>
      )}

      {/* Config form */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <ConfigComponent
          config={node.data.config}
          nodeType={node.data.nodeType}
          onChange={(config) => updateNodeConfig(node.id, config)}
        />
      </div>
    </div>
  )
}

interface ConfigProps {
  config: Record<string, unknown>
  nodeType: string
  onChange: (config: Record<string, unknown>) => void
}

function getConfigComponent(nodeType: string): React.ComponentType<ConfigProps> {
  if (nodeType === 'excel_input' || nodeType === 'csv_input') return InputNodeConfig
  if (nodeType === 'filter_rows') return FilterRowsConfig
  if (nodeType === 'group_by') return GroupByConfig
  if (nodeType === 'join_tables' || nodeType === 'lookup') return JoinConfig
  return GenericConfig
}
