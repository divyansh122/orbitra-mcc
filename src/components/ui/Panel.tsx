import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import type { Accent } from '../../config'
import { cssColor } from '../../lib/theme'

interface PanelProps {
  title: string
  /** Small mono tag after the title, e.g. "MPU-6050". */
  code?: string
  accent?: Accent
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  /** Entrance stagger order. */
  index?: number
  children: ReactNode
}

export function Panel({ title, code, accent = 'cyan', actions, className = '', bodyClassName = '', index = 0, children }: PanelProps) {
  return (
    <motion.section
      className={`panel ${className}`}
      style={{ '--accent': cssColor(accent) } as CSSProperties}
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay: 0.08 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      aria-label={title}
    >
      <span className="hud-corner tl" />
      <span className="hud-corner tr" />
      <span className="hud-corner bl" />
      <span className="hud-corner br" />
      <header className="flex items-center gap-2 border-b border-line/70 px-3 py-[0.45rem]">
        <span className="h-3 w-[3px] rounded-full glow-box" style={{ background: cssColor(accent), color: cssColor(accent) }} />
        <h2 className="hud-label truncate text-[0.82rem] text-ink">{title}</h2>
        {code && <span className="hidden truncate font-mono text-[0.62rem] tracking-wider text-dim sm:inline">// {code}</span>}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>
      </header>
      <div className={`relative min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </motion.section>
  )
}
