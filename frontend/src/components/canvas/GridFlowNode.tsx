import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FlowNode } from '../../store/workflowStore'

const CATEGORY_COLOR: Record<string, string> = {
  excel_input:        '#217346',
  csv_input:          '#217346',
  excel_output:       '#0f6cbf',
  csv_output:         '#0f6cbf',
  filter_rows:        '#c47b1c',
  sort_rows:          '#c47b1c',
  remove_duplicates:  '#c47b1c',
  top_n_rows:         '#c47b1c',
  group_by:           '#7719aa',
  join_tables:        '#7719aa',
  append_tables:      '#7719aa',
  lookup:             '#7719aa',
  add_column:         '#6352a8',
  conditional_column: '#6352a8',
  split_column:       '#6352a8',
  merge_columns:      '#6352a8',
  date_extract:       '#6352a8',
  fill_missing:       '#0078d4',
  replace_values:     '#0078d4',
  standardize_case:   '#0078d4',
  trim_text:          '#0078d4',
  change_data_type:   '#0078d4',
  rename_columns:     '#0078d4',
  select_columns:     '#0078d4',
  drop_columns:       '#0078d4',
  find_duplicates:    '#c50f1f',
  find_missing:       '#c50f1f',
  validate_regex:     '#c50f1f',
}

const NODE_ABBR: Record<string, string> = {
  excel_input:        'XLS',
  csv_input:          'CSV',
  excel_output:       'OUT',
  csv_output:         'OUT',
  filter_rows:        'FLT',
  sort_rows:          'SRT',
  remove_duplicates:  'RMV',
  top_n_rows:         'TOP',
  group_by:           'GRP',
  join_tables:        'JON',
  append_tables:      'APD',
  lookup:             'LKP',
  add_column:         'ADD',
  conditional_column: 'IF',
  split_column:       'SPL',
  merge_columns:      'MRG',
  date_extract:       'DAT',
  fill_missing:       'FIL',
  replace_values:     'RPL',
  standardize_case:   'CAS',
  trim_text:          'TRM',
  change_data_type:   'TYP',
  rename_columns:     'RNM',
  select_columns:     'SEL',
  drop_columns:       'DRP',
  find_duplicates:    'DUP',
  find_missing:       'MIS',
  validate_regex:     'RGX',
}

const STATUS_DOT: Record<string, string> = {
  ok:      '#4ade80',
  error:   '#f87171',
  stale:   '#fb923c',
  running: '#93c5fd',
  pending: 'rgba(255,255,255,0.25)',
}

const DUAL_INPUT_NODES = new Set(['join_tables', 'append_tables', 'lookup'])

export default function GridFlowNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowNode['data']
  const { label, nodeType, status, rowCount } = nodeData
  const isDual = DUAL_INPUT_NODES.has(nodeType)
  const isInput = nodeType.endsWith('_input')
  const isOutput = nodeType.endsWith('_output')
  const accent = CATEGORY_COLOR[nodeType] ?? '#6b7280'
  const abbr = NODE_ABBR[nodeType] ?? '···'
  const isRunning = status === 'running'

  const HANDLE_STYLE = {
    width: 9,
    height: 9,
    border: '2px solid white',
    borderRadius: '50%',
  }

  return (
    <div
      className="relative"
      style={{
        minWidth: 158,
        maxWidth: 215,
        borderRadius: 7,
        border: selected
          ? `1.5px solid ${accent}`
          : '1px solid rgba(0,0,0,0.13)',
        boxShadow: selected
          ? `0 0 0 3px ${accent}26, 0 4px 16px rgba(0,0,0,0.13)`
          : '0 1px 3px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Input handles ─────────────────────────────────── */}
      {!isInput && !isOutput && isDual ? (
        <>
          <Handle
            type="target" id="left" position={Position.Left}
            style={{ ...HANDLE_STYLE, top: '33%', background: accent }}
          />
          <Handle
            type="target" id="right" position={Position.Left}
            style={{ ...HANDLE_STYLE, top: '67%', background: accent }}
          />
        </>
      ) : !isOutput && (
        <Handle
          type="target" id="input" position={Position.Left}
          style={{ ...HANDLE_STYLE, background: '#9ca3af' }}
        />
      )}

      {/* ── Header band ───────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-2.5 py-[7px]"
        style={{
          background: accent,
          borderRadius: '6px 6px 0 0',
        }}
      >
        <span
          className="shrink-0 text-[8px] font-bold font-mono leading-none px-[5px] py-[3px] rounded"
          style={{ background: 'rgba(0,0,0,0.18)', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.05em' }}
        >
          {abbr}
        </span>
        <span className="flex-1 text-[11px] font-semibold text-white leading-tight truncate">
          {label}
        </span>
        <span
          className={`shrink-0 rounded-full ${isRunning ? 'animate-pulse' : ''}`}
          style={{
            width: 7,
            height: 7,
            background: STATUS_DOT[status] ?? STATUS_DOT.pending,
            boxShadow: status !== 'pending' ? '0 0 0 1.5px rgba(255,255,255,0.35)' : 'none',
          }}
        />
      </div>

      {/* ── Stats body ────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-2.5 py-[6px]"
        style={{ background: '#ffffff', borderRadius: '0 0 6px 6px' }}
      >
        <span className="text-[10px] text-gray-400 leading-none tabular-nums">
          {rowCount !== undefined
            ? `${rowCount.toLocaleString()} rows`
            : isRunning ? 'Running…' : 'Not run'}
        </span>
        {status === 'error' && (
          <span className="text-[9px] font-semibold text-red-500 leading-none">Error</span>
        )}
      </div>

      {/* ── Output handle ─────────────────────────────────── */}
      <Handle
        type="source" id="output" position={Position.Right}
        style={{ ...HANDLE_STYLE, background: '#9ca3af' }}
      />
    </div>
  )
}
