import { AnimatePresence, motion } from 'framer-motion'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { CHART_WINDOWS, DEFAULT_WS_URL, type Thresholds } from '../../config'
import { exportCsv } from '../../lib/csv'
import { useTelemetry } from '../../store/telemetry'
import { IconClose, IconDownload, IconFlask, IconRefresh } from '../ui/Icons'

const THRESHOLD_FIELDS: { key: Exclude<keyof Thresholds, 'gpsLostAlert'>; label: string; unit: string; step: number }[] = [
  { key: 'tempHigh', label: 'Temperature high', unit: '°C', step: 0.5 },
  { key: 'tempLow', label: 'Temperature low', unit: '°C', step: 0.5 },
  { key: 'humidityHigh', label: 'Humidity high', unit: '%', step: 1 },
  { key: 'gForceHigh', label: 'G-force high', unit: 'g', step: 0.1 },
  { key: 'tiltHigh', label: 'Tilt limit', unit: '°', step: 1 },
  { key: 'staleMs', label: 'No-packet timeout', unit: 'ms', step: 250 },
]

export function SettingsDrawer() {
  const open = useTelemetry((s) => s.settingsOpen)
  const setOpen = useTelemetry((s) => s.setSettingsOpen)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[70] bg-space-950/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside
            role="dialog"
            aria-label="Settings"
            className="panel fixed bottom-3 right-3 top-3 z-[80] w-[min(26rem,calc(100vw-1.5rem))] overflow-y-auto"
            initial={{ x: '110%' }}
            animate={{ x: 0 }}
            exit={{ x: '110%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            <span className="hud-corner tl" />
            <span className="hud-corner bl" />
            <SettingsBody onClose={() => setOpen(false)} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line/60 px-4 py-3.5">
      <h3 className="hud-label mb-2.5 text-[0.72rem] text-cyan">{title}</h3>
      {children}
    </section>
  )
}

function SettingsBody({ onClose }: { onClose: () => void }) {
  const settings = useTelemetry((s) => s.settings)
  const link = useTelemetry((s) => s.link)
  const demoMode = useTelemetry((s) => s.demoMode)
  const { updateSettings, resetSettings, reconnect, setDemoMode, logEvent } = useTelemetry.getState()
  const [url, setUrl] = useState(settings.wsUrl)
  const urlValid = /^wss?:\/\/.+/i.test(url.trim())

  const applyUrl = () => {
    if (!urlValid) return
    const next = url.trim()
    if (next !== settings.wsUrl) {
      updateSettings({ wsUrl: next })
      logEvent('info', `UPLINK TARGET → ${next}`)
    } else {
      reconnect()
    }
    if (demoMode) setDemoMode(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
        <h2 className="font-display text-[0.95rem] font-semibold tracking-[0.14em] text-ink">CONSOLE SETTINGS</h2>
        <button className="hud-btn !px-2" onClick={onClose} aria-label="Close settings">
          <IconClose />
        </button>
      </div>

      <Section title="Telemetry link">
        <label className="mb-1 block text-[0.72rem] text-muted" htmlFor="ws-url">
          WebSocket URL (bridge.js)
        </label>
        <div className="flex gap-2">
          <input
            id="ws-url"
            className="hud-input"
            value={url}
            spellCheck={false}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
            aria-invalid={!urlValid}
          />
          <button className="hud-btn shrink-0" onClick={applyUrl} disabled={!urlValid} title="Apply and reconnect">
            <IconRefresh /> Connect
          </button>
        </div>
        <p className="mt-1.5 font-mono text-[0.62rem] text-dim">
          {urlValid ? `status: ${demoMode ? 'demo mode' : link} · default ${DEFAULT_WS_URL}` : 'URL must start with ws:// or wss://'}
        </p>
      </Section>

      <Section title="Demo mode">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.75rem] leading-relaxed text-muted">Simulated flight: smooth attitude, GPS figure-eight, gusts and occasional fix loss.</p>
          <button
            className="hud-btn shrink-0"
            data-active={demoMode}
            style={{ '--btn-accent': 'var(--color-purple)' } as CSSProperties}
            onClick={() => setDemoMode(!demoMode)}
            aria-pressed={demoMode}
          >
            <IconFlask /> {demoMode ? 'On' : 'Off'}
          </button>
        </div>
      </Section>

      <Section title="Charts">
        <div className="flex gap-2">
          {CHART_WINDOWS.map((w) => (
            <button key={w.sec} className="hud-btn flex-1 justify-center" data-active={settings.chartWindowSec === w.sec} onClick={() => updateSettings({ chartWindowSec: w.sec })}>
              {w.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Alert thresholds">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {THRESHOLD_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-[0.7rem] text-muted">
                {f.label} <span className="text-dim">({f.unit})</span>
              </span>
              <input
                type="number"
                className="hud-input"
                step={f.step}
                value={settings.thresholds[f.key]}
                onChange={(e) => {
                  const v = e.target.valueAsNumber
                  if (Number.isFinite(v)) updateSettings({ thresholds: { ...settings.thresholds, [f.key]: v } })
                }}
              />
            </label>
          ))}
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[0.75rem] text-muted">
          <input
            type="checkbox"
            className="h-4 w-4 accent-cyan"
            checked={settings.thresholds.gpsLostAlert}
            onChange={(e) => updateSettings({ thresholds: { ...settings.thresholds, gpsLostAlert: e.target.checked } })}
          />
          Alert when an established GPS fix is lost
        </label>
      </Section>

      <Section title="Display">
        <div className="flex gap-2">
          {(['full', 'lite'] as const).map((level) => (
            <button key={level} className="hud-btn flex-1 justify-center" data-active={settings.effects === level} onClick={() => updateSettings({ effects: level })}>
              {level === 'full' ? 'Full effects' : 'Lite (slow PC)'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Data">
        <button
          className="hud-btn w-full justify-center"
          onClick={() => {
            const rows = exportCsv()
            logEvent(rows ? 'ok' : 'warn', rows ? `EXPORTED ${rows} ROWS TO CSV` : 'EXPORT SKIPPED · NO DATA RECORDED')
          }}
        >
          <IconDownload /> Export last 10 min to CSV
        </button>
      </Section>

      <Section title="Keyboard">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[0.72rem]">
          {[
            ['F', 'Fullscreen presentation (hides controls)'],
            ['D', 'Toggle demo mode'],
            ['P', 'Pause / resume display'],
            ['Esc', 'Close this panel / exit fullscreen'],
          ].map(([k, d]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded border border-line bg-space-950 px-1.5 py-0.5 text-cyan">{k}</kbd>
              </dt>
              <dd className="text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="px-4 py-3.5">
        <button className="hud-btn w-full justify-center" onClick={() => { resetSettings(); setUrl(DEFAULT_WS_URL) }}>
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
