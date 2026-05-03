const INPUT_CLS = 'w-full px-2 py-1.5 text-[11px] rounded border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#217346] transition-colors'

interface Props {
  config: Record<string, unknown>
  nodeType: string
  onChange: (config: Record<string, unknown>) => void
}

export default function JoinConfig({ config, nodeType, onChange }: Props) {
  const isLookup = nodeType === 'lookup'

  return (
    <div className="flex flex-col gap-3">
      {isLookup && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-700">
          Connect <strong>main</strong> table to the left handle and <strong>lookup</strong> table to the right handle.
        </div>
      )}

      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">
          {isLookup ? 'Main table key' : 'Left table key'}
        </label>
        <input
          placeholder="e.g. customer_id"
          value={(config[isLookup ? 'main_key' : 'left_key'] as string) ?? ''}
          onChange={(e) => onChange({ ...config, [isLookup ? 'main_key' : 'left_key']: e.target.value })}
          className={INPUT_CLS}
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">
          {isLookup ? 'Lookup table key' : 'Right table key'}
        </label>
        <input
          placeholder="e.g. id"
          value={(config[isLookup ? 'lookup_key' : 'right_key'] as string) ?? ''}
          onChange={(e) => onChange({ ...config, [isLookup ? 'lookup_key' : 'right_key']: e.target.value })}
          className={INPUT_CLS}
        />
      </div>

      {!isLookup && (
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Join type</label>
          <div className="grid grid-cols-2 gap-1">
            {[
              { value: 'left',  label: 'Left join' },
              { value: 'inner', label: 'Inner join' },
              { value: 'right', label: 'Right join' },
              { value: 'full',  label: 'Full join' },
            ].map((jt) => {
              const selected = ((config.join_type as string) ?? 'left') === jt.value
              return (
                <button
                  key={jt.value}
                  onClick={() => onChange({ ...config, join_type: jt.value })}
                  className={`px-2 py-1.5 rounded border text-[11px] transition-colors ${
                    selected
                      ? 'border-[#217346] bg-green-50 text-[#217346] font-medium'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {jt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {isLookup && (
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">
            Return columns <span className="text-gray-400 font-normal">(comma-separated, blank = all)</span>
          </label>
          <input
            placeholder="provider_name, rate_code"
            value={
              Array.isArray(config.return_columns)
                ? (config.return_columns as string[]).join(', ')
                : ((config.return_columns as string) ?? '')
            }
            onChange={(e) =>
              onChange({
                ...config,
                return_columns: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            className={INPUT_CLS}
          />
        </div>
      )}
    </div>
  )
}
