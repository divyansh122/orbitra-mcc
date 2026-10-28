import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { FIELD_META, type SeriesKey } from '../../config'
import { formatNumber } from '../../lib/format'
import { cssColor } from '../../lib/theme'
import { useTelemetry } from '../../store/telemetry'
import { AnimatedNumber } from './AnimatedNumber'
import { Sparkline } from './Sparkline'

interface StatCardProps {
  field: SeriesKey
  label?: string
  index?: number
  /** Replaces the default value block (used by the GPS fix card). */
  children?: ReactNode
  footer?: ReactNode
}

export function StatCard({ field, label, index = 0, children, footer }: StatCardProps) {
  const meta = FIELD_META[field]
  const value = useTelemetry((s) => s.latest[field])
  const stat = useTelemetry((s) => s.stats[field])
  const alerting = useTelemetry((s) => {
    const a = s.alerts
    if (field === 'temperature') return Boolean(a.tempHigh || a.tempLow)
    if (field === 'humidity') return Boolean(a.humidityHigh)
    return false
  })
  const accent = alerting ? 'red' : meta.accent
  const color = cssColor(accent)
  const has = value !== undefined

  return (
    <motion.div
      className="panel overflow-hidden px-3 pb-2 pt-2.5"
      style={{ '--accent': color } as CSSProperties}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="hud-corner tl" />
      <span className="hud-corner br" />
      <div className="absolute inset-x-0 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div className="flex items-center justify-between gap-2">
        <span className="hud-label truncate text-[0.72rem] text-muted">{label ?? meta.label}</span>
        <span className="font-mono text-[0.58rem] tracking-wider text-dim">{meta.sensor}</span>
      </div>

      {children ?? (
        <div className="mt-1 flex items-end justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-1 font-mono font-semibold leading-none glow-text" style={{ color: has ? color : 'var(--color-dim)' }}>
            <AnimatedNumber value={value} decimals={meta.decimals} className="text-[1.95rem]" />
            <span className="text-[0.8rem] text-muted">{meta.unit}</span>
          </div>
          <div className="h-8 w-[45%] max-w-[7.5rem] shrink-0">
            <Sparkline field={field} accent={accent} />
          </div>
        </div>
      )}

      {footer ?? (
        <div className="mt-1.5 grid grid-cols-3 gap-1 border-t border-line/60 pt-1 font-mono text-[0.6rem] text-dim">
          <span>
            MIN <span className="text-muted">{formatNumber(stat?.min, meta.decimals)}</span>
          </span>
          <span className="text-center">
            AVG <span className="text-muted">{formatNumber(stat ? stat.sum / stat.count : null, meta.decimals)}</span>
          </span>
          <span className="text-right">
            MAX <span className="text-muted">{formatNumber(stat?.max, meta.decimals)}</span>
          </span>
        </div>
      )}
    </motion.div>
  )
}
