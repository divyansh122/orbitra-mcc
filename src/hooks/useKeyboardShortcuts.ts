import { useEffect } from 'react'
import { useTelemetry } from '../store/telemetry'

export function togglePresentation(): void {
  const { presentation, setPresentation } = useTelemetry.getState()
  const next = !presentation
  setPresentation(next)
  try {
    if (next && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {})
    if (!next && document.fullscreenElement) void document.exitFullscreen?.().catch(() => {})
  } catch {
    // Fullscreen blocked (e.g. inside an iframe) — presentation mode still hides the controls.
  }
}

/** F = fullscreen/presentation · D = demo mode · P = pause · Esc = close settings */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return

      const s = useTelemetry.getState()
      switch (e.key.toLowerCase()) {
        case 'f':
          togglePresentation()
          break
        case 'd':
          s.setDemoMode(!s.demoMode)
          break
        case 'p':
          s.togglePause()
          break
        case 'escape':
          if (s.settingsOpen) s.setSettingsOpen(false)
          break
        default:
          return
      }
      e.preventDefault()
    }

    // Leaving fullscreen with Esc also ends presentation mode.
    const onFullscreen = () => {
      if (!document.fullscreenElement && useTelemetry.getState().presentation) {
        useTelemetry.getState().setPresentation(false)
      }
    }

    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFullscreen)
    }
  }, [])
}
