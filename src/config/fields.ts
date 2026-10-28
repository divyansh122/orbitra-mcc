/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  FIELD MAPPING — edit this file to match your transmitter's JSON keys.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Each canonical field lists the incoming keys it accepts, checked in order.
 *  - Matching is case-insensitive ("Temp" == "temp").
 *  - Dotted paths reach into nested objects ("gps.lat" reads {gps:{lat}}).
 *  - Unknown extra keys are ignored; missing keys simply leave the field empty.
 *
 *  GPS altitude and BMP280 altitude are deliberately separate fields and are
 *  never merged. A bare "alt"/"altitude" key is treated as BMP280 (barometric)
 *  altitude, since that is what the club's sketch sends — move those aliases
 *  to gpsAltitude if your GPS is the one sending a bare "altitude".
 */
export const FIELD_ALIASES = {
  temperature: ['temperature', 'temp', 'tempC', 'dhtTemp', 't'],
  humidity: ['humidity', 'hum', 'rh', 'dhtHum', 'h'],
  pressure: ['pressure', 'press', 'bmpPressure', 'baro', 'p'],
  bmpAltitude: ['bmpAltitude', 'bmpAlt', 'baroAltitude', 'baroAlt', 'altitude', 'alt', 'bmp.alt', 'bmp.altitude'],
  gpsAltitude: ['gpsAltitude', 'gpsAlt', 'gps.alt', 'gps.altitude'],
  ax: ['ax', 'accX', 'accelX', 'acc.x', 'accel.x'],
  ay: ['ay', 'accY', 'accelY', 'acc.y', 'accel.y'],
  az: ['az', 'accZ', 'accelZ', 'acc.z', 'accel.z'],
  roll: ['roll', 'mpu.roll'],
  pitch: ['pitch', 'mpu.pitch'],
  yaw: ['yaw', 'heading', 'mpu.yaw'],
  latitude: ['latitude', 'lat', 'gps.lat', 'gps.latitude'],
  longitude: ['longitude', 'lon', 'lng', 'long', 'gps.lon', 'gps.lng', 'gps.longitude'],
  satellites: ['satellites', 'sats', 'numSats', 'gps.sats', 'gps.satellites'],
  gpsSpeed: ['gpsSpeed', 'speed', 'spd', 'gps.speed'],
  gpsFix: ['gpsFix', 'fix', 'hasFix', 'gps.fix'],
} as const

/**
 * Unit handling.
 *  - Pressure: BMP280 libraries often report Pa; values above this are divided by 100 → hPa.
 *  - Acceleration: 'g' | 'ms2' | 'auto'. In auto mode a vector magnitude above
 *    ACCEL_AUTO_MS2_THRESHOLD is assumed to be m/s² and converted to g.
 */
export const PRESSURE_PA_THRESHOLD = 2000
export const ACCEL_UNIT: 'g' | 'ms2' | 'auto' = 'auto'
export const ACCEL_AUTO_MS2_THRESHOLD = 4.5
export const STANDARD_GRAVITY = 9.80665

export type FieldKey = keyof typeof FIELD_ALIASES
/** Values computed by the dashboard rather than sent by the hardware. */
export type DerivedKey = 'gForce'
export type SeriesKey = FieldKey | DerivedKey

export const FIELD_KEYS = Object.keys(FIELD_ALIASES) as FieldKey[]
export const SERIES_KEYS: SeriesKey[] = [...FIELD_KEYS, 'gForce']

export type Accent = 'cyan' | 'blue' | 'purple' | 'green' | 'amber' | 'red'
export type SensorGroup = 'MPU' | 'BMP' | 'DHT' | 'GPS'

export interface FieldMeta {
  label: string
  unit: string
  decimals: number
  accent: Accent
  sensor: SensorGroup
}

export const FIELD_META: Record<SeriesKey, FieldMeta> = {
  temperature: { label: 'Temperature', unit: '°C', decimals: 1, accent: 'amber', sensor: 'DHT' },
  humidity: { label: 'Humidity', unit: '%', decimals: 0, accent: 'cyan', sensor: 'DHT' },
  pressure: { label: 'Pressure', unit: 'hPa', decimals: 1, accent: 'blue', sensor: 'BMP' },
  bmpAltitude: { label: 'BMP280 Altitude', unit: 'm', decimals: 1, accent: 'purple', sensor: 'BMP' },
  gpsAltitude: { label: 'GPS Altitude', unit: 'm', decimals: 1, accent: 'green', sensor: 'GPS' },
  ax: { label: 'Accel X', unit: 'g', decimals: 2, accent: 'blue', sensor: 'MPU' },
  ay: { label: 'Accel Y', unit: 'g', decimals: 2, accent: 'purple', sensor: 'MPU' },
  az: { label: 'Accel Z', unit: 'g', decimals: 2, accent: 'green', sensor: 'MPU' },
  roll: { label: 'Roll', unit: '°', decimals: 1, accent: 'cyan', sensor: 'MPU' },
  pitch: { label: 'Pitch', unit: '°', decimals: 1, accent: 'purple', sensor: 'MPU' },
  yaw: { label: 'Yaw', unit: '°', decimals: 0, accent: 'blue', sensor: 'MPU' },
  latitude: { label: 'Latitude', unit: '°', decimals: 6, accent: 'cyan', sensor: 'GPS' },
  longitude: { label: 'Longitude', unit: '°', decimals: 6, accent: 'cyan', sensor: 'GPS' },
  satellites: { label: 'Satellites', unit: '', decimals: 0, accent: 'green', sensor: 'GPS' },
  gpsSpeed: { label: 'Ground Speed', unit: 'm/s', decimals: 1, accent: 'green', sensor: 'GPS' },
  gpsFix: { label: 'GPS Fix', unit: '', decimals: 0, accent: 'green', sensor: 'GPS' },
  gForce: { label: 'Total G', unit: 'g', decimals: 2, accent: 'amber', sensor: 'MPU' },
}

export const SENSOR_GROUPS: SensorGroup[] = ['MPU', 'BMP', 'DHT', 'GPS']

/** Map centre used before the first GPS fix (sample coordinates from the project guide). */
export const DEFAULT_MAP_CENTER: [number, number] = [26.76, 83.37]
