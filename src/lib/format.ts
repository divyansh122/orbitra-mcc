export function formatNumber(v: number | null | undefined, decimals: number): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return v.toFixed(decimals)
}

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0')

/** HH:MM:SS for an elapsed duration in ms. */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`
}

export function formatClock(t: number, withMs = false): string {
  const d = new Date(t)
  const base = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return withMs ? `${base}.${pad(d.getMilliseconds(), 3)}` : base
}

/** Short packet age: "120 ms", "3.4 s", "2 m". */
export function formatAge(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.floor(ms / 60_000)} m`
}

/** Decimal degrees → 26°45'36.0"N */
export function toDms(deg: number, isLat: boolean): string {
  const hemi = isLat ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W'
  const a = Math.abs(deg)
  const d = Math.floor(a)
  const mFloat = (a - d) * 60
  const m = Math.floor(mFloat)
  const s = (mFloat - m) * 60
  return `${d}°${pad(m)}'${s.toFixed(1).padStart(4, '0')}"${hemi}`
}

/** Great-circle distance in metres. */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const toRad = Math.PI / 180
  const dLat = (lat2 - lat1) * toRad
  const dLon = (lon2 - lon1) * toRad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}
