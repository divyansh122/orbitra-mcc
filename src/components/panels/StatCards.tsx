import { useNow } from '../../hooks/useTicker'
import { toDms } from '../../lib/format'
import { useTelemetry } from '../../store/telemetry'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { StatCard } from '../ui/StatCard'

export function StatCards() {
  return (
    <div className="stat-row">
      <StatCard field="temperature" index={0} />
      <StatCard field="humidity" index={1} />
      <StatCard field="pressure" index={2} />
      <StatCard field="bmpAltitude" index={3} />
      <StatCard field="gpsAltitude" index={4} />
      <GpsFixCard />
    </div>
  )
}

function GpsFixCard() {
  const fix = useTelemetry((s) => s.latest.gpsFix)
  const sats = useTelemetry((s) => s.latest.satellites)
  const lat = useTelemetry((s) => s.latest.latitude)
  const lon = useTelemetry((s) => s.latest.longitude)
  const gpsSeen = useTelemetry((s) => s.sensorSeen.GPS)
  const lostAlert = useTelemetry((s) => Boolean(s.alerts.gpsLost))
  const now = useNow(1000)

  const state = fix === 1 ? 'lock' : fix === 0 ? 'nofix' : 'nodata'
  const accent = state === 'lock' ? 'var(--color-green)' : state === 'nofix' ? (lostAlert ? 'var(--color-red)' : 'var(--color-amber)') : 'var(--color-dim)'
  const title = state === 'lock' ? '3D LOCK' : state === 'nofix' ? 'NO FIX' : 'NO DATA'
  const staleSec = gpsSeen ? Math.round((now - gpsSeen) / 1000) : null

  return (
    <StatCard
      field="satellites"
      label="GPS Fix Status"
      index={5}
      footer={
        <div className="mt-1.5 flex justify-between gap-1 border-t border-line/60 pt-1 font-mono text-[0.6rem] text-dim">
          <span className="truncate">{lat !== undefined ? toDms(lat, true) : '--°--\'--.-"'}</span>
          <span className="truncate">{lon !== undefined ? toDms(lon, false) : '--°--\'--.-"'}</span>
        </div>
      }
    >
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="flex items-center gap-2.5" style={{ color: accent }}>
          <span className={`pulse-dot !h-3.5 !w-3.5 ${state === 'nofix' ? 'blink' : ''}`} data-live={state === 'lock'} />
          <span className="font-display text-[1.45rem] font-semibold leading-none glow-text">{title}</span>
        </div>
        <div className="text-right font-mono leading-none">
          <div className="text-[1.3rem] font-semibold text-ink">
            <AnimatedNumber value={sats} decimals={0} />
          </div>
          <div className="hud-label mt-1 text-[0.55rem] text-dim">
            {staleSec !== null && staleSec > 3 ? `${staleSec}s ago` : 'sats'}
          </div>
        </div>
      </div>
    </StatCard>
  )
}
