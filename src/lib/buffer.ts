import { BUFFER, SERIES_KEYS, type SeriesKey } from '../config'
import type { Sample } from '../types/telemetry'

export type ChartData = [number[], ...(number | null)[][]]

export interface TrackPoint {
  t: number
  lat: number
  lon: number
}

/**
 * Columnar ring buffer holding the rolling telemetry history outside React.
 * Charts poll `version` on animation frames and only re-query when it changes.
 */
class TelemetryBuffer {
  private readonly capacity: number
  private readonly t: Float64Array
  private readonly cols: Record<SeriesKey, Float64Array>
  private head = 0
  private size = 0
  /** Increments on every write or clear. */
  version = 0
  track: TrackPoint[] = []
  /** Increments when the GPS track is cleared, so the map can reset its trail. */
  trackEpoch = 0

  constructor(capacity: number) {
    this.capacity = capacity
    this.t = new Float64Array(capacity)
    this.cols = Object.fromEntries(SERIES_KEYS.map((k) => [k, new Float64Array(capacity).fill(NaN)])) as Record<
      SeriesKey,
      Float64Array
    >
  }

  get length(): number {
    return this.size
  }

  private phys(i: number): number {
    return (this.head - this.size + i + this.capacity) % this.capacity
  }

  push(time: number, sample: Sample): void {
    const last = this.size > 0 ? this.t[this.phys(this.size - 1)] : -Infinity
    const t = Math.max(time, last)
    const idx = this.head
    this.t[idx] = t
    for (const key of SERIES_KEYS) {
      const v = sample[key]
      this.cols[key][idx] = v === undefined ? NaN : v
    }
    this.head = (this.head + 1) % this.capacity
    this.size = Math.min(this.size + 1, this.capacity)

    const cutoff = t - BUFFER.retentionSec * 1000
    while (this.size > 0 && this.t[this.phys(0)] < cutoff) this.size--

    if (sample.gpsFix === 1 && sample.latitude !== undefined && sample.longitude !== undefined) {
      this.track.push({ t, lat: sample.latitude, lon: sample.longitude })
      if (this.track.length > BUFFER.trackCapacity) this.track.splice(0, this.track.length - BUFFER.trackCapacity)
    }
    this.version++
  }

  clear(): void {
    this.head = 0
    this.size = 0
    this.track = []
    this.trackEpoch++
    this.version++
  }

  /** First logical index whose timestamp is >= t0. */
  private lowerBound(t0: number): number {
    let lo = 0
    let hi = this.size
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (this.t[this.phys(mid)] < t0) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  /**
   * Returns uPlot-ready columns (x in seconds) for samples newer than t0,
   * decimated to roughly maxPoints using min/max buckets of the first key
   * so spikes survive downsampling.
   */
  window(keys: readonly SeriesKey[], t0: number, maxPoints: number): ChartData {
    const start = this.lowerBound(t0)
    const n = this.size - start
    const xs: number[] = []
    const ys: (number | null)[][] = keys.map(() => [])
    const emit = (i: number) => {
      const p = this.phys(i)
      xs.push(this.t[p] / 1000)
      keys.forEach((k, j) => {
        const v = this.cols[k][p]
        ys[j].push(Number.isNaN(v) ? null : v)
      })
    }

    if (n <= maxPoints) {
      for (let i = start; i < this.size; i++) emit(i)
    } else {
      const buckets = Math.max(1, Math.floor(maxPoints / 2))
      const step = n / buckets
      const primary = this.cols[keys[0]]
      for (let b = 0; b < buckets; b++) {
        const from = start + Math.floor(b * step)
        const to = Math.min(this.size, start + Math.floor((b + 1) * step))
        let minI = -1
        let maxI = -1
        for (let i = from; i < to; i++) {
          const v = primary[this.phys(i)]
          if (Number.isNaN(v)) continue
          if (minI < 0 || v < primary[this.phys(minI)]) minI = i
          if (maxI < 0 || v > primary[this.phys(maxI)]) maxI = i
        }
        if (minI < 0) {
          emit(from)
        } else if (minI === maxI) {
          emit(minI)
        } else {
          emit(Math.min(minI, maxI))
          emit(Math.max(minI, maxI))
        }
      }
    }
    return [xs, ...ys]
  }

  forEachRow(cb: (t: number, row: Record<SeriesKey, number>) => void): void {
    for (let i = 0; i < this.size; i++) {
      const p = this.phys(i)
      const row = {} as Record<SeriesKey, number>
      for (const key of SERIES_KEYS) row[key] = this.cols[key][p]
      cb(this.t[p], row)
    }
  }
}

export const telemetryBuffer = new TelemetryBuffer(BUFFER.capacity)
