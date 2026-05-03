import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useWorkflowStore } from '../store/workflowStore'

type Tab = 'preview' | 'schema' | 'stats' | 'errors'

export default function PreviewPanel() {
  const [tab, setTab] = useState<Tab>('preview')
  const { selectedNodeId, results, nodes } = useWorkflowStore()
  const node = nodes.find((n) => n.id === selectedNodeId)
  const result = selectedNodeId ? results[selectedNodeId] : null

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-3 border-b border-gray-200 bg-gray-50 shrink-0">
        {(['preview', 'schema', 'stats', 'errors'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2.5 py-1.5 text-[11px] capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-[#217346] text-[#217346] font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
            {t === 'errors' && result && result.errors.length > 0 && (
              <span className="ml-1 px-1 bg-red-100 text-red-600 rounded text-[9px] font-semibold">
                {result.errors.length}
              </span>
            )}
          </button>
        ))}

        {/* Right info */}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-gray-400">
          {node && <span className="font-medium text-gray-600">{node.data.label}</span>}
          {result && (
            <span>{result.row_count.toLocaleString()} rows × {result.column_count} cols</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        {!result ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[11px] text-gray-400">
              {selectedNodeId ? 'Click Run to execute and preview output' : 'Select a node to see its output'}
            </p>
          </div>
        ) : tab === 'preview' ? (
          <DataTable data={result.preview} />
        ) : tab === 'schema' ? (
          <SchemaView columns={result.columns} />
        ) : tab === 'stats' ? (
          <StatsView result={result} />
        ) : (
          <ErrorsView result={result} />
        )}
      </div>
    </div>
  )
}

function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data || data.length === 0) {
    return <p className="p-3 text-[11px] text-gray-400">No rows</p>
  }

  const columns: ColumnDef<Record<string, unknown>>[] = Object.keys(data[0]).map((col) => ({
    id: col,
    accessorKey: col,
    header: col,
    cell: ({ getValue }) => {
      const v = getValue()
      const str = v === null || v === undefined ? '' : String(v)
      return <span title={str}>{str}</span>
    },
    size: 120,
  }))

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-[11px] border-collapse">
        <thead className="sticky top-0 z-10 bg-[#f9f9f9]">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="text-left px-3 py-1.5 text-gray-600 font-semibold border-b border-r border-gray-200 whitespace-nowrap bg-[#f0f0f0] text-[11px]"
                  style={{ minWidth: 80 }}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-3 py-1 text-gray-700 border-b border-r border-gray-100 max-w-[160px] truncate"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SchemaView({ columns }: { columns: { name: string; type: string; nullable: boolean; sample_values: unknown[] }[] }) {
  const TYPE_BADGE: Record<string, string> = {
    string:  'bg-sky-50 text-sky-700',
    number:  'bg-emerald-50 text-emerald-700',
    integer: 'bg-emerald-50 text-emerald-700',
    date:    'bg-amber-50 text-amber-700',
    boolean: 'bg-purple-50 text-purple-700',
    any:     'bg-gray-100 text-gray-500',
  }
  return (
    <table className="w-full text-[11px] border-collapse">
      <thead className="sticky top-0 bg-[#f0f0f0]">
        <tr>
          {['Column', 'Type', 'Nullable', 'Samples'].map((h) => (
            <th key={h} className="text-left px-3 py-1.5 text-gray-600 font-semibold border-b border-r border-gray-200">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {columns.map((c, i) => (
          <tr key={c.name} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
            <td className="px-3 py-1.5 text-gray-800 font-medium border-b border-r border-gray-100">{c.name}</td>
            <td className="px-3 py-1.5 border-b border-r border-gray-100">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGE[c.type] ?? TYPE_BADGE.any}`}>
                {c.type}
              </span>
            </td>
            <td className="px-3 py-1.5 text-gray-500 border-b border-r border-gray-100">
              {c.nullable ? 'yes' : 'no'}
            </td>
            <td className="px-3 py-1.5 text-gray-500 border-b border-gray-100 max-w-[200px] truncate">
              {c.sample_values.slice(0, 3).join(', ')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function StatsView({ result }: {
  result: {
    row_count: number
    stats: { rows_in?: number | null; rows_out?: number | null; columns_added: string[]; columns_removed: string[] }
    warnings: string[]
  }
}) {
  const { stats, warnings } = result
  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Rows in" value={stats.rows_in ?? '—'} />
        <StatCard label="Rows out" value={stats.rows_out ?? result.row_count} />
        <StatCard label="Cols added" value={stats.columns_added.length} accent="#107c10" />
        <StatCard label="Cols removed" value={stats.columns_removed.length} accent="#c50f1f" />
      </div>

      {stats.columns_added.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Columns added</p>
          <div className="flex flex-wrap gap-1">
            {stats.columns_added.map((c) => (
              <span key={c} className="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-[10px]">{c}</span>
            ))}
          </div>
        </div>
      )}

      {stats.columns_removed.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Columns removed</p>
          <div className="flex flex-wrap gap-1">
            {stats.columns_removed.map((c) => (
              <span key={c} className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px]">{c}</span>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded">
          {warnings.map((w, i) => <p key={i} className="text-[11px] text-amber-700">{w}</p>)}
        </div>
      )}
    </div>
  )
}

function ErrorsView({ result }: { result: { errors: { message: string; row_index?: number }[]; warnings: string[] } }) {
  return (
    <div className="p-3 space-y-2">
      {result.errors.length === 0 ? (
        <p className="text-[11px] text-gray-400">No errors ✓</p>
      ) : (
        result.errors.map((e, i) => (
          <div key={i} className="p-2 bg-red-50 border border-red-200 rounded">
            {e.row_index !== undefined && (
              <p className="text-[10px] text-red-500 mb-0.5 font-medium">Row {e.row_index}</p>
            )}
            <p className="text-[11px] text-red-700 font-mono">{e.message}</p>
          </div>
        ))
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-2">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold" style={{ color: accent ?? '#1f2937' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}
