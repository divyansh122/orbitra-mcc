import { motion } from 'framer-motion'
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { SENSOR_GROUPS, type Accent } from '../../config'
import { useNow } from '../../hooks/useTicker'
import { cssColor } from '../../lib/theme'
import { useTelemetry } from '../../store/telemetry'

interface Node {
  title: string
  sub: string
  accent: Accent
  active: boolean
  status: string
}

/** Mirrors the deck's pipeline: each stage lights up while data flows through it. */
export function PipelineStrip() {
  const now = useNow(500)
  const demoMode = useTelemetry((s) => s.demoMode)
  const link = useTelemetry((s) => s.link)
  const paused = useTelemetry((s) => s.paused)
  const lastPacketAt = useTelemetry((s) => s.lastPacketAt)
  const sensorSeen = useTelemetry((s) => s.sensorSeen)
  const staleMs = useTelemetry((s) => s.settings.thresholds.staleMs)

  const fresh = lastPacketAt !== null && now - lastPacketAt < staleMs
  const bridgeUp = demoMode || link === 'online'
  const sim = demoMode ? 'SIMULATED' : null

  const nodes: Node[] = [
    { title: 'Sensors', sub: 'MPU • BMP280 • DHT • GPS', accent: 'blue', active: fresh, status: fresh ? (sim ?? 'SAMPLING') : 'IDLE' },
    { title: 'ESP8266 TX', sub: 'ESP-NOW uplink', accent: 'purple', active: fresh, status: fresh ? (sim ?? 'TRANSMITTING') : 'NO SIGNAL' },
    { title: 'ESP8266 RX', sub: 'USB → COM port', accent: 'green', active: fresh, status: fresh ? (sim ?? 'RECEIVING') : 'NO SIGNAL' },
    { title: 'Node Bridge', sub: demoMode ? 'in-browser simulator' : 'serial → WebSocket', accent: 'amber', active: bridgeUp, status: bridgeUp ? (demoMode ? 'BYPASSED' : 'CONNECTED') : link === 'offline' ? 'OFFLINE' : 'SEARCHING' },
    { title: 'Mission Control', sub: 'live telemetry console', accent: 'cyan', active: true, status: paused ? 'PAUSED' : 'RENDERING' },
  ]

  return (
    <motion.nav
      aria-label="Telemetry pipeline status"
      className="panel !flex-row items-stretch gap-0 overflow-x-auto px-2 py-1.5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.45 }}
    >
      {nodes.map((n, i) => (
        <Fragment key={n.title}>
          {i > 0 && (
            <div
              className="flow-track mx-1 flex min-w-6 flex-1 items-center"
              data-active={nodes[i - 1].active && n.active && !paused}
              style={{ '--flow-color': cssColor(n.accent) } as CSSProperties}
            >
              <div className="h-px w-full" style={{ background: nodes[i - 1].active && n.active ? cssColor(n.accent) : 'var(--color-line)', opacity: 0.6 }} />
            </div>
          )}
          <PipelineNode node={n}>
            {i === 0 && (
              <div className="ml-auto hidden gap-1 lg:flex">
                {SENSOR_GROUPS.map((g) => {
                  const on = sensorSeen[g] > 0 && now - sensorSeen[g] < staleMs
                  return (
                    <span
                      key={g}
                      className="rounded px-1 font-mono text-[0.55rem] transition-colors"
                      style={{ color: on ? 'var(--color-space-950)' : 'var(--color-dim)', background: on ? cssColor('blue') : 'transparent', border: `1px solid ${on ? cssColor('blue') : 'var(--color-line)'}` }}
                    >
                      {g}
                    </span>
                  )
                })}
              </div>
            )}
          </PipelineNode>
        </Fragment>
      ))}
    </motion.nav>
  )
}

function PipelineNode({ node, children }: { node: Node; children?: ReactNode }) {
  const color = cssColor(node.accent)
  return (
    <div
      className="relative flex min-w-[9.5rem] shrink-0 flex-col justify-center overflow-hidden rounded-md border px-2.5 py-1 transition-all duration-500 xl:min-w-[11.5rem]"
      style={{
        borderColor: node.active ? `color-mix(in srgb, ${color} 55%, transparent)` : 'var(--color-line)',
        background: node.active ? `color-mix(in srgb, ${color} 8%, transparent)` : 'transparent',
        boxShadow: node.active ? `0 0 18px -6px ${color}` : 'none',
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color, opacity: node.active ? 1 : 0.25 }} />
      <div className="flex items-center gap-2">
        <span className="pulse-dot !h-1.5 !w-1.5" data-live={node.active} style={{ color: node.active ? color : 'var(--color-dim)' }} />
        <span className="hud-label truncate text-[0.72rem]" style={{ color: node.active ? color : 'var(--color-muted)' }}>
          {node.title}
        </span>
        {children}
      </div>
      <div className="flex items-center justify-between gap-2 font-mono text-[0.56rem]">
        <span className="truncate text-dim">{node.sub}</span>
        <span style={{ color: node.active ? color : 'var(--color-dim)' }}>{node.status}</span>
      </div>
    </div>
  )
}
