import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import uPlot from 'uplot'
import type { Accent, SeriesKey } from '../../config'
import { telemetryBuffer } from '../../lib/buffer'
import { rootFontPx, token, withAlpha } from '../../lib/theme'
import { useTelemetry } from '../../store/telemetry'

export interface SeriesSpec {
  key: SeriesKey
  label: string
  accent: Accent
}

interface TimeChartProps {
  series: SeriesSpec[]
  /** Rolling window in seconds. */
  windowSec: number
  decimals?: number
  /** Minimum visible y-span so sensor noise doesn't fill the whole plot. */
  minSpan?: number
  /** Gradient fill under the first series. */
  fill?: boolean
}

/** Max chart redraw rate; data arrives far slower, this just keeps the time axis scrolling smoothly. */
const MAX_FPS = 60

export function TimeChart({ series, windowSec, decimals = 1, minSpan = 1, fill = true }: TimeChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef(windowSec)
  const reduce = useReducedMotion()
  const reduceRef = useRef(reduce)
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    windowRef.current = windowSec
    reduceRef.current = reduce
  }, [windowSec, reduce])

  const seriesKey = series.map((s) => `${s.key}:${s.accent}`).join(',')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const keys = series.map((s) => s.key)
    const fontPx = Math.round(rootFontPx() * 0.72)
    const font = `${fontPx}px "JetBrains Mono", monospace`
    const muted = token('dim')
    const grid = withAlpha(token('blue'), 0.09)

    const opts: uPlot.Options = {
      width: Math.max(50, host.clientWidth),
      height: Math.max(40, host.clientHeight),
      pxAlign: false,
      legend: { show: false },
      cursor: { x: true, y: false, points: { show: false }, drag: { x: false, y: false } },
      scales: {
        x: { time: true },
        y: {
          range: (_u, min, max) => {
            if (min === null || max === null || !Number.isFinite(min) || !Number.isFinite(max)) return [0, minSpan]
            const mid = (min + max) / 2
            const half = Math.max((max - min) / 2, minSpan / 2) * 1.15
            return [mid - half, mid + half]
          },
        },
      },
      axes: [
        {
          stroke: muted,
          font,
          size: fontPx * 2.2,
          space: fontPx * 7,
          grid: { stroke: grid, width: 1 },
          ticks: { show: false },
          values: (_u, splits) =>
            splits.map((s) => {
              const d = new Date(s * 1000)
              return `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
            }),
        },
        {
          stroke: muted,
          font,
          size: fontPx * 4.2,
          space: fontPx * 2.6,
          grid: { stroke: grid, width: 1 },
          ticks: { show: false },
          values: (_u, splits) => splits.map((v) => v.toFixed(decimals)),
        },
      ],
      series: [
        {},
        ...series.map((s, i) => {
          const color = token(s.accent)
          return {
            label: s.label,
            stroke: color,
            width: 1.8,
            spanGaps: true,
            points: { show: false },
            fill:
              fill && i === 0
                ? (u: uPlot) => {
                    const g = u.ctx.createLinearGradient(0, u.bbox.top, 0, u.bbox.top + u.bbox.height)
                    g.addColorStop(0, withAlpha(color, 0.28))
                    g.addColorStop(1, withAlpha(color, 0))
                    return g
                  }
                : undefined,
          } satisfies uPlot.Series
        }),
      ],
    }

    const empty: uPlot.AlignedData = [[], ...keys.map(() => [])]
    const u = new uPlot(opts, empty, host)

    const ro = new ResizeObserver(() => {
      const w = Math.max(50, host.clientWidth)
      const h = Math.max(40, host.clientHeight)
      if (w !== u.width || h !== u.height) u.setSize({ width: w, height: h })
    })
    ro.observe(host)

    let raf = 0
    let lastVersion = -1
    let lastDraw = 0
    let lastHasData = false
    let disposed = false
    const frame = (ts: number) => {
      if (disposed) return
      raf = requestAnimationFrame(frame)
      if (ts - lastDraw < 1000 / MAX_FPS - 1) return
      const paused = useTelemetry.getState().paused
      const changed = telemetryBuffer.version !== lastVersion
      // Without motion (or while paused) only redraw on new data.
      if (!changed && (reduceRef.current || paused)) return
      lastDraw = ts
      lastVersion = telemetryBuffer.version

      try {
        const now = Date.now()
        const t0 = now - windowRef.current * 1000
        const data = telemetryBuffer.window(keys, t0, Math.max(64, Math.floor(u.bbox.width / devicePixelRatio / 1.5)))
        const xMax = paused && data[0].length ? data[0][data[0].length - 1] : now / 1000
        u.batch(() => {
          u.setData(data as uPlot.AlignedData)
          u.setScale('x', { min: xMax - windowRef.current, max: xMax })
        })
        const present = data[0].length > 0
        if (present !== lastHasData) {
          lastHasData = present
          setHasData(present)
        }
      } catch (err) {
        console.warn('[orbitra] chart frame skipped', err)
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      u.destroy()
    }
    // seriesKey captures the series definition; other props are read through refs or are static per chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey, decimals, minSpan, fill])

  return (
    <div className="relative h-full w-full min-h-0">
      <div ref={hostRef} className="chart-host absolute inset-0" />
      {!hasData && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="hud-label blink text-[0.7rem] text-dim">Awaiting telemetry</span>
        </div>
      )}
    </div>
  )
}
