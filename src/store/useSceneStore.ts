import { create } from 'zustand'

export interface MaterialConfig {
  color: string
  metalness: number
  roughness: number
  opacity: number
  transparent: boolean
  wireframe: boolean
  emissive: string
  emissiveIntensity: number
}

export interface LightConfig {
  type: 'point' | 'sun' | 'spot' | 'area'
  color: string
  intensity: number
  distance?: number
  decay?: number
  angle?: number
  penumbra?: number
  castShadow: boolean
}

export interface SceneObject {
  id: string
  name: string
  type: 'mesh' | 'light' | 'camera'
  visible: boolean
  locked: boolean
  position: [number, number, number]
  rotation: [number, number, number] // Euler angles in radians
  scale: [number, number, number]
  geometryType?: 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'circle' | 'icosphere' | 'extrude'
  geometryParams?: any // parameters like radius, etc.
  materialConfig?: MaterialConfig
  lightConfig?: LightConfig
  
  // Custom shape draw path
  shapeVertices?: [number, number][] // [x, z] coordinates for Extrude
  extrudeDepth?: number
  bevelEnabled?: boolean
  bevelThickness?: number
  bevelSize?: number
  bevelSegments?: number
}

export interface ViewportSettings {
  shadingMode: 'solid' | 'wireframe' | 'material'
  showGrid: boolean
  showGizmo: boolean
  showOverlays: boolean
}

export interface SceneSettings {
  backgroundColor: string
  fogEnabled: boolean
  fogColor: string
  fogDensity: number
  ambientColor: string
  ambientIntensity: number
}

interface SceneState {
  objects: SceneObject[]
  selectedIds: string[]
  activeTool: 'select' | 'move' | 'rotate' | 'scale' | 'shape-draw'
  mode: 'object' | 'shape' | 'edit'
  editSubMode: 'vertex' | 'edge' | 'face'
  viewportSettings: ViewportSettings
  sceneSettings: SceneSettings
  
  // Actions
  addObject: (obj: Omit<SceneObject, 'id'>) => void
  deleteObject: (id: string | string[]) => void
  updateObject: (id: string, updates: Partial<SceneObject>) => void
  selectObject: (id: string, isShift?: boolean) => void
  deselectAll: () => void
  selectAll: () => void
  duplicateSelected: () => void
  setMode: (mode: 'object' | 'shape' | 'edit') => void
  setEditSubMode: (sub: 'vertex' | 'edge' | 'face') => void
  setActiveTool: (tool: 'select' | 'move' | 'rotate' | 'scale' | 'shape-draw') => void
  updateViewportSettings: (settings: Partial<ViewportSettings>) => void
  updateSceneSettings: (settings: Partial<SceneSettings>) => void
  
  // History
  history: SceneObject[][]
  historyIndex: number
  pushHistory: (newObjects?: SceneObject[]) => void
  undo: () => void
  redo: () => void
}

const defaultMaterial: MaterialConfig = {
  color: '#808080',
  metalness: 0.0,
  roughness: 0.5,
  opacity: 1.0,
  transparent: false,
  wireframe: false,
  emissive: '#000000',
  emissiveIntensity: 1.0,
}

const defaultLight = (type: 'point' | 'sun' | 'spot' | 'area'): LightConfig => ({
  type,
  color: '#ffffff',
  intensity: type === 'sun' ? 1.0 : 5.0,
  distance: type === 'point' || type === 'spot' ? 10 : undefined,
  decay: 2,
  angle: type === 'spot' ? Math.PI / 6 : undefined,
  penumbra: type === 'spot' ? 0.5 : undefined,
  castShadow: true,
})

// Helper to generate unique names
const generateUniqueName = (baseName: string, objects: SceneObject[]) => {
  let count = 0
  let name = baseName
  while (objects.some(obj => obj.name === name)) {
    count++
    name = `${baseName}.${String(count).padStart(3, '0')}`
  }
  return name
}

export const useSceneStore = create<SceneState>((set, get) => ({
  objects: [
    {
      id: 'default-cube',
      name: 'Cube',
      type: 'mesh',
      visible: true,
      locked: false,
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      geometryType: 'cube',
      materialConfig: { ...defaultMaterial, color: '#7C9CBF' },
    },
    {
      id: 'default-light-sun',
      name: 'Sun Light',
      type: 'light',
      visible: true,
      locked: false,
      position: [4, 5, 4],
      rotation: [-Math.PI / 4, Math.PI / 4, 0],
      scale: [1, 1, 1],
      lightConfig: defaultLight('sun'),
    },
    {
      id: 'default-light-point',
      name: 'Point Light',
      type: 'light',
      visible: true,
      locked: false,
      position: [-2, 3, 2],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      lightConfig: defaultLight('point'),
    },
    {
      id: 'default-camera',
      name: 'Camera',
      type: 'camera',
      visible: true,
      locked: false,
      position: [7, 6, 9],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    }
  ],
  selectedIds: ['default-cube'], // select default cube by default
  activeTool: 'select',
  mode: 'object',
  editSubMode: 'face' as 'vertex' | 'edge' | 'face',
  viewportSettings: {
    shadingMode: 'solid',
    showGrid: true,
    showGizmo: true,
    showOverlays: true,
  },
  sceneSettings: {
    backgroundColor: '#1E1E1E',
    fogEnabled: false,
    fogColor: '#1E1E1E',
    fogDensity: 0.05,
    ambientColor: '#FFFFFF',
    ambientIntensity: 1.0,
  },
  history: [],
  historyIndex: -1,

  pushHistory: (newObjects) => {
    const objs = newObjects || get().objects
    const nextHistory = get().history.slice(0, get().historyIndex + 1)
    
    // Max history size of 50
    if (nextHistory.length >= 50) {
      nextHistory.shift()
    }
    
    // Deep clone the objects list to ensure history snapshots are immutable
    const clone = JSON.parse(JSON.stringify(objs))
    set({
      history: [...nextHistory, clone],
      historyIndex: nextHistory.length,
    })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      const restored = JSON.parse(JSON.stringify(history[prevIndex]))
      set({
        objects: restored,
        historyIndex: prevIndex,
      })
    }
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      const restored = JSON.parse(JSON.stringify(history[nextIndex]))
      set({
        objects: restored,
        historyIndex: nextIndex,
      })
    }
  },

  addObject: (objInput) => {
    const id = Math.random().toString(36).substring(2, 9)
    const baseName = objInput.name || (objInput.type === 'mesh' ? 'Mesh' : 'Light')
    const finalName = generateUniqueName(baseName, get().objects)
    
    const newObj: SceneObject = {
      ...objInput,
      id,
      name: finalName,
      visible: objInput.visible ?? true,
      locked: objInput.locked ?? false,
      position: objInput.position ?? [0, 0, 0],
      rotation: objInput.rotation ?? [0, 0, 0],
      scale: objInput.scale ?? [1, 1, 1],
      materialConfig: objInput.type === 'mesh' ? (objInput.materialConfig || { ...defaultMaterial }) : undefined,
      lightConfig: objInput.type === 'light' ? (objInput.lightConfig || defaultLight((objInput.lightConfig as any)?.type || 'point')) : undefined,
    }

    const nextObjects = [...get().objects, newObj]
    set({
      objects: nextObjects,
      selectedIds: [id], // auto select newly added object
    })
    get().pushHistory(nextObjects)
  },

  deleteObject: (idInput) => {
    const ids = Array.isArray(idInput) ? idInput : [idInput]
    const nextObjects = get().objects.filter(obj => !ids.includes(obj.id))
    const nextSelected = get().selectedIds.filter(selId => !ids.includes(selId))
    
    set({
      objects: nextObjects,
      selectedIds: nextSelected,
    })
    get().pushHistory(nextObjects)
  },

  updateObject: (id, updates) => {
    let changed = false
    const nextObjects = get().objects.map(obj => {
      if (obj.id === id) {
        changed = true
        // Safe deep merging for nested configs
        const updatedObj = { ...obj, ...updates }
        if (updates.materialConfig) {
          updatedObj.materialConfig = { ...obj.materialConfig!, ...updates.materialConfig }
        }
        if (updates.lightConfig) {
          updatedObj.lightConfig = { ...obj.lightConfig!, ...updates.lightConfig }
        }
        return updatedObj
      }
      return obj
    })

    if (changed) {
      set({ objects: nextObjects })
      // Push history on changes, throttling can be managed at viewport/slider side if needed,
      // but standard approach is push on action complete, we'll keep a direct push here for simple actions.
      get().pushHistory(nextObjects)
    }
  },

  selectObject: (id, isShift = false) => {
    const { selectedIds } = get()
    if (isShift) {
      if (selectedIds.includes(id)) {
        set({ selectedIds: selectedIds.filter(x => x !== id) })
      } else {
        set({ selectedIds: [...selectedIds, id] })
      }
    } else {
      set({ selectedIds: [id] })
    }
  },

  deselectAll: () => {
    set({ selectedIds: [] })
  },

  selectAll: () => {
    set({ selectedIds: get().objects.map(obj => obj.id) })
  },

  duplicateSelected: () => {
    const { selectedIds, objects } = get()
    if (selectedIds.length === 0) return

    const newObjects = [...objects]
    const duplicatedIds: string[] = []

    selectedIds.forEach(id => {
      const target = objects.find(obj => obj.id === id)
      if (!target) return

      const newId = Math.random().toString(36).substring(2, 9)
      const baseName = target.name.split('.')[0]
      const finalName = generateUniqueName(baseName, newObjects)

      // Slight offset for position to indicate duplication (standard Blender shifts slightly or keeps same depending on context, we shift on X/Z axis)
      const offsetPos: [number, number, number] = [
        target.position[0] + 0.5,
        target.position[1],
        target.position[2] + 0.5
      ]

      const clone: SceneObject = JSON.parse(JSON.stringify(target))
      clone.id = newId
      clone.name = finalName
      clone.position = offsetPos

      newObjects.push(clone)
      duplicatedIds.push(newId)
    })

    set({
      objects: newObjects,
      selectedIds: duplicatedIds, // select duplicated elements
    })
    get().pushHistory(newObjects)
  },

  setMode: (mode) => {
    const activeTool = mode === 'shape' ? 'shape-draw' : 'select'
    set({ mode, activeTool })
  },

  setEditSubMode: (editSubMode) => set({ editSubMode }),

  setActiveTool: (tool) => {
    set({
      activeTool: tool,
      mode: tool === 'shape-draw' ? 'shape' : 'object',
    })
  },

  updateViewportSettings: (settings) => {
    set(state => ({
      viewportSettings: { ...state.viewportSettings, ...settings }
    }))
  },

  updateSceneSettings: (settings) => {
    set(state => ({
      sceneSettings: { ...state.sceneSettings, ...settings }
    }))
  }
}))

// Push the initial layout to history
useSceneStore.getState().pushHistory()
