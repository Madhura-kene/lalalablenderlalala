import React from 'react'
import { Download, Image as ImageIcon } from 'lucide-react'
import { useSceneStore } from '../store/useSceneStore'

export const RenderPreviewPanel: React.FC = () => {
  const { lastRenderPreview } = useSceneStore()

  const downloadPreview = () => {
    if (!lastRenderPreview) return

    const link = document.createElement('a')
    link.href = lastRenderPreview.dataUrl
    link.download = `la-blender-render-${lastRenderPreview.createdAt}.png`
    link.click()
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 select-none bg-bg-panel">
      <div className="h-7 shrink-0 border-b border-border bg-bg-header px-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-dim">
        <ImageIcon size={12} className="text-text-dim" />
        <span>Render Preview</span>
      </div>

      <div className="flex-1 min-h-0 p-2">
        {lastRenderPreview ? (
          <div className="h-full rounded border border-border/60 bg-bg-deep/60 p-2 flex flex-col gap-2">
            <div className="min-h-0 flex-1 overflow-hidden rounded border border-border/50 bg-black/30 flex items-center justify-center">
              <img
                src={lastRenderPreview.dataUrl}
                alt="Last render preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-[9.5px] text-text-dim">
              <span className="truncate font-mono">
                {new Date(lastRenderPreview.createdAt).toLocaleTimeString()}
              </span>
              <button
                onClick={downloadPreview}
                className="inline-flex items-center gap-1 rounded border border-accent-orange/60 bg-accent-orange/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-accent-orange transition-colors hover:bg-accent-orange/20"
              >
                <Download size={10} />
                Save PNG
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full rounded border border-dashed border-border/70 bg-bg-deep/40 px-3 py-4 text-center flex flex-col items-center justify-center gap-2 text-text-dim">
            <ImageIcon size={20} className="text-text-dim/80" />
            <div className="text-[10px] font-semibold uppercase tracking-wider">No Render Yet</div>
            <div className="text-[9.5px] leading-relaxed">
              Use the Render menu to capture the current viewport as a PNG.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
