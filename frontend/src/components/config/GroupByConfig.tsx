interface Aggregation {
  column: string
  function: string
  output_name: string
}

const AGG_FNS = ['sum', 'avg', 'count', 'count_distinct', 'min', 'max']
const INPUT_CLS = 'w-full px-2 py-1.5 text-[11px] rounded border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#217346] transition-colors'

interface Props {
  config: Record<string, unknown>
  nodeType: string
  onChange: (config: Record<string, unknown>) => void
}

export default function GroupByConfig({ config, onChange }: Props) {
  const groupColumns: string[] = (config.group_columns as string[]) ?? []
  const aggregations: Aggregation[] = (config.aggregations as Aggregation[]) ?? [
    { column: '', function: 'sum', output_name: '' },
  ]

  function setGroupCols(value: string) {
    onChange({ ...config, group_columns: value.split(',').map((s) => s.trim()).filter(Boolean) })
  }

  function updateAgg(i: number, patch: Partial<Aggregation>) {
    onChange({ ...config, aggregations: aggregations.map((a, idx) => idx === i ? { ...a, ...patch } : a) })
  }

  function addAgg() {
    onChange({ ...config, aggregations: [...aggregations, { column: '', function: 'sum', output_name: '' }] })
  }

  function removeAgg(i: number) {
    onChange({ ...config, aggregations: aggregations.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">
          Group by <span className="text-gray-400 font-normal">(comma-separated)</span>
        </label>
        <input
          placeholder="region, product_type"
          value={groupColumns.join(', ')}
          onChange={(e) => setGroupCols(e.target.value)}
          className={INPUT_CLS}
        />
      </div>

      <div>
        <p className="text-[11px] font-medium text-gray-600 mb-1.5">Metrics</p>
        <div className="flex flex-col gap-1.5">
          {aggregations.map((agg, i) => (
            <div key={i} className="border border-gray-200 rounded p-2 bg-gray-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400">Metric {i + 1}</span>
                {aggregations.length > 1 && (
                  <button onClick={() => removeAgg(i)} className="text-[10px] text-gray-300 hover:text-red-500 transition-colors">
                    Remove
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input
                  placeholder="Column"
                  value={agg.column}
                  onChange={(e) => updateAgg(i, { column: e.target.value })}
                  className={INPUT_CLS}
                />
                <div className="flex gap-1">
                  <select
                    value={agg.function}
                    onChange={(e) => updateAgg(i, { function: e.target.value })}
                    className={INPUT_CLS}
                  >
                    {AGG_FNS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <input
                    placeholder="Output name"
                    value={agg.output_name}
                    onChange={(e) => updateAgg(i, { output_name: e.target.value })}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addAgg}
          className="mt-1.5 text-[11px] text-[#217346] hover:text-[#1a5c38] transition-colors"
        >
          + Add metric
        </button>
      </div>
    </div>
  )
}
