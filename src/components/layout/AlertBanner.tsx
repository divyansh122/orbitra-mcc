import { AnimatePresence, motion } from 'framer-motion'
import { useTelemetry } from '../../store/telemetry'
import { IconAlert } from '../ui/Icons'

/** Master caution strip: flashes until acknowledged, clears itself when conditions recover. */
export function AlertBanner() {
  const alerts = useTelemetry((s) => s.alerts)
  const acked = useTelemetry((s) => s.alertsAcked)
  const ackAlerts = useTelemetry((s) => s.ackAlerts)
  const list = Object.values(alerts).sort((a, b) => (a.severity === b.severity ? a.since - b.since : a.severity === 'critical' ? -1 : 1))
  const critical = list.some((a) => a.severity === 'critical')

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[5.2rem] z-40 flex justify-center px-4">
      <AnimatePresence>
        {list.length > 0 && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className={`pointer-events-auto flex max-w-[min(64rem,100%)] items-center gap-3 rounded-lg border px-4 py-2 backdrop-blur-md ${
              acked ? '' : 'alert-flash'
            }`}
            style={{
              borderColor: critical ? 'var(--color-red)' : 'var(--color-amber)',
              background: critical ? 'rgb(255 77 109 / 0.16)' : 'rgb(251 191 36 / 0.14)',
              color: critical ? 'var(--color-red)' : 'var(--color-amber)',
            }}
          >
            <IconAlert className="h-5 w-5 shrink-0" />
            <span className="font-display text-[0.75rem] font-semibold tracking-[0.18em]">{critical ? 'MASTER WARNING' : 'MASTER CAUTION'}</span>
            <span className="h-4 w-px bg-current opacity-40" />
            <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-0.5 font-mono text-[0.75rem] font-semibold">
              {list.map((a) => (
                <span key={a.id} style={{ color: a.severity === 'critical' ? 'var(--color-red)' : 'var(--color-amber)' }}>
                  {a.message}
                </span>
              ))}
            </div>
            {!acked && (
              <button className="hud-btn ml-2 !h-7 shrink-0 !text-[0.65rem]" onClick={ackAlerts}>
                ACK
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
