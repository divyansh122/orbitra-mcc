/** Concentric orbit-ring mark from the ORBITRA'26 title slide. */
export function OrbitLogo({ className = '', animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="29" fill="none" stroke="var(--color-blue)" strokeWidth="2" />
      <g className={animated ? 'spin-slow' : ''} style={{ transformOrigin: '32px 32px' }}>
        <circle cx="32" cy="32" r="21" fill="none" stroke="var(--color-cyan)" strokeWidth="2" />
        <circle cx="32" cy="11" r="2.4" fill="var(--color-cyan)" />
      </g>
      <g className={animated ? 'spin-slow-rev' : ''} style={{ transformOrigin: '32px 32px' }}>
        <circle cx="32" cy="32" r="13" fill="none" stroke="var(--color-purple)" strokeWidth="2" />
        <circle cx="45" cy="32" r="1.8" fill="var(--color-purple)" />
      </g>
      <circle cx="32" cy="32" r="4.6" fill="var(--color-cyan)" style={{ filter: 'drop-shadow(0 0 4px var(--color-cyan))' }} />
    </svg>
  )
}
