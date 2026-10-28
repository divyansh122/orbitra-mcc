import { DEFAULT_MAP_CENTER } from '../config'

/**
 * Simulated transmitter. Produces JSON lines with exactly the keys the club's
 * bridge.js forwards (packetNo, altitude = GPS, bmpAltitude, speed in km/h,
 * gx/gy/gz, totalAcc…) so demo data goes through the same parser as live data.
 */
export class DemoGenerator {
  private readonly start = Date.now()
  private tempDrift = 0
  private humDrift = 0
  private gustUntil = 0
  private nextGust: number
  private fixLostUntil = 0
  private nextFixLoss: number
  private nextGlitch: number
  private packetNo = 0
  private prev = { roll: 0, pitch: 0, yaw: 0, t: 0 }

  constructor() {
    this.nextGust = this.start + 18_000
    this.nextFixLoss = this.start + 40_000
    this.nextGlitch = this.start + 35_000
  }

  /** Returns one serial line (normally JSON). */
  next(): string {
    const now = Date.now()
    const t = (now - this.start) / 1000
    // ESP-NOW drops the odd frame: skip a packet number now and then.
    this.packetNo += Math.random() < 0.012 ? 2 : 1

    if (now >= this.nextGlitch) {
      this.nextGlitch = now + rand(45_000, 80_000)
      return '{"temperature": 26.9, "humidity": 5' // truncated packet, as seen on noisy links
    }

    // Flight profile: climb → cruise → descend → ground, repeating every 120 s.
    const phase = t % 120
    let alt: number
    let climbRate = 0
    if (phase < 20) {
      alt = 2 + 38 * smooth(phase / 20)
      climbRate = 1.9
    } else if (phase < 80) {
      alt = 40 + 4 * Math.sin((phase - 20) / 6)
    } else if (phase < 105) {
      alt = 40 - 38 * smooth((phase - 80) / 25)
      climbRate = -1.5
    } else {
      alt = 2
    }

    if (now >= this.nextGust) {
      this.gustUntil = now + 1_400
      this.nextGust = now + rand(55_000, 75_000)
    }
    const gust = now < this.gustUntil ? Math.sin(((this.gustUntil - now) / 1_400) * Math.PI) : 0

    const roll = 9 * Math.sin(t / 3.1) + 4 * Math.sin(t / 1.3) + 28 * gust + noise(0.4)
    const pitch = 6 * Math.sin(t / 4.3 + 1) + 3 * Math.cos(t / 1.7) - 12 * gust + noise(0.4)
    const yaw = ((t * 6) % 360 + 360) % 360

    const r = (roll * Math.PI) / 180
    const p = (pitch * Math.PI) / 180
    const vib = () => noise(0.025)
    const ax = Math.sin(p) + vib() + 0.9 * gust
    const ay = -Math.sin(r) * Math.cos(p) + vib() + 0.6 * gust
    const az = Math.cos(r) * Math.cos(p) + climbRate * 0.03 + vib() + 1.8 * gust

    this.tempDrift = clamp(this.tempDrift + noise(0.02), -1.2, 1.2)
    this.humDrift = clamp(this.humDrift + noise(0.08), -4, 4)
    const temperature = 27.2 - alt * 0.012 + 1.1 * Math.sin(t / 37) + this.tempDrift + noise(0.05)
    const humidity = 52 + 3 * Math.sin(t / 53) + this.humDrift + noise(0.3)
    const pressure = 1008.6 - alt * 0.119 + 0.3 * Math.sin(t / 71) + noise(0.04)
    const bmpAlt = alt + noise(0.25)

    if (now >= this.nextFixLoss) {
      this.fixLostUntil = now + rand(4_000, 7_000)
      this.nextFixLoss = now + rand(50_000, 80_000)
    }
    const hasFix = now >= this.fixLostUntil

    // Figure-eight survey pattern around the field (~150 m across).
    const w = t / 22
    const lat = DEFAULT_MAP_CENTER[0] + 0.0011 * Math.sin(w)
    const lon = DEFAULT_MAP_CENTER[1] + 0.0016 * Math.sin(w) * Math.cos(w)

    const dt = this.prev.t ? t - this.prev.t : 0.1
    const rate = (a: number, b: number) => (a - b) / Math.max(dt, 0.01) + noise(0.6)
    const gx = rate(roll, this.prev.roll)
    const gy = rate(pitch, this.prev.pitch)
    const gz = rate(yaw, this.prev.yaw) % 180
    this.prev = { roll, pitch, yaw, t }

    // Same key order and types as the club's bridge.js output.
    return JSON.stringify({
      packetNo: this.packetNo,
      timestamp: now,
      temperature: round(temperature, 2),
      humidity: round(humidity, 1),
      ax: round(ax, 3),
      ay: round(ay, 3),
      az: round(az, 3),
      totalAcc: round(Math.hypot(ax, ay, az), 3),
      gx: round(gx, 2),
      gy: round(gy, 2),
      gz: round(gz, 2),
      roll: round(roll, 2),
      pitch: round(pitch, 2),
      latitude: hasFix ? round(lat + noise(0.000004), 6) : 0,
      longitude: hasFix ? round(lon + noise(0.000004), 6) : 0,
      altitude: hasFix ? round(alt + 3.5 + 1.8 * Math.sin(t / 9) + noise(0.8), 1) : 0,
      speed: hasFix ? round(Math.abs(32 * Math.cos(w)) + noise(0.7), 2) : 0,
      satellites: hasFix ? 8 + Math.round(2 * Math.sin(t / 19)) : Math.round(rand(0, 3)),
      gpsFix: hasFix ? 1 : 0,
      bmpTemperature: round(temperature + 1.4 + noise(0.05), 2),
      pressure: round(pressure, 2),
      bmpAltitude: round(bmpAlt, 2),
    })
  }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const noise = (amp: number) => (Math.random() * 2 - 1) * amp
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const smooth = (x: number) => x * x * (3 - 2 * x)
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d
