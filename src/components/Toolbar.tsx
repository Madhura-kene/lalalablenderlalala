import React from 'react'
import { useSceneStore } from '../store/useSceneStore'
import { 
  MousePointer, 
  Move, 
  RotateCw, 
  Maximize2, 
  SquarePlus, 
  PenTool, 
  Settings,
  ArrowUpFromLine
} from 'lucide-react'

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool, addObject, selectedIds, objects } = useSceneStore()

  const transformTools = [
    { id: 'select', name: 'Select', icon: MousePointer, shortcut: 'A' },
    { id: 'move',   name: 'Move',   icon: Move,          shortcut: 'G' },
    { id: 'rotate', name: 'Rotate', icon: RotateCw,      shortcut: 'R' },
    { id: 'scale',  name: 'Scale',  icon: Maximize2,     shortcut: 'S' },
  ] as const

  const handleExtrude = () => {
    // Fire an E keydown event so the Viewport picks it up via its keydown handler
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }))
  }

  return (
    <div className="w-10 bg-bg-panel border-r border-border flex flex-col items-center py-2 h-full z-40 select-none">
      {/* Transform tools */}
      <div className="flex flex-col items-center space-y-1 w-full">
        {transformTools.map((tool) => {
          const Icon = tool.icon
          const isActive = activeTool === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id as any)}
              title={`${tool.name} [${tool.shortcut}]`}
              className={`toolbar-btn group relative cursor-pointer transition-all ${
                isActive
                  ? 'bg-accent-blue text-white shadow-md'
                  : 'text-text-primary/70 hover:text-white hover:bg-border/30'
              }`}
            >
              <Icon size={14} className="stroke-[2.2px]" />
              <div className="absolute left-10 scale-0 group-hover:scale-100 transition-all origin-left bg-bg-deep border border-border text-[9.5px] px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
                {tool.name} [{tool.shortcut}]
              </div>
            </button>
          )
        })}
      </div>

      <hr className="tool-sep w-6 border-border" />

      {/* Mesh tools */}
      <div className="flex flex-col items-center space-y-1 w-full">
        {/* Add Cube */}
        <button
          onClick={() =>
            addObject({
              name: 'Cube',
              type: 'mesh',
              visible: true,
              locked: false,
              position: [0, 0.5, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
              geometryType: 'cube',
            })
          }
          title="Add Cube [Shift+A]"
          className="toolbar-btn group relative cursor-pointer text-text-primary/70 hover:text-white hover:bg-border/30 transition-all"
        >
          <SquarePlus size={14} className="stroke-[2.2px]" />
          <div className="absolute left-10 scale-0 group-hover:scale-100 transition-all origin-left bg-bg-deep border border-border text-[9.5px] px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
            Add Cube [Shift+A]
          </div>
        </button>

        {/* Extrude — only highlighted when a mesh is selected */}
        <button
          onClick={handleExtrude}
          title="Extrude [E] — select a mesh first"
          className={`toolbar-btn group relative cursor-pointer transition-all ${
            selectedIds.length > 0 && objects.find(o => o.id === selectedIds[0])?.type === 'mesh'
              ? 'text-accent-orange hover:bg-accent-orange/20'
              : 'text-text-primary/30 cursor-not-allowed'
          }`}
        >
          <ArrowUpFromLine size={14} className="stroke-[2.2px]" />
          <div className="absolute left-10 scale-0 group-hover:scale-100 transition-all origin-left bg-bg-deep border border-border text-[9.5px] px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
            Extrude [E]
          </div>
        </button>

        {/* Draw Shape */}
        <button
          onClick={() => setActiveTool('shape-draw')}
          title="Draw Shape [Tab]"
          className={`toolbar-btn group relative cursor-pointer transition-all ${
            activeTool === 'shape-draw'
              ? 'bg-accent-blue text-white shadow-md'
              : 'text-text-primary/70 hover:text-white hover:bg-border/30'
          }`}
        >
          <PenTool size={14} className="stroke-[2.2px]" />
          <div className="absolute left-10 scale-0 group-hover:scale-100 transition-all origin-left bg-bg-deep border border-border text-[9.5px] px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
            Draw Shape [Tab]
          </div>
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <button
        onClick={() => alert('Settings is a Phase 2 feature!')}
        title="Settings"
        className="w-7 h-7 rounded flex items-center justify-center text-text-primary/70 hover:text-white hover:bg-border/30 cursor-pointer"
      >
        <Settings size={14} className="stroke-[2.2px]" />
      </button>
    </div>
  )
}
