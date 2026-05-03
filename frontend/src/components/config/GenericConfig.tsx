/**
 * Fallback config for nodes without a dedicated form.
 * Renders a simple key=value editor for each config field,
 * plus a raw JSON editor for power users.
 */
import { useState } from 'react'

interface Props {
  config: Record<string, unknown>
  nodeType: string
  onChange: (config: Record<string, unknown>) => void
}

// Field definitions per node type for a nicer UX than raw JSON
const FIELD_DEFS: Record<string, Array<{ key: string; label: string; type?: string; placeholder?: string }>> = {
  add_column: [
    { key: 'column_name', label: 'New column name', placeholder: 'profit' },
    { key: 'expression', label: 'Expression', placeholder: '[Revenue] - [Cost]' },
  ],
  select_columns: [
    { key: 'columns', label: 'Columns (comma-separated)', placeholder: 'name, revenue, status' },
  ],
  drop_columns: [
    { key: 'columns', label: 'Columns to drop (comma-separated)', placeholder: 'temp_col, debug_col' },
  ],
  rename_columns: [
    { key: '_renames_raw', label: 'Renames (old:new, one per line)', placeholder: 'CustomerName:customer_name\nOrderAmt:order_amount', type: 'textarea' },
  ],
  sort_rows: [
    { key: '_sort_raw', label: 'Sort columns (col:asc or col:desc, one per line)', placeholder: 'date:desc\nname:asc', type: 'textarea' },
  ],
  remove_duplicates: [
    { key: 'subset', label: 'Subset columns (comma-separated, blank = all)', placeholder: 'email, phone' },
  ],
  top_n_rows: [
    { key: 'n', label: 'Number of rows', placeholder: '100', type: 'number' },
    { key: 'order_by', label: 'Order by column (optional)', placeholder: 'date' },
    { key: 'direction', label: 'Direction (asc / desc)', placeholder: 'desc' },
  ],
  trim_text: [
    { key: 'columns', label: 'Columns (comma-separated, blank = all)', placeholder: 'name, address' },
  ],
  fill_missing: [
    { key: 'column', label: 'Column', placeholder: 'revenue' },
    { key: 'strategy', label: 'Strategy (value / mean / median)', placeholder: 'value' },
    { key: 'fill_value', label: 'Fill value (for strategy=value)', placeholder: '0' },
  ],
  replace_values: [
    { key: 'column', label: 'Column' },
    { key: 'find', label: 'Find' },
    { key: 'replace', label: 'Replace with' },
  ],
  standardize_case: [
    { key: 'columns', label: 'Columns (comma-separated)', placeholder: 'name, city' },
    { key: 'case', label: 'Case (upper / lower / title)', placeholder: 'lower' },
  ],
  split_column: [
    { key: 'column', label: 'Column to split' },
    { key: 'delimiter', label: 'Delimiter', placeholder: ',' },
    { key: 'output_columns', label: 'Output column names (comma-separated)', placeholder: 'first_name, last_name' },
  ],
  merge_columns: [
    { key: 'columns', label: 'Columns to merge (comma-separated)', placeholder: 'first_name, last_name' },
    { key: 'separator', label: 'Separator', placeholder: ' ' },
    { key: 'output_column', label: 'Output column name', placeholder: 'full_name' },
  ],
  date_extract: [
    { key: 'column', label: 'Date column' },
    { key: 'parts', label: 'Parts (comma-separated: year/month/day/weekday/quarter)', placeholder: 'year, month, day' },
  ],
  change_data_type: [
    { key: 'column', label: 'Column' },
    { key: 'to_type', label: 'Target type (string/number/integer/date/boolean)' },
  ],
  append_tables: [
    { key: 'match_by', label: 'Match by (name / position)', placeholder: 'name' },
  ],
  excel_output: [
    { key: 'filename', label: 'Filename', placeholder: 'output.xlsx' },
    { key: 'sheet_name', label: 'Sheet name', placeholder: 'Sheet1' },
  ],
  csv_output: [
    { key: 'filename', label: 'Filename', placeholder: 'output.csv' },
  ],
  validate_regex: [
    { key: 'column', label: 'Column' },
    { key: 'preset', label: 'Preset (phone / email / zip / number — overrides pattern)', placeholder: 'phone' },
    { key: 'pattern', label: 'Custom regex pattern (if no preset)', placeholder: '^\\d{10}$' },
  ],
  find_duplicates: [
    { key: 'subset', label: 'Subset columns (comma-separated, blank = all)', placeholder: 'email, phone' },
  ],
  find_missing: [
    { key: 'columns', label: 'Columns to check (comma-separated, blank = all)', placeholder: 'name, email, phone' },
  ],
  conditional_column: [
    { key: 'column_name', label: 'New column name', placeholder: 'priority' },
    { key: '_conditions_raw', label: 'Conditions (when:then, one per line)', type: 'textarea', placeholder: '[status] = \'Active\':Yes\n[status] = \'Inactive\':No' },
    { key: 'else_value', label: 'Else value', placeholder: 'Unknown' },
  ],
  lookup: [
    { key: 'return_columns', label: 'Return columns (comma-separated, blank = all)', placeholder: 'provider_name, rate' },
  ],
}

export default function GenericConfig({ config, nodeType, onChange }: Props) {
  const [showRaw, setShowRaw] = useState(false)
  const [rawJson, setRawJson] = useState(JSON.stringify(config, null, 2))
  const [jsonError, setJsonError] = useState<string | null>(null)

  const fields = FIELD_DEFS[nodeType] ?? []

  function getValue(key: string): string {
    if (key === '_renames_raw') {
      const renames = (config.renames as Array<{ from: string; to: string }>) ?? []
      return renames.map((r) => `${r.from}:${r.to}`).join('\n')
    }
    if (key === '_sort_raw') {
      const cols = (config.columns as Array<{ name: string; direction: string }>) ?? []
      return cols.map((c) => `${c.name}:${c.direction ?? 'asc'}`).join('\n')
    }
    if (key === '_conditions_raw') {
      const conds = (config.conditions as Array<{ when: string; then: unknown }>) ?? []
      return conds.map((c) => `${c.when}:${c.then}`).join('\n')
    }
    const val = config[key]
    if (Array.isArray(val)) return val.join(', ')
    return val !== undefined && val !== null ? String(val) : ''
  }

  function setValue(key: string, raw: string) {
    if (key === '_renames_raw') {
      const renames = raw
        .split('\n')
        .map((line) => line.split(':'))
        .filter((parts) => parts.length === 2 && parts[0].trim())
        .map(([from, to]) => ({ from: from.trim(), to: to.trim() }))
      onChange({ ...config, renames })
      return
    }
    if (key === '_sort_raw') {
      const columns = raw
        .split('\n')
        .map((line) => line.split(':'))
        .filter((parts) => parts[0].trim())
        .map(([name, direction]) => ({ name: name.trim(), direction: (direction ?? 'asc').trim() }))
      onChange({ ...config, columns })
      return
    }
    if (key === '_conditions_raw') {
      const conditions = raw
        .split('\n')
        .map((line) => {
          const idx = line.indexOf(':')
          if (idx < 0) return null
          return { when: line.slice(0, idx).trim(), then: line.slice(idx + 1).trim() }
        })
        .filter(Boolean)
      onChange({ ...config, conditions })
      return
    }

    // Comma-separated → array for 'columns' and 'parts' and 'return_columns'
    if (['columns', 'parts', 'output_columns', 'return_columns'].includes(key) && raw.includes(',')) {
      onChange({ ...config, [key]: raw.split(',').map((s) => s.trim()).filter(Boolean) })
      return
    }
    if (['columns', 'parts', 'output_columns', 'return_columns'].includes(key) && raw.trim() === '') {
      onChange({ ...config, [key]: [] })
      return
    }
    onChange({ ...config, [key]: raw })
  }

  function applyRawJson() {
    try {
      const parsed = JSON.parse(rawJson)
      onChange(parsed)
      setJsonError(null)
    } catch (e) {
      setJsonError('Invalid JSON')
    }
  }

  const INPUT_CLS = 'w-full px-2 py-1.5 text-[11px] rounded border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#217346] transition-colors'

  if (fields.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-gray-400">No configuration needed for this node type.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-600">{f.label}</span>
          {f.type === 'textarea' ? (
            <textarea
              rows={3}
              placeholder={f.placeholder}
              value={getValue(f.key)}
              onChange={(e) => setValue(f.key, e.target.value)}
              className={INPUT_CLS + ' font-mono resize-y'}
            />
          ) : (
            <input
              type={f.type ?? 'text'}
              placeholder={f.placeholder}
              value={getValue(f.key)}
              onChange={(e) => setValue(f.key, e.target.value)}
              className={INPUT_CLS}
            />
          )}
        </label>
      ))}

      <div className="border-t border-gray-100 pt-2">
        <button
          onClick={() => {
            setRawJson(JSON.stringify(config, null, 2))
            setShowRaw((v) => !v)
          }}
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showRaw ? 'Hide' : 'Show'} raw JSON
        </button>
        {showRaw && (
          <div className="mt-1.5 flex flex-col gap-1">
            <textarea
              rows={6}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              className={INPUT_CLS + ' font-mono resize-y'}
            />
            {jsonError && <p className="text-[11px] text-red-500">{jsonError}</p>}
            <button
              onClick={applyRawJson}
              className="px-2 py-1 text-xs bg-[#217346] hover:bg-[#1a5c38] rounded text-white transition-colors"
            >
              Apply JSON
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
