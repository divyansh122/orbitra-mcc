import { create } from 'zustand'
import {
  DEFAULT_SETTINGS,
  FIELD_META,
  SERIES_KEYS,
  UI,
  loadSettings,
  saveSettings,
  urlParam,
  type SensorGroup,
  type SeriesKey,
  type Settings,
} from '../config'
import { evaluateAlerts } from '../lib/alerts'
import { telemetryBuffer } from '../lib/buffer'
import type {
  ActiveAlert,
  AlertId,
  EventEntry,
  LinkStatus,
  RawLine,
  RunningStat,
  Sample,
  SensorSeen,
  Severity,
} from '../types/telemetry'

interface TelemetryState {
  settings: Settings
  demoMode: boolean
  paused: boolean
  presentation: boolean
  settingsOpen: boolean

  link: LinkStatus
  linkAttempt: number
  nextRetryAt: number | null
  linkSince: number | null
  /** Bump to force the socket hook to reconnect immediately. */
  reconnectNonce: number
  demoOffered: boolean
  demoOfferDismissed: boolean

  packetCount: number
  malformedCount: number
  lastPacketAt: number | null
  firstPacketAt: number | null
  pps: number

  latest: Sample
  stats: Partial<Record<SeriesKey, RunningStat>>
  sensorSeen: SensorSeen
  hadGpsFix: boolean

  rawLog: RawLine[]
  events: EventEntry[]
  alerts: Partial<Record<AlertId, ActiveAlert>>
  alertsAcked: boolean

  ingest: (sample: Sample, raw: string) => void
  recordMalformed: (raw: string) => void
  tick: () => void
  setLink: (link: LinkStatus, attempt: number, nextRetryAt?: number | null) => void
  reconnect: () => void
  setDemoMode: (on: boolean) => void
  togglePause: () => void
  clearData: () => void
  setPresentation: (on: boolean) => void
  setSettingsOpen: (open: boolean) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
  dismissDemoOffer: () => void
  ackAlerts: () => void
  logEvent: (severity: Severity, message: string) => void
}

let seq = 0
const arrivals: number[] = []
const emptySensors = (): SensorSeen => ({ MPU: 0, BMP: 0, DHT: 0, GPS: 0 })

function pushStat(stats: TelemetryState['stats'], key: SeriesKey, v: number) {
  const s = stats[key]
  stats[key] = s
    ? { min: Math.min(s.min, v), max: Math.max(s.max, v), sum: s.sum + v, count: s.count + 1 }
    : { min: v, max: v, sum: v, count: 1 }
}

export const useTelemetry = create<TelemetryState>()((set, get) => {
  const logEvent = (severity: Severity, message: string) =>
    set((s) => ({ events: [{ id: ++seq, t: Date.now(), severity, message }, ...s.events].slice(0, UI.eventLogSize) }))

  /** Diff current conditions against active alerts; log transitions. */
  const syncAlerts = () => {
    const s = get()
    const now = Date.now()
    const conditions = evaluateAlerts({
      latest: s.latest,
      thresholds: s.settings.thresholds,
      now,
      sourceActive: s.demoMode || s.link === 'online',
      lastActivityAt: s.lastPacketAt ?? s.linkSince,
      hadGpsFix: s.hadGpsFix,
    })
    let changed = false
    let raised = false
    const next: Partial<Record<AlertId, ActiveAlert>> = {}
    for (const [id, cond] of Object.entries(conditions) as [AlertId, NonNullable<(typeof conditions)[AlertId]>][]) {
      const prev = s.alerts[id]
      if (prev && prev.message === cond.message) {
        next[id] = prev
      } else {
        next[id] = { id, ...cond, since: prev?.since ?? now }
        changed = true
        if (!prev) {
          raised = true
          logEvent(cond.severity, `ALERT · ${cond.message}`)
        }
      }
    }
    for (const id of Object.keys(s.alerts) as AlertId[]) {
      if (!next[id]) {
        changed = true
        logEvent('ok', `CLEARED · ${s.alerts[id]!.message}`)
      }
    }
    if (changed) set({ alerts: next, ...(raised ? { alertsAcked: false } : {}) })
  }

  const initialDemo = urlParam('demo') === '1'

  return {
    settings: loadSettings(),
    demoMode: initialDemo,
    paused: false,
    presentation: false,
    settingsOpen: false,

    link: 'idle',
    linkAttempt: 0,
    nextRetryAt: null,
    linkSince: initialDemo ? Date.now() : null,
    reconnectNonce: 0,
    demoOffered: false,
    demoOfferDismissed: false,

    packetCount: 0,
    malformedCount: 0,
    lastPacketAt: null,
    firstPacketAt: null,
    pps: 0,

    latest: {},
    stats: {},
    sensorSeen: emptySensors(),
    hadGpsFix: false,

    rawLog: [],
    events: [{ id: ++seq, t: Date.now(), severity: 'info', message: 'MISSION CONTROL ONLINE' }],
    alerts: {},
    alertsAcked: false,

    ingest: (sample, raw) => {
      const now = Date.now()
      arrivals.push(now)
      const s = get()
      if (s.paused) {
        set({ packetCount: s.packetCount + 1, lastPacketAt: now })
        return
      }

      telemetryBuffer.push(now, sample)

      const stats = { ...s.stats }
      const sensorSeen = { ...s.sensorSeen }
      for (const key of SERIES_KEYS) {
        const v = sample[key]
        if (v === undefined) continue
        pushStat(stats, key, v)
        const group: SensorGroup = FIELD_META[key].sensor
        // A GPS that reports "no fix" is still a live sensor.
        sensorSeen[group] = now
      }

      // Keep last known values for fields this packet didn't carry (e.g. GPS during no-fix).
      const latest: Sample = { ...s.latest, ...sample }
      if (sample.gpsFix === 0) delete latest.gpsAltitude

      set({
        packetCount: s.packetCount + 1,
        lastPacketAt: now,
        firstPacketAt: s.firstPacketAt ?? now,
        latest,
        stats,
        sensorSeen,
        hadGpsFix: s.hadGpsFix || sample.gpsFix === 1,
        rawLog: [{ id: ++seq, t: now, text: raw, ok: true }, ...s.rawLog].slice(0, UI.rawLogSize),
      })
      syncAlerts()
    },

    recordMalformed: (raw) => {
      const s = get()
      if (s.paused) return
      set({
        malformedCount: s.malformedCount + 1,
        rawLog: [{ id: ++seq, t: Date.now(), text: raw, ok: false }, ...s.rawLog].slice(0, UI.rawLogSize),
      })
    },

    tick: () => {
      const now = Date.now()
      while (arrivals.length && arrivals[0] < now - UI.ppsWindowMs) arrivals.shift()
      const pps = Math.round((arrivals.length / (UI.ppsWindowMs / 1000)) * 10) / 10
      if (pps !== get().pps) set({ pps })
      syncAlerts()
    },

    setLink: (link, attempt, nextRetryAt = null) => {
      const s = get()
      if (s.link !== link) {
        if (link === 'online') logEvent('ok', `LINK ESTABLISHED · ${s.settings.wsUrl}`)
        if (s.link === 'online' && link !== 'online') logEvent('warn', 'LINK LOST · RECONNECTING')
        if (link === 'offline') logEvent('critical', `BRIDGE UNREACHABLE · ${s.settings.wsUrl}`)
      }
      const offerDemo = link === 'offline' && !s.demoMode
      set({
        link,
        linkAttempt: attempt,
        nextRetryAt,
        linkSince: link === 'online' ? (s.link === 'online' ? s.linkSince : Date.now()) : s.demoMode ? s.linkSince : null,
        demoOffered: offerDemo || (s.demoOffered && link !== 'online'),
      })
    },

    reconnect: () => set((s) => ({ reconnectNonce: s.reconnectNonce + 1 })),

    setDemoMode: (on) => {
      if (get().demoMode === on) return
      logEvent(on ? 'info' : 'info', on ? 'DEMO MODE ENGAGED · SIMULATED TELEMETRY' : 'DEMO MODE OFF · LIVE LINK')
      set({ demoMode: on, linkSince: on ? Date.now() : null, demoOffered: false })
    },

    togglePause: () => {
      const paused = !get().paused
      logEvent('info', paused ? 'DISPLAY PAUSED' : 'DISPLAY RESUMED')
      set({ paused })
    },

    clearData: () => {
      telemetryBuffer.clear()
      arrivals.length = 0
      set({
        packetCount: 0,
        malformedCount: 0,
        firstPacketAt: null,
        lastPacketAt: null,
        latest: {},
        stats: {},
        sensorSeen: emptySensors(),
        hadGpsFix: false,
        rawLog: [],
        alerts: {},
        pps: 0,
      })
      logEvent('info', 'DATA CLEARED')
    },

    setPresentation: (on) => set({ presentation: on }),
    setSettingsOpen: (open) => set({ settingsOpen: open }),

    updateSettings: (patch) => {
      const settings = {
        ...get().settings,
        ...patch,
        thresholds: { ...get().settings.thresholds, ...(patch.thresholds ?? {}) },
      }
      saveSettings(settings)
      set({ settings })
    },

    resetSettings: () => {
      saveSettings(DEFAULT_SETTINGS)
      set({ settings: DEFAULT_SETTINGS })
      logEvent('info', 'SETTINGS RESET TO DEFAULTS')
    },

    dismissDemoOffer: () => set({ demoOfferDismissed: true }),
    ackAlerts: () => set({ alertsAcked: true }),
    logEvent,
  }
})
