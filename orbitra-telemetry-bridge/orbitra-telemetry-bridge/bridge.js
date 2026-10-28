
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const WebSocket = require("ws");

const SERIAL_PORT = "COM6";
const BAUD_RATE = 115200;
const WS_PORT = 8081;

const serial = new SerialPort({
  path: SERIAL_PORT,
  baudRate: BAUD_RATE
});

const parser = serial.pipe(
  new ReadlineParser({ delimiter: "\n" })
);

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on("listening", () => {
  console.log(`WebSocket server running at ws://localhost:${WS_PORT}`);
});

serial.on("open", () => {
  console.log(`ESP8266 connected on ${SERIAL_PORT}`);
});

serial.on("error", (err) => {
  console.error("Serial error:", err.message);
});

parser.on("data", (line) => {
  try {
    const data = JSON.parse(line.trim());

    if (
      data.packetNo === undefined ||
      !Number.isFinite(Number(data.temperature)) ||
      !Number.isFinite(Number(data.humidity)) ||
      !Number.isFinite(Number(data.ax)) ||
      !Number.isFinite(Number(data.ay)) ||
      !Number.isFinite(Number(data.az)) ||
      !Number.isFinite(Number(data.totalAcc)) ||
      !Number.isFinite(Number(data.gx)) ||
      !Number.isFinite(Number(data.gy)) ||
      !Number.isFinite(Number(data.gz)) ||
      !Number.isFinite(Number(data.roll)) ||
      !Number.isFinite(Number(data.pitch)) ||
      !Number.isFinite(Number(data.latitude)) ||
      !Number.isFinite(Number(data.longitude)) ||
      !Number.isFinite(Number(data.altitude)) ||
      !Number.isFinite(Number(data.speed)) ||
      !Number.isFinite(Number(data.satellites)) ||
      !Number.isFinite(Number(data.gpsFix)) ||
      !Number.isFinite(Number(data.bmpTemperature)) ||
      !Number.isFinite(Number(data.pressure)) ||
      !Number.isFinite(Number(data.bmpAltitude))
    ) {
      return;
    }

    const telemetry = {
      packetNo: Number(data.packetNo),
      timestamp: Date.now(),

      temperature: Number(data.temperature),
      humidity: Number(data.humidity),

      ax: Number(data.ax),
      ay: Number(data.ay),
      az: Number(data.az),
      totalAcc: Number(data.totalAcc),

      gx: Number(data.gx),
      gy: Number(data.gy),
      gz: Number(data.gz),

      roll: Number(data.roll),
      pitch: Number(data.pitch),

      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      altitude: Number(data.altitude),
      speed: Number(data.speed),
      satellites: Number(data.satellites),
      gpsFix: Number(data.gpsFix),

      // BMP280 telemetry
      bmpTemperature: Number(data.bmpTemperature),
      pressure: Number(data.pressure),
      bmpAltitude: Number(data.bmpAltitude)
    };

    console.log("Telemetry:", telemetry);

    const message = JSON.stringify(telemetry);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch {
    // Ignore non-JSON serial lines.
  }
});

wss.on("connection", (socket) => {
  console.log("Telemetry dashboard client connected");
});