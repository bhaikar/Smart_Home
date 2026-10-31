# HomeMate backend

The backend is an in-memory Express, Socket.IO, and MQTT service. It communicates with the HomeMate master through the agreed MQTT topics; it does not connect directly to slave devices.

## Run the backend

From `backend/`, create `.env` from `.env.example` and configure the broker credentials:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

## Run the local mock master

The mock master is a simulated MQTT participant for local development. It is clearly labeled `[MOCK]` in its source header and console output. It is **not real hardware** and must not be used as evidence that the ESP32-S3 master or slave boards work.

Run it in a second terminal, from `backend/`:

```powershell
npm run mock:master
```

The mock connects to the same broker settings as the backend and:

- Publishes master `ONLINE` heartbeat messages every 10 seconds.
- Subscribes to `homemate/001/master/command`.
- Sends an ACK after one second.
- Simulates water-pump and fan state, then publishes matching STATUS messages.
- Decrements pump `remainingSeconds` every second and turns the simulated pump off at zero.
- **TBC mock behavior:** fan timers decrement `remainingSeconds` every second and switch the simulated fan to `OFF` at zero. This is not tested against real hardware.
- Emits simulated RFID granted or denied events periodically.
- Publishes `OFFLINE` during graceful shutdown.

Useful test modes:

```powershell
npm run mock:master -- --fail
npm run mock:master -- --silent
npm run mock:master -- --offline
```

- `--fail` returns a simulated `FAILED` result for commands.
- `--silent` receives commands but sends no ACK, allowing command timeout handling to be tested.
- `--offline` publishes an offline availability message and does not start heartbeats or simulated events.

## What the mock does not test

The mock does not test real ESP32-S3 firmware, ESP-NOW forwarding, slave-device wiring, pump safety behavior, servo positions, RFID hardware, camera hardware, power loss, reboot fail-safe behavior, actual sensor readings, broker TLS certificate deployment, or real hardware timing. It also does not prove that the production master uses the exact same message fields beyond the simulated contract. Those require integration testing with the hardware developer's real master and slaves.

All application state and mock state are held in memory and disappear when the process stops. No database or data files are written.
