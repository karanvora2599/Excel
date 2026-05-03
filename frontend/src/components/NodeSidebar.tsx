import { useState } from 'react'
import FilePanel from './FilePanel'

const NODE_CATEGORIES = [
  {
    label: 'Input / Output',
    color: '#217346',
    nodes: [
      { type: 'excel_input', label: 'Excel Input' },
      { type: 'csv_input',   label: 'CSV Input' },
      { type: 'excel_output', label: 'Excel Output' },
      { type: 'csv_output',  label: 'CSV Output' },
    ],
  },
  {
    label: 'Columns',
    color: '#0f6cbf',
    nodes: [
      { type: 'select_columns',   label: 'Select Columns' },
      { type: 'rename_columns',   label: 'Rename Columns' },
      { type: 'drop_columns',     label: 'Drop Columns' },
      { type: 'change_data_type', label: 'Change Data Type' },
    ],
  },
  {
    label: 'Rows',
    color: '#ca5010',
    nodes: [
      { type: 'filter_rows',        label: 'Filter Rows' },
      { type: 'sort_rows',          label: 'Sort Rows' },
      { type: 'remove_duplicates',  label: 'Remove Duplicates' },
      { type: 'top_n_rows',         label: 'Top N Rows' },
    ],
  },
  {
    label: 'Cleaning',
    color: '#8764b8',
    nodes: [
      { type: 'trim_text',        label: 'Trim Text' },
      { type: 'fill_missing',     label: 'Fill Missing' },
      { type: 'replace_values',   label: 'Replace Values' },
      { type: 'standardize_case', label: 'Standardize Case' },
    ],
  },
  {
    label: 'Formula',
    color: '#8764b8',
    nodes: [
      { type: 'add_column',          label: 'Add Column' },
      { type: 'split_column',        label: 'Split Column' },
      { type: 'merge_columns',       label: 'Merge Columns' },
      { type: 'date_extract',        label: 'Date Extract' },
      { type: 'conditional_column',  label: 'Conditional Column' },
    ],
  },
  {
    label: 'Tables',
    color: '#7719aa',
    nodes: [
      { type: 'join_tables',   label: 'Join Tables' },
      { type: 'append_tables', label: 'Append Tables' },
      { type: 'group_by',      label: 'Group By' },
      { type: 'lookup',        label: 'Lookup' },
    ],
  },
  {
    label: 'Validation',
    color: '#c50f1f',
    nodes: [
      { type: 'find_duplicates', label: 'Find Duplicates' },
      { type: 'find_missing',    label: 'Find Missing' },
      { type: 'validate_regex',  label: 'Validate Regex' },
    ],
  },
]

type Tab = 'files' | 'nodes'

export default function NodeSidebar() {
  const [tab, setTab] = useState<Tab>('files')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const filtered = NODE_CATEGORIES.map((cat) => ({
    ...cat,
    nodes: cat.nodes.filter((n) => n.label.toLowerCase().includes(search.toLowerCase())),
  })).filter((cat) => cat.nodes.length > 0)

  function onDragStart(e: React.DragEvent, nodeType: string) {
    e.dataTransfer.setData('application/gridflow-node', nodeType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  function toggleCollapse(label: string) {
    setCollapsed((p) => {
      const n = new Set(p)
      n.has(label) ? n.delete(label) : n.add(label)
      return n
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab strip */}
      <div className="flex border-b border-gray-200 shrink-0">
        {(['files', 'nodes'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[11px] font-medium capitalize transition-colors ${
              tab === t
                ? 'text-[#217346] border-b-2 border-[#217346] -mb-px bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'files' ? '📁 Files' : '⊞ Nodes'}
          </button>
        ))}
      </div>

      {/* Files tab */}
      {tab === 'files' && <FilePanel />}

      {/* Nodes tab */}
      {tab === 'nodes' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-2 py-1.5 shrink-0">
            <input
              type="search"
              placeholder="Search nodes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#217346] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto pb-2">
            {filtered.map((cat) => {
              const isCollapsed = collapsed.has(cat.label)
              return (
                <div key={cat.label}>
                  {/* Category header */}
                  <button
                    className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCollapse(cat.label)}
                  >
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: cat.color }} />
                    <span className="flex-1 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {cat.label}
                    </span>
                    <span className="text-[10px] text-gray-400">{isCollapsed ? '▸' : '▾'}</span>
                  </button>

                  {!isCollapsed && (
                    <div className="px-2 pb-1 flex flex-col gap-0.5">
                      {cat.nodes.map((n) => (
                        <div
                          key={n.type}
                          draggable
                          onDragStart={(e) => onDragStart(e, n.type)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-gray-600 cursor-grab bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm hover:text-gray-800 transition-all select-none"
                          style={{ borderLeft: `3px solid ${cat.color}` }}
                        >
                          {n.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
