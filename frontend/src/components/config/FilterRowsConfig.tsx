interface Condition {
  column: string
  operator: string
  value: string
}

const OPERATORS = [
  { value: 'equals', label: '= equals' },
  { value: 'not_equals', label: '≠ not equals' },
  { value: 'greater_than', label: '> greater than' },
  { value: 'less_than', label: '< less than' },
  { value: 'greater_than_or_equal', label: '≥ ≥' },
  { value: 'less_than_or_equal', label: '≤ ≤' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
]

const INPUT_CLS = 'w-full px-2 py-1.5 text-[11px] rounded border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#217346] transition-colors'

interface Props {
  config: Record<string, unknown>
  nodeType: string
  onChange: (config: Record<string, unknown>) => void
}

export default function FilterRowsConfig({ config, onChange }: Props) {
  const conditions: Condition[] = (config.conditions as Condition[]) ?? [
    { column: '', operator: 'equals', value: '' },
  ]
  const logic: string = (config.logic as string) ?? 'AND'

  function updateCondition(i: number, patch: Partial<Condition>) {
    onChange({ ...config, conditions: conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c) })
  }

  function addCondition() {
    onChange({ ...config, conditions: [...conditions, { column: '', operator: 'equals', value: '' }] })
  }

  function removeCondition(i: number) {
    onChange({ ...config, conditions: conditions.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500">Match</span>
        {['AND', 'OR'].map((l) => (
          <button
            key={l}
            onClick={() => onChange({ ...config, logic: l })}
            className={`px-2.5 py-0.5 rounded text-[11px] border transition-colors ${
              logic === l
                ? 'bg-[#217346] text-white border-[#217346]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {l}
          </button>
        ))}
        <span className="text-[11px] text-gray-500">conditions</span>
      </div>

      {conditions.map((cond, i) => (
        <div key={i} className="border border-gray-200 rounded p-2 bg-gray-50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-400 font-medium">Condition {i + 1}</span>
            {conditions.length > 1 && (
              <button onClick={() => removeCondition(i)} className="text-[10px] text-gray-300 hover:text-red-500 transition-colors">
                Remove
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <input
              placeholder="Column name"
              value={cond.column}
              onChange={(e) => updateCondition(i, { column: e.target.value })}
              className={INPUT_CLS}
            />
            <select
              value={cond.operator}
              onChange={(e) => updateCondition(i, { operator: e.target.value })}
              className={INPUT_CLS}
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            {!['is_empty', 'is_not_empty'].includes(cond.operator) && (
              <input
                placeholder="Value"
                value={cond.value}
                onChange={(e) => updateCondition(i, { value: e.target.value })}
                className={INPUT_CLS}
              />
            )}
          </div>
        </div>
      ))}

      <button
        onClick={addCondition}
        className="text-[11px] text-[#217346] hover:text-[#1a5c38] transition-colors text-left"
      >
        + Add condition
      </button>
    </div>
  )
}
