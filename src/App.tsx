import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { AlertBanner } from './components/layout/AlertBanner'
import { Background } from './components/layout/Background'
import { BootSequence } from './components/layout/BootSequence'
import { DemoOffer } from './components/layout/DemoOffer'
import { PipelineStrip } from './components/layout/PipelineStrip'
import { SettingsDrawer } from './components/layout/SettingsDrawer'
import { TopBar } from './components/layout/TopBar'
import { AccelerationPanel } from './components/panels/AccelerationPanel'
import { AttitudePanel } from './components/panels/AttitudePanel'
import { EnvironmentPanel } from './components/panels/EnvironmentPanel'
import { EventsPanel } from './components/panels/EventsPanel'
import { GpsPanel } from './components/panels/GpsPanel'
import { StatCards } from './components/panels/StatCards'
import { TerminalPanel } from './components/panels/TerminalPanel'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { urlParam } from './config'
import { useDemoStream } from './hooks/useDemoStream'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useTelemetrySocket } from './hooks/useTelemetrySocket'
import { useTicker } from './hooks/useTicker'
import { useTelemetry } from './store/telemetry'

export default function App() {
  // Data keeps flowing during the boot intro so charts are already populated when it ends.
  useTelemetrySocket()
  useDemoStream()
  useTicker()
  useKeyboardShortcuts()

  const effects = useTelemetry((s) => s.settings.effects)
  useEffect(() => {
    document.documentElement.dataset.effects = effects
  }, [effects])

  const [booted, setBooted] = useState(() => urlParam('noboot') === '1')
  const finishBoot = useCallback(() => setBooted(true), [])

  return (
    <>
      <Background />
      <AnimatePresence>{!booted && <BootSequence key="boot" onDone={finishBoot} />}</AnimatePresence>
      {booted && <Dashboard />}
      <SettingsDrawer />
    </>
  )
}

function Dashboard() {
  return (
    <div className="dash">
      <TopBar />
      <StatCards />
      <main className="main-grid">
        <ErrorBoundary name="Attitude" className="area-attitude">
          <AttitudePanel />
        </ErrorBoundary>
        <ErrorBoundary name="Acceleration" className="area-accel">
          <AccelerationPanel />
        </ErrorBoundary>
        <ErrorBoundary name="GPS" className="area-gps">
          <GpsPanel />
        </ErrorBoundary>
        <ErrorBoundary name="Environment" className="area-env">
          <EnvironmentPanel />
        </ErrorBoundary>
      </main>
      <section className="bottom-grid" aria-label="Logs">
        <ErrorBoundary name="Packet stream">
          <TerminalPanel />
        </ErrorBoundary>
        <ErrorBoundary name="Events">
          <EventsPanel />
        </ErrorBoundary>
      </section>
      <PipelineStrip />
      <AlertBanner />
      <DemoOffer />
    </div>
  )
}
