import { useEffect } from 'react'
import { LINK } from '../config'
import { ingestData } from '../lib/ingest'
import { useTelemetry } from '../store/telemetry'

/**
 * Maintains the WebSocket to bridge.js while demo mode is off.
 * Reconnects with exponential backoff + jitter; never throws.
 */
export function useTelemetrySocket(): void {
  const demoMode = useTelemetry((s) => s.demoMode)
  const url = useTelemetry((s) => s.settings.wsUrl)
  const nonce = useTelemetry((s) => s.reconnectNonce)

  useEffect(() => {
    const { setLink } = useTelemetry.getState()
    if (demoMode) {
      setLink('idle', 0)
      return
    }

    let ws: WebSocket | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let connectTimer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    let disposed = false

    const scheduleRetry = () => {
      if (disposed) return
      attempt++
      const delay = Math.min(LINK.backoffBaseMs * 2 ** (attempt - 1), LINK.backoffMaxMs) * (0.8 + Math.random() * 0.4)
      setLink(attempt >= LINK.offlineAfterAttempts ? 'offline' : 'connecting', attempt, Date.now() + delay)
      retryTimer = setTimeout(connect, delay)
    }

    const connect = () => {
      if (disposed) return
      if (attempt < LINK.offlineAfterAttempts) setLink('connecting', attempt)
      try {
        ws = new WebSocket(url)
      } catch {
        // Invalid URL — keep retrying so a corrected setting recovers on its own.
        scheduleRetry()
        return
      }
      const socket = ws
      connectTimer = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) socket.close()
      }, LINK.connectTimeoutMs)

      socket.onopen = () => {
        clearTimeout(connectTimer)
        attempt = 0
        setLink('online', 0)
      }
      socket.onmessage = (e) => {
        void ingestData(e.data)
      }
      socket.onerror = () => {
        // onclose follows and handles the retry
      }
      socket.onclose = () => {
        clearTimeout(connectTimer)
        if (ws === socket) ws = null
        scheduleRetry()
      }
    }

    connect()

    return () => {
      disposed = true
      clearTimeout(retryTimer)
      clearTimeout(connectTimer)
      if (ws) {
        ws.onclose = null
        ws.onmessage = null
        try {
          ws.close()
        } catch {
          // already closed
        }
      }
    }
  }, [demoMode, url, nonce])
}
