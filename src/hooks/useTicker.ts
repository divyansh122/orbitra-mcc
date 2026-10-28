import { useEffect, useState } from 'react'
import { UI } from '../config'
import { useTelemetry } from '../store/telemetry'

/** Periodic housekeeping: packets/sec and time-based alerts (e.g. stale link). */
export function useTicker(): void {
  useEffect(() => {
    const id = setInterval(() => useTelemetry.getState().tick(), UI.tickMs)
    return () => clearInterval(id)
  }, [])
}

/** Re-renders the calling component every `intervalMs` and returns Date.now(). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
