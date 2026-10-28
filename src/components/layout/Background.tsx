import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useTelemetry } from '../../store/telemetry'

const STAR_DENSITY = 1 / 6500 // stars per CSS px²
const FPS = 30

interface Star {
  x: number
  y: number
  z: number
  phase: number
}

/** Starfield + grid + nebula + orbit accents + scanlines + vignette. */
export function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()
  const lite = useTelemetry((s) => s.settings.effects === 'lite')
  const animate = !reduce && !lite

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let stars: Star[] = []
    let w = 0
    let h = 0
    let raf = 0
    let last = 0

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(w * h * STAR_DENSITY)
      stars = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, z: Math.random(), phase: Math.random() * Math.PI * 2 }))
      draw(0)
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        if (animate) {
          s.x -= 0.04 + s.z * 0.18
          if (s.x < 0) s.x += w
        }
        const twinkle = animate ? 0.65 + 0.35 * Math.sin(t / 900 + s.phase) : 0.85
        const alpha = (0.25 + s.z * 0.65) * twinkle
        const size = 0.5 + s.z * 1.3
        ctx.fillStyle = s.z > 0.92 ? `rgba(160, 230, 255, ${alpha})` : `rgba(200, 215, 255, ${alpha})`
        ctx.fillRect(s.x, s.y, size, size)
      }
    }

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < 1000 / FPS) return
      last = t
      draw(t)
    }

    resize()
    window.addEventListener('resize', resize)
    if (animate) raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [animate])

  return (
    <div aria-hidden>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] top-[30%] h-[60vh] w-[50vw] rounded-full bg-blue/10 blur-[120px]" />
        <div className="absolute -right-[5%] -top-[10%] h-[50vh] w-[40vw] rounded-full bg-purple/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[35%] h-[45vh] w-[40vw] rounded-full bg-cyan/[0.06] blur-[120px]" />
      </div>
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 h-full w-full" />
      <div className="bg-grid" />
      <svg className="pointer-events-none fixed -right-[12vmin] -top-[16vmin] h-[70vmin] w-[70vmin] opacity-[0.16]" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="96" fill="none" stroke="var(--color-blue)" strokeWidth="0.6" />
        <g className={animate ? 'spin-slow' : ''} style={{ transformOrigin: '100px 100px' }}>
          <circle cx="100" cy="100" r="72" fill="none" stroke="var(--color-cyan)" strokeWidth="0.6" strokeDasharray="2 4" />
          <circle cx="100" cy="28" r="2" fill="var(--color-cyan)" />
        </g>
        <circle cx="100" cy="100" r="46" fill="none" stroke="var(--color-purple)" strokeWidth="0.6" />
      </svg>
      <div className="bg-vignette" />
      <div className="bg-scanlines" />
    </div>
  )
}
