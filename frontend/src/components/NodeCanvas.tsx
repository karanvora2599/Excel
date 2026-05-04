import { useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  ConnectionLineType,
  type NodeMouseHandler,
} from '@xyflow/react'
import { useWorkflowStore, type FlowNode } from '../store/workflowStore'
import GridFlowNode from './canvas/GridFlowNode'
import { CATEGORY_COLOR } from '../constants/nodeColors'

const nodeTypes = { gridflowNode: GridFlowNode }

const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep' as const,
  style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#a1a1aa', width: 14, height: 14 },
}

export default function NodeCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, selectNode } =
    useWorkflowStore()

  const wrapperRef = useRef<HTMLDivElement>(null)

  const onNodeClick = useCallback<NodeMouseHandler>((_e, node) => selectNode(node.id), [selectNode])
  const onPaneClick = useCallback(() => selectNode(null), [selectNode])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/gridflow-node')
      if (!nodeType || !wrapperRef.current) return

      const configStr = e.dataTransfer.getData('application/gridflow-node-config')
      const initialConfig = configStr ? (JSON.parse(configStr) as Record<string, unknown>) : undefined

      const rect = wrapperRef.current.getBoundingClientRect()
      addNode(nodeType, { x: e.clientX - rect.left - 64, y: e.clientY - rect.top - 18 }, initialConfig)
    },
    [addNode],
  )

  const isEmpty = nodes.length === 0

  return (
    <div ref={wrapperRef} className="w-full h-full" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        deleteKeyCode="Delete"
        style={{ background: '#f8f9fa' }}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: '#217346', strokeWidth: 1.5, strokeDasharray: '5 3' }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          color="#e4e4e7"
          gap={24}
          style={{ opacity: 0.7 }}
        />
        <Controls position="bottom-right" />
        <MiniMap
          style={{ background: '#ffffff', border: '1px solid #e4e7eb' }}
          nodeColor={(n: FlowNode) => CATEGORY_COLOR[n.data?.nodeType] ?? '#d1d5db'}
          maskColor="rgba(248,249,250,0.7)"
        />

        {isEmpty && (
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div className="flex flex-col items-center gap-4 select-none">
              {/* Pipeline illustration */}
              <svg width="72" height="52" viewBox="0 0 72 52" fill="none">
                <rect x="1" y="18" width="18" height="13" rx="3" fill="#e4e4e7" stroke="#d4d4d8" strokeWidth="1"/>
                <rect x="27" y="5"  width="18" height="13" rx="3" fill="#e4e4e7" stroke="#d4d4d8" strokeWidth="1"/>
                <rect x="27" y="32" width="18" height="13" rx="3" fill="#e4e4e7" stroke="#d4d4d8" strokeWidth="1"/>
                <rect x="53" y="18" width="18" height="13" rx="3" fill="#e4e4e7" stroke="#d4d4d8" strokeWidth="1"/>
                <path d="M19 24.5 C23 24.5 23 11.5 27 11.5" stroke="#d4d4d8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <path d="M19 24.5 C23 24.5 23 38.5 27 38.5" stroke="#d4d4d8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <path d="M45 11.5 C49 11.5 49 24.5 53 24.5" stroke="#d4d4d8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <path d="M45 38.5 C49 38.5 49 24.5 53 24.5" stroke="#d4d4d8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>

              <div className="text-center">
                <p className="text-[13px] font-medium text-gray-400">Drop nodes here to build your pipeline</p>
                <p className="text-[11px] text-gray-300 mt-1">
                  Drag from the left panel · or drag sheets from the Files tab
                </p>
              </div>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  )
}
