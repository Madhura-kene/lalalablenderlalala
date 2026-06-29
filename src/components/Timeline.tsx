import React, { useState, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react'

export const Timeline: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(1)
  const [startFrame, setStartFrame] = useState(1)
  const [endFrame, setEndFrame] = useState(250)

  useEffect(() => {
    let interval: any
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= endFrame) {
            return startFrame
          }
          return prev + 1
        })
      }, 1000 / 24) // 24 fps
    }
    return () => clearInterval(interval)
  }, [isPlaying, startFrame, endFrame])

  const togglePlay = () => setIsPlaying(!isPlaying)
  const resetFrame = () => {
    setIsPlaying(false)
    setCurrentFrame(startFrame)
  }

  // Generate grid ticks for frame bar
  const renderTicks = () => {
    const ticks = []
    const range = endFrame - startFrame
    const step = range > 100 ? 50 : (range > 50 ? 20 : 10)
    
    // Standard spacing between ticks
    for (let f = startFrame; f <= endFrame; f += step) {
      ticks.push(
        <div key={f} className="flex flex-col items-center justify-end h-full relative" style={{ left: `${((f - startFrame) / range) * 92 + 4}%`, position: 'absolute' }}>
          <span className="text-[8.5px] text-text-dim mb-1 font-mono">{f}</span>
          <div className="w-0.5 h-1.5 bg-border"></div>
        </div>
      )
    }
    return ticks
  }

  const handleFrameSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentFrame(parseInt(e.target.value))
  }

  return (
    <div className="h-16 bg-bg-panel border-t border-border flex flex-col select-none text-[11px] z-40">
      {/* Playback Controls Row */}
      <div className="h-7 border-b border-border/50 flex items-center justify-between px-3 bg-bg-header/20">
        {/* Left: Frame indicator inputs */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-bg-deep border border-border px-1.5 py-0.5 rounded">
            <span className="text-[9.5px] text-text-dim">Start:</span>
            <input 
              type="number" 
              value={startFrame}
              onChange={(e) => setStartFrame(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-8 bg-transparent text-white font-mono outline-none text-right text-[10px]"
            />
          </div>
          <div className="flex items-center space-x-1.5 bg-bg-deep border border-border px-1.5 py-0.5 rounded">
            <span className="text-[9.5px] text-text-dim">End:</span>
            <input 
              type="number" 
              value={endFrame}
              onChange={(e) => setEndFrame(Math.max(startFrame + 10, parseInt(e.target.value) || 250))}
              className="w-10 bg-transparent text-white font-mono outline-none text-right text-[10px]"
            />
          </div>
        </div>

        {/* Center: Play/Pause/Skips */}
        <div className="flex items-center space-x-1.5">
          <button 
            onClick={resetFrame} 
            title="Jump to Start"
            className="w-5 h-5 rounded hover:bg-border/30 text-text-dim hover:text-text-primary flex items-center justify-center cursor-pointer"
          >
            <SkipBack size={11} />
          </button>
          <button 
            onClick={() => setCurrentFrame(prev => Math.max(startFrame, prev - 1))}
            title="Previous Frame"
            className="w-5 h-5 rounded hover:bg-border/30 text-text-dim hover:text-text-primary flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft size={12} />
          </button>
          
          <button 
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer ${
              isPlaying ? 'bg-accent-orange text-white' : 'bg-border/30 text-text-primary hover:bg-border/50'
            }`}
          >
            {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="translate-x-0.5" />}
          </button>
          
          <button 
            onClick={() => setCurrentFrame(prev => Math.min(endFrame, prev + 1))}
            title="Next Frame"
            className="w-5 h-5 rounded hover:bg-border/30 text-text-dim hover:text-text-primary flex items-center justify-center cursor-pointer"
          >
            <ChevronRight size={12} />
          </button>
          <button 
            onClick={() => setCurrentFrame(endFrame)}
            title="Jump to End"
            className="w-5 h-5 rounded hover:bg-border/30 text-text-dim hover:text-text-primary flex items-center justify-center cursor-pointer"
          >
            <SkipForward size={11} />
          </button>
        </div>

        {/* Right: Current Frame display */}
        <div className="flex items-center space-x-1 bg-bg-deep border border-border px-2 py-0.5 rounded font-mono text-[10.5px]">
          <span className="text-text-dim">Frame:</span>
          <span className="text-accent-orange font-bold">{currentFrame}</span>
        </div>
      </div>

      {/* Timeline Ruler & Playhead Slider */}
      <div className="flex-1 relative flex items-center px-4 bg-bg-deep/15">
        {/* Tick lines */}
        <div className="absolute inset-0 h-6 border-b border-border/35 overflow-hidden flex items-end">
          {renderTicks()}
        </div>

        {/* Range Slider for Playhead */}
        <input
          type="range"
          min={startFrame}
          max={endFrame}
          value={currentFrame}
          onChange={handleFrameSliderChange}
          className="absolute left-[4%] w-[92%] h-full opacity-0 cursor-ew-resize z-25"
        />

        {/* Visible Playhead Blue Line */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-accent-blue z-20 pointer-events-none transition-all duration-75"
          style={{ left: `${((currentFrame - startFrame) / (endFrame - startFrame)) * 92 + 4}%` }}
        >
          <div className="w-2.5 h-2.5 bg-accent-blue rounded-sm -translate-x-1 -translate-y-0.5 shadow-md"></div>
        </div>
      </div>
    </div>
  )
}
