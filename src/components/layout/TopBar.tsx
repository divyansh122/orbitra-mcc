import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { useNow } from '../../hooks/useTicker'
import { togglePresentation } from '../../hooks/useKeyboardShortcuts'
import { exportCsv } from '../../lib/csv'
import { formatAge, formatClock, formatElapsed } from '../../lib/format'
import { useTelemetry } from '../../store/telemetry'
import { IconDownload, IconExpand, IconFlask, IconPause, IconPlay, IconSettings, IconTrash } from '../ui/Icons'
import { OrbitLogo } from '../ui/OrbitLogo'

export function TopBar() {
  const presentation = useTelemetry((s) => s.presentation)

  return (
    <motion.header
      className="panel !flex-row flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="hud-corner tl" />
      <span className="hud-corner br" />
      <div className="flex items-center gap-2.5">
        <OrbitLogo className="h-10 w-10 shrink-0" />
        <div className="leading-tight">
          <div className="font-display text-[1.3rem] font-extrabold tracking-[0.08em] text-cyan glow-text">ORBITRA’26</div>
          <div className="hud-label text-[0.66rem] text-muted">
            Mission Control <span className="text-dim">// Drone &amp; IoT Club</span>
          </div>
        </div>
      </div>

      <LinkStatusPill />
      <Metrics />

      <AnimatePresence>
        {!presentation && (
          <motion.div
            className="ml-auto flex flex-wrap items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Controls />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

function LinkStatusPill() {
  const link = useTelemetry((s) => s.link)
  const demoMode = useTelemetry((s) => s.demoMode)
  const attempt = useTelemetry((s) => s.linkAttempt)
  const nextRetryAt = useTelemetry((s) => s.nextRetryAt)
  const lastPacketAt = useTelemetry((s) => s.lastPacketAt)
  const staleMs = useTelemetry((s) => s.settings.thresholds.staleMs)
  const paused = useTelemetry((s) => s.paused)
  const now = useNow(250)

  const fresh = lastPacketAt !== null && now - lastPacketAt < staleMs
  let label: string
  let color: string
  let live = false
  let detail: string
  if (demoMode) {
    label = 'SIMULATION'
    color = 'var(--color-purple)'
    live = true
    detail = 'demo feed'
  } else if (link === 'online') {
    label = fresh ? 'LINK ONLINE' : 'LINK IDLE'
    color = fresh ? 'var(--color-green)' : 'var(--color-amber)'
    live = fresh
    detail = fresh ? 'bridge.js' : 'no packets'
  } else if (link === 'offline') {
    label = 'OFFLINE'
    color = 'var(--color-red)'
    detail = nextRetryAt ? `retry ${Math.max(0, Math.ceil((nextRetryAt - now) / 1000))}s` : ''
  } else {
    label = 'SEARCHING'
    color = 'var(--color-amber)'
    live = true
    detail = attempt ? `attempt ${attempt + 1}` : 'connecting'
  }

  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border px-3 py-1.5"
      style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, background: `color-mix(in srgb, ${color} 9%, transparent)`, color }}
      role="status"
      aria-live="polite"
    >
      <span className={`pulse-dot ${link === 'connecting' && !demoMode ? 'blink' : ''}`} data-live={live} />
      <div className="leading-none">
        <div className="font-display text-[0.8rem] font-semibold tracking-[0.12em] glow-text">{label}</div>
        <div className="mt-1 font-mono text-[0.58rem] text-muted">{paused ? 'display paused' : detail}</div>
      </div>
    </div>
  )
}

/** Packet-loss colour bands for the ESP-NOW link, in %. */
const LOSS_WARN_PCT = 2
const LOSS_ALERT_PCT = 10

function Metric({ label, children, accent }: { label: string; children: ReactNode; accent?: string }) {
  return (
    <div className="min-w-[4.2rem] leading-none">
      <div className="hud-label text-[0.56rem] text-dim">{label}</div>
      <div className="tabular mt-1 font-mono text-[0.95rem] font-semibold" style={{ color: accent ?? 'var(--color-ink)' }}>
        {children}
      </div>
    </div>
  )
}

function Metrics() {
  const packetCount = useTelemetry((s) => s.packetCount)
  const pps = useTelemetry((s) => s.pps)
  const lastPacketAt = useTelemetry((s) => s.lastPacketAt)
  const firstPacketAt = useTelemetry((s) => s.firstPacketAt)
  const staleMs = useTelemetry((s) => s.settings.thresholds.staleMs)
  const txReceived = useTelemetry((s) => s.txReceived)
  const txLost = useTelemetry((s) => s.txLost)
  const now = useNow(100)
  const age = lastPacketAt === null ? null : now - lastPacketAt
  const lossPct = txReceived ? (txLost / (txReceived + txLost)) * 100 : null
  const lossColor = lossPct === null ? undefined : lossPct > LOSS_ALERT_PCT ? 'var(--color-red)' : lossPct > LOSS_WARN_PCT ? 'var(--color-amber)' : 'var(--color-green)'

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-line/60 xl:border-l xl:pl-5">
      <Metric label="Packets">{packetCount.toLocaleString()}</Metric>
      <Metric label="Pkt / s" accent="var(--color-cyan)">
        {pps.toFixed(1)}
      </Metric>
      <Metric label="ESP-NOW loss" accent={lossColor}>
        <span title={`${txLost} packets missing from the transmitter's packetNo sequence`}>{lossPct === null ? '—' : `${lossPct.toFixed(1)}%`}</span>
      </Metric>
      <Metric label="Last pkt" accent={age !== null && age > staleMs ? 'var(--color-red)' : undefined}>
        {formatAge(age)}
      </Metric>
      <Metric label="Mission T+" accent="var(--color-amber)">
        {firstPacketAt ? formatElapsed(now - firstPacketAt) : '--:--:--'}
      </Metric>
      <Metric label="Local">{formatClock(now)}</Metric>
    </div>
  )
}

function Controls() {
  const demoMode = useTelemetry((s) => s.demoMode)
  const paused = useTelemetry((s) => s.paused)
  const setDemoMode = useTelemetry((s) => s.setDemoMode)
  const togglePause = useTelemetry((s) => s.togglePause)
  const clearData = useTelemetry((s) => s.clearData)
  const setSettingsOpen = useTelemetry((s) => s.setSettingsOpen)
  const logEvent = useTelemetry((s) => s.logEvent)

  const onExport = () => {
    const rows = exportCsv()
    logEvent(rows ? 'ok' : 'warn', rows ? `EXPORTED ${rows} ROWS TO CSV` : 'EXPORT SKIPPED · NO DATA RECORDED')
  }

  return (
    <>
      <button className="hud-btn" data-active={demoMode} style={{ '--btn-accent': 'var(--color-purple)' } as CSSProperties} onClick={() => setDemoMode(!demoMode)} title="Demo mode (D)" aria-pressed={demoMode}>
        <IconFlask /> Demo
      </button>
      <button className="hud-btn" data-active={paused} style={{ '--btn-accent': 'var(--color-amber)' } as CSSProperties} onClick={togglePause} title="Pause / resume (P)" aria-pressed={paused}>
        {paused ? <IconPlay /> : <IconPause />} {paused ? 'Resume' : 'Pause'}
      </button>
      <button className="hud-btn" onClick={clearData} title="Clear recorded data">
        <IconTrash /> Clear
      </button>
      <button className="hud-btn" onClick={onExport} title="Export recorded data as CSV">
        <IconDownload /> CSV
      </button>
      <button className="hud-btn" onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings">
        <IconSettings />
      </button>
      <button className="hud-btn" onClick={togglePresentation} title="Fullscreen presentation (F)" aria-label="Fullscreen presentation">
        <IconExpand />
      </button>
    </>
  )
}
