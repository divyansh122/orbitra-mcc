import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { UI } from '../../config'
import { useTelemetry } from '../../store/telemetry'

const HEADLINE = "ORBITRA'26 // INITIALIZING TELEMETRY LINK..."
const RINGS = [
  { r: 120, color: 'var(--color-blue)', delay: 0 },
  { r: 86, color: 'var(--color-cyan)', delay: 0.15 },
  { r: 52, color: 'var(--color-purple)', delay: 0.3 },
]

/** 2–3 s intro: expanding orbit rings, typewriter headline, subsystem checks. Click or any key skips. */
export function BootSequence({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion()
  const wsUrl = useTelemetry((s) => s.settings.wsUrl)
  const demoMode = useTelemetry((s) => s.demoMode)
  const duration = reduce ? UI.bootReducedMs : UI.bootMs
  const [typed, setTyped] = useState(reduce ? HEADLINE.length : 0)

  const checks = [
    'FIELD MAP ............ LOADED',
    `UPLINK ............... ${demoMode ? 'SIMULATOR' : wsUrl}`,
    'RENDER CORE .......... ONLINE',
    'ALERT ENGINE ......... ARMED',
  ]

  useEffect(() => {
    if (reduce) return
    const perChar = (duration * 0.42) / HEADLINE.length
    const id = setInterval(() => setTyped((n) => (n >= HEADLINE.length ? n : n + 1)), perChar)
    return () => clearInterval(id)
  }, [reduce, duration])

  useEffect(() => {
    const done = setTimeout(onDone, duration)
    const skip = () => onDone()
    window.addEventListener('keydown', skip, { once: true })
    window.addEventListener('pointerdown', skip, { once: true })
    return () => {
      clearTimeout(done)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [onDone, duration])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-space-950"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      role="status"
      aria-label="Initializing telemetry link"
    >
      <div className="relative h-[17rem] w-[17rem]">
        <svg viewBox="-130 -130 260 260" className="absolute inset-0 h-full w-full overflow-visible">
          {RINGS.map((ring) => (
            <motion.circle
              key={ring.r}
              r={ring.r}
              fill="none"
              stroke={ring.color}
              strokeWidth="2"
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: ring.delay, ease: [0.22, 1, 0.36, 1] }}
              style={{ filter: `drop-shadow(0 0 6px ${ring.color})` }}
            />
          ))}
          <motion.g animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 3, ease: 'linear', repeat: Infinity }}>
            <circle cx="0" cy="-86" r="5" fill="var(--color-cyan)" style={{ filter: 'drop-shadow(0 0 8px var(--color-cyan))' }} />
          </motion.g>
          <motion.g animate={reduce ? undefined : { rotate: -360 }} transition={{ duration: 2.2, ease: 'linear', repeat: Infinity }}>
            <circle cx="52" cy="0" r="3.5" fill="var(--color-purple)" />
          </motion.g>
          <motion.circle
            r="11"
            fill="var(--color-cyan)"
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: [0, 1.4, 1] }}
            transition={{ duration: 0.7, delay: 0.45 }}
            style={{ filter: 'drop-shadow(0 0 14px var(--color-cyan))' }}
          />
          {!reduce && (
            <motion.circle
              r="120"
              fill="none"
              stroke="var(--color-cyan)"
              strokeWidth="1"
              initial={{ scale: 0.4, opacity: 0.8 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </svg>
      </div>

      <p className="relative mt-10 font-display text-[clamp(0.9rem,1.6vw,1.5rem)] font-semibold tracking-[0.18em] text-cyan glow-text">
        {/* invisible full line reserves the width so the typed text doesn't re-centre each keystroke */}
        <span className="invisible">{HEADLINE}▌</span>
        <span className="absolute inset-0 whitespace-nowrap">
          {HEADLINE.slice(0, typed)}
          <span className="blink">▌</span>
        </span>
      </p>

      <div className="mt-5 w-[min(30rem,86vw)] font-mono text-[0.75rem] text-muted">
        {checks.map((c, i) => (
          <motion.div
            key={c}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduce ? 0 : (duration / 1000) * (0.42 + i * 0.1), duration: 0.25 }}
            className="truncate"
          >
            <span className="text-green">›</span> {c}
          </motion.div>
        ))}
        <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full bg-gradient-to-r from-blue via-cyan to-purple"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: duration / 1000, ease: 'easeInOut' }}
          />
        </div>
        <p className="hud-label mt-3 text-center text-[0.6rem] text-dim">Press any key to skip</p>
      </div>
    </motion.div>
  )
}
