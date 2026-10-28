import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { formatNumber } from '../../lib/format'

interface Props {
  value: number | null | undefined
  decimals: number
  className?: string
  duration?: number
}

/** Tweens between values without re-rendering React on every frame. */
export function AnimatedNumber({ value, decimals, className, duration = 0.45 }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const mv = useMotionValue(value ?? 0)
  const hasValue = value !== null && value !== undefined && Number.isFinite(value)

  useMotionValueEvent(mv, 'change', (v) => {
    if (ref.current) ref.current.textContent = formatNumber(v, decimals)
  })

  useLayoutEffect(() => {
    if (!hasValue && ref.current) ref.current.textContent = '—'
  }, [hasValue])

  const shownRef = useRef(false)

  useEffect(() => {
    if (!hasValue) {
      shownRef.current = false
      return
    }
    // A value appearing from "—" is shown at once; only changes after that are tweened.
    if (reduce || !shownRef.current || mv.get() === value) {
      shownRef.current = true
      mv.jump(value)
      if (ref.current) ref.current.textContent = formatNumber(value, decimals)
      return
    }
    const controls = animate(mv, value, { duration, ease: 'easeOut' })
    return () => controls.stop()
  }, [value, hasValue, reduce, mv, duration, decimals])

  return <span ref={ref} className={`tabular ${className ?? ''}`} />
}
