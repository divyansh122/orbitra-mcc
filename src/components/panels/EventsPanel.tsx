import { formatClock } from '../../lib/format'
import { useTelemetry } from '../../store/telemetry'
import type { Severity } from '../../types/telemetry'
import { Panel } from '../ui/Panel'

const SEVERITY_COLOR: Record<Severity, string> = {
  info: 'var(--color-blue)',
  ok: 'var(--color-green)',
  warn: 'var(--color-amber)',
  critical: 'var(--color-red)',
}

export function EventsPanel() {
  const events = useTelemetry((s) => s.events)
  const activeCount = useTelemetry((s) => Object.keys(s.alerts).length)

  return (
    <Panel
      title="Mission Events"
      code="ALERT LOG"
      accent={activeCount ? 'red' : 'purple'}
      index={5}
      actions={
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[0.62rem] ${activeCount ? 'bg-red/20 text-red' : 'bg-green/10 text-green'}`}
        >
          {activeCount ? `${activeCount} ACTIVE` : 'NOMINAL'}
        </span>
      }
    >
      <ul className="fade-bottom absolute inset-0 overflow-y-auto px-3 py-1.5 font-mono text-[0.66rem] leading-[1.6]">
        {events.slice(0, 50).map((e) => (
          <li key={e.id} className="terminal-line flex items-start gap-2">
            <span className="shrink-0 text-dim">{formatClock(e.t)}</span>
            <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[e.severity], boxShadow: `0 0 6px ${SEVERITY_COLOR[e.severity]}` }} />
            <span className="min-w-0 break-words" style={{ color: e.severity === 'info' ? 'var(--color-muted)' : SEVERITY_COLOR[e.severity] }}>
              {e.message}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
