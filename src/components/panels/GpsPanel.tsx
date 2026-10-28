import L from 'leaflet'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { DEFAULT_MAP_CENTER, UI } from '../../config'
import { DEFAULT_MAP_LAYER, DEFAULT_MAP_ZOOM, MAP_LAYERS, MAP_MAX_ZOOM, type MapLayerId } from '../../config/map'
import { telemetryBuffer } from '../../lib/buffer'
import { formatNumber, haversine, toDms } from '../../lib/format'
import { token } from '../../lib/theme'
import { useTelemetry } from '../../store/telemetry'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { IconCrosshair } from '../ui/Icons'
import { Panel } from '../ui/Panel'

export function GpsPanel() {
  const fix = useTelemetry((s) => s.latest.gpsFix)
  const lat = useTelemetry((s) => s.latest.latitude)
  const lon = useTelemetry((s) => s.latest.longitude)
  const gpsAlt = useTelemetry((s) => s.latest.gpsAltitude)
  const speed = useTelemetry((s) => s.latest.gpsSpeed)
  const sats = useTelemetry((s) => s.latest.satellites)
  const [follow, setFollow] = useState(true)
  const [layer, setLayer] = useState<MapLayerId>(DEFAULT_MAP_LAYER)
  const [distance, setDistance] = useState(0)
  const hasFix = fix === 1
  const hasAnyPosition = lat !== undefined && lon !== undefined

  return (
    <Panel
      title="GPS Navigation"
      code="NEO-6M · WGS84"
      accent={hasFix ? 'green' : 'amber'}
      className="area-gps"
      index={3}
      actions={
        <>
          <div role="radiogroup" aria-label="Map layer" className="flex rounded-md border border-line bg-space-950/60 p-0.5">
            {(Object.keys(MAP_LAYERS) as MapLayerId[]).map((id) => (
              <button
                key={id}
                role="radio"
                aria-checked={layer === id}
                onClick={() => setLayer(id)}
                className={`rounded px-2 py-0.5 font-mono text-[0.62rem] transition-colors ${layer === id ? 'bg-green/15 text-green' : 'text-dim hover:text-muted'}`}
              >
                {MAP_LAYERS[id].label}
              </button>
            ))}
          </div>
          <button className="hud-btn !h-6 !px-2 !text-[0.62rem]" data-active={follow} style={{ '--btn-accent': 'var(--color-green)' } as CSSProperties} onClick={() => setFollow((f) => !f)} aria-pressed={follow}>
            <IconCrosshair /> Follow
          </button>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="relative min-h-[14rem] flex-1 overflow-hidden">
          <MapView follow={follow} layer={layer} hasFix={hasFix} onDistance={setDistance} />

          <div className="pointer-events-none absolute left-2 top-2 z-[500] flex items-center gap-2 rounded-md border border-line bg-space-950/80 px-2 py-1 backdrop-blur">
            <span className={`pulse-dot ${hasFix ? '' : 'blink'}`} data-live={hasFix} style={{ color: hasFix ? 'var(--color-green)' : 'var(--color-amber)' }} />
            <span className="hud-label text-[0.66rem]" style={{ color: hasFix ? 'var(--color-green)' : 'var(--color-amber)' }}>
              {hasFix ? 'GPS LOCK' : fix === 0 ? 'NO FIX' : 'NO SIGNAL'}
            </span>
            <span className="font-mono text-[0.62rem] text-muted">{sats !== undefined ? `${sats} SAT` : ''}</span>
          </div>

          <MiniRadar />

          {!hasFix && <NoFixOverlay lastKnown={hasAnyPosition} everSeen={fix !== undefined} />}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 border-t border-line/60 px-3 py-2 font-mono">
          <Readout label="LAT" value={lat !== undefined ? lat.toFixed(6) : '—'} sub={lat !== undefined ? toDms(lat, true) : ''} dim={!hasFix} />
          <Readout label="LON" value={lon !== undefined ? lon.toFixed(6) : '—'} sub={lon !== undefined ? toDms(lon, false) : ''} dim={!hasFix} />
          <div className="flex items-baseline justify-between text-[0.62rem] text-dim">
            <span>GPS ALT</span>
            <span className="text-[0.82rem] text-green">
              <AnimatedNumber value={gpsAlt} decimals={1} /> <span className="text-[0.6rem] text-dim">m</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between text-[0.62rem] text-dim">
            <span>SPD · DIST</span>
            <span className="text-[0.82rem] text-ink">
              {formatNumber(speed, 1)}
              <span className="text-[0.6rem] text-dim"> km/h · </span>
              {distance >= 1000 ? `${(distance / 1000).toFixed(2)}` : distance.toFixed(0)}
              <span className="text-[0.6rem] text-dim">{distance >= 1000 ? ' km' : ' m'}</span>
            </span>
          </div>
        </div>
      </div>
    </Panel>
  )
}

function Readout({ label, value, sub, dim }: { label: string; value: string; sub: string; dim: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[0.62rem] text-dim">
        <span>{label}</span>
        <span className={`truncate text-[0.95rem] font-semibold glow-text ${dim ? 'text-dim' : 'text-cyan'}`}>{value}</span>
      </div>
      <div className="truncate text-right text-[0.58rem] text-dim">{sub}</div>
    </div>
  )
}

interface MapViewProps {
  follow: boolean
  layer: MapLayerId
  hasFix: boolean
  onDistance: (m: number) => void
}

function MapView({ follow, layer, hasFix, onDistance }: MapViewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const followRef = useRef(follow)
  const hasFixRef = useRef(hasFix)
  const [map, setMap] = useState<L.Map | null>(null)

  useEffect(() => {
    if (!map) return
    const cfg = MAP_LAYERS[layer]
    const tiles = L.tileLayer(cfg.url, { attribution: cfg.attribution, maxNativeZoom: cfg.maxNativeZoom, maxZoom: MAP_MAX_ZOOM }).addTo(map)
    tiles.bringToBack()
    return () => {
      tiles.remove()
    }
  }, [map, layer])

  useEffect(() => {
    followRef.current = follow
  }, [follow])

  useEffect(() => {
    hasFixRef.current = hasFix
  }, [hasFix])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const map = L.map(host, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      zoomControl: false,
      attributionControl: true,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    map.on('dragstart', () => {
      followRef.current = false
    })

    const cyan = token('cyan')
    const glow = L.polyline([], { color: cyan, weight: 9, opacity: 0.12, interactive: false }).addTo(map)
    const trail = L.polyline([], { color: cyan, weight: 2.5, opacity: 0.9, interactive: false }).addTo(map)
    const marker = L.marker(DEFAULT_MAP_CENTER, {
      icon: L.divIcon({
        className: '',
        html: '<div class="gps-marker" data-nofix="true"><span class="ring"></span><span class="ring r2"></span><span class="core"></span></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      interactive: false,
      opacity: 0,
    }).addTo(map)

    let drawn = 0
    let epoch = telemetryBuffer.trackEpoch
    let distance = 0
    let centered = false

    const sync = () => {
      // Applied every tick: the marker element may not exist yet when the fix state first changes.
      marker.getElement()?.querySelector('.gps-marker')?.setAttribute('data-nofix', String(!hasFixRef.current))
      const track = telemetryBuffer.track
      if (epoch !== telemetryBuffer.trackEpoch || track.length < drawn) {
        epoch = telemetryBuffer.trackEpoch
        drawn = 0
        distance = 0
        trail.setLatLngs([])
        glow.setLatLngs([])
        marker.setOpacity(0)
        onDistance(0)
      }
      if (track.length === drawn) return
      for (let i = Math.max(drawn, 1); i < track.length; i++) {
        const a = track[i - 1]
        const b = track[i]
        const d = haversine(a.lat, a.lon, b.lat, b.lon)
        if (d < 500) distance += d // ignore teleports from glitchy fixes
      }
      const fresh = track.slice(drawn).map((p) => L.latLng(p.lat, p.lon))
      fresh.forEach((p) => {
        trail.addLatLng(p)
        glow.addLatLng(p)
      })
      drawn = track.length
      const last = fresh[fresh.length - 1]
      marker.setLatLng(last)
      marker.setOpacity(1)
      onDistance(distance)
      if (!centered) {
        map.setView(last, DEFAULT_MAP_ZOOM, { animate: false })
        centered = true
      } else if (followRef.current) {
        map.panTo(last, { animate: true, duration: 0.25 })
      }
    }
    sync()
    const id = setInterval(sync, UI.mapRefreshMs)

    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }))
    ro.observe(host)
    setMap(map)

    return () => {
      clearInterval(id)
      ro.disconnect()
      setMap(null)
      map.remove()
    }
  }, [onDistance])

  return <div ref={hostRef} className="map-host absolute inset-0" data-nofix={!hasFix} />
}

function MiniRadar() {
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-[500] h-14 w-14 overflow-hidden rounded-full border border-green/40 bg-space-950/70" aria-hidden>
      <div className="radar-sweep absolute inset-0 rounded-full" />
      <div className="absolute inset-[30%] rounded-full border border-green/25" />
      <div className="absolute left-1/2 top-0 h-full w-px bg-green/20" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-green/20" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green shadow-[0_0_8px_var(--color-green)]" />
    </div>
  )
}

function NoFixOverlay({ lastKnown, everSeen }: { lastKnown: boolean; everSeen: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-space-950/45">
      <div className="flex flex-col items-center text-center">
        <div className="relative h-28 w-28 overflow-hidden rounded-full border border-amber/50 bg-space-950/60 shadow-[0_0_40px_-10px_var(--color-amber)]">
          <div className="radar-sweep absolute inset-0 rounded-full" style={{ filter: 'hue-rotate(-140deg)' }} />
          <div className="absolute inset-[22%] rounded-full border border-amber/30" />
          <div className="absolute inset-[44%] rounded-full border border-amber/30" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-amber/20" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-amber/20" />
        </div>
        <p className="hud-label mt-3 text-[0.85rem] text-amber glow-text">{everSeen ? 'Acquiring satellites' : 'Awaiting GPS data'}</p>
        <p className="mt-1 font-mono text-[0.62rem] text-muted">
          {everSeen ? (lastKnown ? 'Holding last known position' : 'No position lock yet') : 'No GPS fields in incoming packets'}
        </p>
      </div>
    </div>
  )
}
