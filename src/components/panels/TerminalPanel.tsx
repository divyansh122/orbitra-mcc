import { useState, type CSSProperties } from 'react'
import { UI } from '../../config'
import { formatClock } from '../../lib/format'
import { useTelemetry } from '../../store/telemetry'
import type { RawLine } from '../../types/telemetry'
import { IconPause, IconPlay } from '../ui/Icons'
import { Panel } from '../ui/Panel'

/** Live view of the raw JSON arriving from bridge.js, newest first. */
export function TerminalPanel() {
  const live = useTelemetry((s) => s.rawLog)
  const packetCount = useTelemetry((s) => s.packetCount)
  const malformed = useTelemetry((s) => s.malformedCount)
  const demoMode = useTelemetry((s) => s.demoMode)
  const wsUrl = useTelemetry((s) => s.settings.wsUrl)
  const [frozen, setFrozen] = useState<RawLine[] | null>(null)
  const lines = (frozen ?? live).slice(0, UI.terminalRows)

  return (
    <Panel
      title="Raw Packet Stream"
      code={demoMode ? 'SIMULATOR · ESP-NOW FRAMES' : wsUrl}
      accent="green"
      index={4}
      actions={
        <>
          <span className="hidden font-mono text-[0.62rem] text-dim sm:inline">
            RX <span className="text-green">{packetCount}</span> · ERR <span className={malformed ? 'text-red' : 'text-muted'}>{malformed}</span>
          </span>
          <button
            className="hud-btn !h-6 !px-2 !text-[0.62rem]"
            data-active={frozen !== null}
            style={{ '--btn-accent': 'var(--color-amber)' } as CSSProperties}
            onClick={() => setFrozen((f) => (f ? null : live))}
            aria-pressed={frozen !== null}
          >
            {frozen ? <IconPlay /> : <IconPause />}
            {frozen ? 'Resume' : 'Hold'}
          </button>
        </>
      }
    >
      <div className="fade-bottom absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,rgb(2_6_4/0.55),rgb(2_6_4/0.3))] px-3 py-1.5 font-mono text-[0.68rem] leading-[1.55]" role="log" aria-live="off">
        {lines.length === 0 && (
          <p className="text-green/60">
            <span className="blink">▌</span> listening for packets…
          </p>
        )}
        {lines.map((l) => (
          <div key={l.id} className="terminal-line flex gap-2 whitespace-nowrap">
            <span className="shrink-0 text-dim">{formatClock(l.t, true)}</span>
            {l.ok ? (
              <span className="truncate text-green" style={{ textShadow: '0 0 6px rgb(74 222 128 / 0.45)' }}>
                {l.text}
              </span>
            ) : (
              <span className="truncate text-red">
                <span className="mr-1 rounded bg-red/15 px-1">MALFORMED · DISCARDED</span>
                {l.text}
              </span>
            )}
          </div>
        ))}
      </div>
      {frozen && <div className="hud-label pointer-events-none absolute right-3 top-2 text-[0.6rem] text-amber blink">Stream held</div>}
    </Panel>
  )
}
