import type { Thresholds } from '../config'
import type { ActiveAlert, AlertId, Sample } from '../types/telemetry'

export interface AlertContext {
  latest: Sample
  thresholds: Thresholds
  now: number
  /** True while a data source (socket or demo) is supposed to be delivering packets. */
  sourceActive: boolean
  /** Timestamp of the last packet, or of the moment the source became active. */
  lastActivityAt: number | null
  hadGpsFix: boolean
}

type Condition = { severity: ActiveAlert['severity']; message: string }

export function evaluateAlerts(ctx: AlertContext): Partial<Record<AlertId, Condition>> {
  const { latest, thresholds: th } = ctx
  const out: Partial<Record<AlertId, Condition>> = {}

  if (ctx.sourceActive && ctx.lastActivityAt !== null && ctx.now - ctx.lastActivityAt > th.staleMs) {
    out.stale = { severity: 'critical', message: `NO PACKETS FOR ${(th.staleMs / 1000).toFixed(0)}+ S` }
  }
  if (latest.temperature !== undefined && latest.temperature > th.tempHigh) {
    out.tempHigh = { severity: 'critical', message: `TEMPERATURE ABOVE ${th.tempHigh} °C` }
  }
  if (latest.temperature !== undefined && latest.temperature < th.tempLow) {
    out.tempLow = { severity: 'warn', message: `TEMPERATURE BELOW ${th.tempLow} °C` }
  }
  if (latest.humidity !== undefined && latest.humidity > th.humidityHigh) {
    out.humidityHigh = { severity: 'warn', message: `HUMIDITY ABOVE ${th.humidityHigh} %` }
  }
  if (latest.gForce !== undefined && latest.gForce > th.gForceHigh) {
    out.gForceHigh = { severity: 'critical', message: `HIGH G-FORCE > ${th.gForceHigh} g` }
  }
  const tilt = Math.max(Math.abs(latest.roll ?? 0), Math.abs(latest.pitch ?? 0))
  if (tilt > th.tiltHigh) {
    out.tilt = { severity: 'warn', message: `ATTITUDE BEYOND ±${th.tiltHigh}°` }
  }
  if (th.gpsLostAlert && ctx.hadGpsFix && latest.gpsFix === 0) {
    out.gpsLost = { severity: 'warn', message: 'GPS FIX LOST' }
  }
  return out
}
