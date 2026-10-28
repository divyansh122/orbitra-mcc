/**
 * ORBITRA'26 telemetry bridge: ESP8266 RX (USB serial) → WebSocket.
 *
 *   node bridge.js              uses COM_PORT below
 *   node bridge.js COM5         override the port
 *   node bridge.js COM5 9600    override port and baud rate
 *   node bridge.js --list       show available serial ports
 *
 * Every line the receiver prints is forwarded unchanged to all WebSocket
 * clients; the dashboard does the parsing.
 */
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')
const { WebSocketServer, WebSocket } = require('ws')

// ── Edit these ──────────────────────────────────────────────────────────────
const COM_PORT = 'COM6' // the RX board's port (Device Manager / Arduino IDE)
const BAUD_RATE = 115200 // must match Serial.begin(...) in the RX sketch
const WS_PORT = 8081
// ────────────────────────────────────────────────────────────────────────────

const RETRY_MS = 3000
const args = process.argv.slice(2)

async function listPorts() {
  const ports = await SerialPort.list()
  if (!ports.length) return console.log('  (no serial ports found: is the RX plugged in?)')
  for (const p of ports) console.log(`  ${p.path.padEnd(8)} ${p.manufacturer ?? ''} ${p.friendlyName ?? ''}`.trimEnd())
}

if (args.includes('--list')) {
  console.log('Available serial ports:')
  listPorts().then(() => process.exit(0))
} else {
  startBridge()
}

function startBridge() {
  const portPath = args[0] || process.env.COM_PORT || COM_PORT
  const baudRate = Number(args[1] || process.env.BAUD_RATE || BAUD_RATE)

  // ── WebSocket server ───────────────────────────────────────────────────────
  const wss = new WebSocketServer({ port: WS_PORT })
  wss.on('listening', () => console.log(`[ws]     listening on ws://localhost:${WS_PORT}`))
  wss.on('connection', (ws, req) => {
    console.log(`[ws]     dashboard connected (${req.socket.remoteAddress}) · clients: ${wss.clients.size}`)
    ws.on('close', () => console.log(`[ws]     dashboard disconnected · clients: ${wss.clients.size}`))
  })
  wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`[ws]     port ${WS_PORT} is already in use: is another bridge.js running?`)
    else console.error('[ws]    ', err.message)
    process.exit(1)
  })

  let lines = 0
  let lastLine = ''
  function broadcast(line) {
    lines++
    lastLine = line
    for (const client of wss.clients) if (client.readyState === WebSocket.OPEN) client.send(line)
  }

  // ── Serial port (reopens automatically if unplugged) ─────────────────────────
  let warnedMissing = false
  function openSerial() {
    const port = new SerialPort({ path: portPath, baudRate, autoOpen: false })
    port.open(async (err) => {
      if (err) {
        if (!warnedMissing) {
          console.error(`[serial] cannot open ${portPath}: ${err.message}`)
          if (/access denied/i.test(err.message)) console.error('         → close the Arduino Serial Monitor / any other program using the port')
          console.log('         available ports (an ESP8266 shows up as "USB-SERIAL CH340" or "Silicon Labs CP210x"):')
          await listPorts()
          console.log(`         retrying every ${RETRY_MS / 1000}s… (or restart with: node bridge.js COMx)`)
          warnedMissing = true
        }
        return setTimeout(openSerial, RETRY_MS)
      }
      warnedMissing = false
      console.log(`[serial] ${portPath} open @ ${baudRate} baud`)
      port.pipe(new ReadlineParser({ delimiter: '\n' })).on('data', (raw) => {
        const line = String(raw).trim()
        if (line) broadcast(line)
      })
    })
    port.on('close', () => {
      console.warn(`[serial] ${portPath} closed: waiting for it to come back…`)
      setTimeout(openSerial, RETRY_MS)
    })
    port.on('error', (e) => console.error('[serial]', e.message))
  }
  openSerial()

  // Heartbeat so you can see data is flowing without a Serial Monitor.
  setInterval(() => {
    if (!lines) return
    console.log(`[data]   ${(lines / 5).toFixed(1)} lines/s → ${wss.clients.size} client(s) · last: ${lastLine.slice(0, 90)}`)
    lines = 0
  }, 5000)
}
