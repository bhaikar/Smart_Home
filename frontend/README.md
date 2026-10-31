# HomeMate Frontend

HomeMate is a frontend-only smart-home dashboard built with Next.js, React, TypeScript, Tailwind CSS, and Socket.IO. The frontend communicates with a future backend through REST and Socket.IO; it never connects directly to devices or hardware.

## Setup

From the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Available pages:

- `/` — Overview
- `/devices` — Device controls and reported states
- `/activity` — Temporary activity feed
- `/assistant` — Typed and browser voice assistant
- `/settings` — Appearance and dashboard preferences

## Environment variables

Create `frontend/.env.local` for local overrides. Start from `.env.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_MOCK_MODE=true
```

- `NEXT_PUBLIC_API_URL` is the backend base URL used by REST and Socket.IO.
- `NEXT_PUBLIC_MOCK_MODE=true` runs the browser demo data layer. It starts devices as unknown, reports demo states after a short delay, simulates command progress, and creates temporary door events. The UI always labels this as demo mode and does not claim to control real devices.
- `NEXT_PUBLIC_MOCK_MODE=false` uses the configured backend REST and Socket.IO services.

Restart the dev server after changing environment variables.

## Mock mode

To enable demo mode:

```env
NEXT_PUBLIC_MOCK_MODE=true
```

To use the real backend connection:

```env
NEXT_PUBLIC_MOCK_MODE=false
```

Mock data is held in React memory only. There is no device-data persistence in `localStorage`, `sessionStorage`, IndexedDB, or a database.

The mock assistant uses a simple rule-based interpreter for common fan, pump, and door requests. It is demo behavior, not an AI or hardware integration.

## Checks

```powershell
npm run lint
npm run build
```

The production build performs TypeScript checking. There is no backend in this repository yet.

## Not tested against real hardware

The following remain untested against a real backend, broker, hub, or physical devices:

- REST response payloads from a running backend
- Socket.IO connection and live event delivery from a backend
- Device status freshness from real reports
- Pump execution, local pump timing, and physical safety behavior
- Fan setting execution and reported angle behavior
- Door lock state and real access events
- Real command acknowledgements versus executed status
- Real cloud assistant interpretation
- Browser voice recognition quality and device microphone permissions
- Hardware disconnects, network failures, and backend restart behavior

No hardware integration should be considered complete until these paths are tested with the backend and the actual device system.
