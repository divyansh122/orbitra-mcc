import { SERIES_KEYS } from '../config'
import { telemetryBuffer } from './buffer'

/** Downloads everything in the rolling buffer as CSV. Returns the row count. */
export function exportCsv(): number {
  const lines = [['timestamp_iso', 'timestamp_ms', ...SERIES_KEYS].join(',')]
  telemetryBuffer.forEachRow((t, row) => {
    const values = SERIES_KEYS.map((k) => (Number.isNaN(row[k]) ? '' : String(row[k])))
    lines.push([new Date(t).toISOString(), String(t), ...values].join(','))
  })
  const rows = lines.length - 1
  if (rows === 0) return 0

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orbitra26-telemetry-${fileStamp(new Date())}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return rows
}

function fileStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}
