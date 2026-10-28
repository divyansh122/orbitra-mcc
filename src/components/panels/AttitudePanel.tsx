import { Suspense, lazy } from 'react'
import { useTelemetry } from '../../store/telemetry'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { Gauge } from '../ui/Gauge'
import { Panel } from '../ui/Panel'
import { HorizonFallback } from './HorizonFallback'

const AttitudeScene = lazy(() => import('./AttitudeScene'))

export function AttitudePanel() {
  const roll = useTelemetry((s) => s.latest.roll)
  const pitch = useTelemetry((s) => s.latest.pitch)
  const yaw = useTelemetry((s) => s.latest.yaw)
  const tiltLimit = useTelemetry((s) => s.settings.thresholds.tiltHigh)
  const tiltAlert = useTelemetry((s) => Boolean(s.alerts.tilt))

  const zones = [
    { from: -90, to: -tiltLimit, accent: 'red' as const },
    { from: tiltLimit, to: 90, accent: 'red' as const },
  ]

  return (
    <Panel
      title="Attitude"
      code="MPU-6050 · IMU"
      accent={tiltAlert ? 'red' : 'cyan'}
      className="area-attitude"
      index={0}
      actions={
        yaw !== undefined && (
          <span className="font-mono text-[0.68rem] text-muted">
            HDG <AnimatedNumber value={yaw} decimals={0} className="text-cyan" />°
          </span>
        )
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="relative min-h-0 flex-1">
          <ErrorBoundary name="3D attitude" fallback={<HorizonFallback />}>
            <Suspense fallback={<span className="hud-label blink absolute inset-0 grid place-items-center text-[0.7rem] text-dim">Loading 3D core</span>}>
              <AttitudeScene />
            </Suspense>
          </ErrorBoundary>
          <span className="hud-label pointer-events-none absolute left-2 top-1.5 text-[0.58rem] text-dim">Body frame · live</span>
        </div>
        <div className="grid h-[42%] min-h-0 shrink-0 grid-cols-2 gap-1 px-2 pb-2">
          <Gauge value={roll} min={-90} max={90} label="ROLL" unit="°" bipolar zones={zones} accent="cyan" />
          <Gauge value={pitch} min={-90} max={90} label="PITCH" unit="°" bipolar zones={zones} accent="purple" />
        </div>
      </div>
    </Panel>
  )
}
