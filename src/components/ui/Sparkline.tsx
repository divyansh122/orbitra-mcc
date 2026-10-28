import { useEffect, useId, useRef } from 'react'
import { UI, type Accent, type SeriesKey } from '../../config'
import { telemetryBuffer } from '../../lib/buffer'
import { cssColor } from '../../lib/theme'

const W = 120
const H = 32

/** Tiny trailing-minute trend line, redrawn a few times a second straight from the buffer. */
export function Sparkline({ field, accent }: { field: SeriesKey; accent: Accent }) {
  const lineRef = useRef<SVGPathElement>(null)
  const areaRef = useRef<SVGPathElement>(null)
  const gradId = `spark-${useId().replace(/:/g, '')}`

  useEffect(() => {
    let lastVersion = -1
    const draw = () => {
      if (telemetryBuffer.version === lastVersion) return
      lastVersion = telemetryBuffer.version
      const now = Date.now()
      const [xs, ys] = telemetryBuffer.window([field], now - UI.sparklineSec * 1000, UI.sparklinePoints)
      const pts: [number, number][] = []
      let min = Infinity
      let max = -Infinity
      ys.forEach((y) => {
        if (y === null) return
        if (y < min) min = y
        if (y > max) max = y
      })
      const span = max - min || 1
      const t0 = now / 1000 - UI.sparklineSec
      xs.forEach((x, i) => {
        const y = ys[i]
        if (y === null) return
        pts.push([((x - t0) / UI.sparklineSec) * W, H - 3 - ((y - min) / span) * (H - 6)])
      })
      const line = pts.length > 1 ? 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') : ''
      lineRef.current?.setAttribute('d', line)
      areaRef.current?.setAttribute('d', line ? `${line}L${pts[pts.length - 1][0].toFixed(1)},${H}L${pts[0][0].toFixed(1)},${H}Z` : '')
    }
    draw()
    const id = setInterval(draw, UI.sparklineRefreshMs)
    return () => clearInterval(id)
  }, [field])

  const color = cssColor(accent)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path ref={areaRef} fill={`url(#${gradId})`} />
      <path
        ref={lineRef}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
    </svg>
  )
}
