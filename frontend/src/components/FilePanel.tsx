import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadFile, listFiles, deleteFile } from '../api/files'
import type { UploadedFile, SheetInfo } from '../types'

const TYPE_BADGE: Record<string, string> = {
  string:  'bg-sky-50 text-sky-600',
  number:  'bg-emerald-50 text-emerald-600',
  integer: 'bg-emerald-50 text-emerald-600',
  date:    'bg-amber-50 text-amber-600',
  boolean: 'bg-purple-50 text-purple-600',
  any:     'bg-gray-50 text-gray-500',
}

export default function FilePanel() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try { setFiles(await listFiles()) } catch { /* backend offline */ }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    setError(null)
    setUploading(true)
    try {
      for (const f of Array.from(fileList)) await uploadFile(f)
      await load()
      // Auto-expand newly uploaded file
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteFile(id)
    setFiles((p) => p.filter((f) => f.id !== id))
    setExpanded((p) => { const n = new Set(p); n.delete(id); return n })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Upload zone */}
      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`mx-2 mt-2 mb-1 p-2.5 rounded border-2 border-dashed cursor-pointer text-center transition-colors ${
          dragOver
            ? 'border-[#217346] bg-green-50'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <p className="text-xs text-[#217346]">Uploading…</p>
        ) : (
          <>
            <p className="text-xs font-medium text-gray-500">Upload files</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Excel, CSV — drag & drop or click</p>
          </>
        )}
      </div>

      {error && (
        <p className="mx-2 mb-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center mt-6 px-4">
            No files yet. Upload an Excel or CSV file to begin.
          </p>
        ) : (
          files.map((f) => (
            <FileRow
              key={f.id}
              file={f}
              expanded={expanded.has(f.id)}
              onToggle={() => toggleExpand(f.id)}
              onDelete={(e) => handleDelete(f.id, e)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function FileRow({
  file, expanded, onToggle, onDelete,
}: {
  file: UploadedFile
  expanded: boolean
  onToggle: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const sheetCount = Object.keys(file.sheets).length
  const icon = file.file_type === 'csv' ? '📄' : '📊'

  return (
    <div className="border-b border-gray-100">
      <div
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-gray-50 group"
      >
        <span className="text-[10px] text-gray-400 w-3 shrink-0">
          {expanded ? '▾' : '▸'}
        </span>
        <span className="text-xs mr-0.5">{icon}</span>
        <span className="flex-1 truncate text-[11px] text-gray-700 font-medium" title={file.original_filename}>
          {file.original_filename}
        </span>
        <span className="text-[10px] text-gray-400 shrink-0">{sheetCount}sh</span>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 ml-1 text-gray-300 hover:text-red-500 transition-all text-xs leading-none"
          title="Remove file"
        >
          ×
        </button>
      </div>

      {expanded && (
        <div className="pl-7 pr-2 pb-1">
          {Object.entries(file.sheets).map(([name, sheet]) => (
            <SheetRow key={name} fileId={file.id} name={name} sheet={sheet as SheetInfo} />
          ))}
        </div>
      )}
    </div>
  )
}

function SheetRow({ fileId, name, sheet }: { fileId: string; name: string; sheet: SheetInfo }) {
  const [open, setOpen] = useState(false)

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/gridflow-node', 'excel_input')
    e.dataTransfer.setData(
      'application/gridflow-node-config',
      JSON.stringify({ file_id: fileId, sheet: name }),
    )
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="mb-0.5">
      <div
        className="flex items-center gap-1.5 py-1 px-1 rounded hover:bg-gray-50 group"
      >
        <button
          className="text-[10px] text-gray-400 w-3 shrink-0 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '▾' : '▸'}
        </button>
        <span className="text-[10px] text-gray-400 shrink-0">⊞</span>
        <span
          className="flex-1 text-[11px] text-gray-600 truncate cursor-grab"
          draggable
          onDragStart={onDragStart}
          title={`Drag to canvas to add as input — ${name}`}
        >
          {name}
        </span>
        <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
          {sheet.row_count.toLocaleString()}r
        </span>
        <span
          draggable
          onDragStart={onDragStart}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-[#217346] cursor-grab shrink-0 transition-opacity"
          title="Drag to canvas"
        >
          ⊕
        </span>
      </div>

      {open && (
        <div className="ml-5 mb-1 border border-gray-100 rounded overflow-hidden">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-2 py-0.5 text-gray-500 font-medium">Column</th>
                <th className="text-left px-2 py-0.5 text-gray-500 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {sheet.columns.map((col) => (
                <tr key={col.name} className="border-t border-gray-100">
                  <td className="px-2 py-0.5 text-gray-700 truncate max-w-[80px]">{col.name}</td>
                  <td className="px-2 py-0.5">
                    <span className={`px-1 rounded text-[9px] ${TYPE_BADGE[col.type] ?? TYPE_BADGE.any}`}>
                      {col.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
