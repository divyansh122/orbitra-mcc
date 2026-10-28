/**
 * Runtime defaults. Everything here can be changed live from the ⚙ settings
 * panel; changes made there are remembered in the browser.
 */

export interface Thresholds {
  /** °C — raise a caution above this temperature. */
  tempHigh: number
  /** °C — raise a caution below this temperature. */
  tempLow: number
  /** % — raise a caution above this humidity. */
  humidityHigh: number
  /** g — raise a warning when total acceleration exceeds this. */
  gForceHigh: number
  /** ° — raise a caution when |roll| or |pitch| exceeds this. */
  tiltHigh: number
  /** ms — raise a warning when no packet arrives for this long. */
  staleMs: number
  /** Raise a caution when an established GPS fix is lost. */
  gpsLostAlert: boolean
}

export type EffectsLevel = 'full' | 'lite'

export interface Settings {
  wsUrl: string
  thresholds: Thresholds
  /** Rolling window shown by the time-series charts, in seconds. */
  chartWindowSec: number
  /** 'lite' disables background animation and glass blur for slow machines. */
  effects: EffectsLevel
}

export const DEFAULT_WS_URL: string = import.meta.env.VITE_WS_URL || 'ws://localhost:8081'

export const DEFAULT_THRESHOLDS: Thresholds = {
  tempHigh: 45,
  tempLow: 0,
  humidityHigh: 90,
  gForceHigh: 2.5,
  tiltHigh: 45,
  staleMs: 3000,
  gpsLostAlert: true,
}

export const CHART_WINDOWS = [
  { sec: 30, label: '30s' },
  { sec: 60, label: '1m' },
  { sec: 300, label: '5m' },
] as const

export const DEFAULT_SETTINGS: Settings = {
  wsUrl: DEFAULT_WS_URL,
  thresholds: DEFAULT_THRESHOLDS,
  chartWindowSec: 60,
  effects: 'full',
}

/** WebSocket reconnect behaviour (exponential backoff with jitter). */
export const LINK = {
  backoffBaseMs: 500,
  backoffMaxMs: 10_000,
  connectTimeoutMs: 4_000,
  /** Failed attempts before the status shows OFFLINE (and demo mode is offered). */
  offlineAfterAttempts: 2,
}

export const BUFFER = {
  /** Rolling history kept in memory (and exported to CSV). */
  retentionSec: 600,
  /** Hard cap on stored rows: 10 min at 50 Hz. */
  capacity: 30_000,
  /** GPS trail points kept for the map. */
  trackCapacity: 6_000,
}

export const UI = {
  rawLogSize: 60,
  terminalRows: 40,
  eventLogSize: 200,
  sparklineSec: 60,
  sparklinePoints: 60,
  sparklineRefreshMs: 400,
  tickMs: 250,
  ppsWindowMs: 2_000,
  mapRefreshMs: 250,
  bootMs: 2_800,
  bootReducedMs: 900,
}

export const DEMO = {
  hz: 10,
}

const STORAGE_KEY = 'orbitra26.settings.v1'

export function loadSettings(): Settings {
  let stored: Partial<Settings> = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) stored = JSON.parse(raw) as Partial<Settings>
  } catch {
    stored = {}
  }
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    thresholds: { ...DEFAULT_THRESHOLDS, ...(stored.thresholds ?? {}) },
  }
  const ws = urlParam('ws')
  if (ws) settings.wsUrl = ws
  return settings
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // storage unavailable (private window) — settings stay for this session only
  }
}

/** Query-string overrides: ?ws=ws://host:port  ?demo=1  ?noboot=1 */
export function urlParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name)
  } catch {
    return null
  }
}
