import { useTelemetry } from '../store/telemetry'
import { parseMessage } from './parse'

/** Single entry point for incoming text from the socket or the demo generator. */
export function ingestText(text: string): void {
  try {
    const { packets, malformed } = parseMessage(text)
    const store = useTelemetry.getState()
    for (const p of packets) store.ingest(p.sample, p.raw)
    for (const m of malformed) store.recordMalformed(m)
  } catch (err) {
    // Never let a bad packet take the dashboard down.
    console.warn('[orbitra] packet dropped', err)
  }
}

export async function ingestData(data: unknown): Promise<void> {
  if (typeof data === 'string') return ingestText(data)
  try {
    if (data instanceof Blob) return ingestText(await data.text())
    if (data instanceof ArrayBuffer) return ingestText(new TextDecoder().decode(data))
  } catch (err) {
    console.warn('[orbitra] could not decode message', err)
  }
}
