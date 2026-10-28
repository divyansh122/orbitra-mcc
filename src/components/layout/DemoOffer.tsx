import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { useTelemetry } from '../../store/telemetry'
import { IconFlask } from '../ui/Icons'

/** Shown when bridge.js can't be reached, so a demo never stalls on missing hardware. */
export function DemoOffer() {
  const offered = useTelemetry((s) => s.demoOffered && !s.demoOfferDismissed && !s.demoMode)
  const wsUrl = useTelemetry((s) => s.settings.wsUrl)
  const setDemoMode = useTelemetry((s) => s.setDemoMode)
  const dismiss = useTelemetry((s) => s.dismissDemoOffer)
  const openSettings = useTelemetry((s) => s.setSettingsOpen)

  return (
    <AnimatePresence>
      {offered && (
        <motion.div
          role="dialog"
          aria-label="Bridge unreachable"
          className="panel fixed bottom-24 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] p-4"
          style={{ '--accent': 'var(--color-purple)' } as CSSProperties}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <span className="hud-corner tl" />
          <span className="hud-corner br" />
          <p className="hud-label text-[0.8rem] text-red">Bridge unreachable</p>
          <p className="mt-1.5 text-[0.8rem] leading-relaxed text-muted">
            No response from <span className="font-mono text-ink">{wsUrl}</span>. Start <span className="font-mono text-amber">node bridge.js</span>, or run the console on simulated telemetry.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="hud-btn" data-active="true" style={{ '--btn-accent': 'var(--color-purple)' } as CSSProperties} onClick={() => setDemoMode(true)}>
              <IconFlask /> Launch demo <kbd className="font-mono text-[0.6rem] opacity-70">D</kbd>
            </button>
            <button className="hud-btn" onClick={() => openSettings(true)}>
              Change URL
            </button>
            <button className="hud-btn" onClick={dismiss}>
              Keep searching
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
