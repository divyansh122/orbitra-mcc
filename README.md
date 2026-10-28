# ORBITRA'26 · Mission Control

Live telemetry console for the ORBITRA'26 Drone & IoT Club project.

```
SENSORS → ESP8266 TX ──ESP-NOW──▶ ESP8266 RX ──USB/COM──▶ bridge.js ──ws://localhost:8081──▶ this dashboard
```

Built with Vite, React, TypeScript, Tailwind CSS v4, Framer Motion, uPlot, Leaflet, three.js / react-three-fiber and Zustand.

## Run it

Requires Node 18+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (default **http://localhost:5173**). A 3-second boot sequence plays; press any key to skip it.

For the demo itself, `npm run build && npm run preview` serves an optimized build.

## Run alongside bridge.js

Order matters, and **both terminals stay open**:

1. Plug in the **RX ESP8266** and close the Arduino Serial Monitor, since only one program can hold the COM port.
2. Terminal 1, in the `bridge/` folder (a ready-made serial → WebSocket bridge ships with this repo):
   ```bash
   cd bridge
   npm install
   node bridge.js --list   # find the RX port (CH340 / CP210x, not "Bluetooth link")
   node bridge.js COM5     # serial → ws://localhost:8081  (or edit COM_PORT / BAUD_RATE at the top of bridge.js)
   ```
   The bridge keeps retrying if the board isn't plugged in yet, and reconnects automatically if it's unplugged.
3. Terminal 2, in this folder:
   ```bash
   npm run dev
   ```
4. Open the dashboard. The status pill turns green (**LINK ONLINE**) and every stage of the pipeline strip at the bottom lights up.

The dashboard reconnects automatically with exponential backoff. If the bridge restarts mid-demo, you don't need to refresh.

| Status pill | Meaning |
| --- | --- |
| `LINK ONLINE` (green) | Socket open and packets arriving |
| `LINK IDLE` (amber) | Socket open but no packets: check the transmitter and the RX wiring |
| `SEARCHING` (amber) | Trying to connect |
| `OFFLINE` (red) | Bridge unreachable: the dashboard offers demo mode |
| `SIMULATION` (purple) | Demo mode is on |

If the plots stay blank, check in this order: the COM port in bridge.js, then the bridge terminal for errors, then that the RX prints **only JSON lines**, then the field mapping (below). Malformed lines appear in red in the *Raw Packet Stream* panel and are discarded, so they never crash the console.

## Change the WebSocket URL

Use any one of these:

- **Settings panel:** click ⚙ in the top bar, edit *WebSocket URL*, then press **Connect**. The setting is remembered in this browser.
- **Environment variable:** copy `.env.example` to `.env.local` and set `VITE_WS_URL=ws://192.168.1.20:8081`, then restart `npm run dev`.
- **URL parameter:** `http://localhost:5173/?ws=ws://192.168.1.20:8081`

## Demo mode (no hardware)

Press **D**, click **Demo** in the top bar, or open `http://localhost:5173/?demo=1`.

The simulator flies a 2-minute loop: climb, cruise, descend, land. It includes smooth roll and pitch, a GPS figure-eight with a flight trail, a wind gust about once a minute (this triggers the high-G alert), and periodic GPS fix dropouts. It also sends an occasional corrupted packet, to show that bad data is discarded safely. Simulated packets go through exactly the same parser as real ones.

If the bridge can't be reached, the dashboard offers demo mode on its own.

## Controls

| Key | Action |
| --- | --- |
| `F` | Fullscreen presentation mode (hides the control buttons) |
| `D` | Toggle demo mode |
| `P` | Pause or resume the display (the link stays connected) |
| `Esc` | Close settings / leave fullscreen |

Top-bar buttons: **Clear** wipes the recorded data. **CSV** downloads the rolling 10-minute buffer.

Other URL flags: `?noboot=1` skips the intro.

## What to tweak

| What | Where |
| --- | --- |
| **JSON key mapping** (aliases, nested `gps.lat` paths, units) | [`src/config/fields.ts`](src/config/fields.ts), at the top of the file |
| Labels, units, decimals, colours per field | `FIELD_META` in the same file |
| **Alert thresholds** (default values) | [`src/config/settings.ts`](src/config/settings.ts). Also editable live in ⚙ settings |
| Reconnect timing, buffer length, refresh rates | `LINK`, `BUFFER`, `UI` in `src/config/settings.ts` |
| **Colours, fonts, glow, spacing** (design tokens) | `@theme` and `:root` at the top of [`src/index.css`](src/index.css) |
| Map tiles (satellite / dark) | [`src/config/map.ts`](src/config/map.ts) |
| Demo flight behaviour | [`src/lib/demo.ts`](src/lib/demo.ts) |

### Field mapping

Incoming keys are matched case-insensitively against alias lists. The first match wins:

```ts
temperature: ['temperature', 'temp', 'tempC', 'dhtTemp', 't'],
bmpAltitude: ['bmpAltitude', 'bmpAlt', 'baroAltitude', 'baroAlt', 'altitude', 'alt', ...],
gpsAltitude: ['gpsAltitude', 'gpsAlt', 'gps.alt', 'gps.altitude'],
latitude:    ['latitude', 'lat', 'gps.lat', 'gps.latitude'],
```

- **GPS altitude and BMP280 altitude are always separate fields.** A bare `alt` or `altitude` counts as BMP280. Move those two aliases to `gpsAltitude` if your GPS is the one sending them.
- Pressure in Pa is converted to hPa automatically.
- Acceleration in m/s² is converted to g automatically (`ACCEL_UNIT`).
- `0,0` coordinates are treated as "no fix".
- Missing fields show `—`. Extra fields are ignored.
- Lines with a prefix (`RX: {...}`), JSON arrays, `{ data: {...} }` wrappers and Open MCT-style `{ id, value }` points are all accepted.

## Slow laptop or projector?

Open ⚙ settings and choose **Display → Lite**. This turns off the animated starfield and the glass blur. The console also respects the operating system's *reduce motion* setting.

## Project structure

```
src/
  config/       field mapping, settings & thresholds, map tiles  ← edit here
  lib/          parser, ring buffer, demo generator, alerts, CSV, formatting
  store/        Zustand telemetry store (single source of truth)
  hooks/        WebSocket link, demo stream, ticker, keyboard shortcuts
  components/
    ui/         Panel, StatCard, Gauge, Sparkline, AnimatedNumber, icons
    charts/     TimeChart (uPlot, canvas, 60 fps)
    panels/     Attitude (3D), Acceleration, Environment, GPS, Terminal, Events
    layout/     TopBar, BootSequence, PipelineStrip, AlertBanner, Settings, Background
  types/        shared TypeScript types
```

Performance: telemetry history lives in a columnar ring buffer outside React. Charts read from it on animation frames and downsample with min/max buckets, so plots stay smooth even with the 5-minute window. Each panel is wrapped in an error boundary, so one failing widget can't take down the console. If WebGL isn't available, the 3D view falls back to a 2D artificial horizon.
