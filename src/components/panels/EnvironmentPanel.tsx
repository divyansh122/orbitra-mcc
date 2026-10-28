import { CHART_WINDOWS, FIELD_META, type FieldKey } from '../../config'
import { cssColor } from '../../lib/theme'
import { useTelemetry } from '../../store/telemetry'
import { TimeChart, type SeriesSpec } from '../charts/TimeChart'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { Panel } from '../ui/Panel'

const CHARTS: { key: FieldKey; minSpan: number; sensor: string; overlay?: FieldKey }[] = [
  { key: 'temperature', minSpan: 1, sensor: 'DHT', overlay: 'bmpTemperature' },
  { key: 'humidity', minSpan: 4, sensor: 'DHT' },
  { key: 'pressure', minSpan: 1, sensor: 'BMP280' },
]

export function EnvironmentPanel() {
  const windowSec = useTelemetry((s) => s.settings.chartWindowSec)
  const updateSettings = useTelemetry((s) => s.updateSettings)

  return (
    <Panel
      title="Environment"
      code="DHT · BMP280"
      accent="amber"
      className="area-env"
      index={2}
      actions={
        <div role="radiogroup" aria-label="Chart window" className="flex rounded-md border border-line bg-space-950/60 p-0.5">
          {CHART_WINDOWS.map((w) => (
            <button
              key={w.sec}
              role="radio"
              aria-checked={windowSec === w.sec}
              onClick={() => updateSettings({ chartWindowSec: w.sec })}
              className={`rounded px-2 py-0.5 font-mono text-[0.65rem] transition-colors ${
                windowSec === w.sec ? 'bg-cyan/15 text-cyan shadow-[0_0_10px_-2px_var(--color-cyan)]' : 'text-dim hover:text-muted'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid h-full min-h-0 grid-cols-1 gap-2 p-2 sm:grid-cols-3">
        {CHARTS.map((c) => (
          <EnvChart key={c.key} field={c.key} overlay={c.overlay} minSpan={c.minSpan} sensor={c.sensor} windowSec={windowSec} />
        ))}
      </div>
    </Panel>
  )
}

interface EnvChartProps {
  field: FieldKey
  /** Second series drawn on the same axes, e.g. BMP280 temperature next to DHT. */
  overlay?: FieldKey
  minSpan: number
  sensor: string
  windowSec: number
}

function EnvChart({ field, overlay, minSpan, sensor, windowSec }: EnvChartProps) {
  const meta = FIELD_META[field]
  const value = useTelemetry((s) => s.latest[field])
  const overlayValue = useTelemetry((s) => (overlay ? s.latest[overlay] : undefined))
  const color = cssColor(meta.accent)
  const series: SeriesSpec[] = [{ key: field, label: meta.label, accent: meta.accent }]
  if (overlay) series.push({ key: overlay, label: FIELD_META[overlay].label, accent: FIELD_META[overlay].accent })
  return (
    <div className="flex min-h-[9rem] min-w-0 flex-col rounded-lg border border-line/60 bg-space-950/35 sm:min-h-0">
      <div className="flex items-baseline justify-between gap-2 px-2 pt-1.5">
        <span className="hud-label truncate text-[0.66rem] text-muted">
          {meta.label} <span className="text-dim">· {sensor}</span>
        </span>
        <span className="flex items-baseline gap-2 font-mono">
          {overlay && overlayValue !== undefined && (
            <span className="text-[0.7rem]" style={{ color: cssColor(FIELD_META[overlay].accent) }} title={FIELD_META[overlay].label}>
              BMP <AnimatedNumber value={overlayValue} decimals={FIELD_META[overlay].decimals} />
            </span>
          )}
          <span className="text-[0.95rem] font-semibold glow-text" style={{ color }}>
            <AnimatedNumber value={value} decimals={meta.decimals} />
            <span className="ml-0.5 text-[0.6rem] text-muted">{meta.unit}</span>
          </span>
        </span>
      </div>
      <div className="min-h-0 flex-1 pb-0.5 pr-1">
        <TimeChart series={series} windowSec={windowSec} decimals={meta.decimals === 0 ? 0 : 1} minSpan={minSpan} />
      </div>
    </div>
  )
}
