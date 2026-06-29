import React, { useState } from 'react'
import { useSceneStore } from '../store/useSceneStore'
import { 
  Globe, 
  Palette, 
  Lightbulb,
  Box,
  Camera,
  MousePointer
} from 'lucide-react'

// Convert degrees to radians and back
const degToRad = (deg: number) => (deg * Math.PI) / 180
const radToDeg = (rad: number) => Math.round((rad * 180) / Math.PI)

const formatValue = (val: number) => {
  const floatVal = parseFloat(val.toFixed(2))
  if (Number.isInteger(floatVal)) {
    return `${floatVal}.`
  }
  return floatVal.toString()
}

export const PropertiesPanel: React.FC = () => {
  const { 
    objects, 
    selectedIds, 
    updateObject, 
    activeTool, 
    sceneSettings, 
    updateSceneSettings,
    viewportSettings,
    updateViewportSettings
  } = useSceneStore()

  const [activeTab, setActiveTab] = useState<'item' | 'tool' | 'view' | 'object' | 'material' | 'light' | 'scene'>('item')
  const [expandedSections, setExpandedSections] = useState({
    transform: true,
    material: true,
    visibility: true,
  })

  const toggleSection = (sec: 'transform' | 'material' | 'visibility') => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  }

  const selectedObj = objects.find(obj => selectedIds.includes(obj.id))

  // Determine which tabs are visible
  const isMeshSelected = selectedObj?.type === 'mesh'
  const isLightSelected = selectedObj?.type === 'light'

  // Handle value inputs safely
  const handleTransformChange = (
    field: 'position' | 'rotation' | 'scale', 
    axis: 0 | 1 | 2, 
    valStr: string
  ) => {
    if (!selectedObj) return
    const val = parseFloat(valStr)
    if (isNaN(val)) return

    const currentArr = [...selectedObj[field]]
    if (field === 'rotation') {
      currentArr[axis] = degToRad(val)
    } else {
      currentArr[axis] = val
    }
    updateObject(selectedObj.id, { [field]: currentArr as [number, number, number] })
  }

  // Handle standard properties
  const handleMaterialChange = (key: string, val: any) => {
    if (!selectedObj || !selectedObj.materialConfig) return
    updateObject(selectedObj.id, {
      materialConfig: {
        ...selectedObj.materialConfig,
        [key]: val
      }
    })
  }

  const handleLightChange = (key: string, val: any) => {
    if (!selectedObj || !selectedObj.lightConfig) return
    updateObject(selectedObj.id, {
      lightConfig: {
        ...selectedObj.lightConfig,
        [key]: val
      }
    })
  }

  const handleExtrudeParamsChange = (key: string, val: any) => {
    if (!selectedObj) return
    updateObject(selectedObj.id, {
      [key]: val
    })
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'item':
        if (!selectedObj) {
          return <div className="text-text-dim text-center py-8 italic">No object selected</div>
        }
        return (
          <div className="space-y-1">
            {/* TRANSFORM COLLAPSIBLE SECTION */}
            <div className="prop-section">
              <div 
                onClick={() => toggleSection('transform')}
                className="prop-section-header"
              >
                <span className="text-[8px] text-text-dim/80">{expandedSections.transform ? '▼' : '▶'}</span>
                <span>Transform</span>
              </div>
              
              {expandedSections.transform && (
                <div className="mt-1">
                  {/* Location Row */}
                  <div className="prop-row">
                    <span className="prop-label">Location</span>
                    <div className="prop-inputs">
                      {['x', 'y', 'z'].map((axis, idx) => (
                        <input
                          key={`loc-${idx}`}
                          type="text"
                          value={formatValue(selectedObj.position[idx])}
                          onChange={(e) => handleTransformChange('position', idx as 0|1|2, e.target.value)}
                          className={`prop-input ${axis}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Rotation Row */}
                  <div className="prop-row">
                    <span className="prop-label">Rotation</span>
                    <div className="prop-inputs">
                      {['x', 'y', 'z'].map((axis, idx) => (
                        <input
                          key={`rot-${idx}`}
                          type="text"
                          value={`${formatValue(radToDeg(selectedObj.rotation[idx]))}°`}
                          onChange={(e) => {
                            const cleanVal = e.target.value.replace('°', '')
                            handleTransformChange('rotation', idx as 0|1|2, cleanVal)
                          }}
                          className={`prop-input ${axis}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Scale Row */}
                  <div className="prop-row">
                    <span className="prop-label">Scale</span>
                    <div className="prop-inputs">
                      {['x', 'y', 'z'].map((axis, idx) => (
                        <input
                          key={`scl-${idx}`}
                          type="text"
                          value={formatValue(selectedObj.scale[idx])}
                          onChange={(e) => handleTransformChange('scale', idx as 0|1|2, e.target.value)}
                          className={`prop-input ${axis}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MATERIAL COLLAPSIBLE SECTION */}
            <div className="prop-section">
              <div 
                onClick={() => toggleSection('material')}
                className="prop-section-header"
              >
                <span className="text-[8px] text-text-dim/80">{expandedSections.material ? '▼' : '▶'}</span>
                <span>Material</span>
              </div>
              
              {expandedSections.material && (
                selectedObj.materialConfig ? (
                  <div className="mt-1">
                    {/* Base Color */}
                    <div className="color-row">
                      <span className="prop-label">Base Color</span>
                      <div 
                        className="color-swatch relative" 
                        style={{ backgroundColor: selectedObj.materialConfig.color }}
                      >
                        <input
                          type="color"
                          value={selectedObj.materialConfig.color}
                          onChange={(e) => handleMaterialChange('color', e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <span className="font-mono text-text-dim text-[10px]">{selectedObj.materialConfig.color.toUpperCase()}</span>
                    </div>

                    {/* Metalness */}
                    <div className="prop-slider-row">
                      <span className="prop-label">Metalness</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={selectedObj.materialConfig.metalness}
                        onChange={(e) => handleMaterialChange('metalness', parseFloat(e.target.value))}
                        className="prop-slider"
                      />
                      <span className="prop-val">
                        {Number(selectedObj.materialConfig.metalness).toFixed(2)}
                      </span>
                    </div>

                    {/* Roughness */}
                    <div className="prop-slider-row">
                      <span className="prop-label">Roughness</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={selectedObj.materialConfig.roughness}
                        onChange={(e) => handleMaterialChange('roughness', parseFloat(e.target.value))}
                        className="prop-slider"
                      />
                      <span className="prop-val">
                        {Number(selectedObj.materialConfig.roughness).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-text-dim text-center py-2 italic text-[9.5px]">No material properties</div>
                )
              )}
            </div>

            {/* VISIBILITY COLLAPSIBLE SECTION */}
            <div className="prop-section">
              <div 
                onClick={() => toggleSection('visibility')}
                className="prop-section-header"
              >
                <span className="text-[8px] text-text-dim/80">{expandedSections.visibility ? '▼' : '▶'}</span>
                <span>Visibility</span>
              </div>
              
              {expandedSections.visibility && (
                <div className="mt-1">
                  <div className="prop-row" style={{ gap: '8px' }}>
                    <span className="prop-label">Viewport</span>
                    <div 
                      onClick={() => updateObject(selectedObj.id, { visible: !selectedObj.visible })}
                      className={`w-7 h-3.5 rounded-full relative cursor-pointer transition-colors ${
                        selectedObj.visible ? 'bg-accent-blue' : 'bg-bg-deep border border-border'
                      }`}
                    >
                      <div 
                        className={`w-2.5 h-2.5 bg-white rounded-full absolute top-[0.5px] transition-all ${
                          selectedObj.visible ? 'right-[1.5px]' : 'left-[1.5px]'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'tool':
        // Active tool settings
        const isExtrudeShape = selectedObj?.geometryType === 'extrude'
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary text-[10.5px] uppercase tracking-wider mb-2 border-b border-border pb-1">
              Active Tool settings
            </h4>
            <div className="text-[10px] text-text-dim mb-3">
              Active tool: <span className="text-white font-semibold uppercase">{activeTool}</span>
            </div>

            {isExtrudeShape && selectedObj ? (
              <div className="space-y-3.5 bg-bg-deep/50 p-2.5 rounded border border-border/40">
                <div className="text-[10.5px] font-semibold text-accent-blue border-b border-border/40 pb-0.5">Custom Extruded Mesh</div>
                
                {/* Extrude Depth */}
                <div>
                  <div className="flex justify-between mb-1 text-[10px]">
                    <span className="text-text-dim">Extrude Depth</span>
                    <span className="font-mono text-white">{selectedObj.extrudeDepth ?? 1}m</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={selectedObj.extrudeDepth ?? 1}
                    onChange={(e) => handleExtrudeParamsChange('extrudeDepth', parseFloat(e.target.value))}
                    className="w-full accent-accent-blue cursor-pointer h-1 bg-border rounded-lg appearance-none"
                  />
                </div>

                {/* Bevel Toggle */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-text-dim">Bevel Enabled</span>
                  <input
                    type="checkbox"
                    checked={selectedObj.bevelEnabled ?? false}
                    onChange={(e) => handleExtrudeParamsChange('bevelEnabled', e.target.checked)}
                    className="accent-accent-blue h-3.5 w-3.5 cursor-pointer rounded"
                  />
                </div>

                {/* Bevel params */}
                {(selectedObj.bevelEnabled ?? false) && (
                  <div className="space-y-3 pl-2 border-l border-border/60">
                    {/* Bevel Thickness */}
                    <div>
                      <div className="flex justify-between mb-1 text-[9.5px]">
                        <span className="text-text-dim">Thickness</span>
                        <span className="font-mono text-white">{selectedObj.bevelThickness ?? 0.05}m</span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="0.5"
                        step="0.01"
                        value={selectedObj.bevelThickness ?? 0.05}
                        onChange={(e) => handleExtrudeParamsChange('bevelThickness', parseFloat(e.target.value))}
                        className="w-full accent-accent-blue cursor-pointer h-1 bg-border rounded-lg appearance-none"
                      />
                    </div>

                    {/* Bevel Size */}
                    <div>
                      <div className="flex justify-between mb-1 text-[9.5px]">
                        <span className="text-text-dim">Size</span>
                        <span className="font-mono text-white">{selectedObj.bevelSize ?? 0.05}m</span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="0.5"
                        step="0.01"
                        value={selectedObj.bevelSize ?? 0.05}
                        onChange={(e) => handleExtrudeParamsChange('bevelSize', parseFloat(e.target.value))}
                        className="w-full accent-accent-blue cursor-pointer h-1 bg-border rounded-lg appearance-none"
                      />
                    </div>

                    {/* Bevel Segments */}
                    <div>
                      <div className="flex justify-between mb-1 text-[9.5px]">
                        <span className="text-text-dim">Segments</span>
                        <span className="font-mono text-white">{selectedObj.bevelSegments ?? 3}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={selectedObj.bevelSegments ?? 3}
                        onChange={(e) => handleExtrudeParamsChange('bevelSegments', parseInt(e.target.value))}
                        className="w-full accent-accent-blue cursor-pointer h-1 bg-border rounded-lg appearance-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-text-dim text-center py-4 italic text-[10px]">
                No special tool parameters for this object. Switch to Shape Draw mode to create extrusions.
              </div>
            )}
          </div>
        )

      case 'view':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary text-[10.5px] uppercase tracking-wider mb-2 border-b border-border pb-1">
              Viewport settings
            </h4>

            {/* Overlays toggle */}
            <div className="flex items-center justify-between">
              <span className="text-text-dim">Show Overlays</span>
              <input
                type="checkbox"
                checked={viewportSettings.showOverlays}
                onChange={(e) => updateViewportSettings({ showOverlays: e.target.checked })}
                className="accent-accent-orange h-3.5 w-3.5 cursor-pointer rounded"
              />
            </div>

            {/* Grid toggle */}
            <div className="flex items-center justify-between">
              <span className="text-text-dim">Show Floor Grid</span>
              <input
                type="checkbox"
                checked={viewportSettings.showGrid}
                onChange={(e) => updateViewportSettings({ showGrid: e.target.checked })}
                className="accent-accent-orange h-3.5 w-3.5 cursor-pointer rounded"
              />
            </div>

            {/* Viewport Shading modes */}
            <div>
              <label className="text-text-dim block mb-1.5 text-[10px]">Viewport Shading</label>
              <div className="grid grid-cols-3 gap-1 bg-bg-deep p-0.5 rounded border border-border">
                {(['solid', 'wireframe', 'material'] as const).map((modeName) => (
                  <button
                    key={modeName}
                    onClick={() => updateViewportSettings({ shadingMode: modeName })}
                    className={`py-1 rounded text-[9.5px] font-semibold capitalize cursor-pointer transition-all ${
                      viewportSettings.shadingMode === modeName 
                        ? 'bg-accent-orange text-white' 
                        : 'text-text-dim hover:text-text-primary hover:bg-border/20'
                    }`}
                  >
                    {modeName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'object':
        if (!selectedObj) {
          return <div className="text-text-dim text-center py-8 italic">No object selected</div>
        }
        const isExtrude = selectedObj.geometryType === 'extrude'
        return (
          <div className="space-y-1">
            <div className="prop-section">
              <div className="prop-section-header">
                <span>Object Visibility</span>
              </div>
              <div className="prop-row" style={{ gap: '8px' }}>
                <span className="prop-label">Viewport</span>
                <div 
                  onClick={() => updateObject(selectedObj.id, { visible: !selectedObj.visible })}
                  className={`w-7 h-3.5 rounded-full relative cursor-pointer transition-colors ${
                    selectedObj.visible ? 'bg-accent-blue' : 'bg-bg-deep border border-border'
                  }`}
                >
                  <div 
                    className={`w-2.5 h-2.5 bg-white rounded-full absolute top-[0.5px] transition-all ${
                      selectedObj.visible ? 'right-[1.5px]' : 'left-[1.5px]'
                    }`}
                  />
                </div>
              </div>
              <div className="prop-row" style={{ gap: '8px' }}>
                <span className="prop-label">Lock Selection</span>
                <div 
                  onClick={() => updateObject(selectedObj.id, { locked: !selectedObj.locked })}
                  className={`w-7 h-3.5 rounded-full relative cursor-pointer transition-colors ${
                    selectedObj.locked ? 'bg-accent-blue' : 'bg-bg-deep border border-border'
                  }`}
                >
                  <div 
                    className={`w-2.5 h-2.5 bg-white rounded-full absolute top-[0.5px] transition-all ${
                      selectedObj.locked ? 'right-[1.5px]' : 'left-[1.5px]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {isExtrude && (
              <div className="prop-section">
                <div className="prop-section-header">
                  <span>Extrusion Settings</span>
                </div>
                
                {/* Extrude Depth */}
                <div className="prop-slider-row">
                  <span className="prop-label">Depth</span>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={selectedObj.extrudeDepth ?? 1}
                    onChange={(e) => handleExtrudeParamsChange('extrudeDepth', parseFloat(e.target.value))}
                    className="prop-slider"
                  />
                  <span className="prop-val">
                    {(selectedObj.extrudeDepth ?? 1.0).toFixed(1)}m
                  </span>
                </div>

                {/* Bevel Toggle */}
                <div className="prop-row" style={{ gap: '8px' }}>
                  <span className="prop-label">Bevel Enabled</span>
                  <div 
                    onClick={() => updateObject(selectedObj.id, { bevelEnabled: !selectedObj.bevelEnabled })}
                    className={`w-7 h-3.5 rounded-full relative cursor-pointer transition-colors ${
                      selectedObj.bevelEnabled ? 'bg-accent-blue' : 'bg-bg-deep border border-border'
                    }`}
                  >
                    <div 
                      className={`w-2.5 h-2.5 bg-white rounded-full absolute top-[0.5px] transition-all ${
                        selectedObj.bevelEnabled ? 'right-[1.5px]' : 'left-[1.5px]'
                      }`}
                    />
                  </div>
                </div>

                {/* Bevel Params */}
                {selectedObj.bevelEnabled && (
                  <div className="pl-2 border-l border-border/40 space-y-0.5 mt-1">
                    <div className="prop-slider-row">
                      <span className="prop-label">Thickness</span>
                      <input
                        type="range"
                        min="0.01"
                        max="0.5"
                        step="0.01"
                        value={selectedObj.bevelThickness ?? 0.05}
                        onChange={(e) => handleExtrudeParamsChange('bevelThickness', parseFloat(e.target.value))}
                        className="prop-slider"
                      />
                      <span className="prop-val">
                        {(selectedObj.bevelThickness ?? 0.05).toFixed(2)}
                      </span>
                    </div>

                    <div className="prop-slider-row">
                      <span className="prop-label">Size</span>
                      <input
                        type="range"
                        min="0.01"
                        max="0.5"
                        step="0.01"
                        value={selectedObj.bevelSize ?? 0.05}
                        onChange={(e) => handleExtrudeParamsChange('bevelSize', parseFloat(e.target.value))}
                        className="prop-slider"
                      />
                      <span className="prop-val">
                        {(selectedObj.bevelSize ?? 0.05).toFixed(2)}
                      </span>
                    </div>

                    <div className="prop-slider-row">
                      <span className="prop-label">Segments</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={selectedObj.bevelSegments ?? 3}
                        onChange={(e) => handleExtrudeParamsChange('bevelSegments', parseInt(e.target.value))}
                        className="prop-slider"
                      />
                      <span className="prop-val">
                        {selectedObj.bevelSegments ?? 3}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="prop-section">
              <div className="prop-section-header">
                <span>Metadata</span>
              </div>
              <div className="prop-row">
                <span className="prop-label">ID</span>
                <span className="font-mono text-text-dim text-[10px] truncate flex-1 select-all">{selectedObj.id}</span>
              </div>
              <div className="prop-row">
                <span className="prop-label">Type</span>
                <span className="capitalize text-text-dim text-[10px]">{selectedObj.type}</span>
              </div>
              {selectedObj.geometryType && (
                <div className="prop-row">
                  <span className="prop-label">Geometry</span>
                  <span className="capitalize text-text-dim text-[10px]">{selectedObj.geometryType}</span>
                </div>
              )}
            </div>
          </div>
        )

      case 'material':
        if (!isMeshSelected || !selectedObj || !selectedObj.materialConfig) {
          return <div className="text-text-dim text-center py-8 italic">Please select a mesh object</div>
        }
        
        const mat = selectedObj.materialConfig
        
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary text-[10.5px] uppercase tracking-wider mb-2 border-b border-border pb-1">
              Material Properties
            </h4>

            {/* Base color picker */}
            <div>
              <div className="flex justify-between mb-1.5 text-[10px]">
                <span className="text-text-dim">Base Color</span>
                <span className="font-mono text-white">{mat.color.toUpperCase()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={mat.color}
                  onChange={(e) => handleMaterialChange('color', e.target.value)}
                  className="w-8 h-6 bg-transparent border border-border rounded cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={mat.color}
                  onChange={(e) => handleMaterialChange('color', e.target.value)}
                  className="w-full bg-bg-deep border border-border rounded px-2 py-0.5 text-white font-mono text-[10px]"
                />
              </div>
            </div>

            {/* Metalness */}
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-text-dim">Metalness</span>
                <span className="font-mono text-white">{Number(mat.metalness).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mat.metalness}
                onChange={(e) => handleMaterialChange('metalness', parseFloat(e.target.value))}
                className="w-full accent-accent-orange cursor-pointer h-1 bg-border rounded-lg appearance-none"
              />
            </div>

            {/* Roughness */}
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-text-dim">Roughness</span>
                <span className="font-mono text-white">{Number(mat.roughness).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mat.roughness}
                onChange={(e) => handleMaterialChange('roughness', parseFloat(e.target.value))}
                className="w-full accent-accent-orange cursor-pointer h-1 bg-border rounded-lg appearance-none"
              />
            </div>

            {/* Wireframe toggle */}
            <div className="flex items-center justify-between">
              <span className="text-text-dim">Wireframe display</span>
              <input
                type="checkbox"
                checked={mat.wireframe}
                onChange={(e) => handleMaterialChange('wireframe', e.target.checked)}
                className="accent-accent-orange h-3.5 w-3.5 cursor-pointer rounded"
              />
            </div>

            {/* Transparency controls */}
            <div className="space-y-2 border-t border-border/40 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-text-dim">Transparent</span>
                <input
                  type="checkbox"
                  checked={mat.transparent}
                  onChange={(e) => handleMaterialChange('transparent', e.target.checked)}
                  className="accent-accent-orange h-3.5 w-3.5 cursor-pointer rounded"
                />
              </div>

              {mat.transparent && (
                <div>
                  <div className="flex justify-between mb-1 text-[9.5px]">
                    <span className="text-text-dim">Opacity</span>
                    <span className="font-mono text-white">{Number(mat.opacity).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={mat.opacity}
                    onChange={(e) => handleMaterialChange('opacity', parseFloat(e.target.value))}
                    className="w-full accent-accent-orange cursor-pointer h-1 bg-border rounded-lg appearance-none"
                  />
                </div>
              )}
            </div>

            {/* Emissive controls */}
            <div className="space-y-2 border-t border-border/40 pt-2 mt-2">
              <div>
                <div className="flex justify-between mb-1 text-[10px]">
                  <span className="text-text-dim">Emissive Color</span>
                  <span className="font-mono text-white">{mat.emissive.toUpperCase()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={mat.emissive}
                    onChange={(e) => handleMaterialChange('emissive', e.target.value)}
                    className="w-6 h-5 bg-transparent border border-border rounded cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={mat.emissive}
                    onChange={(e) => handleMaterialChange('emissive', e.target.value)}
                    className="w-full bg-bg-deep border border-border rounded px-1.5 py-0.5 text-white font-mono text-[9.5px]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-[9.5px]">
                  <span className="text-text-dim">Emissive Intensity</span>
                  <span className="font-mono text-white">{Number(mat.emissiveIntensity).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={mat.emissiveIntensity}
                  onChange={(e) => handleMaterialChange('emissiveIntensity', parseFloat(e.target.value))}
                  className="w-full accent-accent-orange cursor-pointer h-1 bg-border rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>
        )

      case 'light':
        if (!isLightSelected || !selectedObj || !selectedObj.lightConfig) {
          return <div className="text-text-dim text-center py-8 italic">Please select a light object</div>
        }

        const lgt = selectedObj.lightConfig

        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary text-[10.5px] uppercase tracking-wider mb-2 border-b border-border pb-1">
              Light properties
            </h4>

            {/* Light Type dropdown */}
            <div>
              <label className="text-text-dim block mb-1 text-[10px]">Light Type</label>
              <select
                value={lgt.type}
                onChange={(e) => handleLightChange('type', e.target.value)}
                className="w-full bg-bg-deep border border-border rounded px-2 py-1 text-white outline-none cursor-pointer focus:border-accent-orange"
              >
                <option value="point">Point Light</option>
                <option value="sun">Sun (Directional)</option>
                <option value="spot">Spot Light</option>
              </select>
            </div>

            {/* Color */}
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-text-dim">Color</span>
                <span className="font-mono text-white">{lgt.color.toUpperCase()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={lgt.color}
                  onChange={(e) => handleLightChange('color', e.target.value)}
                  className="w-8 h-6 bg-transparent border border-border rounded cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={lgt.color}
                  onChange={(e) => handleLightChange('color', e.target.value)}
                  className="w-full bg-bg-deep border border-border rounded px-2 py-0.5 text-white font-mono text-[10px]"
                />
              </div>
            </div>

            {/* Intensity */}
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-text-dim">Intensity</span>
                <span className="font-mono text-white">{Number(lgt.intensity).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={lgt.type === 'sun' ? 5 : 50}
                step="0.1"
                value={lgt.intensity}
                onChange={(e) => handleLightChange('intensity', parseFloat(e.target.value))}
                className="w-full accent-accent-orange cursor-pointer h-1 bg-border rounded-lg appearance-none"
              />
            </div>

            {/* Distance / Range (only for point and spot) */}
            {(lgt.type === 'point' || lgt.type === 'spot') && (
              <div>
                <div className="flex justify-between mb-1 text-[10px]">
                  <span className="text-text-dim">Range / Distance</span>
                  <span className="font-mono text-white">{lgt.distance ?? 10}m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={lgt.distance ?? 10}
                  onChange={(e) => handleLightChange('distance', parseFloat(e.target.value))}
                  className="w-full accent-accent-orange cursor-pointer h-1 bg-border rounded-lg appearance-none"
                />
              </div>
            )}

            {/* Spot light specific fields */}
            {lgt.type === 'spot' && (
              <div className="space-y-3.5 bg-bg-deep/40 p-2 rounded border border-border/40">
                {/* Angle */}
                <div>
                  <div className="flex justify-between mb-1 text-[9.5px]">
                    <span className="text-text-dim">Spot Angle</span>
                    <span className="font-mono text-white">{Math.round(((lgt.angle ?? Math.PI / 6) * 180) / Math.PI)}°</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    step="1"
                    value={Math.round(((lgt.angle ?? Math.PI / 6) * 180) / Math.PI)}
                    onChange={(e) => handleLightChange('angle', degToRad(parseFloat(e.target.value)))}
                    className="w-full accent-accent-orange cursor-pointer h-1 bg-border rounded-lg appearance-none"
                  />
                </div>

                {/* Penumbra */}
                <div>
                  <div className="flex justify-between mb-1 text-[9.5px]">
                    <span className="text-text-dim">Penumbra</span>
                    <span className="font-mono text-white">{Number(lgt.penumbra ?? 0.5).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={lgt.penumbra ?? 0.5}
                    onChange={(e) => handleLightChange('penumbra', parseFloat(e.target.value))}
                    className="w-full accent-accent-orange cursor-pointer h-1 bg-border rounded-lg appearance-none"
                  />
                </div>
              </div>
            )}

            {/* Shadow Casting */}
            <div className="flex items-center justify-between">
              <span className="text-text-dim">Cast Shadows</span>
              <input
                type="checkbox"
                checked={lgt.castShadow}
                onChange={(e) => handleLightChange('castShadow', e.target.checked)}
                className="accent-accent-orange h-3.5 w-3.5 cursor-pointer rounded"
              />
            </div>
          </div>
        )

      case 'scene':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-text-primary text-[10.5px] uppercase tracking-wider mb-2 border-b border-border pb-1">
              Scene Settings
            </h4>

            {/* Background Color */}
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-text-dim">Background Color</span>
                <span className="font-mono text-white">{sceneSettings.backgroundColor.toUpperCase()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={sceneSettings.backgroundColor}
                  onChange={(e) => updateSceneSettings({ backgroundColor: e.target.value })}
                  className="w-8 h-6 bg-transparent border border-border rounded cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={sceneSettings.backgroundColor}
                  onChange={(e) => updateSceneSettings({ backgroundColor: e.target.value })}
                  className="w-full bg-bg-deep border border-border rounded px-2 py-0.5 text-white font-mono text-[10px]"
                />
              </div>
            </div>

            {/* Ambient Intensity */}
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-text-dim">Ambient Light Intensity</span>
                <span className="font-mono text-white">{Number(sceneSettings.ambientIntensity).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={sceneSettings.ambientIntensity}
                onChange={(e) => updateSceneSettings({ ambientIntensity: parseFloat(e.target.value) })}
                className="w-full accent-accent-orange cursor-pointer h-1 bg-border rounded-lg appearance-none"
              />
            </div>

            {/* Ambient Color */}
            <div>
              <div className="flex justify-between mb-1 text-[10px]">
                <span className="text-text-dim">Ambient Light Color</span>
                <span className="font-mono text-white">{sceneSettings.ambientColor.toUpperCase()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={sceneSettings.ambientColor}
                  onChange={(e) => updateSceneSettings({ ambientColor: e.target.value })}
                  className="w-6 h-5 bg-transparent border border-border rounded cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={sceneSettings.ambientColor}
                  onChange={(e) => updateSceneSettings({ ambientColor: e.target.value })}
                  className="w-full bg-bg-deep border border-border rounded px-1.5 py-0.5 text-white font-mono text-[9.5px]"
                />
              </div>
            </div>

            {/* Fog configuration */}
            <div className="space-y-3.5 border-t border-border/40 pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-text-dim font-semibold">Enable Viewport Fog</span>
                <input
                  type="checkbox"
                  checked={sceneSettings.fogEnabled}
                  onChange={(e) => updateSceneSettings({ fogEnabled: e.target.checked })}
                  className="accent-accent-orange h-3.5 w-3.5 cursor-pointer rounded"
                />
              </div>

              {sceneSettings.fogEnabled && (
                <>
                  {/* Fog Color */}
                  <div>
                    <div className="flex justify-between mb-1 text-[9.5px]">
                      <span className="text-text-dim">Fog Color</span>
                      <span className="font-mono text-white">{sceneSettings.fogColor.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={sceneSettings.fogColor}
                        onChange={(e) => updateSceneSettings({ fogColor: e.target.value })}
                        className="w-6 h-5 bg-transparent border border-border rounded cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={sceneSettings.fogColor}
                        onChange={(e) => updateSceneSettings({ fogColor: e.target.value })}
                        className="w-full bg-bg-deep border border-border rounded px-1.5 py-0.5 text-white font-mono text-[9.5px]"
                      />
                    </div>
                  </div>

                  {/* Fog Density */}
                  <div>
                    <div className="flex justify-between mb-1 text-[9.5px]">
                      <span className="text-text-dim">Fog Density</span>
                      <span className="font-mono text-white">{Number(sceneSettings.fogDensity).toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.001"
                      max="0.2"
                      step="0.001"
                      value={sceneSettings.fogDensity}
                      onChange={(e) => updateSceneSettings({ fogDensity: parseFloat(e.target.value) })}
                      className="w-full accent-accent-orange cursor-pointer h-1 bg-border rounded-lg appearance-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Define property tab configurations
  const tabConfigs = [
    { id: 'item', title: 'Properties', icon: MousePointer },
    { id: 'object', title: 'Object Properties', icon: Box },
    ...(isMeshSelected ? [{ id: 'material', title: 'Material Properties', icon: Palette }] : []),
    ...(isLightSelected ? [{ id: 'light', title: 'Light Properties', icon: Lightbulb }] : []),
    { id: 'scene', title: 'Environment settings', icon: Globe },
    { id: 'view', title: 'Viewport options', icon: Camera },
  ] as const

  return (
    <div className="flex-1 flex flex-col select-none text-[11px] h-full overflow-hidden bg-bg-panel">
      {/* Horizontal Tabs Header */}
      <div className="prop-tabs shrink-0">
        {tabConfigs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              title={tab.title}
              className={`prop-tab ${isActive ? 'active' : ''}`}
            >
              <Icon size={13} />
            </button>
          )
        })}
      </div>

      {/* Tab Content Panel */}
      <div className="flex-1 p-2 overflow-y-auto min-w-0">
        {renderTabContent()}
      </div>
    </div>
  )
}
