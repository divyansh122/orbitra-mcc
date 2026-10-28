import { useReducedMotion } from 'framer-motion'
import type { Accent } from '../../config'
import { cssColor } from '../../lib/theme'
import { AnimatedNumber } from './AnimatedNumber'

export interface GaugeZone {
  from: number
  to: number
  accent: Accent
}

interface GaugeProps {
  value: number | null | undefined
  min: number
  max: number
  label: string
  unit: string
  decimals?: number
  accent?: Accent
  /** Fill from the centre (0) instead of from min — for ± angles. */
  bipolar?: boolean
  zones?: GaugeZone[]
  ticks?: number
}

const SWEEP = 240
const START = -SWEEP / 2
const R = 42
const C = 50

function polar(deg: number, r = R): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)]
}

function arc(fromDeg: number, toDeg: number, r = R): string {
  if (Math.abs(toDeg - fromDeg) < 0.01) return ''
  const [a, b] = fromDeg < toDeg ? [fromDeg, toDeg] : [toDeg, fromDeg]
  const [x1, y1] = polar(a, r)
  const [x2, y2] = polar(b, r)
  return `M${x1},${y1} A${r},${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2},${y2}`
}

/** Radial HUD gauge with spring-animated needle. Scales to its container. */
export function Gauge({ value, min, max, label, unit, decimals = 1, accent = 'cyan', bipolar, zones, ticks = 8 }: GaugeProps) {
  const reduce = useReducedMotion()
  const has = value !== null && value !== undefined && Number.isFinite(value)
  const clamped = has ? Math.min(max, Math.max(min, value)) : bipolar ? 0 : min
  const toDeg = (v: number) => START + ((v - min) / (max - min)) * SWEEP
  const valueDeg = toDeg(clamped)
  const originDeg = bipolar ? toDeg(0) : START
  const activeZone = has ? zones?.find((z) => clamped >= z.from && clamped <= z.to) : undefined
  const color = cssColor(activeZone?.accent ?? accent)

  return (
    <div className="flex h-full w-full min-h-0 items-center justify-center" style={{ containerType: 'size' }}>
      <div className="relative" style={{ width: 'min(100cqw, calc(100cqh * 100 / 88))', aspectRatio: '100 / 88' }}>
      <svg viewBox="0 0 100 88" className="absolute inset-0 h-full w-full" role="img" aria-label={`${label} ${has ? value!.toFixed(decimals) : 'no data'} ${unit}`}>
        <path d={arc(START, START + SWEEP)} stroke="var(--color-line)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {zones?.map((z) => (
          <path key={`${z.from}-${z.to}`} d={arc(toDeg(z.from), toDeg(z.to), R + 5)} stroke={cssColor(z.accent)} strokeOpacity="0.55" strokeWidth="1.4" fill="none" />
        ))}
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const d = START + (i / ticks) * SWEEP
          const [x1, y1] = polar(d, R - 5)
          const [x2, y2] = polar(d, R - (i % 2 === 0 ? 9 : 7))
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-dim)" strokeWidth="0.8" />
        })}
        <path
          d={arc(originDeg, valueDeg)}
          stroke={color}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${color})`, transition: reduce ? 'none' : 'd 0.35s ease-out, stroke 0.3s' }}
        />
        <g
          style={{
            transform: `rotate(${valueDeg}deg)`,
            transformBox: 'view-box',
            transformOrigin: `${C}px ${C}px`,
            transition: reduce ? 'none' : 'transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
          }}
        >
          <line x1={C} y1={C} x2={C} y2={C - R + 10} stroke="var(--color-ink)" strokeWidth="1.4" strokeLinecap="round" />
        </g>
        <circle cx={C} cy={C} r="3" fill="var(--color-space-900)" stroke={color} strokeWidth="1.2" />
        <text x={C} y={C + 18} textAnchor="middle" className="hud-label" fontSize="6.5" fill="var(--color-muted)">
          {label}
        </text>
      </svg>
      <div
        className="pointer-events-none absolute inset-x-0 top-[60%] flex items-baseline justify-center gap-[0.15em] font-mono font-semibold leading-none glow-text"
        style={{ color, fontSize: 'min(12cqw, 13.6cqh)' }}
      >
        <AnimatedNumber value={has ? value : null} decimals={decimals} />
        <span className="text-[0.5em] text-muted">{unit}</span>
      </div>
      </div>
    </div>
  )
}
