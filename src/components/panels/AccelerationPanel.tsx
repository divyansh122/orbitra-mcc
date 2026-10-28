import { FIELD_META } from '../../config'
import { cssColor } from '../../lib/theme'
import { useTelemetry } from '../../store/telemetry'
import { TimeChart, type SeriesSpec } from '../charts/TimeChart'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { Gauge } from '../ui/Gauge'
import { Panel } from '../ui/Panel'

const SERIES: SeriesSpec[] = [
  { key: 'ax', label: 'AX', accent: FIELD_META.ax.accent },
  { key: 'ay', label: 'AY', accent: FIELD_META.ay.accent },
  { key: 'az', label: 'AZ', accent: FIELD_META.az.accent },
]

export function AccelerationPanel() {
  const windowSec = useTelemetry((s) => s.settings.chartWindowSec)
  const gForce = useTelemetry((s) => s.latest.gForce)
  const gLimit = useTelemetry((s) => s.settings.thresholds.gForceHigh)
  const gAlert = useTelemetry((s) => Boolean(s.alerts.gForceHigh))
  const peak = useTelemetry((s) => s.stats.gForce?.max)

  const gMax = Math.max(4, Math.ceil(gLimit + 1))
  const zones = [
    { from: 0, to: gLimit * 0.65, accent: 'green' as const },
    { from: gLimit * 0.65, to: gLimit, accent: 'amber' as const },
    { from: gLimit, to: gMax, accent: 'red' as const },
  ]

  return (
    <Panel
      title="Acceleration"
      code="MPU-6050 · 3-AXIS"
      accent={gAlert ? 'red' : 'blue'}
      className="area-accel"
      index={1}
      actions={<Legend />}
    >
      <div className="flex h-full min-h-0">
        <div className="min-w-0 flex-1 py-1 pl-1">
          <TimeChart series={SERIES} windowSec={windowSec} decimals={1} minSpan={0.6} fill={false} />
        </div>
        <div className="flex w-[34%] max-w-[13rem] shrink-0 flex-col border-l border-line/60 px-2 py-1.5">
          <div className="min-h-0 flex-1">
            <Gauge value={gForce} min={0} max={gMax} label="TOTAL G" unit="g" decimals={2} zones={zones} accent="green" ticks={gMax * 2} />
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1 font-mono text-[0.62rem]">
            {SERIES.map((s) => (
              <AxisReadout key={s.key} k={s.key as 'ax' | 'ay' | 'az'} />
            ))}
          </div>
          <div className="mt-1 flex justify-between font-mono text-[0.58rem] text-dim">
            <span>PEAK</span>
            <span className="text-amber">{peak !== undefined ? `${peak.toFixed(2)} g` : '—'}</span>
          </div>
        </div>
      </div>
    </Panel>
  )
}

function AxisReadout({ k }: { k: 'ax' | 'ay' | 'az' }) {
  const v = useTelemetry((s) => s.latest[k])
  const color = cssColor(FIELD_META[k].accent)
  return (
    <div className="rounded border border-line/70 bg-space-950/50 px-1 py-0.5 text-center">
      <div className="text-[0.55rem] text-dim">{k.toUpperCase()}</div>
      <AnimatedNumber value={v} decimals={2} className="font-semibold" />
      <div className="mx-auto mt-0.5 h-0.5 w-3/5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
    </div>
  )
}

function Legend() {
  return (
    <div className="hidden items-center gap-2.5 font-mono text-[0.62rem] text-muted md:flex">
      {SERIES.map((s) => (
        <span key={s.key} className="flex items-center gap-1">
          <span className="h-0.5 w-3 rounded-full" style={{ background: cssColor(s.accent), boxShadow: `0 0 6px ${cssColor(s.accent)}` }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}
