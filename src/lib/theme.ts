import type { Accent } from '../config'

/**
 * Canvas-based renderers (uPlot, three.js, Leaflet) can't use CSS variables
 * directly, so they read the design tokens defined in index.css at runtime.
 * Fallbacks only apply if the stylesheet hasn't loaded.
 */
const FALLBACK: Record<string, string> = {
  cyan: '#22d3ee',
  blue: '#4f8cff',
  purple: '#b388ff',
  green: '#4ade80',
  amber: '#fbbf24',
  red: '#ff4d6d',
  muted: '#93a8c9',
  dim: '#5a7096',
  line: '#1c2c47',
  ink: '#e6f1ff',
}

const cache = new Map<string, string>()

export function token(name: Accent | 'muted' | 'dim' | 'line' | 'ink'): string {
  const hit = cache.get(name)
  if (hit) return hit
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
  const resolved = value || FALLBACK[name]
  cache.set(name, resolved)
  return resolved
}

/** '#22d3ee' + 0.3 → 'rgba(34, 211, 238, 0.3)'. Non-hex input is returned unchanged. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** CSS custom property reference for use in inline styles / SVG. */
export const cssColor = (accent: Accent) => `var(--color-${accent})`

export function rootFontPx(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 14
}
