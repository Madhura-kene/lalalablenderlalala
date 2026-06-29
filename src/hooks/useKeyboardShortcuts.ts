import { useEffect } from 'react'
import { useSceneStore } from '../store/useSceneStore'

export const useKeyboardShortcuts = () => {
  const {
    objects,
    selectedIds,
    activeTool,
    setActiveTool,
    mode,
    setMode,
    deleteObject,
    duplicateSelected,
    selectAll,
    deselectAll,
    undo,
    redo
  } = useSceneStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in an input field
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return
      }

      // Ctrl key modifications
      const isCtrl = e.ctrlKey || e.metaKey

      // 1. Undo / Redo
      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      // 2. Select All / Deselect All
      if (e.key.toLowerCase() === 'a') {
        e.preventDefault()
        if (isCtrl) {
          // select all
          selectAll()
        } else {
          // toggle: if any selected, deselect all, else select all
          if (selectedIds.length > 0) {
            deselectAll()
          } else {
            selectAll()
          }
        }
        return
      }

      // Alt + A to deselect all (another standard Blender convention)
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        deselectAll()
        return
      }

      // 3. Delete Selected
      if (e.key.toLowerCase() === 'x' || e.key === 'Delete') {
        e.preventDefault()
        if (selectedIds.length > 0) {
          // Custom confirmation popover can be shown or we delete directly in dev.
          // The PRD mentions confirmation popover or deleting, let's delete directly for smooth editing,
          // or dispatch delete-confirm event. Let's do direct deletion for simplicity and speed.
          deleteObject(selectedIds)
        }
        return
      }

      // 4. Duplicate
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateSelected()
        return
      }

      // 5. Add Object Popover (Shift + A)
      if (e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        // Dispatch event to show Add Menu at screen center or mouse cursor
        window.dispatchEvent(
          new CustomEvent('show-add-menu-at-cursor', {
            detail: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
          })
        )
        return
      }

      // 6. Tools Selectors (G / R / S)
      if (e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setActiveTool('move')
        return
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        setActiveTool('rotate')
        return
      }
      if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        setActiveTool('scale')
        return
      }

      // 7. Axis constraints (X / Y / Z)
      // When activeTool is transform-related, axis keys constrain it
      if (['move', 'rotate', 'scale'].includes(activeTool)) {
        if (e.key.toLowerCase() === 'x') {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('set-transform-axis', { detail: { axis: 'X' } }))
          return
        }
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('set-transform-axis', { detail: { axis: 'Y' } }))
          return
        }
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('set-transform-axis', { detail: { axis: 'Z' } }))
          return
        }
      }

      // 8. Tab: Toggle Object / Edit mode
      if (e.key === 'Tab') {
        e.preventDefault()
        if (mode === 'edit') {
          setMode('object')
        } else if (mode === 'object' && selectedIds.length > 0) {
          const selObj = objects.find(o => o.id === selectedIds[0] && o.type === 'mesh')
          if (selObj) setMode('edit')
        }
        return
      }

      // 9. View orientations (1, 3, 7 on Numpad or normal keys)
      if (e.key === '1') {
        if (mode === 'edit') return // Let edit mode vertex select handle it
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('align-camera', { detail: { view: 'front' } }))
        return
      }
      if (e.key === '3') {
        if (mode === 'edit') return // Let edit mode face select handle it
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('align-camera', { detail: { view: 'right' } }))
        return
      }
      if (e.key === '7') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('align-camera', { detail: { view: 'top' } }))
        return
      }

      // 10. Toggle Orthographic / Perspective (5)
      if (e.key === '5') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('toggle-ortho'))
        return
      }

      // 11. Focus camera on selected object (Period '.' or F)
      if (e.key === '.' || e.key.toLowerCase() === 'f') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('focus-camera'))
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    objects,
    selectedIds,
    activeTool,
    setActiveTool,
    mode,
    setMode,
    deleteObject,
    duplicateSelected,
    selectAll,
    deselectAll,
    undo,
    redo
  ])
}
