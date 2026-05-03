import { useEffect, useRef, useState } from 'react'
import { listFiles, uploadFile } from '../../api/files'
import type { UploadedFile, SheetInfo } from '../../types'

interface Props {
  config: Record<string, unknown>
  nodeType: string
  onChange: (config: Record<string, unknown>) => void
}

export default function InputNodeConfig({ config, nodeType, onChange }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listFiles()
      .then(setFiles)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selectedFile = files.find((f) => f.id === config.file_id)
  const sheets = selectedFile ? Object.entries(selectedFile.sheets) : []
  const selectedSheet = (config.sheet as string) || (sheets[0]?.[0] ?? '')
  const sheetInfo: SheetInfo | undefined = selectedSheet
    ? (selectedFile?.sheets[selectedSheet] as SheetInfo)
    : undefined

  function handleFileChange(fileId: string) {
    const file = files.find((f) => f.id === fileId)
    const firstSheet = file ? Object.keys(file.sheets)[0] : undefined
    onChange({ ...config, file_id: fileId, sheet: firstSheet })
  }

  function handleSheetChange(sheet: string) {
    onChange({ ...config, sheet })
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length) return
    setUploadError(null)
    setUploading(true)
    try {
      const uploaded = await uploadFile(fileList[0])
      const refreshed = await listFiles()
      setFiles(refreshed)
      handleFileChange(uploaded.id)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-uploaded if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return <p className="text-[11px] text-gray-400">Loading files…</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden file input — shared by both upload buttons */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {files.length === 0 ? (
        /* ── Empty state ─────────────────────────────────── */
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-[11px] text-gray-400">No files uploaded yet.</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 text-[11px] rounded border border-dashed border-gray-300 text-gray-500 hover:border-[#217346] hover:text-[#217346] disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Uploading…' : '+ Upload file'}
          </button>
          {uploadError && <p className="text-[10px] text-red-500">{uploadError}</p>}
        </div>
      ) : (
        <>
          {/* ── File selector ─────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-gray-600">File</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[10px] text-[#217346] hover:underline disabled:opacity-50 transition-opacity"
              >
                {uploading ? 'Uploading…' : '+ Upload new'}
              </button>
            </div>
            {uploadError && <p className="text-[10px] text-red-500 mb-1">{uploadError}</p>}
            <select
              className="w-full px-2 py-1.5 text-[11px] rounded border border-gray-300 bg-white text-gray-700 focus:outline-none focus:border-[#217346] transition-colors"
              value={(config.file_id as string) ?? ''}
              onChange={(e) => handleFileChange(e.target.value)}
            >
              <option value="">— Select a file —</option>
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.file_type === 'csv' ? '📄' : '📊'} {f.original_filename}
                </option>
              ))}
            </select>
          </div>

          {/* ── Sheet selector — only for Excel / multi-sheet ── */}
          {nodeType === 'excel_input' && sheets.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Sheet</label>
              <div className="flex flex-col gap-1">
                {sheets.map(([name, info]) => {
                  const si = info as SheetInfo
                  const isSelected = selectedSheet === name
                  return (
                    <button
                      key={name}
                      onClick={() => handleSheetChange(name)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-left transition-colors ${
                        isSelected
                          ? 'border-[#217346] bg-green-50 text-[#217346]'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-[10px] shrink-0">{isSelected ? '●' : '○'}</span>
                      <span className="flex-1 text-[11px] font-medium truncate">{name}</span>
                      <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
                        {si.row_count.toLocaleString()}r · {si.columns.length}c
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Column preview ───────────────────────────── */}
          {sheetInfo && (
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Columns in <span className="text-gray-700">{selectedSheet}</span>
              </label>
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-2 py-1 text-gray-500 font-medium">Column</th>
                      <th className="text-left px-2 py-1 text-gray-500 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetInfo.columns.map((col, i) => (
                      <tr key={col.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-2 py-0.5 text-gray-700 truncate max-w-[100px]">{col.name}</td>
                        <td className="px-2 py-0.5 text-gray-400">{col.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
