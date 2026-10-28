import { useEffect } from 'react'
import { DEMO } from '../config'
import { DemoGenerator } from '../lib/demo'
import { ingestText } from '../lib/ingest'
import { useTelemetry } from '../store/telemetry'

/** Feeds simulated packets through the normal ingest path while demo mode is on. */
export function useDemoStream(): void {
  const demoMode = useTelemetry((s) => s.demoMode)

  useEffect(() => {
    if (!demoMode) return
    const gen = new DemoGenerator()
    const id = setInterval(() => ingestText(gen.next()), 1000 / DEMO.hz)
    return () => clearInterval(id)
  }, [demoMode])
}
