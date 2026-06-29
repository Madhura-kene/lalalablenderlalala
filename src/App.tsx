import React from 'react'
import { Topbar } from './components/Topbar'
import { Toolbar } from './components/Toolbar'
import { Viewport } from './components/Viewport'
import { Outliner } from './components/Outliner'
import { PropertiesPanel } from './components/PropertiesPanel'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function App() {
  // Activate global keyboard shortcuts listener
  useKeyboardShortcuts()

  const handleExportScene = () => {
    // Dispatch global event that Viewport listens to
    window.dispatchEvent(new CustomEvent('export-scene'))
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      window.dispatchEvent(new CustomEvent('import-file', { detail: { file } }))
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-bg-deep text-text-primary">
      {/* Topbar spans the entire width of the screen */}
      <Topbar onExport={handleExportScene} onImport={handleImportFile} />

      {/* Main Container below Topbar */}
      <div className="flex-1 flex flex-row min-h-0 w-full overflow-hidden">
        {/* Left Toolbar shelf (T-Panel) - starts below Topbar */}
        <Toolbar />

        {/* Workspace Row: Viewport and Right panels */}
        <div className="flex-1 flex flex-row min-h-0 h-full overflow-hidden">
          {/* Central Viewport canvas */}
          <Viewport />

          {/* Right side panels: stacked Outliner & Properties (N-Panel) */}
          <div className="w-60 border-l border-border flex flex-col h-full min-h-0 bg-bg-panel">
            {/* Top segment: Scene graph / Outliner (35%) */}
            <div className="h-[35%] min-h-[150px] flex flex-col min-h-0">
              <Outliner />
            </div>

            {/* Bottom segment: Object properties tab panel (65%) */}
            <div className="h-[65%] min-h-[250px] border-t border-border flex flex-col min-h-0 overflow-hidden">
              <PropertiesPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
