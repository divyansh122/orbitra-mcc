import type { SeriesKey, SensorGroup } from '../config/fields'

/** One normalized telemetry packet. Every field is optional. */
export type Sample = Partial<Record<SeriesKey, number>>

export type LinkStatus = 'idle' | 'connecting' | 'online' | 'offline'

export interface RawLine {
  id: number
  t: number
  text: string
  ok: boolean
}

export type Severity = 'info' | 'ok' | 'warn' | 'critical'

export interface EventEntry {
  id: number
  t: number
  severity: Severity
  message: string
}

export type AlertId = 'tempHigh' | 'tempLow' | 'humidityHigh' | 'gForceHigh' | 'tilt' | 'gpsLost' | 'stale'

export interface ActiveAlert {
  id: AlertId
  severity: 'warn' | 'critical'
  message: string
  since: number
}

export interface RunningStat {
  min: number
  max: number
  sum: number
  count: number
}

export type SensorSeen = Record<SensorGroup, number>
