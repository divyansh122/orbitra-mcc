/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WebSocket URL of bridge.js, e.g. ws://localhost:8081 */
  readonly VITE_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
