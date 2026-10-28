import { useTelemetry } from '../../store/telemetry'

/** 2D artificial horizon used when WebGL isn't available. */
export function HorizonFallback() {
  const roll = useTelemetry((s) => s.latest.roll ?? 0)
  const pitch = useTelemetry((s) => s.latest.pitch ?? 0)
  const offset = Math.max(-40, Math.min(40, pitch)) * 1.2

  return (
    <svg viewBox="-60 -60 120 120" className="h-full w-full" aria-label="Artificial horizon">
      <defs>
        <clipPath id="horizon-clip">
          <circle r="54" />
        </clipPath>
      </defs>
      <g clipPath="url(#horizon-clip)">
        <g transform={`rotate(${-roll}) translate(0 ${offset})`} style={{ transition: 'transform 0.3s ease-out' }}>
          <rect x="-120" y="-120" width="240" height="120" fill="#123a66" />
          <rect x="-120" y="0" width="240" height="120" fill="#2a1d14" />
          <line x1="-120" x2="120" y1="0" y2="0" stroke="var(--color-cyan)" strokeWidth="1" />
          {[-20, -10, 10, 20].map((p) => (
            <line key={p} x1="-12" x2="12" y1={-p * 1.2} y2={-p * 1.2} stroke="var(--color-ink)" strokeOpacity="0.6" strokeWidth="0.6" />
          ))}
        </g>
      </g>
      <circle r="54" fill="none" stroke="var(--color-cyan)" strokeOpacity="0.6" />
      <path d="M-26 0h16l4 6 4-6h16" fill="none" stroke="var(--color-amber)" strokeWidth="2" />
    </svg>
  )
}
