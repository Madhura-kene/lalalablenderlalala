import React, { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '../store/useSceneStore'
import { Undo2, Redo2, HelpCircle, FileDown, FileUp, Hexagon } from 'lucide-react'

interface TopbarProps {
  onExport: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const Topbar: React.FC<TopbarProps> = ({ onExport, onImport }) => {
  const { 
    undo, 
    redo, 
    addObject, 
    historyIndex, 
    history
  } = useSceneStore()

  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Close menus on click outside
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenu(null)
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  const handleMenuClick = (e: React.MouseEvent, menuName: string) => {
    e.stopPropagation()
    setActiveMenu(activeMenu === menuName ? null : menuName)
  }

  const triggerImport = () => {
    fileInputRef.current?.click()
    setActiveMenu(null)
  }

  const handleAddMesh = (type: any, name: string) => {
    addObject({
      name,
      type: 'mesh',
      visible: true,
      locked: false,
      position: [0, type === 'plane' || type === 'circle' ? 0 : 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      geometryType: type,
    })
    setActiveMenu(null)
  }

  const handleAddLight = (type: 'point' | 'sun' | 'spot' | 'area', name: string) => {
    addObject({
      name,
      type: 'light',
      visible: true,
      locked: false,
      position: [0, 3, 0],
      rotation: type === 'sun' ? [-Math.PI / 4, Math.PI / 4, 0] : [0, 0, 0],
      scale: [1, 1, 1],
      lightConfig: {
        type,
        color: '#ffffff',
        intensity: type === 'sun' ? 1.0 : 5.0,
        castShadow: true,
      }
    })
    setActiveMenu(null)
  }

  return (
    <div className="h-7 bg-bg-header border-b border-border flex items-center justify-between px-3 select-none z-50 text-[11px] text-text-primary">
      {/* Left side: Logo & Menus */}
      <div className="flex items-center space-x-2">
        {/* Logo */}
        <span className="font-bold text-accent-orange flex items-center gap-1.5 mr-4 text-xs select-none">
          <Hexagon size={13} className="text-accent-orange fill-accent-orange/10 stroke-[2.5px]" />
          La Blender
        </span>

        {/* File Menu */}
        <div className="relative">
          <button 
            onClick={(e) => handleMenuClick(e, 'file')}
            className={`px-2 py-0.5 rounded hover:bg-border/30 cursor-pointer ${activeMenu === 'file' ? 'bg-border/55' : ''}`}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="absolute left-0 mt-1 w-40 bg-bg-panel border border-border shadow-lg rounded py-1 flex flex-col z-50">
              <button 
                onClick={() => { window.location.reload() }}
                className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>New Scene</span>
                <span className="text-[9px] text-text-dim hover:text-white/80">Ctrl+N</span>
              </button>
              <hr className="border-border my-1" />
              <button 
                onClick={triggerImport}
                className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5"><FileUp size={11} /> Import (.glb, .obj)</span>
              </button>
              <button 
                onClick={() => { onExport(); setActiveMenu(null); }}
                className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5"><FileDown size={11} /> Export Scene (.glb)</span>
              </button>
            </div>
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onImport} 
          accept=".glb,.gltf,.obj" 
          className="hidden" 
        />

        {/* Edit Menu */}
        <div className="relative">
          <button 
            onClick={(e) => handleMenuClick(e, 'edit')}
            className={`px-2 py-0.5 rounded hover:bg-border/30 cursor-pointer ${activeMenu === 'edit' ? 'bg-border/55' : ''}`}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div className="absolute left-0 mt-1 w-40 bg-bg-panel border border-border shadow-lg rounded py-1 flex flex-col z-50">
              <button 
                disabled={historyIndex <= 0}
                onClick={() => { undo(); setActiveMenu(null); }}
                className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-primary flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5"><Undo2 size={11} /> Undo</span>
                <span className="text-[9px] text-text-dim">Ctrl+Z</span>
              </button>
              <button 
                disabled={historyIndex >= history.length - 1}
                onClick={() => { redo(); setActiveMenu(null); }}
                className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-primary flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5"><Redo2 size={11} /> Redo</span>
                <span className="text-[9px] text-text-dim">Ctrl+Shift+Z</span>
              </button>
            </div>
          )}
        </div>

        {/* Render Menu */}
        <div className="relative">
          <button 
            onClick={(e) => handleMenuClick(e, 'render')}
            className={`px-2 py-0.5 rounded hover:bg-border/30 cursor-pointer ${activeMenu === 'render' ? 'bg-border/55' : ''}`}
          >
            Render
          </button>
          {activeMenu === 'render' && (
            <div className="absolute left-0 mt-1 w-40 bg-bg-panel border border-border shadow-lg rounded py-1 flex flex-col z-50">
              <button 
                onClick={() => { alert("Render Image is a Phase 2 feature!"); setActiveMenu(null); }}
                className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer"
              >
                Render Image
              </button>
            </div>
          )}
        </div>

        {/* Object Menu (Add options) */}
        <div className="relative">
          <button 
            onClick={(e) => handleMenuClick(e, 'object')}
            className={`px-2 py-0.5 rounded hover:bg-border/30 cursor-pointer ${activeMenu === 'object' ? 'bg-border/55' : ''}`}
          >
            Object
          </button>
          {activeMenu === 'object' && (
            <div className="absolute left-0 mt-1 w-48 bg-bg-panel border border-border shadow-lg rounded py-1 flex flex-col z-50">
              <div className="px-2 py-0.5 text-[9px] text-text-dim font-semibold uppercase tracking-wider">Add Mesh</div>
              <button onClick={() => handleAddMesh('cube', 'Cube')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">Cube</button>
              <button onClick={() => handleAddMesh('sphere', 'Sphere')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">UV Sphere</button>
              <button onClick={() => handleAddMesh('cylinder', 'Cylinder')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">Cylinder</button>
              <button onClick={() => handleAddMesh('cone', 'Cone')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">Cone</button>
              <button onClick={() => handleAddMesh('torus', 'Torus')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">Torus</button>
              <button onClick={() => handleAddMesh('plane', 'Plane')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">Plane</button>
              <button onClick={() => handleAddMesh('circle', 'Circle')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">Circle</button>
              <button onClick={() => handleAddMesh('icosphere', 'Icosphere')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">Icosphere</button>
              
              <hr className="border-border my-1" />
              <div className="px-2 py-0.5 text-[9px] text-text-dim font-semibold uppercase tracking-wider">Add Light</div>
              <button onClick={() => handleAddLight('point', 'Point Light')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">Point Light</button>
              <button onClick={() => handleAddLight('sun', 'Sun Light')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">Sun Light</button>
              <button onClick={() => handleAddLight('spot', 'Spot Light')} className="px-4 py-1 text-left hover:bg-accent-orange hover:text-white cursor-pointer">Spot Light</button>
            </div>
          )}
        </div>

        {/* Help Menu */}
        <div className="relative">
          <button 
            onClick={(e) => handleMenuClick(e, 'help')}
            className={`px-2 py-0.5 rounded hover:bg-border/30 cursor-pointer ${activeMenu === 'help' ? 'bg-border/55' : ''}`}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div className="absolute left-0 mt-1 w-40 bg-bg-panel border border-border shadow-lg rounded py-1 flex flex-col z-50">
              <button 
                onClick={() => { setShowShortcuts(true); setActiveMenu(null); }}
                className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Shortcuts Reference</span>
                <HelpCircle size={11} />
              </button>
              <a 
                href="https://docs.blender.org/" 
                target="_blank" 
                rel="noreferrer" 
                className="px-3 py-1 text-left hover:bg-accent-orange hover:text-white block cursor-pointer"
              >
                Blender Manual
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Version info */}
      <div className="flex items-center space-x-3 text-[10px] text-text-dim select-none font-mono">
        <span>WebForge 3D &middot; v0.1</span>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] text-text-primary">
          <div className="bg-bg-panel border border-border w-96 rounded-lg p-4 shadow-2xl relative">
            <h3 className="text-sm font-semibold text-accent-orange mb-3 border-b border-border pb-1">Blender Hotkeys Reference</h3>
            <div className="grid grid-cols-2 gap-y-2 text-[10.5px] max-h-60 overflow-y-auto pr-1">
              <span className="font-semibold text-text-dim">Shift + A</span>
              <span>Add Mesh / Light Menu</span>
              
              <span className="font-semibold text-text-dim">G / R / S</span>
              <span>Grab / Rotate / Scale</span>

              <span className="font-semibold text-text-dim">X / Y / Z</span>
              <span>Constrain active transform to axis</span>

              <span className="font-semibold text-text-dim">A</span>
              <span>Select all / Toggle deselect</span>

              <span className="font-semibold text-text-dim">X / Delete</span>
              <span>Delete Selected</span>

              <span className="font-semibold text-text-dim">Shift + D</span>
              <span>Duplicate Selected</span>

              <span className="font-semibold text-text-dim">Tab</span>
              <span>Toggle Shape Draw Mode</span>

              <span className="font-semibold text-text-dim">1 / 3 / 7</span>
              <span>Front / Right / Top Align</span>

              <span className="font-semibold text-text-dim">5</span>
              <span>Toggle Ortho / Perspective</span>

              <span className="font-semibold text-text-dim">Ctrl + Z / Shift+Z</span>
              <span>Undo / Redo</span>

              <span className="font-semibold text-text-dim">. (Period) / F</span>
              <span>Frame Selected Object</span>

              <span className="font-semibold text-text-dim">Middle Mouse Drag</span>
              <span>Orbit Viewport</span>

              <span className="font-semibold text-text-dim">Shift + MMB Drag</span>
              <span>Pan Viewport</span>
            </div>
            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => setShowShortcuts(false)}
                className="bg-accent-orange hover:bg-accent-orange/80 text-white px-3 py-1 rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
