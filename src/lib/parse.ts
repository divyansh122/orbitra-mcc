import {
  ACCEL_AUTO_MS2_THRESHOLD,
  ACCEL_UNIT,
  FIELD_ALIASES,
  FIELD_KEYS,
  PRESSURE_PA_THRESHOLD,
  STANDARD_GRAVITY,
} from '../config/fields'
import type { Sample } from '../types/telemetry'

export interface ParsedMessage {
  packets: { sample: Sample; raw: string }[]
  malformed: string[]
}

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Splits a WebSocket message into lines and parses each one. Never throws:
 * anything that cannot be understood is returned in `malformed`.
 */
export function parseMessage(text: string): ParsedMessage {
  const result: ParsedMessage = { packets: [], malformed: [] }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const json = tryJson(line)
    const candidates = Array.isArray(json) ? json : [json]
    let parsedAny = false
    for (const candidate of candidates) {
      if (!isObj(candidate)) continue
      const sample = extractSample(candidate)
      if (sample) {
        result.packets.push({ sample, raw: Array.isArray(json) ? JSON.stringify(candidate) : line })
        parsedAny = true
      }
    }
    if (!parsedAny) result.malformed.push(line)
  }
  return result
}

function tryJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    // Serial lines sometimes carry a prefix ("RX: {...}") or trailing noise.
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {
        return undefined
      }
    }
    return undefined
  }
}

function getCaseInsensitive(obj: Obj, key: string): unknown {
  if (key in obj) return obj[key]
  const lower = key.toLowerCase()
  for (const k of Object.keys(obj)) if (k.toLowerCase() === lower) return obj[k]
  return undefined
}

function getPath(obj: Obj, path: string): unknown {
  let cur: unknown = obj
  for (const part of path.split('.')) {
    if (!isObj(cur)) return undefined
    cur = getCaseInsensitive(cur, part)
  }
  return cur
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function toFlag(v: unknown): number | undefined {
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'number') return Number.isFinite(v) ? (v > 0 ? 1 : 0) : undefined
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (['true', '1', 'yes', 'fix', '3d', '2d', 'a'].includes(s)) return 1
    if (['false', '0', 'no', 'nofix', 'none', 'v'].includes(s)) return 0
  }
  return undefined
}

/** Maps one decoded JSON object onto the canonical fields. Returns null if nothing matched. */
export function extractSample(input: Obj): Sample | null {
  let src: Obj = input
  // { data: {...} } wrappers
  if (isObj(input.data)) src = { ...input, ...input.data }
  // Open MCT point style: { id: "prop.temperature", value: 26.4 }
  if (typeof input.id === 'string' && 'value' in input) {
    const key = input.id.split('.').pop() ?? input.id
    src = { [key]: input.value }
  }

  const sample: Sample = {}
  for (const field of FIELD_KEYS) {
    for (const alias of FIELD_ALIASES[field]) {
      const raw = getPath(src, alias)
      if (raw === undefined || raw === null) continue
      const value = field === 'gpsFix' ? toFlag(raw) : toNumber(raw)
      if (value !== undefined) {
        sample[field] = value
        break
      }
    }
  }

  normalize(sample)
  return Object.keys(sample).length > 0 ? sample : null
}

function normalize(s: Sample): void {
  if (s.pressure !== undefined && s.pressure > PRESSURE_PA_THRESHOLD) s.pressure /= 100

  // GPS: drop impossible coordinates and the 0,0 "no fix" placeholder.
  const hasLat = s.latitude !== undefined && Math.abs(s.latitude) <= 90
  const hasLon = s.longitude !== undefined && Math.abs(s.longitude) <= 180
  const nullIsland = s.latitude === 0 && s.longitude === 0
  if (!hasLat || !hasLon || nullIsland) {
    delete s.latitude
    delete s.longitude
  }
  if (s.gpsFix === undefined && s.latitude !== undefined) s.gpsFix = 1
  if (s.gpsFix === 0) delete s.gpsAltitude

  const { ax, ay, az } = s
  if (ax !== undefined && ay !== undefined && az !== undefined) {
    let mag = Math.hypot(ax, ay, az)
    const isMs2 = ACCEL_UNIT === 'ms2' || (ACCEL_UNIT === 'auto' && mag > ACCEL_AUTO_MS2_THRESHOLD)
    if (isMs2) {
      s.ax = ax / STANDARD_GRAVITY
      s.ay = ay / STANDARD_GRAVITY
      s.az = az / STANDARD_GRAVITY
      mag /= STANDARD_GRAVITY
    }
    s.gForce = mag
  }
}
