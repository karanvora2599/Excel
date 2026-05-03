import { useWorkflowStore } from './store/workflowStore'
import NodeSidebar from './components/NodeSidebar'
import NodeCanvas from './components/NodeCanvas'
import ConfigPanel from './components/ConfigPanel'
import PreviewPanel from './components/PreviewPanel'

export default function App() {
  const { workflowName, running, runGraph, saveWorkflow, setWorkflowName } = useWorkflowStore()

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] text-gray-800 select-none">

      {/* ── Title bar ─────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-3 h-9 bg-white border-b border-gray-200 shadow-sm shrink-0 z-20">
        {/* Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-4 h-4 rounded-sm bg-[#217346] flex items-center justify-center">
            <span className="text-white text-[9px] font-bold leading-none">G</span>
          </div>
          <span className="text-[13px] font-semibold text-gray-700 tracking-tight">GridFlow</span>
        </div>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Workflow name */}
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="text-[13px] text-gray-600 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#217346] focus:outline-none px-0.5 py-0 w-48 transition-colors"
        />

        {/* Actions */}
        <div className="flex gap-1.5 ml-auto items-center">
          <button
            onClick={() => saveWorkflow()}
            className="px-3 h-6 text-xs rounded text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => runGraph()}
            disabled={running}
            className={`px-3 h-6 text-xs rounded font-medium transition-colors ${
              running
                ? 'bg-[#1a5c38] text-green-100 cursor-not-allowed opacity-70'
                : 'bg-[#217346] hover:bg-[#1a5c38] text-white'
            }`}
          >
            {running ? '⟳ Running…' : '▶ Run'}
          </button>
        </div>
      </header>

      {/* ── Main workspace ────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <aside className="w-52 shrink-0 bg-white border-r border-gray-200 overflow-hidden flex flex-col">
          <NodeSidebar />
        </aside>

        {/* Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <NodeCanvas />
        </main>

        {/* Right config panel */}
        <aside className="w-64 shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
          <ConfigPanel />
        </aside>
      </div>

      {/* ── Bottom preview panel ──────────────────────────────── */}
      <div className="h-48 shrink-0 bg-white border-t border-gray-200 overflow-hidden flex flex-col">
        <PreviewPanel />
      </div>
    </div>
  )
}
