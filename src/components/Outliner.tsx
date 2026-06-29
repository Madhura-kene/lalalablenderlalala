import React, { useState } from 'react'
import { useSceneStore, type SceneObject } from '../store/useSceneStore'
import { Box, Lightbulb, Camera, Eye, EyeOff, Lock, Unlock, Hash, List, Sun } from 'lucide-react'

export const Outliner: React.FC = () => {
  const { objects, selectedIds, selectObject, updateObject } = useSceneStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    selectObject(id, e.shiftKey)
  }

  const startRename = (e: React.MouseEvent, obj: SceneObject) => {
    e.stopPropagation()
    setEditingId(obj.id)
    setEditName(obj.name)
  }

  const finishRename = (id: string) => {
    if (editName.trim()) {
      updateObject(id, { name: editName.trim() })
    }
    setEditingId(null)
  }

  const getIcon = (obj: SceneObject, isSelected: boolean) => {
    const iconClass = isSelected ? 'text-white' : 'text-text-dim'
    switch (obj.lightConfig?.type || obj.type) {
      case 'mesh':
        return <Box size={11} className={iconClass} />
      case 'sun':
        return <Sun size={11} className={iconClass} />
      case 'point':
      case 'light':
        return <Lightbulb size={11} className={iconClass} />
      case 'camera':
        return <Camera size={11} className={iconClass} />
      default:
        return <Hash size={11} className={iconClass} />
    }
  }

  return (
    <div className="flex-1 bg-bg-panel border-b border-border flex flex-col min-h-0 select-none text-[11px]">
      {/* Header */}
      <div className="h-7 bg-bg-header border-b border-border flex items-center px-3 font-bold text-text-dim text-[10px] uppercase tracking-wider gap-1.5">
        <List size={12} className="text-text-dim" />
        <span>OUTLINER</span>
      </div>

      {/* Object List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5 min-h-0">
        {objects.length === 0 ? (
          <div className="text-text-dim text-center py-4 italic text-[10px]">No objects in scene</div>
        ) : (
          objects.map((obj) => {
            const isSelected = selectedIds.includes(obj.id)
            const isEditing = editingId === obj.id

            return (
              <div
                key={obj.id}
                onClick={(e) => handleSelect(e, obj.id)}
                className={`h-6 flex items-center justify-between px-2.5 rounded transition-colors group cursor-pointer ${
                  isSelected 
                    ? 'bg-[#1b4373] text-white font-medium' 
                    : 'hover:bg-border/20 text-text-dim hover:text-text-primary'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  {getIcon(obj, isSelected)}
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => finishRename(obj.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishRename(obj.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                      className="bg-bg-deep border border-accent-orange px-1 py-0 text-white outline-none rounded w-full h-4.5 font-mono text-[10px]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span 
                      onDoubleClick={(e) => startRename(e, obj)}
                      className="truncate select-none font-mono text-[11px]"
                    >
                      {obj.name}
                    </span>
                  )}
                </div>

                {/* Visibility and Lock toggles - visible only on hover of the row */}
                <div className="flex items-center space-x-2 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateObject(obj.id, { visible: !obj.visible })
                    }}
                    className={`hover:text-white cursor-pointer ${obj.visible ? 'text-text-dim' : 'text-accent-orange'}`}
                    title={obj.visible ? "Hide object" : "Show object"}
                  >
                    {obj.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateObject(obj.id, { locked: !obj.locked })
                    }}
                    className={`hover:text-white cursor-pointer ${obj.locked ? 'text-accent-orange' : 'text-text-dim'}`}
                    title={obj.locked ? "Unlock selection" : "Lock selection"}
                  >
                    {obj.locked ? <Lock size={11} /> : <Unlock size={11} />}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
